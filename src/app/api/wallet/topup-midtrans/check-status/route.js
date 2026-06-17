import { NextResponse } from "next/server";
import { getCurrentDashboardUser } from "@/lib/auth/currentUser";
import { findTopupPaymentByExternalRef, creditTopupPayment, getTopupPaymentById } from "@/lib/db/repos/walletRepo";
import { getMidtransTransactionStatus, getMidtransConfig, isMidtransConfigured } from "@/lib/payment/midtrans";

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
  let orderId, user, payment;
  try {
    user = await getCurrentDashboardUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    orderId = String(body.orderId || "").trim();
    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    payment = await findTopupPaymentByExternalRef(orderId);
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

    // Midtrans not configured → just return current pending status
    if (!isMidtransConfigured()) {
      return NextResponse.json({
        ok: true,
        payment: {
          id: payment.id,
          status: payment.status,
          amountCents: payment.amount_cents ?? payment.final_cents,
        },
        alreadyFinal: false,
        warning: "midtrans_not_configured",
      });
    }

    let midtransRes;
    try {
      midtransRes = await getMidtransTransactionStatus(orderId);
    } catch (err) {
      console.error(`[check-status] midtrans call failed for ${orderId}:`, err.message);
      return NextResponse.json({
        ok: false,
        error: "midtrans_status_error",
        detail: err.message,
        payment: {
          id: payment.id,
          status: payment.status,
          amountCents: payment.amount_cents ?? payment.final_cents,
        },
      }, { status: 502 });
    }

    const transactionStatus = String(midtransRes.transaction_status || "").toLowerCase();
    const fraudStatus = String(midtransRes.fraud_status || "").toLowerCase();
    const mapped = STATUS_MAP[transactionStatus] || "pending";

    console.log(`[check-status] ${orderId} → midtrans=${transactionStatus} mapped=${mapped} fraud=${fraudStatus}`);

    if (mapped === "settlement") {
      // Accept capture if fraud=accept OR if no fraud status (CC may not have fraud_status)
      if (transactionStatus === "capture" && fraudStatus && fraudStatus !== "accept") {
        // Pending fraud review
        await (await import("@/lib/db/driver.js")).getAdapter().run(
          `UPDATE topup_payments SET status = ?, paid_at = ? WHERE id = ?`,
          ["capture_pending", new Date().toISOString(), payment.id]
        );
        return NextResponse.json({
          ok: true,
          payment: { id: payment.id, status: "capture_pending", amountCents: payment.amount_cents ?? payment.final_cents },
          alreadyFinal: false,
        });
      }

      // For IDR settlements, we have gross_amount; for pre-USD records, settledAmountCents comes from amount_cents
      const finalCents = Number(payment.final_cents ?? payment.amount_cents ?? 0);
      const updated = await creditTopupPayment({
        id: payment.id,
        settledAmountCents: finalCents,
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
      try {
        const db = (await import("@/lib/db/driver.js")).getAdapter();
        await db.run(
          `UPDATE topup_payments SET status = ?, paid_at = ? WHERE id = ?`,
          [mapped, new Date().toISOString(), payment.id]
        );
      } catch (e) {
        console.error(`[check-status] failed to persist ${mapped}:`, e.message);
      }
      return NextResponse.json({
        ok: true,
        payment: { id: payment.id, status: mapped, amountCents: payment.amount_cents ?? payment.final_cents },
        alreadyFinal: false,
      });
    }

    // Still pending
    return NextResponse.json({
      ok: true,
      payment: { id: payment.id, status: mapped, amountCents: payment.amount_cents ?? payment.final_cents },
      alreadyFinal: false,
    });
  } catch (err) {
    console.error(`[check-status] UNHANDLED ERROR for orderId=${orderId} user=${user?.id}:`, err);
    return NextResponse.json({
      ok: false,
      error: "internal_error",
      detail: err?.message || String(err),
      payment: payment ? { id: payment.id, status: payment.status } : null,
    }, { status: 500 });
  }
}
