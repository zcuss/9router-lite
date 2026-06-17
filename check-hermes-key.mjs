import { createPostgresAdapter } from './src/lib/db/adapters/postgresAdapter.js';

async function main() {
  const adapter = await createPostgresAdapter();
  try {
    const rows = await adapter.all(`SELECT id, name, key, isActive FROM "apiKeys" WHERE name = 'hermes'`);
    if (rows.length === 0) {
      console.log("No 'hermes' key found");
      return;
    }
    // Don't print the key, just its hash/length
    const r = rows[0];
    console.log("Key ID:", r.id);
    console.log("Key Name:", r.name);
    console.log("Key Length:", r.key ? r.key.length : 0);
    console.log("Key Prefix:", r.key ? r.key.substring(0, 10) : null);
    console.log("isActive value:", r.isActive, "type:", typeof r.isActive);
  } catch (err) {
    console.error("DB fail:", err);
  }
  process.exit(0);
}

main();
