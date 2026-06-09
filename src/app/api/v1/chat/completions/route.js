import { handleChat } from "@/sse/handlers/chat.js";
import { initTranslators } from "open-sse/translator/index.js";

let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await initTranslators();
    initialized = true;
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*"
    }
  });
}

export async function POST(request) {  
  await ensureInitialized();
  const res = await handleChat(request);
  if (res instanceof Response) {
    return res;
  }
  if (res && typeof res === "object" && res.response instanceof Response) {
    return res.response;
  }
  return new Response(JSON.stringify(res), {
    headers: { "Content-Type": "application/json" }
  });
}
