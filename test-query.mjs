import { createPostgresAdapter } from './src/lib/db/adapters/postgresAdapter.js';

async function main() {
  const adapter = await createPostgresAdapter();
  try {
    const keys = await adapter.all(`SELECT key FROM "apiKeys" WHERE name = 'hermes' LIMIT 1`);
    if (keys.length === 0) {
      console.log("No key found");
      return;
    }
    const key = keys[0].key;
    console.log("Querying with key...");
    
    // Exact query used by validateApiKey:
    const row = await adapter.get(`SELECT isActive FROM apiKeys WHERE key = ?`, [key]);
    console.log("Result from apiKeys (no quotes):", row);
    
    // Query with quotes:
    const rowQuotes = await adapter.get(`SELECT isActive FROM "apiKeys" WHERE key = ?`, [key]);
    console.log("Result from \"apiKeys\" (with quotes):", rowQuotes);
  } catch (err) {
    console.error("DB fail:", err);
  }
  process.exit(0);
}

main();
