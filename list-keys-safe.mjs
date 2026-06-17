import { createPostgresAdapter } from './src/lib/db/adapters/postgresAdapter.js';

async function main() {
  const adapter = await createPostgresAdapter();
  try {
    const keys = await adapter.all(`SELECT * FROM "apiKeys" LIMIT 10`);
    // Print keys securely: mask the key value to protect credentials
    const safeKeys = keys.map(k => ({
      id: k.id,
      name: k.name,
      keyMasked: k.key ? k.key.substring(0, 7) + "..." : null,
      userId: k.userId || k.user_id
    }));
    console.log("API KEYS:", safeKeys);
  } catch (err) {
    console.error("DB fail:", err);
  }
  process.exit(0);
}

main();
