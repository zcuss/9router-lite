import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/driver";
import { getCurrentDashboardUser } from "@/lib/auth/currentUser";
import { hasRole } from "@/lib/auth/rbac";

export async function DELETE(_req, ctx) {
  const user = await getCurrentDashboardUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!hasRole(user.role, "dev")) {
    return NextResponse.json({ error: "Dev role required" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const modelId = decodeURIComponent(id);
  const db = await getAdapter();
  await db.run(`DELETE FROM model_publish WHERE model_id = ?`, [modelId]);
  return NextResponse.json({ success: true });
}
