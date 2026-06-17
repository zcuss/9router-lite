import { createPostgresAdapter } from './src/lib/db/adapters/postgresAdapter.js';

async function main() {
  const adapter = await createPostgresAdapter();
  try {
    const list = await adapter.all(`SELECT * FROM user_providers`);
    console.log("USER PROVIDERS:", list);
  } catch (err) {
    console.error("DB fail:", err);
  }
  process.exit(0);
}

main();