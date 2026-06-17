import { createPostgresAdapter } from './src/lib/db/adapters/postgresAdapter.js';

async function main() {
  const adapter = await createPostgresAdapter();
  try {
    // Check for hermes in alias, models, or provider connections
    const aliases = await adapter.all(`SELECT * FROM model_aliases LIMIT 20`);
    console.log("MODEL ALIASES:", JSON.stringify(aliases, null, 2));

    const conns = await adapter.all(`SELECT id, name, provider, baseUrl, isActive FROM provider_connections LIMIT 20`);
    console.log("PROVIDER CONNS:", JSON.stringify(conns, null, 2));

    const customModels = await adapter.all(`SELECT * FROM custom_models LIMIT 20`);
    console.log("CUSTOM MODELS:", JSON.stringify(customModels, null, 2));
  } catch (err) {
    console.error("DB fail:", err);
    // Try to list all tables
    try {
      const tables = await adapter.all(`SHOW TABLES`);
      console.log("TABLES:", JSON.stringify(tables, null, 2));
    } catch (e2) {
      console.error("SHOW TABLES fail:", e2.message);
    }
  }
  process.exit(0);
}

main();
