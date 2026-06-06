import { AsyncLocalStorage } from "node:async_hooks";

const txStorage = new AsyncLocalStorage();

const PRIMARY_KEYS = {
  _meta: ["key"],
  settings: ["id"],
  providerConnections: ["id"],
  providerNodes: ["id"],
  proxyPools: ["id"],
  apiKeys: ["id"],
  combos: ["id"],
  kv: ["scope", "key"],
  usageHistory: ["id"],
  usageDaily: ["dateKey"],
  requestDetails: ["id"],
};

const CASE_SENSITIVE_COLUMNS = [
  "authType", "isActive", "createdAt", "updatedAt", "testStatus",
  "machineId", "dateKey", "connectionId", "apiKey", "promptTokens",
  "completionTokens",
];

function quoteIdent(name) {
  return `"${String(name).replaceAll('"', '""')}"`;
}

function quoteKnownColumns(sql) {
  let out = sql;
  for (const column of CASE_SENSITIVE_COLUMNS) {
    out = out.replace(new RegExp(`(?<!")\\b${column}\\b(?!")`, "g"), quoteIdent(column));
  }
  return out;
}

function convertPlaceholders(sql, params = []) {
  let idx = 0;
  let inSingle = false;
  let inDouble = false;
  let out = "";
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (ch === "'" && !inDouble) {
      out += ch;
      if (inSingle && next === "'") { out += next; i++; }
      else inSingle = !inSingle;
      continue;
    }
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    if (ch === "?" && !inSingle && !inDouble) out += `$${++idx}`;
    else out += ch;
  }
  return { sql: out, params };
}

function translateInsertOrReplace(sql) {
  const m = sql.match(/^INSERT\s+OR\s+REPLACE\s+INTO\s+([A-Za-z_][\w]*)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (!m) return sql;
  const [, table, rawCols, rawValues] = m;
  const cols = rawCols.split(",").map((c) => c.trim());
  const pk = PRIMARY_KEYS[table] || [cols[0]];
  const updates = cols.filter((c) => !pk.includes(c)).map((c) => `${quoteIdent(c)} = excluded.${quoteIdent(c)}`);
  const conflict = pk.map(quoteIdent).join(", ");
  const updateClause = updates.length ? `DO UPDATE SET ${updates.join(", ")}` : "DO NOTHING";
  return `INSERT INTO ${quoteIdent(table)} (${cols.map(quoteIdent).join(", ")}) VALUES (${rawValues}) ON CONFLICT (${conflict}) ${updateClause}`;
}

function splitTopLevelComma(input) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(input.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(input.slice(start).trim());
  return parts.filter(Boolean);
}

function translateCreateTable(sql) {
  const m = sql.match(/^CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([A-Za-z_][\w]*)\s*\((.*)\)$/is);
  if (!m) return sql;

  const [, table, body] = m;
  const columns = splitTopLevelComma(body).map((part) => {
    const pk = part.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)$/i);
    if (pk) {
      const cols = pk[1].split(",").map((c) => quoteIdent(c.trim().replaceAll('"', ""))).join(", ");
      return `PRIMARY KEY (${cols})`;
    }

    const col = part.match(/^([A-Za-z_][\w]*)(\s+.*)$/s);
    if (!col) return part;
    return `${quoteIdent(col[1])}${col[2]}`;
  });

  return `CREATE TABLE IF NOT EXISTS ${quoteIdent(table)} (${columns.join(", ")})`;
}

function translateSql(input) {
  let sql = String(input).trim();
  if (!sql) return sql;
  if (/^PRAGMA\b/i.test(sql)) return "";

  sql = translateCreateTable(translateInsertOrReplace(sql));

  sql = sql
    .replace(/\bINTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT\b/gi, "SERIAL PRIMARY KEY")
    .replace(/\bINTEGER\s+PRIMARY\s+KEY\s*CHECK\s*\(([^)]*)\)/gi, "INT PRIMARY KEY CHECK ($1)")
    .replace(/\bINTEGER\s+PRIMARY\s+KEY\b/gi, "INT PRIMARY KEY")
    .replace(/\bINTEGER\b/gi, "INT")
    .replace(/\bREAL\b/gi, "DOUBLE PRECISION")
    .replace(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+([A-Za-z_][\w]*)\s+ON\s+([A-Za-z_][\w]*)\(([^)]+)\)/gi,
      (_m, idx, table, cols) => `CREATE INDEX IF NOT EXISTS ${quoteIdent(idx)} ON ${quoteIdent(table)}(${quoteKnownColumns(cols)})`)
    .replace(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([A-Za-z_][\w]*)\s*\(/gi,
      (_m, table) => `CREATE TABLE IF NOT EXISTS ${quoteIdent(table)} (`)
    .replace(/INSERT\s+INTO\s+([A-Za-z_][\w]*)\s*\(/gi,
      (_m, table) => `INSERT INTO ${quoteIdent(table)} (`)
    .replace(/UPDATE\s+([A-Za-z_][\w]*)\s+SET\s+/gi,
      (_m, table) => `UPDATE ${quoteIdent(table)} SET `)
    .replace(/DELETE\s+FROM\s+([A-Za-z_][\w]*)/gi,
      (_m, table) => `DELETE FROM ${quoteIdent(table)}`)
    .replace(/FROM\s+([A-Za-z_][\w]*)/gi,
      (_m, table) => `FROM ${quoteIdent(table)}`)
    .replace(/JOIN\s+([A-Za-z_][\w]*)/gi,
      (_m, table) => `JOIN ${quoteIdent(table)}`)
    .replace(/excluded\.([A-Za-z_][\w]*)/g,
      (_m, col) => `excluded.${quoteIdent(col)}`)
    .replace(/ON\s+CONFLICT\(([^)]+)\)/gi,
      (_m, cols) => `ON CONFLICT (${cols.split(",").map((c) => quoteIdent(c.trim().replaceAll('"', ''))).join(", ")})`)
    .replace(/INSERT\s+INTO\s+"([^"]+)"\(([^)]+)\)/gi,
      (_m, table, cols) => `INSERT INTO ${quoteIdent(table)} (${cols.split(",").map((c) => quoteIdent(c.trim().replaceAll('"', ''))).join(", ")})`);

  return quoteKnownColumns(sql);
}

function splitStatements(sql) {
  return String(sql).split(";").map((s) => s.trim()).filter(Boolean);
}

export async function createPostgresAdapter() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("[DB] DATABASE_URL is required for CockroachDB/Postgres mode");

  let Pool;
  try {
    ({ Pool } = await import("pg"));
  } catch {
    throw new Error("[DB] CockroachDB/Postgres mode requires dependency 'pg'. Run npm install after pulling this change.");
  }

  const pool = new Pool({
    connectionString: url,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Increased from 2000 to 10000 for remote DB stability
  });

  async function query(sql, params = []) {
    const translated = translateSql(sql);
    if (!translated) return { rows: [], rowCount: 0 };
    const q = convertPlaceholders(translated, params);
    const client = txStorage.getStore();
    return await (client || pool).query(q.sql, q.params);
  }

  const adapter = {
    driver: "postgres",
    dialect: "postgres",
    async run(sql, params = []) {
      const res = await query(sql, params);
      return { changes: res.rowCount ?? 0, lastInsertRowid: null };
    },
    async get(sql, params = []) {
      const res = await query(sql, params);
      return res.rows[0];
    },
    async all(sql, params = []) {
      const res = await query(sql, params);
      return res.rows;
    },
    async exec(sql) {
      for (const stmt of splitStatements(sql)) {
        const translated = translateSql(stmt);
        if (!translated) continue;
        const client = txStorage.getStore();
        await (client || pool).query(translated);
      }
    },
    async listColumns(tableName) {
      const res = await query(
        `SELECT column_name AS name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = ?`,
        [tableName]
      );
      return res.rows;
    },
    transaction() {
      throw new Error("[DB] Synchronous transactions are not supported by Postgres adapter; use transactionAsync");
    },
    async transactionAsync(fn) {
      const existing = txStorage.getStore();
      if (existing) return await fn();

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await txStorage.run(client, async () => await fn());
        await client.query("COMMIT");
        return result;
      } catch (err) {
        try { await client.query("ROLLBACK"); } catch {}
        throw err;
      } finally {
        client.release();
      }
    },
    async checkpoint() {},
    async close() { await pool.end(); },
    raw: pool,
  };

  return adapter;
}
