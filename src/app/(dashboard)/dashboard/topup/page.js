"use client";

export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { Wallet, Tag, ArrowRight, Loader2, Check, X, AlertCircle, Shield } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import useRoleStore, { useEffectiveRole } from "@/store/roleStore";

const PRESETS = [500, 1000, 2500, 5000, 10000, 25000]; // in cents

const fmtUSD = (cents) => {
  return ((Number(cents) || 0) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
};

export default function TopupPage() {
  const effectiveRole = useEffectiveRole();
  const realRole = useRoleStore((s) => s.realRole);
  const viewAs = useRoleStore((s) => s.viewAs);
  const isPrivileged = (realRole === "admin" || realRole === "dev") && !viewAs;

  const [balance, setBalance] = useState(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [midtrans, setMidtrans] = useState(null);
  const [msg, setMsg] = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  const [voucherCode, setVoucherCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [voucherMsg, setVoucherMsg] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [bRes, hRes, cRes, pRes] = await Promise.all([
        fetch("/api/wallet/balance").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/wallet/history?limit=15").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/auth/config").then((r) => (r.ok ? r.json() : null)),
        isPrivileged ? fetch("/api/admin/pending-counts", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)) : Promise.resolve(null),
      ]);
      if (bRes?.balance) setBalance(bRes.balance);
      if (hRes?.payments) setHistory(hRes.payments);
      if (cRes?.midtrans) setMidtrans(cRes.midtrans);
      if (pRes?.pendingPayments != null) setPendingCount(pRes.pendingPayments);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (!isPrivileged) return;
    const t = setInterval(() => {
      fetch("/api/admin/pending-counts", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setPendingCount(d.pendingPayments || 0))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, [isPrivileged]);

  // Auto-refresh balance + history every 5s so the UI updates without manual
  // refresh after a Snap payment settles. Pauses when the tab is hidden.
  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (document.hidden) return;
      fetch("/api/wallet/balance", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && d?.balance && setBalance(d.balance))
        .catch(() => {});
      fetch("/api/wallet/history?limit=15", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && d?.payments && setHistory(d.payments))
        .catch(() => {});
    };
    const t = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // While a Snap order is open, poll the Midtrans status every 3s and stop
  // as soon as the payment is settled / failed.
  useEffect(() => {
    if (!activeOrderId) return;
    let alive = true;
    let attempts = 0;
    const tick = async () => {
      if (!alive) return;
      if (++attempts > 60) return; // safety: max ~3 min
      try {
        const r = await fetch("/api/wallet/topup-midtrans/check-status", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderId: activeOrderId }),
        });
        const d = await r.json().catch(() => ({}));
        const st = d?.payment?.status;
        if (st === "settlement" || st === "failed" || st === "expired" || st === "refunded") {
          setActiveOrderId(null);
          setSubmitting(false);
          load();
        }
      } catch {}
    };
    const t = setInterval(tick, 3000);
    return () => { alive = false; clearInterval(t); };
  }, [activeOrderId]);

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;
    setRedeeming(true);
    setVoucherMsg(null);
    try {
      const r = await fetch("/api/wallet/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: voucherCode }),
      });
      const data = await r.json();
      if (!r.ok) {
        setVoucherMsg({ type: "error", text: data.error || "Failed to redeem voucher" });
        return;
      }
      setVoucherMsg({ type: "success", text: `Voucher redeemed! +${fmtUSD(data.amountCents || 0)} added to your balance.` });
      setVoucherCode("");
      load();
    } catch (err) {
      setVoucherMsg({ type: "error", text: err.message });
    } finally {
      setRedeeming(false);
    }
  };

  const handleMidtrans = async () => {
    const rawVal = parseFloat(amount);
    if (isNaN(rawVal) || rawVal <= 0) {
      setMsg({ type: "error", text: "Enter a valid amount" });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const r = await fetch("/api/wallet/topup-midtrans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountCents: Math.round(rawVal * 100) }),
      });
      const data = await r.json();
      if (!r.ok) {
        setMsg({ type: "error", text: data.error || "Failed to start Midtrans payment" });
        return;
      }
      setMsg({ type: "success", text: "Opening Midtrans Snap..." });
      setActiveOrderId(data.orderId);
      setTimeout(async () => {
        try {
          await openMidtransSnap(data);
        } catch (err) {
          setMsg({ type: "error", text: err.message });
          setActiveOrderId(null);
        }
      }, 200);
      load();
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const checkMidtransStatus = async (orderId) => {
    try {
      const r = await fetch("/api/wallet/topup-midtrans/check-status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data?.payment) return data.payment;
      return null;
    } catch {
      return null;
    }
  };

  const openMidtransSnap = async ({ snapToken, orderId }) => {
    if (typeof window === "undefined") return;
    if (!window.snap) {
      for (let i = 0; i < 30; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (window.snap) break;
      }
    }
    if (!window.snap) {
      throw new Error("Midtrans Snap is not loaded yet. Please wait a moment and try again.");
    }
    const afterCheck = (payment) => {
      if (payment?.status === "settlement") {
        setMsg({ type: "success", text: "Payment success. Balance updated." });
      } else if (payment?.status === "pending") {
        setMsg({ type: "success", text: `Payment is pending. ${isPrivileged ? "You can force-settle it from the admin panel." : "An admin will credit it once settled."}` });
      } else if (payment?.status === "failed" || payment?.status === "expired" || payment?.status === "refunded") {
        setMsg({ type: "error", text: `Payment ${payment.status}. Please try again.` });
      } else {
        setMsg({ type: "success", text: "Payment submitted. Balance will update shortly." });
      }
      setActiveOrderId(null);
      load();
    };
    window.snap.embed(snapToken, {
      embedId: "snap-container",
      onSuccess: async () => {
        setMsg({ type: "success", text: "Verifying payment..." });
        const p = orderId ? await checkMidtransStatus(orderId) : null;
        afterCheck(p);
      },
      onPending: async () => {
        setMsg({ type: "success", text: "Verifying payment..." });
        const p = orderId ? await checkMidtransStatus(orderId) : null;
        afterCheck(p);
      },
      onError: async (res) => {
        if (orderId) {
          const p = await checkMidtransStatus(orderId);
          afterCheck(p);
        } else {
          setMsg({ type: "error", text: res?.status_message || "Payment error" });
          setActiveOrderId(null);
        }
      },
      onClose: async () => {
        if (orderId) {
          setMsg({ type: "success", text: "Checking payment status..." });
          const p = await checkMidtransStatus(orderId);
          afterCheck(p);
        } else {
          setMsg({ type: "error", text: "Payment closed." });
          setActiveOrderId(null);
        }
      },
    });
  };

  const total = balance ? (Number(balance.balanceCents || 0) + Number(balance.voucherCents || 0)) / 100 : 0;

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 pb-24 lg:pb-8 max-w-5xl mx-auto space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-subtle)]">Balance</div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">Top Up</h1>
      </header>

      {isPrivileged && pendingCount > 0 && (
        <Link
          href="/dashboard/admin/vouchers"
          className="flex items-center gap-3 rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-4 py-3 hover:bg-[var(--color-accent)]/15 transition-colors"
        >
          <Shield className="size-4 text-[var(--color-accent)] shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-[var(--color-text-main)]">
              {pendingCount} pending {pendingCount === 1 ? "payment" : "payments"} awaiting admin approval
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)]">
              Click to open the admin voucher panel and approve them manually.
            </div>
          </div>
          <ArrowRight className="size-4 text-[var(--color-accent)] shrink-0" />
        </Link>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="md:col-span-2 space-y-6">
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold">Pay via Midtrans</h2>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-subtle)]">
                {midtrans?.enabled ? "enabled" : "disabled"}
              </span>
            </div>

            {msg && (
              <div className={`p-3 rounded text-[12px] flex items-center justify-between ${
                msg.type === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
              }`}>
                <span>{msg.text}</span>
                <button onClick={() => setMsg(null)}><X size={14} /></button>
              </div>
            )}

            {activeOrderId ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
                  <span className="text-[11px] text-[var(--color-text-subtle)] font-mono">Order: {activeOrderId}</span>
                  <button
                    onClick={() => {
                      setActiveOrderId(null);
                      setMsg(null);
                    }}
                    className="text-[11px] text-danger hover:underline"
                  >
                    Cancel
                  </button>
                </div>
                <div
                  id="snap-container"
                  className="w-full min-h-[600px] rounded-md border border-[var(--color-border-subtle)] overflow-hidden bg-[var(--color-surface)]"
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PRESETS.map((cents) => (
                    <button
                      key={cents}
                      onClick={() => setAmount((cents / 100).toString())}
                      className="h-9 rounded-md border border-[var(--color-border-subtle)] text-[12px] font-medium hover:border-[var(--color-text-main)] hover:bg-[var(--color-surface-2)] transition-colors"
                    >
                      ${cents / 100}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] font-medium block mb-1.5">
                      Amount (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)] text-[12px] font-mono">$</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-10 pl-7 pr-3 rounded-md border border-[var(--color-border-subtle)] bg-transparent text-[13px] outline-none focus:border-[var(--color-text-main)]"
                      />
                    </div>
                  </div>

                  <div>
                    <button
                      onClick={handleMidtrans}
                      disabled={submitting || !amount || !midtrans?.enabled}
                      className="w-full h-10 rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] text-[12px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-colors"
                    >
                      {submitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                      Pay with Midtrans
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="p-3 rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] text-[11px] text-[var(--color-text-subtle)] leading-relaxed flex items-start gap-2">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              <span>
                <strong>Midtrans:</strong> {midtrans?.enabled ? "enabled" : "not configured"}. Payment is auto-processed. {isPrivileged ? "If pending, force-settle from the admin panel." : "If payment stays pending, an admin can force-settle it."}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
              <h2 className="text-[14px] font-semibold">Payment History</h2>
              <span className="text-[11px] text-[var(--color-text-subtle)]">{history.length} records</span>
            </div>

            {loading ? (
              <div className="px-5 py-12 text-center text-[12px] text-[var(--color-text-subtle)]">Loading...</div>
            ) : history.length === 0 ? (
              <div className="px-5 py-12 text-center text-[12px] text-[var(--color-text-subtle)]">No payments yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-[var(--color-surface-2)] text-[var(--color-text-subtle)] border-b border-[var(--color-border-subtle)] text-[10px] uppercase tracking-wider">
                      <th className="px-5 py-3 font-semibold">Date</th>
                      <th className="px-5 py-3 font-semibold">Amount</th>
                      <th className="px-5 py-3 font-semibold">Ref / Promo</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-subtle)]">
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td className="px-5 py-3 text-[var(--color-text-muted)]">
                          {new Date(h.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3 font-mono font-medium">{fmtUSD(h.amountCents)}</td>
                        <td className="px-5 py-3 font-mono text-[var(--color-text-subtle)] text-[10px]">{h.promoCode || h.externalRef || "—"}</td>
                        <td className="px-5 py-3">
                          <span className={`chip ${
                            ["completed", "settlement", "capture"].includes(h.status)
                              ? "bg-success/10 text-success"
                              : ["pending", "snap_created"].includes(h.status)
                              ? "bg-warning/10 text-warning"
                              : ["failed", "expired", "deny", "expire"].includes(h.status)
                              ? "bg-danger/10 text-danger"
                              : ""
                          }`}>
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5">
            <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] font-medium mb-3">Total Balance</div>
            <div className="text-3xl font-bold tabular-nums tracking-tight mb-2">
              {loading ? "—" : fmtUSD(Math.round(total * 100))}
            </div>
            <div className="divide-y divide-[var(--color-border-subtle)] text-[11px] text-[var(--color-text-subtle)] mt-4">
              <div className="py-2 flex justify-between">
                <span>Core balance</span>
                <span className="font-mono">{balance ? fmtUSD(balance.balanceCents) : "—"}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span>Vouchers</span>
                <span className="font-mono">{balance ? fmtUSD(balance.voucherCents) : "—"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 space-y-4">
            <h3 className="text-[12px] uppercase tracking-wider text-[var(--color-text-subtle)] font-medium">Redeem Voucher</h3>

            {voucherMsg && (
              <div className={`p-3 rounded text-[11px] flex items-center justify-between ${
                voucherMsg.type === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
              }`}>
                <span>{voucherMsg.text}</span>
                <button onClick={() => setVoucherMsg(null)}><X size={12} /></button>
              </div>
            )}

            <form onSubmit={handleRedeem} className="space-y-3">
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                placeholder="XXXXX-XXXXX"
                className="w-full h-9 px-3 rounded-md border border-[var(--color-border-subtle)] bg-transparent text-[12px] uppercase placeholder:normal-case outline-none focus:border-[var(--color-text-main)] font-mono"
              />
              <button
                type="submit"
                disabled={redeeming || !voucherCode.trim()}
                className="w-full h-9 rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] text-[12px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-colors"
              >
                {redeeming ? <Loader2 size={12} className="animate-spin" /> : <Tag size={12} />}
                Redeem
              </button>
            </form>
          </div>
        </section>
      </div>
      {midtrans?.enabled && midtrans?.baseJsUrl && (
        <Script
          src={midtrans.baseJsUrl}
          data-client-key={midtrans.clientKey}
          strategy="afterInteractive"
        />
      )}
    </div>
  );
}
