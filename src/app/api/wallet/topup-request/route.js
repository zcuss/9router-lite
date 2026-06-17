import { NextResponse } from "next/server";
import { getCurrentDashboardUser } from "@/lib/auth/currentUser";
import { createTopupRequest, listTopupRequests } from "@/lib/db/repos/walletRepo";

export async function GET(request) {
  try {
    const user = await getCurrentDashboardUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL(request.url);
    const mine = url.searchParams.get("mine") === "1";
    const status = url.searchParams.get("status") || null;
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    if (mine) {
      const rows = await listTopupRequests({ status, limit });
      return NextResponse.json({ requests: rows.filter((r) => r.userId === (user.userId || user.id)) });
    }
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentDashboardUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const amountCents = Math.round(Number(body?.amountCents || body?.amount || 0) * (body?.amountCents ? 1 : 100));
    const method = body?.method || null;
    const reference = body?.reference || null;
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
    }
    const req = await createTopupRequest({
      userId: user.userId || user.id,
      amountCents,
      method,
      reference,
    });
    return NextResponse.json({ success: true, request: req });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
