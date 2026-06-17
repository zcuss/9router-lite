import { NextResponse } from "next/server";
import { getCurrentDashboardUser } from "@/lib/auth/currentUser";
import { getAdapter } from "@/lib/db/driver";
import { PLANS, PLANS_LIST } from "@/shared/constants/plans";
import { debitBalance } from "@/lib/db/repos/walletRepo";

export async function GET() {
  try {
    const user = await getCurrentDashboardUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = await getAdapter();
    const row = await db.get(`SELECT id, username, role, status, plan FROM users WHERE id = ? LIMIT 1`, [user.id]);
    const planId = row?.plan || "lite";
    return NextResponse.json({ user: row, plan: PLANS[planId] || PLANS.lite, plans: PLANS_LIST });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to load subscription" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentDashboardUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { plan: targetPlanId } = await request.json();
    const targetPlan = PLANS[targetPlanId];
    if (!targetPlan) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    const db = await getAdapter();
    const userRow = await db.get(`SELECT plan, balance_cents, voucher_cents FROM users WHERE id = ? LIMIT 1`, [user.id]);
    if (!userRow) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const currentPlanId = userRow.plan || "lite";
    if (currentPlanId === targetPlanId) {
      return NextResponse.json({ error: "Already subscribed to this plan" }, { status: 400 });
    }

    const priceCents = Math.round(targetPlan.price * 100);

    // Charge the user
    try {
      await debitBalance({
        userId: user.id,
        amountCents: priceCents,
        source: "subscription_upgrade",
        note: `Upgrade subscription from ${currentPlanId} to ${targetPlanId}`,
      });
    } catch (debitError) {
      if (debitError.code === "INSUFFICIENT_BALANCE") {
        return NextResponse.json({ error: `Insufficient balance. Upgrade requires $${targetPlan.price.toFixed(2)}.` }, { status: 402 });
      }
      throw debitError;
    }

    const now = new Date().toISOString();
    await db.run(`UPDATE users SET plan = ?, updated_at = ? WHERE id = ?`, [targetPlanId, now, user.id]);
    return NextResponse.json({ success: true, plan: targetPlan });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to update subscription" }, { status: 500 });
  }
}
