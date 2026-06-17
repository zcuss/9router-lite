import { createPostgresAdapter } from './src/lib/db/adapters/postgresAdapter.js';

async function main() {
  const adapter = await createPostgresAdapter();
  try {
    const combos = await adapter.all(`SELECT id, name, models FROM combos ORDER BY createdAt ASC`);
    console.log("ALL COMBOS:");
    combos.forEach(c => {
      console.log(`- ${c.name} (${c.id.substring(0, 8)}...) models=${JSON.stringify(c.models).substring(0, 200)}`);
    });
    console.log("\nPROVIDERS:");
    const conns = await adapter.all(`SELECT id, name, provider, baseUrl FROM providerConnections ORDER BY name ASC`);
    conns.forEach(c => {
      console.log(`- ${c.name} [${c.provider}] base=${c.baseUrl ? c.baseUrl.substring(0, 60) : 'n/a'}`);
    });
  } catch (err) {
    console.error("DB fail:", err);
  }
  process.exit(0);
}

main();
