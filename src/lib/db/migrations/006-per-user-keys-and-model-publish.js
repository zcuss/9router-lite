// Migration 006: Per-user API keys + model publishing + topup_payments table.
//
// Adds:
//   apiKeys.user_id         — owner of the key (FK users.id; null = legacy/unowned)
//   model_publish           — admin/dev-curated list of models visible to end users
//   topup_payments          — record of user topup transactions (Midtrans later)
//   topup_requests          — extends with payment_method, payment_proof columns
//
// Existing apiKey rows are backfilled to the seeded admin user (or first dev) so
// nothing is orphaned. New INSERTs require user_id.

export const version = 6;
export const id = "006-per-user-keys-and-model-publish";

export async function up(db) {
  // 1) user_id column on apiKeys
  let hasUserId = false;
  try {
    const colRow = await db.get(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'apiKeys' AND column_name = 'user_id' LIMIT 1`
    );
    hasUserId = !!colRow;
  } catch { hasUserId = false; }
  if (!hasUserId) {
    await db.run(`ALTER TABLE "apiKeys" ADD COLUMN user_id TEXT`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_apiKeys_user ON "apiKeys"(user_id)`);
  }

  // Backfill: assign all existing keys to the seeded admin or first dev
  const admin = await db.get(`SELECT id FROM users WHERE role IN ('dev','admin') ORDER BY (role = 'dev') DESC, created_at ASC LIMIT 1`);
  if (admin?.id) {
    await db.run(`UPDATE "apiKeys" SET user_id = ? WHERE user_id IS NULL`, [admin.id]);
  }

  // 2) model_publish table
  await db.run(`
    CREATE TABLE IF NOT EXISTS model_publish (
      model_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      label TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (now()::TEXT),
      updated_at TEXT NOT NULL DEFAULT (now()::TEXT)
    )
  `);

  // 3) topup_payments (per-user topup history, separate from approval queue)
  await db.run(`
    CREATE TABLE IF NOT EXISTS topup_payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      promocode TEXT,
      discount_cents INTEGER NOT NULL DEFAULT 0,
      final_cents INTEGER NOT NULL,
      method TEXT NOT NULL DEFAULT 'manual',
      status TEXT NOT NULL DEFAULT 'pending',
      external_ref TEXT,
      payload TEXT,
      created_at TEXT NOT NULL DEFAULT (now()::TEXT),
      paid_at TEXT,
      applied_at TEXT
    )
  `);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_topup_payments_user ON topup_payments(user_id, created_at DESC)`);

  // 4) extend topup_requests with user_id, promocode, payment_method (idempotent)
  const addCol = async (col, type) => {
    try {
      const colRow = await db.get(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'topup_requests' AND column_name = ? LIMIT 1`,
        [col]
      );
      if (!colRow) await db.run(`ALTER TABLE topup_requests ADD COLUMN ${col} ${type}`);
    } catch {}
  };
  await addCol("user_id", "TEXT");
  await addCol("promocode", "TEXT");
  await addCol("payment_method", "TEXT DEFAULT 'manual'");
}

export async function down(db) {
  // No destructive down — keep data intact. Just drop new tables.
  await db.run(`DROP TABLE IF EXISTS model_publish`);
  await db.run(`DROP TABLE IF EXISTS topup_payments`);
}

export const name = "per_user_keys_and_model_publish";
export default { version, name, up, down };
