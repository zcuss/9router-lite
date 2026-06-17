// Migration 011: Voucher per-user redemption limit
// - Add per_user_limit column to vouchers (default 1, set 0 for unlimited)
// - Create voucher_redemptions table to track who redeemed which voucher
// - This enables 1 voucher valid for 10 different users, with each user limited to 1 redemption

export default {
  version: 11,
  name: "voucher_per_user_limit",
  async up(db) {
    // 1. Add per_user_limit column to vouchers
    try {
      await db.exec(`ALTER TABLE vouchers ADD COLUMN per_user_limit INTEGER NOT NULL DEFAULT 1`);
    } catch (e) {
      if (!e.message.includes("already exists") && !e.message.includes("duplicate column")) {
        console.warn(`[DB] migration 11: per_user_limit ADD COLUMN failed: ${e.message}`);
      }
    }

    // 2. Create voucher_redemptions table to track per-user redemptions
    await db.exec(`
      CREATE TABLE IF NOT EXISTS voucher_redemptions (
        id TEXT PRIMARY KEY,
        voucher_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        redeemed_at TEXT NOT NULL,
        UNIQUE(voucher_id, user_id)
      )
    `);
    await db.exec("CREATE INDEX IF NOT EXISTS idx_vr_user ON voucher_redemptions(user_id)");
    await db.exec("CREATE INDEX IF NOT EXISTS idx_vr_voucher ON voucher_redemptions(voucher_id)");

    // 3. Backfill from existing redemptions: count current redeemed_count from wallet_transactions
    // Skip - existing transactions are already in audit log
  },
};
