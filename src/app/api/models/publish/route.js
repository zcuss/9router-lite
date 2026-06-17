import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/driver";
import { getCurrentDashboardUser } from "@/lib/auth/currentUser";
import { hasRole } from "@/lib/auth/rbac";

export async function GET() {
  try {
    const db = await getAdapter();
    const rows = await db.all(`SELECT * FROM model_publish ORDER BY label ASC, model_id ASC`);
    return NextResponse.json({
      items: rows.map((r) => ({
        modelId: r.model_id,
        enabled: r.enabled === 1 || r.enabled === true,
        label: r.label,
        notes: r.notes,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Failed to load" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentDashboardUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(user.role, "admin")) {
      return NextResponse.json({ error: "Admin or dev role required" }, { status: 403 });
    }
    const body = await request.json();
    const modelId = String(body?.modelId || "").trim();
    if (!modelId) return NextResponse.json({ error: "modelId is required" }, { status: 400 });
    const enabled = body?.enabled !== false;
    const label = body?.label ? String(body.label).slice(0, 120) : null;
    const notes = body?.notes ? String(body.notes).slice(0, 500) : null;
    const now = new Date().toISOString();
    const db = await getAdapter();
    await db.run(
      `INSERT INTO model_publish (model_id, enabled, label, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (model_id) DO UPDATE SET enabled = EXCLUDED.enabled, label = EXCLUDED.label, notes = EXCLUDED.notes, updated_at = EXCLUDED.updated_at`,
      [modelId, enabled ? 1 : 0, label, notes, now, now]
    );
    return NextResponse.json({ success: true, modelId, enabled });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getCurrentDashboardUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasRole(user.role, "admin")) {
      return NextResponse.json({ error: "Admin or dev role required" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get("modelId");
    if (!modelId) return NextResponse.json({ error: "modelId is required" }, { status: 400 });
    const db = await getAdapter();
    await db.run(`DELETE FROM model_publish WHERE model_id = ?`, [modelId]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Failed to delete" }, { status: 500 });
  }
}
