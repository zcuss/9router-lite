import { NextResponse } from "next/server";
import { getCurrentDashboardUser } from "@/lib/auth/currentUser";
import { getUserBalance, listTransactions } from "@/lib/db/repos/walletRepo";

export async function GET(request) {
  try {
    const user = await getCurrentDashboardUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const includeTx = url.searchParams.get("include") === "transactions";
    const txLimit = parseInt(url.searchParams.get("txLimit") || "20", 10);

    const balance = await getUserBalance(user.userId || user.id);
    if (!balance) return NextResponse.json({ error: "user not found" }, { status: 404 });

    const result = { balance };
    if (includeTx) {
      result.transactions = await listTransactions({ userId: user.userId || user.id, limit: txLimit });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error("[wallet/balance]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
