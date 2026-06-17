export const version = 10;
export const name = "model-tunings";

/**
 * Per-target AI tuning (persona) overrides.
 *
 * target_type: 'model'  -> target_id = canonical model id (e.g. "openai/gpt-4o-mini")
 * target_type: 'combo'  -> target_id = combo id (uuid) OR combo name
 *
 * When a chat request resolves to a tuned target, the row's persona fields are
 * injected as the assistant's identity / system prompt before forwarding to the
 * upstream provider. Falls back to global settings when no row exists.
 */
export async function up(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS model_tunings (
      target_type TEXT NOT NULL CHECK (target_type IN ('model','combo')),
      target_id   TEXT NOT NULL,
      enabled     INTEGER NOT NULL DEFAULT 1,
      name        TEXT,
      tone        TEXT,
      behavior    TEXT,
      system_prompt TEXT,
      preset_id   TEXT,
      created_at  TEXT NOT NULL DEFAULT (now()::TEXT),
      updated_at  TEXT NOT NULL DEFAULT (now()::TEXT),
      PRIMARY KEY (target_type, target_id)
    );
    CREATE INDEX IF NOT EXISTS idx_model_tunings_target ON model_tunings(target_type, target_id);
  `);
}

export default { version, name, up };