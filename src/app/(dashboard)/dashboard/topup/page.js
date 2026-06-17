"use client";

export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { Wallet, Plus, Tag, ArrowRight, Loader2, Clock, Check, X, Receipt, AlertCircle, Banknote } from "lucide-react";
import Script from "next/script";
import useRoleStore, { useEffectiveRole } from "@/store/roleStore";

const PRESETS = [500, 1000, 2500, 5000, 10000, 25000]; // in cents

const fmtUSD = (cents) => {
  return ((Number(cents) || 0) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
};

const PAYMENT_METHODS = [
  { id: "bank_transfer", label: "Transfer Bank" },
  { id: "e_wallet", label: "E-Wallet (OVO/GoPay/Dana)" },
  { id: "qris", label: "QRIS" },
  { id: "cash", label: "Tunai" },
  { id: "other", label: "Lainnya" },
];

export default function TopupPage() {
  const effectiveRole = useEffectiveRole();
  const isPrivileged = effectiveRole === "admin" || effectiveRole === "dev";

  const [balance, setBalance] = useState(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [midtrans, setMidtrans] = useState(null);
  const [msg, setMsg] = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);

  // Manual top-up request
  const [manualAmount, setManualAmount] = useState("");
  const [manualMethod, setManualMethod] = useState("bank_transfer");
  const [manualReference, setManualReference] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualMsg, setManualMsg] = useState(null);
  const [manualRequests, setManualRequests] = useState([]);

  const [voucherCode, setVoucherCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [voucherMsg, setVoucherMsg] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [bRes, hRes, cRes, mRes] = await Promise.all([
        fetch("/api/wallet/balance").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/wallet/history?limit=15").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/auth/config").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/wallet/topup-request?mine=1&limit=20").then((r) => (r.ok ? r.json() : null)),
      ]);
      if (bRes?.balance) setBalance(bRes.balance);
      if (hRes?.payments) setHistory(hRes.payments);
      if (cRes?.midtrans) setMidtrans(cRes.midtrans);
      if (mRes?.requests) setManualRequests(mRes.requests);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
        setVoucherMsg({ type: "error", text: data.error || "Gagal menukar voucher" });
        return;
      }
      setVoucherMsg({ type: "success", text: "Voucher berhasil ditukar! Saldo diperbarui." });
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
      setMsg({ type: "error", text: "Masukkan nominal yang valid" });
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
        setMsg({ type: "error", text: data.error || "Gagal memulai pembayaran Midtrans" });
        return;
      }
      setMsg({ type: "success", text: "Membuka Midtrans Snap..." });
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
      throw new Error("Midtrans Snap belum dimuat. Tunggu sebentar lalu coba lagi.");
    }
    const afterCheck = (payment) => {
      if (payment?.status === "settlement") {
        setMsg({ type: "success", text: "Pembayaran berhasil. Saldo diperbarui." });
      } else if (payment?.status === "pending") {
        setMsg({ type: "success", text: "Pembayaran tertunda. Saldo akan ditambah setelah settle." });
      } else if (payment?.status === "failed" || payment?.status === "expired" || payment?.status === "refunded") {
        setMsg({ type: "error", text: `Pembayaran ${payment.status}. Coba lagi.` });
      } else {
        setMsg({ type: "success", text: "Pembayaran dikirim. Saldo akan diperbarui sebentar lagi." });
      }
      setActiveOrderId(null);
      load();
    };
    window.snap.embed(snapToken, {
      embedId: "snap-container",
      onSuccess: async () => {
        setMsg({ type: "success", text: "Memverifikasi pembayaran..." });
        const p = orderId ? await checkMidtransStatus(orderId) : null;
        afterCheck(p);
      },
      onPending: async () => {
        setMsg({ type: "success", text: "Memverifikasi pembayaran..." });
        const p = orderId ? await checkMidtransStatus(orderId) : null;
        afterCheck(p);
      },
      onError: async (res) => {
        if (orderId) {
          const p = await checkMidtransStatus(orderId);
          afterCheck(p);
        } else {
          setMsg({ type: "error", text: res?.status_message || "Kesalahan pembayaran" });
          setActiveOrderId(null);
        }
      },
      onClose: async () => {
        if (orderId) {
          setMsg({ type: "success", text: "Memeriksa status pembayaran..." });
          const p = await checkMidtransStatus(orderId);
          afterCheck(p);
        } else {
          setMsg({ type: "error", text: "Pembayaran ditutup." });
          setActiveOrderId(null);
        }
      },
    });
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(manualAmount);
    if (isNaN(amt) || amt <= 0) {
      setManualMsg({ type: "error", text: "Nominal harus lebih dari 0" });
      return;
    }
    if (!manualReference.trim()) {
      setManualMsg({ type: "error", text: "Isi referensi / bukti transfer" });
      return;
    }
    setManualSubmitting(true);
    setManualMsg(null);
    try {
      const r = await fetch("/api/wallet/topup-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amountCents: Math.round(amt * 100),
          method: manualMethod,
          reference: manualReference.trim(),
          note: manualNote.trim() || null,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setManualMsg({ type: "error", text: data.error || "Gagal mengirim permintaan" });
        return;
      }
      setManualMsg({ type: "success", text: "Permintaan terkirim. Menunggu approval admin." });
      setManualAmount("");
      setManualReference("");
      setManualNote("");
      load();
    } catch (err) {
      setManualMsg({ type: "error", text: err.message });
    } finally {
      setManualSubmitting(false);
    }
  };

  const total = balance ? (Number(balance.balanceCents || 0) + Number(balance.voucherCents || 0)) / 100 : 0;

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 pb-24 lg:pb-8 max-w-5xl mx-auto space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-subtle)]">Saldo</div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">Top Up</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="md:col-span-2 space-y-6">
          {/* Midtrans quick top-up */}
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold">Top Up Otomatis (Midtrans)</h2>
              <span className={`text-[10px] font-mono uppercase tracking-wider ${midtrans?.enabled ? "text-[var(--color-text-subtle)]" : "text-[var(--color-text-subtle)]"}`}>
                {midtrans?.enabled ? "aktif" : "nonaktif"}
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
                    Batalkan
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
                      Nominal (USD)
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
                      Bayar via Midtrans
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="p-3 rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] text-[11px] text-[var(--color-text-subtle)] leading-relaxed">
              <strong>Midtrans:</strong> {midtrans?.enabled ? "aktif" : "tidak dikonfigurasi"}. Pembayaran diproses otomatis lewat Midtrans. Admin tidak perlu approve manual. Kalau pembayaran pending/gagal, admin bisa force-settle dari dashboard.
            </div>
          </div>

          {/* Manual top-up request (user can submit; admin approves) */}
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Receipt size={14} className="text-[var(--color-text-subtle)]" />
              <h2 className="text-[14px] font-semibold">Top Up Manual (Butuh Approval)</h2>
            </div>

            {manualMsg && (
              <div className={`p-3 rounded text-[12px] flex items-center justify-between ${
                manualMsg.type === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
              }`}>
                <span>{manualMsg.text}</span>
                <button onClick={() => setManualMsg(null)}><X size={14} /></button>
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] font-medium block mb-1.5">
                    Nominal (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)] text-[12px] font-mono">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-10 pl-7 pr-3 rounded-md border border-[var(--color-border-subtle)] bg-transparent text-[13px] outline-none focus:border-[var(--color-text-main)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] font-medium block mb-1.5">
                    Metode
                  </label>
                  <select
                    value={manualMethod}
                    onChange={(e) => setManualMethod(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-[var(--color-border-subtle)] bg-transparent text-[13px] outline-none focus:border-[var(--color-text-main)]"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] font-medium block mb-1.5">
                  Referensi / Bukti Transfer
                </label>
                <input
                  type="text"
                  value={manualReference}
                  onChange={(e) => setManualReference(e.target.value)}
                  placeholder="cth: BCA 1234567890 a.n. Zcus, 12 Jun 2026"
                  className="w-full h-10 px-3 rounded-md border border-[var(--color-border-subtle)] bg-transparent text-[13px] outline-none focus:border-[var(--color-text-main)]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] font-medium block mb-1.5">
                  Catatan (opsional)
                </label>
                <input
                  type="text"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="cth: top up untuk testing"
                  className="w-full h-10 px-3 rounded-md border border-[var(--color-border-subtle)] bg-transparent text-[13px] outline-none focus:border-[var(--color-text-main)]"
                />
              </div>

              <button
                type="submit"
                disabled={manualSubmitting || !manualAmount || !manualReference.trim()}
                className="w-full h-10 rounded-md border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-fg)] text-[12px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-colors"
              >
                {manualSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />}
                Kirim Permintaan Top Up
              </button>
            </form>

            <div className="p-3 rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] text-[11px] text-[var(--color-text-subtle)] leading-relaxed flex items-start gap-2">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              <span>
                Isi referensi / bukti transfer dengan jelas. Admin akan approve setelah memverifikasi pembayaran. Saldo baru akan masuk setelah approve.
              </span>
            </div>
          </div>

          {/* Combined history: midtrans payments + manual requests */}
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
              <h2 className="text-[14px] font-semibold">Riwayat Permintaan</h2>
              <span className="text-[11px] text-[var(--color-text-subtle)]">{history.length + manualRequests.length} total</span>
            </div>

            {loading ? (
              <div className="px-5 py-12 text-center text-[12px] text-[var(--color-text-subtle)]">Memuat…</div>
            ) : history.length === 0 && manualRequests.length === 0 ? (
              <div className="px-5 py-12 text-center text-[12px] text-[var(--color-text-subtle)]">Belum ada permintaan.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-[var(--color-surface-2)] text-[var(--color-text-subtle)] border-b border-[var(--color-border-subtle)] text-[10px] uppercase tracking-wider">
                      <th className="px-5 py-3 font-semibold">Tanggal</th>
                      <th className="px-5 py-3 font-semibold">Nominal</th>
                      <th className="px-5 py-3 font-semibold">Tipe</th>
                      <th className="px-5 py-3 font-semibold">Referensi</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-subtle)]">
                    {manualRequests.map((r) => (
                      <tr key={`manual-${r.id}`}>
                        <td className="px-5 py-3 text-[var(--color-text-muted)]">
                          {new Date(r.requestedAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3 font-mono font-medium">{fmtUSD(r.amountCents)}</td>
                        <td className="px-5 py-3 text-[var(--color-text-muted)] text-[10px] uppercase font-mono">manual · {r.method || "—"}</td>
                        <td className="px-5 py-3 font-mono text-[var(--color-text-subtle)] text-[10px]">{r.reference || "—"}</td>
                        <td className="px-5 py-3">
                          <span className={`chip ${
                            r.status === "approved" ? "bg-success/10 text-success"
                              : r.status === "rejected" ? "bg-danger/10 text-danger"
                              : "bg-warning/10 text-warning"
                          }`}>
                            {r.status === "approved" ? "disetujui" : r.status === "rejected" ? "ditolak" : "menunggu"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {history.map((h) => (
                      <tr key={`midtrans-${h.id}`}>
                        <td className="px-5 py-3 text-[var(--color-text-muted)]">
                          {new Date(h.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3 font-mono font-medium">{fmtUSD(h.amountCents)}</td>
                        <td className="px-5 py-3 text-[var(--color-text-muted)] text-[10px] uppercase font-mono">midtrans</td>
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
            <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] font-medium mb-3">Total Saldo</div>
            <div className="text-3xl font-bold tabular-nums tracking-tight mb-2">
              {loading ? "—" : fmtUSD(Math.round(total * 100))}
            </div>
            <div className="divide-y divide-[var(--color-border-subtle)] text-[11px] text-[var(--color-text-subtle)] mt-4">
              <div className="py-2 flex justify-between">
                <span>Saldo utama</span>
                <span className="font-mono">{balance ? fmtUSD(balance.balanceCents) : "—"}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span>Voucher</span>
                <span className="font-mono">{balance ? fmtUSD(balance.voucherCents) : "—"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 space-y-4">
            <h3 className="text-[12px] uppercase tracking-wider text-[var(--color-text-subtle)] font-medium">Tukar Voucher</h3>

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
                Tukar
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
