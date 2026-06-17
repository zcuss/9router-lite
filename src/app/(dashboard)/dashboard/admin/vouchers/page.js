"use client";

export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/shared/components";
import { Ticket } from "lucide-react";

function fmtMoney(cents) {
  if (cents == null) return "$0.00";
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleString();
}

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("vouchers");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ amount: "10", maxRedemptions: "10", perUserLimit: "1", expiresAt: "", note: "" });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [historyStatus, setHistoryStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [v, r, p, h] = await Promise.all([
      fetch("/api/admin/wallet?resource=vouchers&limit=100").then((r) => r.json()).catch(() => null),
      fetch("/api/admin/wallet?status=pending&limit=100").then((r) => r.json()).catch(() => null),
      fetch("/api/admin/wallet?resource=topup-payments&limit=100").then((r) => r.json()).catch(() => null),
      fetch(`/api/admin/wallet?${historyStatus ? `status=${historyStatus}&` : ""}limit=200`).then((r) => r.json()).catch(() => null),
    ]);
    setVouchers(v?.vouchers || []);
    setRequests(r?.requests || []);
    setPayments(p?.payments || []);
    setHistory(h?.requests || []);
    setLoading(false);
  }, [historyStatus]);

  useEffect(() => { load(); }, [load]);

  const createVoucher = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setCreating(true);
    try {
      const amountCents = Math.round(parseFloat(form.amount) * 100);
      const maxRedemptions = parseInt(form.maxRedemptions || "1", 10);
      const perUserLimit = parseInt(form.perUserLimit || "1", 10);
      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        setError("Amount must be > 0");
        return;
      }
      const res = await fetch("/api/admin/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create-voucher",
          amountCents,
          maxRedemptions,
          perUserLimit,
          expiresAt: form.expiresAt || null,
          note: form.note || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Created: ${data.voucher.code} (${fmtMoney(data.voucher.amountCents)})`);
        setForm({ amount: "10", maxRedemptions: "10", perUserLimit: "1", expiresAt: "", note: "" });
        await load();
      } else {
        setError(data.error || "create failed");
      }
    } finally {
      setCreating(false);
    }
  };

  const resolveRequest = async (id, action) => {
    const note = prompt(`Resolution note (optional):`) || null;
    const res = await fetch("/api/admin/wallet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: `${action}-topup`, id, note }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setSuccess(`Request ${action}d`);
      await load();
    } else {
      setError(data.error || "failed");
    }
  };

  const deleteVoucher = async (id) => {
    if (!confirm("Are you sure you want to delete this voucher?")) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete-voucher", id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess("Voucher deleted");
        await load();
      } else {
        setError(data.error || "delete failed");
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const editVoucher = async (v) => {
    const newAmount = prompt(`New amount (USD) for ${v.code}:`, (v.amountCents / 100).toFixed(2));
    if (newAmount == null) return;
    const newMax = prompt(`New max redemptions for ${v.code}:`, String(v.maxRedemptions));
    if (newMax == null) return;
    const amountCents = Math.round(parseFloat(newAmount) * 100);
    const maxRedemptions = parseInt(newMax, 10);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError("Invalid amount");
      return;
    }
    if (!Number.isFinite(maxRedemptions) || maxRedemptions <= 0) {
      setError("Invalid max redemptions");
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "update-voucher",
          id: v.id,
          amountCents,
          maxRedemptions,
          expiresAt: v.expiresAt,
          note: v.note,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Voucher ${v.code} updated`);
        await load();
      } else {
        setError(data.error || "update failed");
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const [resolvingPaymentId, setResolvingPaymentId] = useState(null);
  const resolvePayment = async (id, action) => {
    const note = action === "reject-payment" ? prompt(`Rejection reason (optional):`) : null;
    if (action === "approve-payment" && !confirm("Are you sure you want to force-settle and credit this payment?")) {
      return;
    }
    setResolvingPaymentId(id);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, id, note }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Payment resolved successfully.`);
        await load();
      } else {
        setError(data.error || "failed resolving payment");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setResolvingPaymentId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text-main)] flex items-center gap-2">
          <Ticket size={22} className="text-[var(--color-accent)]" />
          Voucher & Top Up
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Buat kode voucher, approve top up, kelola saldo user.</p>
      </div>

      {error && <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-4 py-2 text-sm text-[var(--color-danger)] dark:text-[var(--color-danger)]">{error}</div>}
      {success && <div className="rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-4 py-2 text-sm text-[var(--color-success)] dark:text-[var(--color-success)]">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card padding="md" className="lg:col-span-1">
          <h2 className="text-base font-semibold text-[var(--color-text-main)] mb-3">Buat Voucher</h2>
          <form onSubmit={createVoucher} className="space-y-3">
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">Nominal (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-bg text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">Maks Tukar (total)</label>
              <input
                type="number"
                min="1"
                value={form.maxRedemptions}
                onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">Batas per User (1 akun = 1x)</label>
              <input
                type="number"
                min="0"
                value={form.perUserLimit}
                onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40"
              />
              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">0 = unlimited per user. 1 = setiap akun hanya bisa 1x.</p>
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">Kadaluarsa (opsional)</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-bg text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">Catatan (opsional)</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="cth: promo, refund"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-bg text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="w-full px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 text-[var(--color-accent-fg)] text-sm font-medium transition-colors"
            >
              {creating ? "Membuat..." : "Buat Voucher"}
            </button>
          </form>
        </Card>

        <Card padding="md" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-base font-semibold text-[var(--color-text-main)]">Item Terbaru</h2>
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setTab("vouchers")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === "vouchers" ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]"
                }`}
              >
                Voucher ({vouchers.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("requests")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === "requests" ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]"
                }`}
              >
                Permintaan Top Up ({requests.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("payments")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === "payments" ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]"
                }`}
              >
                Pembayaran ({payments.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("history")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === "history" ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)]"
                }`}
              >
                Riwayat ({history.length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-[var(--color-text-muted)] text-sm">Memuat...</div>
          ) : tab === "vouchers" ? (
            vouchers.length === 0 ? (
              <div className="py-12 text-center text-[var(--color-text-muted)] text-sm">Belum ada voucher. Buat di panel kiri.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)]">
                      <th className="py-2 pr-4">Kode</th>
                      <th className="py-2 pr-4">Nominal</th>
                      <th className="py-2 pr-4">Penukaran</th>
                      <th className="py-2 pr-4">Kadaluarsa</th>
                      <th className="py-2 pr-4">Dibuat</th>
                      <th className="py-2 pr-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers.map((v) => (
                      <tr key={v.id} className="border-b border-[var(--color-border-subtle)] last:border-b-0">
                        <td className="py-2 pr-4 font-mono font-medium text-[var(--color-text-main)]">{v.code}</td>
                        <td className="py-2 pr-4 text-[var(--color-text-main)]">{fmtMoney(v.amountCents)}</td>
                        <td className="py-2 pr-4 text-[var(--color-text-main)]">{v.redeemedCount} / {v.maxRedemptions}</td>
                        <td className="py-2 pr-4 text-[var(--color-text-muted)] text-xs">{fmtDate(v.expiresAt)}</td>
                        <td className="py-2 pr-4 text-[var(--color-text-muted)] text-xs">{fmtDate(v.createdAt)}</td>
                        <td className="py-2 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => editVoucher(v)}
                              className="px-2 py-0.5 rounded text-xs border border-[var(--color-border-subtle)] hover:border-[var(--color-text-main)] text-[var(--color-text-main)]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteVoucher(v.id)}
                              className="px-2 py-0.5 rounded text-xs border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-fg)] transition-colors"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : tab === "requests" ? (
            requests.length === 0 ? (
              <div className="py-12 text-center text-[var(--color-text-muted)] text-sm">Tidak ada permintaan top up tertunda.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)]">
                      <th className="py-2 pr-4">User</th>
                      <th className="py-2 pr-4">Nominal</th>
                      <th className="py-2 pr-4">Metode</th>
                      <th className="py-2 pr-4">Referensi</th>
                      <th className="py-2 pr-4">Diminta</th>
                      <th className="py-2 pr-4">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r.id} className="border-b border-[var(--color-border-subtle)] last:border-b-0">
                        <td className="py-2 pr-4 text-[var(--color-text-main)] text-xs">
                          <div className="font-mono text-[11px] text-[var(--color-text-muted)]">{r.userId.slice(0, 8)}</div>
                          <div className="font-medium">{r.username || r.email || "(tanpa nama)"}</div>
                        </td>
                        <td className="py-2 pr-4 text-[var(--color-text-main)]">{fmtMoney(r.amountCents)}</td>
                        <td className="py-2 pr-4 text-[var(--color-text-muted)] text-xs">{r.method || "—"}</td>
                        <td className="py-2 pr-4 text-[var(--color-text-muted)] text-xs max-w-xs truncate" title={r.reference}>{r.reference || "—"}</td>
                        <td className="py-2 pr-4 text-[var(--color-text-muted)] text-xs">{fmtDate(r.requestedAt)}</td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => resolveRequest(r.id, "approve")} className="px-2 py-1 rounded text-xs bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-fg)]">Setujui</button>
                            <button type="button" onClick={() => resolveRequest(r.id, "reject")} className="px-2 py-1 rounded text-xs border border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10">Tolak</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : tab === "payments" ? (
            payments.length === 0 ? (
              <div className="py-12 text-center text-[var(--color-text-muted)] text-sm">Belum ada catatan pembayaran.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)]">
                      <th className="py-2 pr-4">User</th>
                      <th className="py-2 pr-4">Nominal</th>
                      <th className="py-2 pr-4">Final</th>
                      <th className="py-2 pr-4">Metode</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Ref</th>
                      <th className="py-2 pr-4">Dibuat</th>
                      <th className="py-2 pr-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => {
                      const settled = p.status === "settlement" || p.status === "completed" || p.status === "captured";
                      const failed = p.status === "failed" || p.status === "cancelled" || p.status === "expired";
                      return (
                        <tr key={p.id} className="border-b border-[var(--color-border-subtle)] last:border-b-0">
                          <td className="py-2 pr-4 text-[var(--color-text-main)] text-xs">
                            <div className="font-mono text-[11px] text-[var(--color-text-muted)]">{p.userId.slice(0, 8)}</div>
                            <div className="font-medium">{p.username || p.email || "(tanpa nama)"}</div>
                          </td>
                          <td className="py-2 pr-4 text-[var(--color-text-main)]">{fmtMoney(p.amountCents)}</td>
                          <td className="py-2 pr-4 text-[var(--color-text-main)]">{fmtMoney(p.finalCents)}</td>
                          <td className="py-2 pr-4 text-[var(--color-text-muted)] text-xs">{p.method || "—"}</td>
                          <td className="py-2 pr-4 text-[var(--color-text-muted)] text-xs">
                            <span className={
                              settled
                                ? "text-[var(--color-success)]"
                                : failed
                                ? "text-[var(--color-danger)]"
                                : "text-[var(--color-accent)]"
                            }>
                              {p.status || "—"}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-[var(--color-text-muted)] text-xs font-mono">{p.externalRef || "—"}</td>
                          <td className="py-2 pr-4 text-[var(--color-text-muted)] text-xs">{fmtDate(p.createdAt)}</td>
                          <td className="py-2 pr-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={settled || resolvingPaymentId === p.id}
                                onClick={() => resolvePayment(p.id, "approve-payment")}
                                className="px-2 py-1 rounded text-xs bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--color-accent-fg)]"
                              >
                                {resolvingPaymentId === p.id ? "..." : settled ? "Kredit" : "Setujui"}
                              </button>
                              <button
                                type="button"
                                disabled={settled || resolvingPaymentId === p.id}
                                onClick={() => resolvePayment(p.id, "reject-payment")}
                                className="px-2 py-1 rounded text-xs border border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Tolak
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs text-[var(--color-text-muted)]">Riwayat semua permintaan top up user.</div>
                <select
                  value={historyStatus}
                  onChange={(e) => setHistoryStatus(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[var(--color-border-subtle)] bg-bg text-xs text-[var(--color-text-main)]"
                >
                  <option value="">Semua status</option>
                  <option value="pending">Tertunda</option>
                  <option value="approved">Disetujui</option>
                  <option value="rejected">Ditolak</option>
                </select>
              </div>
              {history.length === 0 ? (
                <div className="py-12 text-center text-[var(--color-text-muted)] text-sm">Belum ada riwayat top up.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)]">
                        <th className="py-2 pr-4">User</th>
                        <th className="py-2 pr-4">Nominal</th>
                        <th className="py-2 pr-4">Metode</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Diminta</th>
                        <th className="py-2 pr-4">Selesai</th>
                        <th className="py-2 pr-4">Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((r) => (
                        <tr key={r.id} className="border-b border-[var(--color-border-subtle)] last:border-b-0">
                          <td className="py-2 pr-4 text-[var(--color-text-main)] text-xs">
                            <div className="font-mono text-[11px] text-[var(--color-text-muted)]">{r.userId.slice(0, 8)}</div>
                            <div className="font-medium">{r.username || r.email || "(tanpa nama)"}</div>
                          </td>
                          <td className="py-2 pr-4 text-[var(--color-text-main)]">{fmtMoney(r.amountCents)}</td>
                          <td className="py-2 pr-4 text-[var(--color-text-muted)] text-xs">{r.method || "—"}</td>
                          <td className="py-2 pr-4 text-[var(--color-text-muted)] text-xs uppercase">
                            {r.status === "pending" ? "tertunda" : r.status === "approved" ? "disetujui" : r.status === "rejected" ? "ditolak" : (r.status || "—")}
                          </td>
                          <td className="py-2 pr-4 text-[var(--color-text-muted)] text-xs">{fmtDate(r.requestedAt)}</td>
                          <td className="py-2 pr-4 text-[var(--color-text-muted)] text-xs">{fmtDate(r.resolvedAt)}</td>
                          <td className="py-2 pr-4 text-[var(--color-text-muted)] text-xs">{r.resolutionNote || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
