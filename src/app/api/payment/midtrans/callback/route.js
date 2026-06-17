import { NextResponse } from "next/server";
import {
  creditTopupPayment,
  findTopupPaymentByExternalRef,
  updateTopupPaymentStatus,
} from "@/lib/db/repos/walletRepo";
import { verifyMidtransSignature } from "@/lib/payment/midtrans";

function centsFromGross(v) {
  const n = Number(v || 0);
  const USD_TO_IDR = Number(process.env.USD_TO_IDR || 16000);
  return Math.round((n / USD_TO_IDR) * 100);
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "invalid payload" }, { status: 400 });

    const orderId = body.order_id || null;
    const transactionStatus = body.transaction_status || null;
    const fraudStatus = body.fraud_status || null;
    const statusCode = String(body.status_code || "");
    const grossAmount = String(body.gross_amount || "");
    const signatureKey = body.signature_key || "";

    if (!verifyMidtransSignature({ orderId, statusCode, grossAmount, signatureKey })) {
      return NextResponse.json({ error: "invalid signature" }, { status: 403 });
    }

    const payment = await findTopupPaymentByExternalRef(orderId) || null;
    if (!payment) {
      return NextResponse.json({ error: "payment not found" }, { status: 404 });
    }

    const amountCents = centsFromGross(grossAmount);

    if (transactionStatus === "settlement" || transactionStatus === "capture") {
      const paid = await creditTopupPayment({
        id: payment.id,
        settledAmountCents: amountCents,
        externalRef: orderId,
        status: transactionStatus === "capture" && fraudStatus !== "accept" ? "capture_pending" : transactionStatus,
      });
      return NextResponse.json({ success: true, payment: paid });
    }

    const updated = await updateTopupPaymentStatus({
      id: payment.id,
      status: transactionStatus || "unknown",
      externalRef: orderId,
      note: body.status_message || null,
    });
    return NextResponse.json({ success: true, payment: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
