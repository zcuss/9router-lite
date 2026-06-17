import { getTuning as getTuningRaw } from "@/lib/db/repos/tuningsRepo";
import { getSettings } from "@/lib/localDb";

/**
 * Resolve AI tuning for a target.
 * targetType: 'model' | 'combo'
 * targetId:   canonical model id ("openai/gpt-4o-mini") or combo name / combo uuid
 *
 * Returns null when no tuning exists OR when the tuning row is disabled.
 * Otherwise returns: { name, tone, behavior, systemPrompt, source: 'db'|'default' }
 */
export async function resolveTuning(targetType, targetId) {
  if (!targetType || !targetId) return null;
  try {
    const row = await getTuningRaw(targetType, targetId);
    if (row && row.enabled !== false) {
      if (row.name || row.tone || row.behavior || row.systemPrompt) {
        return {
          name: row.name,
          tone: row.tone,
          behavior: row.behavior,
          systemPrompt: row.systemPrompt,
          source: "db",
        };
      }
    }
  } catch {
    // table may not exist yet on first boot; fall back to globals
  }
  // Fallback to global settings (single-user default persona)
  try {
    const settings = await getSettings();
    if (settings?.aiTuningEnabled) {
      return {
        name: settings.aiPersonaName,
        tone: settings.aiPersonaTone,
        behavior: settings.aiPersonaBehavior,
        systemPrompt: settings.aiSystemPrompt,
        source: "default",
      };
    }
  } catch {}
  return null;
}

/**
 * Apply a resolved tuning to an OpenAI-style chat body.
 * - Prepends a system message with persona identity
 * - Augments the system prompt with persona behavior description
 * - If the user already has a system message, the tuning is MERGED on top
 */
export function applyTuningToBody(body, tuning) {
  if (!tuning || !body || typeof body !== "object") return body;

  const personaLines = [];
  if (tuning.name) personaLines.push(`Your name is ${tuning.name}.`);
  if (tuning.tone) personaLines.push(`Tone: ${tuning.tone}.`);
  if (tuning.behavior) personaLines.push(`Behavior: ${tuning.behavior}`);
  const personaBlurb = personaLines.join(" ");

  const explicitSystem = typeof tuning.systemPrompt === "string" ? tuning.systemPrompt.trim() : "";

  const composed = [personaBlurb, explicitSystem].filter(Boolean).join("\n\n");

  if (!composed) return body;

  const messages = Array.isArray(body.messages) ? body.messages : null;

  if (messages && messages.length > 0) {
    // Merge: replace the first system message OR prepend a new one
    const firstSystemIdx = messages.findIndex((m) => m?.role === "system");
    if (firstSystemIdx >= 0) {
      const existing = messages[firstSystemIdx]?.content || "";
      const merged = [composed, existing].filter(Boolean).join("\n\n");
      const next = messages.slice();
      next[firstSystemIdx] = { ...next[firstSystemIdx], role: "system", content: merged };
      return { ...body, messages: next };
    }
    return { ...body, messages: [{ role: "system", content: composed }, ...messages] };
  }

  // Responses API / input[] shape — prepend a system message
  if (Array.isArray(body.input)) {
    return { ...body, input: [{ role: "system", content: composed }, ...body.input] };
  }

  return body;
}