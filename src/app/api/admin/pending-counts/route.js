import { NextResponse } from "next/server";
import { getCurrentDashboardUser, canManageUsers } from "@/lib/auth/currentUser";
import { getAdapter } from "@/lib/db/driver";

export const dynamic = "force-dynamic";

// GET /api/admin/pending-counts - Returns count of pending items for admin widgets/badges
export async function GET() {
  try {
    const user = await getCurrentDashboardUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageUsers(user)) {
      return NextResponse.json({ error: "admin only" }, { status: 403 });
    }
    const db = await getAdapter();
    // pending Midtrans payments that need manual approval (not yet settled)
    const [pendingPayments, pendingTopupRequests] = await Promise.all([
      db.get(`SELECT COUNT(*) AS c FROM topup_payments WHERE status NOT IN ('settlement','completed','captured','failed','cancelled','expired')`).catch(() => ({ c: 0 })),
      db.get(`SELECT COUNT(*) AS c FROM topup_requests WHERE status = 'pending'`).catch(() => ({ c: 0 })),
    ]);
    return NextResponse.json({
      pendingPayments: Number(pendingPayments?.c || 0),
      pendingTopupRequests: Number(pendingTopupRequests?.c || 0),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
