import { NextResponse } from "next/server";
import { getCurrentDashboardUser } from "@/lib/auth/currentUser";
import { listTunings, getTuning, upsertTuning, deleteTuning } from "@/lib/db/repos/tuningsRepo";
import { getCombos } from "@/lib/db/repos/combosRepo";

export const dynamic = "force-dynamic";

async function requireUser() {
  const user = await getCurrentDashboardUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return user;
}

/**
 * GET /api/tunings?targetType=model|combo&targetId=...
 *   -> { tunings: [...] }
 * GET /api/tunings?action=targets
 *   -> { models: [...], combos: [...] } — for UI target selector
 */
export async function GET(request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "targets") {
    // Provide selectable targets: combos (always) + provider/model combos from published models
    const combos = await getCombos();
    const targets = {
      combos: combos.map((c) => ({ id: c.id, name: c.name, kind: c.kind, modelCount: (c.models || []).length })),
    };
    return NextResponse.json(targets);
  }

  const targetType = url.searchParams.get("targetType") || undefined;
  const targetId = url.searchParams.get("targetId") || undefined;
  const tunings = await listTunings({ targetType, targetId });
  return NextResponse.json({ tunings });
}

/**
 * POST /api/tunings  body: { targetType, targetId, enabled?, name?, tone?, behavior?, systemPrompt?, presetId? }
 *   -> { tuning }
 */
export async function POST(request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const { targetType, targetId } = body || {};
  if (!targetType || !targetId) {
    return NextResponse.json({ error: "targetType and targetId are required" }, { status: 400 });
  }

  try {
    const tuning = await upsertTuning({
      targetType,
      targetId,
      enabled: body.enabled !== false,
      name: body.name,
      tone: body.tone,
      behavior: body.behavior,
      systemPrompt: body.systemPrompt,
      presetId: body.presetId,
    });
    return NextResponse.json({ tuning });
  } catch (e) {
    return NextResponse.json({ error: e.message || "upsert_failed" }, { status: 400 });
  }
}

/**
 * DELETE /api/tunings?targetType=...&targetId=...
 */
export async function DELETE(request) {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  const url = new URL(request.url);
  const targetType = url.searchParams.get("targetType");
  const targetId = url.searchParams.get("targetId");
  if (!targetType || !targetId) {
    return NextResponse.json({ error: "targetType and targetId are required" }, { status: 400 });
  }
  const ok = await deleteTuning(targetType, targetId);
  return NextResponse.json({ success: ok });
}