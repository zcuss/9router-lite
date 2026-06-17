import { NextResponse } from "next/server";
import { getCurrentDashboardUser, canManageUsers } from "@/lib/auth/currentUser";
import {
  creditBalance,
  getUserBalance,
  listVouchers,
  createVoucher,
  listTopupRequests,
  listTopupPayments,
  approveTopupRequest,
  rejectTopupRequest,
  creditTopupPayment,
  updateTopupPaymentStatus,
  findTopupPaymentById,
  deleteVoucher,
  updateVoucher
} from "@/lib/db/repos/walletRepo";

function requireAdmin(user) {
  if (!user || !canManageUsers(user)) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }
  return null;
}

export async function GET(request) {
  try {
    const user = await getCurrentDashboardUser();
    const guard = requireAdmin(user);
    if (guard) return guard;

    const url = new URL(request.url);
    const resource = url.searchParams.get("resource") || "topup-requests";
    const status = url.searchParams.get("status") || null;
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    if (resource === "vouchers") {
      const vouchers = await listVouchers({ limit });
      return NextResponse.json({ vouchers });
    }
    if (resource === "topup-payments") {
      const payments = await listTopupPayments({ status, limit });
      return NextResponse.json({ payments });
    }
    const requests = await listTopupRequests({ status, limit });
    return NextResponse.json({ requests });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentDashboardUser();
    const guard = requireAdmin(user);
    if (guard) return guard;

    const body = await request.json();
    const action = body?.action;

    if (action === "credit") {
      const userId = String(body?.userId || "").trim();
      const amountCents = parseInt(body?.amountCents || 0, 10);
      if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        return NextResponse.json({ error: "amountCents must be > 0" }, { status: 400 });
      }
      const result = await creditBalance({
        userId,
        amountCents,
        source: body?.source || "admin_credit",
        note: body?.note || null,
        createdBy: user.userId || user.id,
      });
      const balance = await getUserBalance(userId);
      return NextResponse.json({ success: true, ...result, balance });
    }

    if (action === "create-voucher") {
      const amountCents = parseInt(body?.amountCents || 0, 10);
      const maxRedemptions = parseInt(body?.maxRedemptions || 1, 10);
      const perUserLimit = parseInt(body?.perUserLimit ?? 1, 10);
      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        return NextResponse.json({ error: "amountCents must be > 0" }, { status: 400 });
      }
      const voucher = await createVoucher({
        amountCents,
        maxRedemptions: maxRedemptions > 0 ? maxRedemptions : 1,
        perUserLimit: perUserLimit >= 0 ? perUserLimit : 1,
        expiresAt: body?.expiresAt || null,
        note: body?.note || null,
        customCode: body?.customCode || null,
        createdBy: user.userId || user.id,
      });
      return NextResponse.json({ success: true, voucher });
    }

    if (action === "delete-voucher") {
      const id = String(body?.id || "").trim();
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      await deleteVoucher(id);
      return NextResponse.json({ success: true });
    }

    if (action === "update-voucher") {
      const id = String(body?.id || "").trim();
      const amountCents = parseInt(body?.amountCents || 0, 10);
      const maxRedemptions = parseInt(body?.maxRedemptions || 1, 10);
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        return NextResponse.json({ error: "amountCents must be > 0" }, { status: 400 });
      }
      const voucher = await updateVoucher({
        id,
        amountCents,
        maxRedemptions: maxRedemptions > 0 ? maxRedemptions : 1,
        expiresAt: body?.expiresAt || null,
        note: body?.note || null,
      });
      return NextResponse.json({ success: true, voucher });
    }

    if (action === "approve-topup") {
      const id = String(body?.id || "").trim();
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const req = await approveTopupRequest({
        id,
        resolvedBy: user.userId || user.id,
        note: body?.note || null,
      });
      return NextResponse.json({ success: true, request: req });
    }

    if (action === "reject-topup") {
      const id = String(body?.id || "").trim();
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const req = await rejectTopupRequest({
        id,
        resolvedBy: user.userId || user.id,
        note: body?.note || null,
      });
      return NextResponse.json({ success: true, request: req });
    }

    if (action === "approve-payment") {
      const id = String(body?.id || "").trim();
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const existing = await findTopupPaymentById(id);
      if (!existing) return NextResponse.json({ error: "payment not found" }, { status: 404 });
      if (existing.status === "settlement" || existing.status === "completed") {
        return NextResponse.json({ success: true, payment: existing, alreadyCredited: true });
      }
      const paid = await creditTopupPayment({
        id,
        settledAmountCents: existing.amountCents,
        externalRef: existing.externalRef || `admin_force_${user.userId || user.id}`,
        status: "settlement",
      });
      return NextResponse.json({ success: true, payment: paid });
    }

    if (action === "reject-payment") {
      const id = String(body?.id || "").trim();
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const existing = await findTopupPaymentById(id);
      if (!existing) return NextResponse.json({ error: "payment not found" }, { status: 404 });
      if (existing.status === "settlement" || existing.status === "completed") {
        return NextResponse.json({ error: "cannot reject a settled payment" }, { status: 400 });
      }
      const updated = await updateTopupPaymentStatus({
        id,
        status: "failed",
        note: body?.note || `Rejected by admin ${user.userId || user.id}`,
      });
      return NextResponse.json({ success: true, payment: updated });
    }

    if (action === "resync-payment") {
      const id = String(body?.id || "").trim();
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const existing = await findTopupPaymentById(id);
      if (!existing) return NextResponse.json({ error: "payment not found" }, { status: 404 });
      return NextResponse.json({ success: true, payment: existing });
    }

    return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
  } catch (e) {
    console.error("[admin/wallet]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
