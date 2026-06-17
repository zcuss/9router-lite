// Migration 004: Wallet & Voucher system for token-selling
// - Add balance_cents, voucher_cents to users (stored as integer cents to avoid float drift)
// - Create vouchers table (gift codes)
// - Create wallet_transactions table (audit trail for all balance movements)

export default {
  version: 4,
  name: "wallet_voucher_system",
  async up(db) {
    // 1. Add balance columns to users
    const userCols = [
      "balance_cents INTEGER NOT NULL DEFAULT 0",
      "voucher_cents INTEGER NOT NULL DEFAULT 0",
      "lifetime_spent_cents INTEGER NOT NULL DEFAULT 0",
      "lifetime_topup_cents INTEGER NOT NULL DEFAULT 0",
    ];
    for (const col of userCols) {
      try {
        await db.exec(`ALTER TABLE users ADD COLUMN ${col}`);
      } catch (e) {
        if (!e.message.includes("already exists") && !e.message.includes("duplicate column")) {
          console.warn(`[DB] migration 4: users ADD COLUMN failed: ${e.message}`);
        }
      }
    }

    // 2. Vouchers: gift codes that can be redeemed for balance
    await db.exec(`
      CREATE TABLE IF NOT EXISTS vouchers (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        amount_cents INTEGER NOT NULL,
        max_redemptions INTEGER NOT NULL DEFAULT 1,
        redeemed_count INTEGER NOT NULL DEFAULT 0,
        expires_at TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        note TEXT
      )
    `);
    await db.exec("CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code)");

    // 3. Wallet transactions: audit trail for every credit/debit/redeem
    await db.exec(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        source TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        balance_after_cents INTEGER NOT NULL,
        voucher_after_cents INTEGER NOT NULL,
        related_id TEXT,
        note TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL
      )
    `);
    await db.exec("CREATE INDEX IF NOT EXISTS idx_wtx_user ON wallet_transactions(user_id, created_at DESC)");
    await db.exec("CREATE INDEX IF NOT EXISTS idx_wtx_kind ON wallet_transactions(kind)");

    // 4. Topup requests: user asks admin for credit, admin approves/declines
    await db.exec(`
      CREATE TABLE IF NOT EXISTS topup_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        method TEXT,
        reference TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        requested_at TEXT NOT NULL,
        resolved_at TEXT,
        resolved_by TEXT,
        resolution_note TEXT
      )
    `);
    await db.exec("CREATE INDEX IF NOT EXISTS idx_topup_user ON topup_requests(user_id, requested_at DESC)");
    await db.exec("CREATE INDEX IF NOT EXISTS idx_topup_status ON topup_requests(status)");
  }
};
