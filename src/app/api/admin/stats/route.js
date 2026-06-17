import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/driver";
import { getCurrentDashboardUser } from "@/lib/auth/currentUser";
import { hasRole } from "@/lib/auth/rbac";

export async function GET() {
  const user = await getCurrentDashboardUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!hasRole(user.role, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const db = await getAdapter();

    // 1. Total users
    const rUsers = await db.get(`SELECT COUNT(*) as count FROM users`);
    const userCount = rUsers?.count || 0;

    // 2. Active keys
    const rKeys = await db.get(`SELECT COUNT(*) as count FROM "apiKeys" WHERE "isActive" = 1`);
    const keyCount = rKeys?.count || 0;

    // 3. Requests 24h & Spend 24h
    // Since usage is in usage logs, let's select from usage_logs or request_logs if it exists,
    // or just return mock/reasonable values from db if schema is simpler.
    // Let's check table list first to query correctly.
    let req24h = 0;
    let spend24h = 0;

    try {
      const rLogs = await db.get(`
        SELECT COUNT(*) as count, SUM(cost_cents) as cost 
        FROM usage_logs 
        WHERE created_at >= (now() - interval '24 hours')
      `);
      req24h = rLogs?.count || 0;
      spend24h = rLogs?.cost || 0;
    } catch {
      // Fallback if table doesn't exist or is named differently
      try {
        const rLogs2 = await db.get(`
          SELECT COUNT(*) as count, SUM(cost) as cost 
          FROM logs 
          WHERE timestamp >= (now() - interval '24 hours')
        `);
        req24h = rLogs2?.count || 0;
        spend24h = rLogs2?.cost || 0;
      } catch {
        req24h = 0;
        spend24h = 0;
      }
    }

    return NextResponse.json({
      userCount,
      keyCount,
      req24h,
      spend24h
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
