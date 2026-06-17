import { createPostgresAdapter } from './src/lib/db/adapters/postgresAdapter.js';

async function main() {
  const adapter = await createPostgresAdapter();
  try {
    const keys = await adapter.all(`SELECT key FROM "apiKeys" WHERE name = 'hermes' LIMIT 1`);
    if (keys.length === 0) {
      console.error("No API key named 'hermes' found");
      process.exit(1);
    }
    const apiKey = keys[0].key;

    console.log("Calling API endpoint http://localhost:20129/v1/chat/completions with model 'hermes'...");
    const response = await fetch("http://localhost:20129/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "hermes",
        messages: [
          { role: "user", content: "Halo, ini tes koneksi model Hermes. Katakan: 'Koneksi Hermes Berhasil!'" }
        ],
        stream: false
      })
    });

    const status = response.status;
    console.log("Response status:", status);
    
    const text = await response.text();
    console.log("Response text:", text);
  } catch (err) {
    console.error("Test execution failed:", err);
  }
  process.exit(0);
}

main();
