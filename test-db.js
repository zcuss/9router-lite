// load .env
require('dotenv').config({ path: '/root/9router-lite/.env' });
const { createPostgresAdapter } = require('/root/9router-lite/src/lib/db/adapters/postgresAdapter.js');

async function main() {
  console.log("Connecting...");
  const adapter = await createPostgresAdapter();
  console.log("Connected!");
  
  try {
    const cols = await adapter.all(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'topup_payments'
    `);
    console.log("Columns:", cols);
  } catch (err) {
    console.error("Error fetching columns:", err);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Main crash:", err);
  process.exit(1);
});
