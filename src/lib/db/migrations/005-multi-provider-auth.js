// Migration 005: Multi-provider auth (Google / GitHub / email magic link) alongside password.
// Adds:
//   users.email            — canonical unique identifier
//   users.email_verified   — boolean
//   users.provider         — 'password' | 'env' | 'google' | 'github' | 'magic_link'
//   users.provider_subject — sub claim from OAuth (or local username for password users)
//   users.avatar_url       — profile picture
//   users.display_name     — preferred name
//   oauth_states           — CSRF state for OAuth start/callback
//   magic_links            — single-use email tokens
//
// Username column kept for back-compat (env admin still uses 'admin').

const ADD_COLUMNS = [
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'password'",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_subject TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT",
];

const CREATE_TABLES = [
  `CREATE TABLE IF NOT EXISTS oauth_states (
    state TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    code_verifier TEXT,
    redirect TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS magic_links (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
];

const INDEXES = [
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_subject ON users(provider, provider_subject) WHERE provider_subject IS NOT NULL",
  "CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at)",
  "CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email)",
  "CREATE INDEX IF NOT EXISTS idx_magic_links_expires ON magic_links(expires_at)",
];

const BACKFILL = [
  "UPDATE users SET email = username || '@local.invalid' WHERE email IS NULL AND username IS NOT NULL",
];

export const version = 5;
export const name = "multi-provider-auth";

export async function up(db) {
  for (const sql of ADD_COLUMNS) {
    try { await db.exec(sql); } catch (e) {
      console.warn(`[DB] migration 5: column add failed (${e.message}); continuing`);
    }
  }
  for (const sql of CREATE_TABLES) {
    try { await db.exec(sql); } catch (e) {
      console.warn(`[DB] migration 5: table create failed: ${e.message}`);
    }
  }
  for (const sql of INDEXES) {
    try { await db.exec(sql); } catch (e) {
      console.warn(`[DB] migration 5: index create failed: ${e.message}`);
    }
  }
  for (const sql of BACKFILL) {
    try { await db.exec(sql); } catch (e) {
      console.warn(`[DB] migration 5: backfill failed: ${e.message}`);
    }
  }
}

export default { version, name, up };
