import { handleChat } from "@/sse/handlers/chat.js";
import { initTranslators } from "open-sse/translator/index.js";
import { extractApiKey } from "@/sse/services/auth.js";

let initialized = false;

// Simple in-memory token bucket rate limiter
const rateLimitCache = new Map();

function checkRateLimit(key) {
  const limit = process.env.RATE_LIMIT_PER_MINUTE ? parseInt(process.env.RATE_LIMIT_PER_MINUTE, 10) : 60;
  const now = Date.now();
  const windowMs = 60 * 1000;

  let record = rateLimitCache.get(key);
  if (!record) {
    record = { tokens: limit, lastRefill: now };
    rateLimitCache.set(key, record);
  }

  // Refill tokens based on time elapsed
  const elapsed = now - record.lastRefill;
  const refill = (elapsed / windowMs) * limit;
  record.tokens = Math.min(limit, record.tokens + refill);
  record.lastRefill = now;

  if (record.tokens >= 1) {
    record.tokens -= 1;
    return true;
  }
  return false;
}

/**
 * Initialize translators once
 */
async function ensureInitialized() {
  if (!initialized) {
    await initTranslators();
    initialized = true;
  }
}

/**
 * Handle CORS preflight
 */
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
  // Fallback to local handling
  await ensureInitialized();

  // Rate limiting
  const apiKey = extractApiKey(request) || request.headers.get("x-forwarded-for") || "global";
  if (!checkRateLimit(apiKey)) {
    return new Response(JSON.stringify({ error: "Too Many Requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  return await handleChat(request);
}

