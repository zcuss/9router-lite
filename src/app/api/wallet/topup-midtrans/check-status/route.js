import { NextResponse } from "next/server";
import { getCurrentDashboardUser } from "@/lib/auth/currentUser";
import { findTopupPaymentByExternalRef, creditTopupPayment } from "@/lib/db/repos/walletRepo";
import { getMidtransTransactionStatus } from "@/lib/payment/midtrans";

export const dynamic = "force-dynamic";

const STATUS_MAP = {
  settlement: "settlement",
  capture: "settlement",
  pending: "pending",
  deny: "failed",
  cancel: "failed",
  expire: "failed",
  refund: "refunded",
};

export async function POST(req) {
  const user = await getCurrentDashboardUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const orderId = String(body.orderId || "").trim();
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  const payment = await findTopupPaymentByExternalRef(orderId);
  if (!payment) {
    return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
  }
  if (payment.user_id !== user.userId && payment.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // If already settled or failed, no need to re-check
  if (payment.status === "settlement" || payment.status === "failed" || payment.status === "expired" || payment.status === "refunded") {
    return NextResponse.json({
      ok: true,
      payment: {
        id: payment.id,
        status: payment.status,
        amountCents: payment.amount_cents ?? payment.final_cents,
      },
      alreadyFinal: true,
    });
  }

  let midtransRes;
  try {
    midtransRes = await getMidtransTransactionStatus(orderId);
  } catch (err) {
    return NextResponse.json({ error: "midtrans_status_error", detail: err.message }, { status: 502 });
  }

  const transactionStatus = String(midtransRes.transaction_status || "").toLowerCase();
  const mapped = STATUS_MAP[transactionStatus] || "pending";

  if (mapped === "settlement") {
    const updated = await creditTopupPayment({
      id: payment.id,
      settledAmountCents: payment.final_cents ?? payment.amount_cents,
      externalRef: orderId,
      status: "settlement",
    });
    return NextResponse.json({
      ok: true,
      payment: {
        id: updated?.id,
        status: updated?.status,
        amountCents: updated?.amount_cents ?? updated?.final_cents,
      },
      alreadyFinal: false,
    });
  }

  if (mapped === "failed" || mapped === "expired" || mapped === "refunded") {
    // Persist the failed status so the admin table reflects it
    try {
      const db = (await import("@/lib/db/driver.js")).getAdapter();
      await db.run(
        `UPDATE topup_payments SET status = ?, paid_at = ? WHERE id = ?`,
        [mapped, new Date().toISOString(), payment.id]
      );
    } catch {}
    return NextResponse.json({
      ok: true,
      payment: {
        id: payment.id,
        status: mapped,
        amountCents: payment.amount_cents ?? payment.final_cents,
      },
      alreadyFinal: false,
    });
  }

  return NextResponse.json({
    ok: true,
    payment: {
      id: payment.id,
      status: mapped,
      amountCents: payment.amount_cents ?? payment.final_cents,
    },
    alreadyFinal: false,
  });
}
