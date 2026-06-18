// Next.js instrumentation hook — runs once at server boot.
// Starts a Midtrans auto-poll worker that re-checks the status of any
// 'snap_created' or 'pending' payments every 30s. Fallback for when
// the Midtrans Payment Notification webhook is not configured.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  let mod: any = {};
  try {
    mod = await import("./lib/payment/midtransPoller.js");
  } catch {
    mod = {};
  }
  if (typeof mod.startMidtransPoller === "function") {
    mod.startMidtransPoller({ intervalMs: 30000 });
  }
}
