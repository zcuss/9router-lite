import { v4 as uuidv4 } from "uuid";
import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";
import { encrypt, decrypt } from "../../crypto";

const OPTIONAL_FIELDS = [
  "displayName", "email", "globalPriority", "defaultModel",
  "accessToken", "refreshToken", "expiresAt", "tokenType",
  "scope", "projectId", "apiKey", "testStatus",
  "lastTested", "lastError", "lastErrorAt", "rateLimitedUntil", "expiresIn", "errorCode",
  "consecutiveUseCount",
];

function parseDbBoolean(value, defaultValue = true) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "t", "yes", "y", "on"].includes(normalized)) return true;
    if (["0", "false", "f", "no", "n", "off"].includes(normalized)) return false;
  }
  return defaultValue;
}

function rowToConn(row) {
  if (!row) return null;
  const extra = parseJson(row.data, {});
  let decryptedApiKey = '';
  if (row.api_key) {
    try {
      decryptedApiKey = decrypt(row.api_key);
    } catch (e) {
      decryptedApiKey = row.api_key; // Fallback if not encrypted
    }
  }
  return {
    ...extra,
    id: row.id,
    provider: row.provider,
    authType: row.authType,
    name: row.name,
    email: row.email,
    priority: row.priority,
    isActive: parseDbBoolean(row.isActive, true),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    // New fields from PRD v2 schema
    apiKey: decryptedApiKey,
    baseUrl: row.base_url ?? null,
    status: row.status ?? 'pending',
    allowedRoles: row.allowed_roles ? JSON.parse(row.allowed_roles) : ['admin','dev','premium+'],
    submittedBy: row.submitted_by ?? null,
    approvedBy: row.approved_by ?? null,
    approvedAt: row.approved_at ?? null,
    rejectionReason: row.rejection_reason ?? null,
    pendingRevision: row.pending_revision ? JSON.parse(row.pending_revision) : null,
  };
}

function connToRow(c) {
  const { id, provider, authType, name, email, priority, isActive, createdAt, updatedAt, apiKey, baseUrl, status, allowedRoles, submittedBy, approvedBy, approvedAt, rejectionReason, pendingRevision, ...rest } = c;
  let encryptedApiKey = '';
  if (apiKey) {
    try {
      encryptedApiKey = encrypt(apiKey);
    } catch (e) {
      encryptedApiKey = apiKey; // Fallback if encryption fails
    }
  }
  return {
    id,
    provider,
    authType,
    name: name ?? null,
    email: email ?? null,
    priority: priority ?? null,
    isActive: isActive === false ? 0 : 1,
    data: stringifyJson(rest),
    createdAt,
    updatedAt,
    // New fields from PRD v2 schema
    api_key: encryptedApiKey,
    base_url: baseUrl ?? null,
    status: status ?? 'pending',
    allowed_roles: allowedRoles ? JSON.stringify(allowedRoles) : '["admin","dev","premium+"]',
    submitted_by: submittedBy ?? null,
    approved_by: approvedBy ?? null,
    approved_at: approvedAt ?? null,
    rejection_reason: rejectionReason ?? null,
    pending_revision: pendingRevision ? JSON.stringify(pendingRevision) : null,
  };
}

async function upsert(db, c) {
  const r = connToRow(c);
  await db.run(
    `INSERT INTO providerConnections(id, provider, authType, name, email, priority, isActive, data, createdAt, updatedAt, api_key, base_url, status, allowed_roles, submitted_by, approved_by, approved_at, rejection_reason, pending_revision)
     VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       provider=excluded.provider, authType=excluded.authType, name=excluded.name,
       email=excluded.email, priority=excluded.priority, isActive=excluded.isActive,
       data=excluded.data, updatedAt=excluded.updatedAt, api_key=excluded.api_key,
       base_url=excluded.base_url, status=excluded.status, allowed_roles=excluded.allowed_roles,
       submitted_by=excluded.submitted_by, approved_by=excluded.approved_by, approved_at=excluded.approved_at,
       rejection_reason=excluded.rejection_reason, pending_revision=excluded.pending_revision`,
    [r.id, r.provider, r.authType, r.name, r.email, r.priority, r.isActive, r.data, r.createdAt, r.updatedAt, r.api_key, r.base_url, r.status, r.allowed_roles, r.submitted_by, r.approved_by, r.approved_at, r.rejection_reason, r.pending_revision]
  );
}

export async function getProviderConnections(filter = {}) {
  const db = await getAdapter();
  const where = [];
  const params = [];
  if (filter.provider) { where.push("provider = ?"); params.push(filter.provider); }
  if (filter.isActive !== undefined) { where.push("isActive = ?"); params.push(filter.isActive ? 1 : 0); }
  const sql = `SELECT * FROM providerConnections${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`;
  const rows = await db.all(sql, params);
  const list = rows.map(rowToConn);
  list.sort((a, b) => (a.priority || 999) - (b.priority || 999));
  return list;
}

export async function getProviderConnectionById(id) {
  const db = await getAdapter();
  const row = await db.get(`SELECT * FROM providerConnections WHERE id = ?`, [id]);
  return rowToConn(row);
}

// Internal reorder — must be called INSIDE a transaction
async function reorderInTx(db, providerId) {
  const list = (await db.all(`SELECT * FROM providerConnections WHERE provider = ?`, [providerId])).map(rowToConn);
  list.sort((a, b) => {
    const pDiff = (a.priority || 0) - (b.priority || 0);
    if (pDiff !== 0) return pDiff;
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  });
  for (const [i, c] of list.entries()) {
    await db.run(`UPDATE providerConnections SET priority = ? WHERE id = ?`, [i + 1, c.id]);
  }
}

export async function createProviderConnection(data) {
  const db = await getAdapter();
  const now = new Date().toISOString();
  let result;

  await db.transactionAsync(async () => {
    const all = (await db.all(`SELECT * FROM providerConnections WHERE provider = ?`, [data.provider])).map(rowToConn);

    let existing = null;
    if (data.authType === "oauth" && data.email) {
      const incomingWs = data.providerSpecificData?.chatgptAccountId;
      existing = all.find(c => {
        if (c.authType !== "oauth" || c.email !== data.email) return false;
        // If both sides have a workspace ID, they must match for dedup
        const existingWs = c.providerSpecificData?.chatgptAccountId;
        if (incomingWs && existingWs) return incomingWs === existingWs;
        return true; // fallback: email-only match for non-workspace providers
      });
    } else if (data.authType === "apikey" && data.name) {
      existing = all.find(c => c.authType === "apikey" && c.name === data.name);
    }
    // access_token: never dedup — user manages duplicates manually

    if (existing) {
      const merged = { ...existing, ...data, updatedAt: now };
      await upsert(db, merged);
      result = merged;
      return;
    }

    let connectionName = data.name || null;
    if (!connectionName && (data.authType === "oauth" || data.authType === "access_token")) {
      connectionName = data.email || `Account ${all.length + 1}`;
    }
    let connectionPriority = data.priority;
    if (!connectionPriority) {
      connectionPriority = all.reduce((m, c) => Math.max(m, c.priority || 0), 0) + 1;
    }

    const conn = {
      id: uuidv4(),
      provider: data.provider,
      authType: data.authType || "oauth",
      name: connectionName,
      priority: connectionPriority,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: now,
      updatedAt: now,
    };
    for (const f of OPTIONAL_FIELDS) {
      if (data[f] !== undefined && data[f] !== null) conn[f] = data[f];
    }
    if (data.providerSpecificData && Object.keys(data.providerSpecificData).length > 0) {
      conn.providerSpecificData = data.providerSpecificData;
    }
    if (data.email !== undefined) conn.email = data.email;

    await upsert(db, conn);
    await reorderInTx(db, data.provider);
    result = conn;
  });

  return result;
}

// Critical: OAuth refresh token race — atomic merge inside transaction
export async function updateProviderConnection(id, data) {
  const db = await getAdapter();
  let result;
  await db.transactionAsync(async () => {
    const row = await db.get(`SELECT * FROM providerConnections WHERE id = ?`, [id]);
    if (!row) { result = null; return; }
    const existing = rowToConn(row);
    const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
    await upsert(db, merged);
    if (data.priority !== undefined) await reorderInTx(db, existing.provider);
    result = merged;
  });
  return result;
}

export async function deleteProviderConnection(id) {
  const db = await getAdapter();
  let ok = false;
  await db.transactionAsync(async () => {
    const row = await db.get(`SELECT provider FROM providerConnections WHERE id = ?`, [id]);
    if (!row) return;
    await db.run(`DELETE FROM providerConnections WHERE id = ?`, [id]);
    await reorderInTx(db, row.provider);
    ok = true;
  });
  return ok;
}

export async function deleteProviderConnectionsByProvider(providerId) {
  const db = await getAdapter();
  const before = await db.get(`SELECT COUNT(*) AS n FROM providerConnections WHERE provider = ?`, [providerId]);
  await db.run(`DELETE FROM providerConnections WHERE provider = ?`, [providerId]);
  return before?.n || 0;
}

export async function reorderProviderConnections(providerId) {
  const db = await getAdapter();
  await db.transactionAsync(async () => reorderInTx(db, providerId));
}

export async function cleanupProviderConnections() {
  const db = await getAdapter();
  const fieldsToCheck = [
    "displayName", "email", "globalPriority", "defaultModel",
    "accessToken", "refreshToken", "expiresAt", "tokenType",
    "scope", "projectId", "apiKey", "testStatus",
    "lastTested", "lastError", "lastErrorAt", "rateLimitedUntil", "expiresIn",
    "consecutiveUseCount",
  ];
  let cleaned = 0;
  await db.transactionAsync(async () => {
    const rows = await db.all(`SELECT * FROM providerConnections`);
    for (const row of rows) {
      const conn = rowToConn(row);
      let dirty = false;
      for (const f of fieldsToCheck) {
        if (conn[f] === null || conn[f] === undefined) {
          if (f in conn) { delete conn[f]; cleaned++; dirty = true; }
        }
      }
      if (conn.providerSpecificData && Object.keys(conn.providerSpecificData).length === 0) {
        delete conn.providerSpecificData;
        cleaned++;
        dirty = true;
      }
      if (dirty) await upsert(db, conn);
    }
  });
  return cleaned;
}
