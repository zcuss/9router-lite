import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/driver.js";
import { getDashboardAuthSession } from "@/lib/auth/dashboardSession";
import { hasRole } from "@/lib/auth/rbac";

async function checkAdmin(request) {
  const token = request.cookies.get("auth_token")?.value;
  const session = await getDashboardAuthSession(token);
  // Allow both admin and dev to access user management
  if (!session || (!hasRole(session.role, "admin") && session.role !== "dev")) {
    return false;
  }
  return true;
}

export async function GET(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const db = await getAdapter();
    const users = await db.all(`SELECT id, username, role, status, created_at FROM users`);
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { userId, role, status } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    const db = await getAdapter();
    const now = new Date().toISOString();
    await db.run(
      `UPDATE users SET role = ?, status = ?, updated_at = ? WHERE id = ?`,
      [role, status, now, userId]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}