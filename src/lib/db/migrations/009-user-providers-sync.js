export const version = 9;
export const name = "user-providers-sync";

export async function up(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_providers (
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_subject TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, provider, provider_subject)
    );
    CREATE INDEX IF NOT EXISTS idx_user_providers_lookup ON user_providers(provider, provider_subject);
  `);
  await db.exec(`
    INSERT INTO user_providers (user_id, provider, provider_subject, created_at)
    SELECT id, provider, provider_subject, created_at::TIMESTAMPTZ
    FROM users
    WHERE provider IS NOT NULL AND provider_subject IS NOT NULL
    ON CONFLICT DO NOTHING;
  `);
}

export default { version, name, up };