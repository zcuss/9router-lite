import { TABLES, buildCreateTableSql } from "../schema.js";

export default {
  version: 2,
  name: "prd_v2_schema_update",
  async up(db) {
    // 1. Create users table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        status TEXT NOT NULL DEFAULT 'pending',
        approved_by TEXT,
        approved_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // 2. Add new columns to providerConnections (we keep existing and append missing ones)
    const pcCols = [
      "api_key TEXT DEFAULT ''",
      "base_url TEXT",
      "status TEXT DEFAULT 'pending'",
      "allowed_roles TEXT DEFAULT '[\"admin\",\"dev\",\"premium+\"]'",
      "submitted_by TEXT",
      "approved_by TEXT",
      "approved_at TEXT",
      "rejection_reason TEXT",
      "pending_revision TEXT"
    ];

    for (const col of pcCols) {
      try {
        await db.exec(`ALTER TABLE providerConnections ADD COLUMN ${col}`);
      } catch (e) {
        // Ignore if column already exists
        if (!e.message.includes("already exists") && !e.message.includes("duplicate column")) {
          console.warn(`[DB] migration 2: providerConnections ADD COLUMN failed: ${e.message}`);
        }
      }
    }

    // 3. Create provider_locks table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS provider_locks (
        id TEXT PRIMARY KEY,
        connection_id TEXT NOT NULL,
        model TEXT NOT NULL,
        lock_type TEXT NOT NULL,
        reason TEXT NOT NULL,
        locked_until TEXT,
        created_at TEXT NOT NULL,
        resolved_at TEXT,
        resolved_by TEXT
      )
    `);

    await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_locks_conn_model ON provider_locks(connection_id, model)");

    // 4. Create routing_combos table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS routing_combos (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        user_id TEXT,
        is_global INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    
    await db.exec("CREATE INDEX IF NOT EXISTS idx_combo_user ON routing_combos(user_id)");

    // 5. Create combo_targets table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS combo_targets (
        id TEXT PRIMARY KEY,
        combo_id TEXT NOT NULL,
        connection_id TEXT NOT NULL,
        model TEXT NOT NULL,
        step_order INTEGER NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_combo_targets_order ON combo_targets(combo_id, step_order)");

    // 6. Create usage_logs table (replaces/augments usageHistory)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS usage_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        combo_id TEXT,
        combo_step INTEGER DEFAULT 0,
        connection_id TEXT,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        prompt_tokens INTEGER DEFAULT 0,
        completion_tokens INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        cost_in REAL DEFAULT 0,
        cost_out REAL DEFAULT 0,
        total_cost REAL DEFAULT 0,
        latency_ms INTEGER NOT NULL,
        status_code INTEGER NOT NULL,
        error_message TEXT,
        created_at TEXT NOT NULL
      )
    `);

    await db.exec("CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_logs(user_id)");
    await db.exec("CREATE INDEX IF NOT EXISTS idx_usage_combo ON usage_logs(combo_id)");
    await db.exec("CREATE INDEX IF NOT EXISTS idx_usage_model ON usage_logs(model)");
    await db.exec("CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_logs(created_at)");
    
    await db.exec("CREATE INDEX IF NOT EXISTS idx_provider_status ON providerConnections(status)");
  },
};