import { initializeApp } from "./initializeApp.js";
import { startCloudSync } from "./cloudSyncScheduler.js";

// Skip during Next.js build/prerender — bootstrap would download cloudflared, init DNS, etc.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build"
  || process.env.NEXT_PHASE === "phase-export"
  || process.env.NEXT_PHASE === "phase-static";

// Server-only singleton: guard via global so HMR / re-imports don't double-init
if (typeof window === "undefined" && !isBuildPhase && !global.__appBootstrapped) {
  global.__appBootstrapped = true;
  
  // Graceful shutdown
  const shutdown = () => {
    console.log("[Bootstrap] Graceful shutdown...");
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  process.on("unhandledRejection", (reason, promise) => {
    console.error("[Bootstrap] Unhandled Rejection at:", promise, "reason:", reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("[Bootstrap] Uncaught Exception:", err);
    process.exit(1);
  });

  initializeApp().then(() => {
    startCloudSync().catch(e => console.error("[Bootstrap] CloudSync start failed:", e.message));
  }).catch((e) => console.error("[Bootstrap] init failed:", e.message));
}
