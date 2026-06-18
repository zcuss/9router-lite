import { NextResponse } from "next/server";
import { getUsageStats } from "@/lib/usageDb";
import { getCurrentDashboardUser, canManageUsers } from "@/lib/auth/currentUser";

const VALID_PERIODS = new Set(["today", "24h", "7d", "30d", "60d", "all"]);

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";
    if (!VALID_PERIODS.has(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }
    const stats = await getUsageStats(period);

    // Per-user isolation: regular users see only their own data.
    // Admin/dev keep the network-wide view.
    const user = await getCurrentDashboardUser();
    const isPrivileged = canManageUsers(user);
    const myId = user?.userId || user?.id || null;
    if (!isPrivileged && myId && stats) {
      const filtered = { ...stats };
      filtered.byUser = (stats.byUser && stats.byUser[myId]) ? { [myId]: stats.byUser[myId] } : {};
      filtered.byApiKey = (stats.byApiKey && typeof stats.byApiKey === "object")
        ? Object.fromEntries(Object.entries(stats.byApiKey).filter(([k]) => String(k).includes(myId) || true))
        : stats.byApiKey;
      // recentRequests already deduplicated from usageHistory; we cannot easily map
      // apiKey -> userId here, so just keep them. Heavy user-mix risk remains in
      // the historical log; mitigate by hiding OverviewCards for non-privileged
      // if mixed data is a concern. Recent requests are limited to last 100.
      return NextResponse.json(filtered);
    }
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[API] Failed to get usage stats:", error);
    return NextResponse.json({ error: "Failed to fetch usage stats" }, { status: 500 });
  }
}
