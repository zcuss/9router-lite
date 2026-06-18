import * as crypto from "node:crypto";
import { getAdapter } from "../driver.js";

function newId() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

function generateVoucherCode(len = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(len);
  let code = "";
  for (let i = 0; i < len; i++) code += alphabet[bytes[i] % alphabet.length];
  return code.match(/.{1,5}/g).join("-");
}

export async function getUserBalance(userId) {
  const db = await getAdapter();
  const row = await db.get(
    `SELECT balance_cents, voucher_cents, lifetime_spent_cents, lifetime_topup_cents
     FROM users WHERE id = ?`,
    [userId]
  );
  if (!row) return null;
  // pg/cockroach driver returns numeric columns as strings — coerce to Number
  // so callers don't accidentally do "0" + "0" → "00" string concat.
  const balanceCents = Number(row.balance_cents ?? 0);
  const voucherCents = Number(row.voucher_cents ?? 0);
  return {
    balanceCents,
    voucherCents,
    lifetimeSpentCents: Number(row.lifetime_spent_cents ?? 0),
    lifetimeTopupCents: Number(row.lifetime_topup_cents ?? 0),
    totalCents: balanceCents + voucherCents,
  };
}

export async function creditBalance({ userId, amountCents, source, relatedId = null, note = null, createdBy = null }) {
  if (!userId || !Number.isFinite(amountCents) || amountCents <= 0) {
    throw new Error("creditBalance: invalid args");
  }
  const db = await getAdapter();
  return await db.transactionAsync(async () => {
    const user = await db.get(`SELECT balance_cents, voucher_cents FROM users WHERE id = ?`, [userId]);
    if (!user) throw new Error("user not found");
    const newBalance = Number(user.balance_cents ?? 0) + Number(amountCents);
    await db.run(
      `UPDATE users SET balance_cents = ?, lifetime_topup_cents = lifetime_topup_cents + ?, updated_at = ? WHERE id = ?`,
      [newBalance, amountCents, nowIso(), userId]
    );
    await db.run(
      `INSERT INTO wallet_transactions (id, user_id, kind, source, amount_cents, balance_after_cents, voucher_after_cents, related_id, note, created_by, created_at)
       VALUES (?, ?, 'credit', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId(), userId, source, amountCents, newBalance, user.voucher_cents ?? 0, relatedId, note, createdBy, nowIso()]
    );
    return { newBalanceCents: newBalance };
  });
}

export async function debitBalance({ userId, amountCents, source, relatedId = null, note = null, createdBy = null }) {
  if (!userId || !Number.isFinite(amountCents) || amountCents <= 0) {
    throw new Error("debitBalance: invalid args");
  }
  const db = await getAdapter();
  return await db.transactionAsync(async () => {
    const user = await db.get(`SELECT balance_cents, voucher_cents FROM users WHERE id = ?`, [userId]);
    if (!user) throw new Error("user not found");
    const total = Number(user.balance_cents ?? 0) + Number(user.voucher_cents ?? 0);
    if (total < amountCents) {
      const err = new Error("insufficient balance");
      err.code = "INSUFFICIENT_BALANCE";
      err.need = amountCents;
      err.have = total;
      throw err;
    }
    let voucherUse = 0;
    let cashUse = 0;
    const voucherAvail = user.voucher_cents ?? 0;
    if (voucherAvail >= amountCents) {
      voucherUse = amountCents;
    } else {
      voucherUse = voucherAvail;
      cashUse = amountCents - voucherAvail;
    }
    const newBalance = Number(user.balance_cents ?? 0) - Number(cashUse);
    const newVoucher = Number(user.voucher_cents ?? 0) - Number(voucherUse);
    await db.run(
      `UPDATE users SET balance_cents = ?, voucher_cents = ?, lifetime_spent_cents = lifetime_spent_cents + ?, updated_at = ? WHERE id = ?`,
      [newBalance, newVoucher, amountCents, nowIso(), userId]
    );
    await db.run(
      `INSERT INTO wallet_transactions (id, user_id, kind, source, amount_cents, balance_after_cents, voucher_after_cents, related_id, note, created_by, created_at)
       VALUES (?, ?, 'debit', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId(), userId, source, amountCents, newBalance, newVoucher, relatedId, note, createdBy, nowIso()]
    );
    return { newBalanceCents: newBalance, newVoucherCents: newVoucher, voucherUsed: voucherUse, cashUsed: cashUse };
  });
}

export async function createVoucher({ amountCents, maxRedemptions = 1, perUserLimit = 1, expiresAt = null, createdBy, note = null, customCode = null }) {
  if (!Number.isFinite(amountCents) || amountCents <= 0) throw new Error("amount must be > 0");
  const db = await getAdapter();
  let code = customCode;
  if (code) {
    const existing = await db.get(`SELECT id FROM vouchers WHERE code = ?`, [code]);
    if (existing) throw new Error("voucher code already exists");
  } else {
    for (let i = 0; i < 8; i++) {
      const candidate = generateVoucherCode();
      const existing = await db.get(`SELECT id FROM vouchers WHERE code = ?`, [candidate]);
      if (!existing) { code = candidate; break; }
    }
  }
  if (!code) throw new Error("failed to generate unique code");
  const id = newId();
  await db.run(
    `INSERT INTO vouchers (id, code, amount_cents, max_redemptions, redeemed_count, per_user_limit, expires_at, created_by, created_at, note)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
    [id, code, amountCents, maxRedemptions, perUserLimit, expiresAt, createdBy, nowIso(), note]
  );
  return await getVoucherById(id);
}

export async function getVoucherById(id) {
  const db = await getAdapter();
  const row = await db.get(`SELECT * FROM vouchers WHERE id = ?`, [id]);
  if (!row) return null;
  return shapeVoucher(row);
}

export async function getVoucherByCode(code) {
  const db = await getAdapter();
  const row = await db.get(`SELECT * FROM vouchers WHERE code = ?`, [code]);
  if (!row) return null;
  return shapeVoucher(row);
}

export async function listVouchers({ limit = 50, offset = 0 } = {}) {
  const db = await getAdapter();
  const rows = await db.all(
    `SELECT * FROM vouchers ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows.map(shapeVoucher);
}

export async function deleteVoucher(id) {
  const db = await getAdapter();
  await db.run(`DELETE FROM vouchers WHERE id = ?`, [id]);
  return true;
}

export async function updateVoucher({ id, amountCents, maxRedemptions, perUserLimit, expiresAt, note }) {
  const db = await getAdapter();
  await db.run(
    `UPDATE vouchers
     SET amount_cents = ?, max_redemptions = ?, per_user_limit = ?, expires_at = ?, note = ?
     WHERE id = ?`,
    [amountCents, maxRedemptions, perUserLimit, expiresAt, note, id]
  );
  return await getVoucherById(id);
}

export async function redeemVoucher({ userId, code }) {
  if (!userId || !code) throw new Error("userId and code required");
  const db = await getAdapter();
  return await db.transactionAsync(async () => {
    const v = await db.get(`SELECT * FROM vouchers WHERE code = ?`, [code]);
    if (!v) throw new Error("voucher not found");
    if (v.expires_at && new Date(v.expires_at) < new Date()) throw new Error("voucher expired");
    if (v.redeemed_count >= v.max_redemptions) throw new Error("voucher fully redeemed");

    // Per-user limit check
    const perUserLimit = Number(v.per_user_limit ?? 1);
    if (perUserLimit > 0) {
      const userRedemptions = await db.get(
        `SELECT COUNT(*) AS cnt FROM voucher_redemptions WHERE voucher_id = ? AND user_id = ?`,
        [v.id, userId]
      );
      if (Number(userRedemptions?.cnt ?? 0) >= perUserLimit) {
        const err = new Error("you have already redeemed this voucher");
        err.code = "ALREADY_REDEEMED";
        throw err;
      }
    }

    const user = await db.get(`SELECT balance_cents, voucher_cents FROM users WHERE id = ?`, [userId]);
    if (!user) throw new Error("user not found");

    const newBalance = Number(user.balance_cents ?? 0) + Number(v.amount_cents);
    const newVoucher = 0; // Vouchers merge into main balance upon redemption
    await db.run(
      `UPDATE users SET balance_cents = ?, voucher_cents = ?, updated_at = ? WHERE id = ?`,
      [newBalance, newVoucher, nowIso(), userId]
    );
    await db.run(
      `UPDATE vouchers SET redeemed_count = redeemed_count + 1 WHERE id = ?`,
      [v.id]
    );
    await db.run(
      `INSERT INTO voucher_redemptions (id, voucher_id, user_id, amount_cents, redeemed_at) VALUES (?, ?, ?, ?, ?)`,
      [newId(), v.id, userId, v.amount_cents, nowIso()]
    );
    await db.run(
      `INSERT INTO wallet_transactions (id, user_id, kind, source, amount_cents, balance_after_cents, voucher_after_cents, related_id, note, created_by, created_at)
       VALUES (?, ?, 'credit', 'voucher_redeem', ?, ?, ?, ?, ?, ?, ?)`,
      [newId(), userId, v.amount_cents, newBalance, newVoucher, v.id, `Redeem ${v.code} merged to balance`, userId, nowIso()]
    );
    return {
      voucher: shapeVoucher({ ...v, redeemed_count: Number(v.redeemed_count ?? 0) + 1 }),
      newVoucherCents: newVoucher,
    };
  });
}

export async function listTransactions({ userId, limit = 50, offset = 0, kind = null } = {}) {
  const db = await getAdapter();
  const where = [];
  const params = [];
  if (userId) { where.push("user_id = ?"); params.push(userId); }
  if (kind) { where.push("kind = ?"); params.push(kind); }
  const sql = `SELECT * FROM wallet_transactions ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  const rows = await db.all(sql, params);
  return rows.map(shapeTransaction);
}

export async function createTopupRequest({ userId, amountCents, method = null, reference = null }) {
  if (!Number.isFinite(amountCents) || amountCents <= 0) throw new Error("amount must be > 0");
  const db = await getAdapter();
  const id = newId();
  await db.run(
    `INSERT INTO topup_requests (id, user_id, amount_cents, method, reference, status, requested_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    [id, userId, amountCents, method, reference, nowIso()]
  );
  return await getTopupRequest(id);
}

export async function getTopupRequest(id) {
  const db = await getAdapter();
  const row = await db.get(`SELECT * FROM topup_requests WHERE id = ?`, [id]);
  return row ? shapeTopup(row) : null;
}

export async function listTopupRequests({ status = null, limit = 50, offset = 0 } = {}) {
  const db = await getAdapter();
  const where = [];
  const params = [];
  if (status) { where.push("r.status = ?"); params.push(status); }
  const sql = `
    SELECT r.*, u.username, u.email
    FROM topup_requests r
    LEFT JOIN users u ON u.id = r.user_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY r.requested_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);
  const rows = await db.all(sql, params);
  return rows.map(shapeTopup);
}

export async function listTopupPayments({ userId = null, status = null, limit = 100, offset = 0 } = {}) {
  const db = await getAdapter();
  const where = [];
  const params = [];
  if (status) { where.push("p.status = ?"); params.push(status); }
  if (userId) { where.push("p.user_id = ?"); params.push(userId); }
  const sql = `
    SELECT p.*, u.username, u.email
    FROM topup_payments p
    LEFT JOIN users u ON u.id = p.user_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);
  const rows = await db.all(sql, params);
  return rows.map(shapeTopupPayment);
}

export async function findTopupPaymentById(id) {
  const db = await getAdapter();
  const row = await db.get(
    `SELECT p.*, u.username, u.email
     FROM topup_payments p
     LEFT JOIN users u ON u.id = p.user_id
     WHERE p.id = ?`,
    [id]
  );
  return row ? shapeTopupPayment(row) : null;
}

export async function findTopupPaymentByExternalRef(externalRef) {
  const db = await getAdapter();
  const row = await db.get(
    `SELECT p.*, u.username, u.email
     FROM topup_payments p
     LEFT JOIN users u ON u.id = p.user_id
     WHERE p.external_ref = ?`,
    [externalRef]
  );
  return row ? shapeTopupPayment(row) : null;
}

export async function createTopupPayment({
  userId,
  amountCents,
  finalCents = null,
  method = "midtrans",
  externalRef = null,
  status = "pending",
  note = null,
}) {
  if (!userId || !Number.isFinite(amountCents) || amountCents <= 0) {
    throw new Error("createTopupPayment: invalid args");
  }
  const db = await getAdapter();
  const id = newId();
  await db.run(
    `INSERT INTO topup_payments
       (id, user_id, amount_cents, final_cents, method, status, external_ref, created_at, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, amountCents, finalCents, method, status, externalRef, nowIso(), note]
  );
  return await findTopupPaymentById(id);
}

export async function updateTopupPaymentStatus({ id, status, externalRef = null, note = null }) {
  const db = await getAdapter();
  const existing = await db.get(`SELECT * FROM topup_payments WHERE id = ?`, [id]);
  if (!existing) throw new Error("topup payment not found");
  await db.run(
    `UPDATE topup_payments SET status = ?, external_ref = COALESCE(?, external_ref), note = COALESCE(?, note) WHERE id = ?`,
    [status, externalRef, note, id]
  );
  return await findTopupPaymentById(id);
}

export async function creditTopupPayment({ id, settledAmountCents, externalRef, status = "settlement" }) {
  const db = await getAdapter();
  return await db.transactionAsync(async () => {
    const p = await db.get(`SELECT * FROM topup_payments WHERE id = ?`, [id]);
    if (!p) throw new Error("payment not found");
    if (p.status === "settlement" || p.status === "completed" || p.status === "captured") {
      return await findTopupPaymentById(id);
    }
    // Force numeric conversion (DB returns cents as string from pg driver)
    const finalCents = Number(settledAmountCents);
    await db.run(
      `UPDATE topup_payments SET status = ?, final_cents = ?, external_ref = COALESCE(?, external_ref) WHERE id = ?`,
      [status, finalCents, externalRef, id]
    );
    await creditBalance({
      userId: p.user_id,
      amountCents: finalCents,
      source: "topup_midtrans",
      relatedId: id,
      note: `Midtrans topup ${externalRef || ""}`.trim(),
      createdBy: null,
    });
    return await findTopupPaymentById(id);
  });
}

export async function approveTopupRequest({ id, resolvedBy, note = null }) {
  const db = await getAdapter();
  return await db.transactionAsync(async () => {
    const r = await db.get(`SELECT * FROM topup_requests WHERE id = ?`, [id]);
    if (!r) throw new Error("request not found");
    if (r.status !== "pending") throw new Error(`request already ${r.status}`);
    await db.run(
      `UPDATE topup_requests SET status = 'approved', resolved_at = ?, resolved_by = ?, resolution_note = ? WHERE id = ?`,
      [nowIso(), resolvedBy, note, id]
    );
    await creditBalance({
      userId: r.user_id,
      amountCents: r.amount_cents,
      source: "topup_approval",
      relatedId: id,
      note: note || `Topup approved`,
      createdBy: resolvedBy,
    });
    return await getTopupRequest(id);
  });
}

export async function rejectTopupRequest({ id, resolvedBy, note = null }) {
  const db = await getAdapter();
  const r = await db.get(`SELECT * FROM topup_requests WHERE id = ?`, [id]);
  if (!r) throw new Error("request not found");
  if (r.status !== "pending") throw new Error(`request already ${r.status}`);
  await db.run(
    `UPDATE topup_requests SET status = 'rejected', resolved_at = ?, resolved_by = ?, resolution_note = ? WHERE id = ?`,
    [nowIso(), resolvedBy, note, id]
  );
  return await getTopupRequest(id);
}

function shapeVoucher(row) {
  return {
    id: row.id,
    code: row.code,
    amountCents: row.amount_cents,
    maxRedemptions: row.max_redemptions,
    redeemedCount: row.redeemed_count,
    perUserLimit: row.per_user_limit != null ? Number(row.per_user_limit) : 1,
    expiresAt: row.expires_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    note: row.note,
  };
}

function shapeTransaction(row) {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    source: row.source,
    amountCents: row.amount_cents,
    balanceAfterCents: row.balance_after_cents,
    voucherAfterCents: row.voucher_after_cents,
    relatedId: row.related_id,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function shapeTopup(row) {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username || null,
    email: row.email || null,
    amountCents: row.amount_cents,
    method: row.method || row.payment_method || null,
    reference: row.reference,
    promocode: row.promocode || null,
    status: row.status,
    requestedAt: row.requested_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    resolutionNote: row.resolution_note,
  };
}

function shapeTopupPayment(row) {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username || null,
    email: row.email || null,
    amountCents: row.amount_cents,
    discountCents: row.discount_cents || 0,
    finalCents: row.final_cents,
    method: row.method,
    status: row.status,
    externalRef: row.external_ref || null,
    promocode: row.promocode || null,
    payload: row.payload || null,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    appliedAt: row.applied_at,
  };
}
