import { NextResponse } from "next/server";
import { getCurrentDashboardUser } from "@/lib/auth/currentUser";
import {
  createTopupPayment,
  updateTopupPaymentStatus,
} from "@/lib/db/repos/walletRepo";
import {
  createMidtransSnapTransaction,
  getMidtransConfig,
  isMidtransConfigured,
  midtransBaseUrl,
} from "@/lib/payment/midtrans";

export async function POST(request) {
  try {
    const user = await getCurrentDashboardUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!isMidtransConfigured()) {
      return NextResponse.json(
        { error: "Midtrans not configured. Set MIDTRANS_SERVER_KEY, MIDTRANS_CLIENT_KEY, MIDTRANS_MERCHANT_ID in .env" },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const amountCents = Math.round(Number(body?.amountCents || body?.amount || 0) * (body?.amountCents ? 1 : 100));
    if (!Number.isFinite(amountCents) || amountCents < 1000) {
      return NextResponse.json({ error: "amount must be at least 1000 cents ($10)" }, { status: 400 });
    }

    // Midtrans Snap processes IDR. Convert USD cents -> IDR gross amount.
    // Default rate: 1 USD = 16,000 IDR. Override via USD_TO_IDR env if needed.
    const USD_TO_IDR = Number(process.env.USD_TO_IDR || 16000);
    const grossAmount = Math.round((amountCents / 100) * USD_TO_IDR);

    const cfg = getMidtransConfig();
    const userId = user.userId || user.id;
    const orderId = `TOPUP-${Date.now()}-${userId.slice(0, 6)}`;

    const payment = await createTopupPayment({
      userId,
      amountCents,
      finalCents: amountCents,
      method: "midtrans",
      status: "pending",
      note: orderId,
    });

    try {
      const snap = await createMidtransSnapTransaction({
        orderId,
        grossAmount,
        firstName: user.username,
        email: user.email,
      });
      await updateTopupPaymentStatus({
        id: payment.id,
        status: "snap_created",
        externalRef: snap.transaction_id || orderId,
        note: orderId,
      });
      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        orderId,
        snapToken: snap.token,
        snapRedirectUrl: snap.redirect_url,
        clientKey: cfg.clientKey,
        isProduction: cfg.isProduction,
        baseJsUrl: `${midtransBaseUrl(cfg.isProduction)}/snap/snap.js`,
      });
    } catch (err) {
      await updateTopupPaymentStatus({
        id: payment.id,
        status: "failed",
        note: `snap_create_failed: ${err.message}`,
      });
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
