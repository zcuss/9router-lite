import { initializeApp } from "./initializeApp.js";
import { startCloudSync } from "./cloudSyncScheduler.js";

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build"
  || process.env.NEXT_PHASE === "phase-export"
  || process.env.NEXT_PHASE === "phase-static";

if (typeof window === "undefined" && !isBuildPhase && !global.__appBootstrapped) {
  global.__appBootstrapped = true;
  global.__bootstrapStartedAt = Date.now();

  const shutdown = () => {
    console.log("[Bootstrap] Graceful shutdown...");
    if (process.env.NODE_ENV === "development") return;
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

  Promise.resolve()
    .then(() => initializeApp())
    .then(() => startCloudSync().catch((e) => console.error("[Bootstrap] CloudSync start failed:", e.message)))
    .catch((e) => {
      console.error("[Bootstrap] init failed:", e?.message || e);
      global.__appBootstrapped = false;
    });
}
