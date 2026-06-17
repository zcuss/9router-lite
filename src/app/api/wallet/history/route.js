import { NextResponse } from "next/server";
import { getCurrentDashboardUser } from "@/lib/auth/currentUser";
import { listTopupPayments } from "@/lib/db/repos/walletRepo";

export async function GET(request) {
  try {
    const user = await getCurrentDashboardUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    
    const payments = await listTopupPayments({
      userId: user.userId || user.id,
      limit,
    });
    
    return NextResponse.json({ payments });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}