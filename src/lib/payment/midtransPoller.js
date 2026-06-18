// Server-side background poller: re-queries Midtrans status for any
// payments that are still 'snap_created' or 'pending' and credits the
// user if Midtrans reports 'settlement'/'capture'. Acts as a fallback
// when the Midtrans webhook is not configured or fails to deliver.

import { getAdapter } from "@/lib/db/driver";
import { creditTopupPayment } from "@/lib/db/repos/walletRepo";
import {
  getMidtransTransactionStatus,
  isMidtransConfigured,
} from "@/lib/payment/midtrans";

const STATUS_TO_SETTLED = new Set(["settlement", "capture"]);

let timer = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    if (!isMidtransConfigured()) return;
    const db = await getAdapter();
    const rows = await db.all(
      `SELECT id, user_id, external_ref, note, amount_cents
       FROM topup_payments
       WHERE status IN ('snap_created','pending')
         AND (external_ref IS NOT NULL OR note IS NOT NULL)
       ORDER BY created_at ASC
       LIMIT 20`
    );
    if (rows.length === 0) return;
    for (const p of rows) {
      const ref = p.external_ref || p.note;
      try {
        const tx = await getMidtransTransactionStatus(ref);
        if (STATUS_TO_SETTLED.has(tx?.transaction_status)) {
          await creditTopupPayment({
            id: p.id,
            settledAmountCents: p.amount_cents,
            externalRef: ref,
            status: tx.transaction_status,
          });
          console.log(
            `[midtrans-poller] auto-settled ${ref} (status=${tx.transaction_status}) for user ${p.user_id}`
          );
        } else if (
          tx?.transaction_status &&
          ["deny", "cancel", "expire", "refund"].includes(tx.transaction_status)
        ) {
          await db.run(
            `UPDATE topup_payments SET status = $1, external_ref = COALESCE(external_ref, $2) WHERE id = $3`,
            [tx.transaction_status, ref, p.id]
          );
          console.log(
            `[midtrans-poller] marked ${ref} as ${tx.transaction_status}`
          );
        }
      } catch (e) {
        // Single-payment error should not stop the whole poll
        console.warn(`[midtrans-poller] ${ref}:`, e?.message || e);
      }
    }
  } catch (e) {
    console.error("[midtrans-poller] tick error:", e?.message || e);
  } finally {
    running = false;
  }
}

export function startMidtransPoller({ intervalMs = 30000 } = {}) {
  if (timer) return;
  // First tick after a short delay so server boot isn't blocked
  setTimeout(tick, 5000);
  timer = setInterval(tick, intervalMs);
  console.log(
    `[midtrans-poller] started (every ${intervalMs}ms)`
  );
}

export function stopMidtransPoller() {
  if (timer) clearInterval(timer);
  timer = null;
}
