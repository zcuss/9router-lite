import { createPostgresAdapter } from './src/lib/db/adapters/postgresAdapter.js';

async function main() {
  const adapter = await createPostgresAdapter();
  try {
    const keys = await adapter.all(`SELECT id, name, key FROM "apiKeys" WHERE name = 'hermes' LIMIT 1`);
    if (keys.length > 0) {
      // Output the full key, but mark as sensitive
      console.log("HERMES KEY ID:", keys[0].id);
      console.log("HERMES KEY VALUE:", keys[0].key);
    } else {
      console.log("No 'hermes' key found");
    }
  } catch (err) {
    console.error("DB fail:", err);
  }
  process.exit(0);
}

main();
