import { createPostgresAdapter } from './src/lib/db/adapters/postgresAdapter.js';

async function main() {
  const adapter = await createPostgresAdapter();
  try {
    const keys = await adapter.all(`SELECT id, name, "key", "userId" FROM "apiKeys" LIMIT 10`);
    console.log("API KEYS:", JSON.stringify(keys, null, 2));
  } catch (err) {
    console.error("DB fail:", err);
  }
  process.exit(0);
}

main();
