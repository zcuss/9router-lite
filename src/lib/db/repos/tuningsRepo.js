import { getAdapter } from "../driver.js";

function rowToTuning(row) {
  if (!row) return null;
  return {
    targetType: row.target_type,
    targetId: row.target_id,
    enabled: row.enabled === 1 || row.enabled === true,
    name: row.name,
    tone: row.tone,
    behavior: row.behavior,
    systemPrompt: row.system_prompt,
    presetId: row.preset_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * List all tunings, optionally filtered.
 */
export async function listTunings({ targetType, targetId, limit = 200 } = {}) {
  const db = await getAdapter();
  const where = [];
  const params = [];
  if (targetType) { where.push("target_type = ?"); params.push(targetType); }
  if (targetId)   { where.push("target_id = ?");   params.push(targetId); }
  const sql = `SELECT * FROM model_tunings${where.length ? " WHERE " + where.join(" AND ") : ""} ORDER BY updated_at DESC LIMIT ?`;
  params.push(limit);
  const rows = await db.all(sql, params);
  return rows.map(rowToTuning);
}

/**
 * Resolve a tuning for a given target.
 * Accepts either ('model'|'combo', id) or ('combo', name) — combos are resolved by name when id not found.
 */
export async function getTuning(targetType, targetId) {
  if (!targetType || !targetId) return null;
  const db = await getAdapter();
  let row = await db.get(
    `SELECT * FROM model_tunings WHERE target_type = ? AND target_id = ?`,
    [targetType, targetId]
  );
  if (!row && targetType === "combo") {
    // Fallback: try by name lookup in combos table
    const comboRow = await db.get(`SELECT id FROM combos WHERE name = ?`, [targetId]);
    if (comboRow) {
      row = await db.get(
        `SELECT * FROM model_tunings WHERE target_type = ? AND target_id = ?`,
        ["combo", comboRow.id]
      );
    }
  }
  return rowToTuning(row);
}

/**
 * Upsert a tuning row. (target_type, target_id) is the primary key.
 */
export async function upsertTuning({ targetType, targetId, enabled = true, name, tone, behavior, systemPrompt, presetId }) {
  if (!targetType || !targetId) throw new Error("targetType and targetId are required");
  if (!["model", "combo"].includes(targetType)) throw new Error("targetType must be 'model' or 'combo'");
  const db = await getAdapter();
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO model_tunings(target_type, target_id, enabled, name, tone, behavior, system_prompt, preset_id, created_at, updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(target_type, target_id) DO UPDATE SET
       enabled = excluded.enabled,
       name = excluded.name,
       tone = excluded.tone,
       behavior = excluded.behavior,
       system_prompt = excluded.system_prompt,
       preset_id = excluded.preset_id,
       updated_at = excluded.updated_at`,
    [targetType, targetId, enabled ? 1 : 0, name || null, tone || null, behavior || null, systemPrompt || null, presetId || null, now, now]
  );
  return rowToTuning(await db.get(`SELECT * FROM model_tunings WHERE target_type = ? AND target_id = ?`, [targetType, targetId]));
}

export async function deleteTuning(targetType, targetId) {
  const db = await getAdapter();
  const res = await db.run(`DELETE FROM model_tunings WHERE target_type = ? AND target_id = ?`, [targetType, targetId]);
  return (res?.changes ?? 0) > 0;
}