import { NextResponse } from "next/server";
import { getCurrentDashboardUser } from "@/lib/auth/currentUser";
import { redeemVoucher } from "@/lib/db/repos/walletRepo";

export async function POST(request) {
  try {
    const user = await getCurrentDashboardUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const code = String(body?.code || "").trim();
    if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

    const result = await redeemVoucher({ userId: user.userId || user.id, code });
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("[wallet/redeem]", e);
    const status = /not found|expired|fully redeemed/.test(e.message) ? 400 : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
