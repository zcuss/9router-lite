"use client";

export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback } from "react";
import { Card } from "@/shared/components";

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
  const [form, setForm] = useState({ amount: "10", maxRedemptions: "1", expiresAt: "", note: "" });
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
          expiresAt: form.expiresAt || null,
          note: form.note || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Created: ${data.voucher.code} (${fmtMoney(data.voucher.amountCents)})`);
        setForm({ amount: "10", maxRedemptions: "1", expiresAt: "", note: "" });
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
        <h1 className="text-2xl font-semibold text-text-main flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600">redeem</span>
          Vouchers & Top-up
        </h1>
        <p className="text-sm text-text-muted mt-1">Create voucher codes, approve top-up requests, manage user balance.</p>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400">{error}</div>}
      {success && <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-600 dark:text-green-400">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card padding="md" className="lg:col-span-1">
          <h2 className="text-base font-semibold text-text-main mb-3">Create Voucher</h2>
          <form onSubmit={createVoucher} className="space-y-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Amount (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-bg text-text-main focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Max Redemptions</label>
              <input
                type="number"
                min="1"
                value={form.maxRedemptions}
                onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-bg text-text-main focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Expires At (optional)</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-bg text-text-main focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Note (optional)</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="e.g. promo, refund"
                className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-bg text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {creating ? "Creating..." : "Create Voucher"}
            </button>
          </form>
        </Card>

        <Card padding="md" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-base font-semibold text-text-main">Recent Items</h2>
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setTab("vouchers")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === "vouchers" ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : "text-text-muted hover:bg-surface-2"
                }`}
              >
                Vouchers ({vouchers.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("requests")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === "requests" ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : "text-text-muted hover:bg-surface-2"
                }`}
              >
                Pending ({requests.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("payments")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === "payments" ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : "text-text-muted hover:bg-surface-2"
                }`}
              >
                Payments ({payments.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("history")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === "history" ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : "text-text-muted hover:bg-surface-2"
                }`}
              >
                All Top-up History ({history.length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-text-muted text-sm">Loading...</div>
          ) : tab === "vouchers" ? (
            vouchers.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-sm">No vouchers yet. Create one on the left.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-text-muted border-b border-border-subtle">
                      <th className="py-2 pr-4">Code</th>
                      <th className="py-2 pr-4">Amount</th>
                      <th className="py-2 pr-4">Redemptions</th>
                      <th className="py-2 pr-4">Expires</th>
                      <th className="py-2 pr-4">Created</th>
                      <th className="py-2 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers.map((v) => (
                      <tr key={v.id} className="border-b border-border-subtle last:border-b-0">
                        <td className="py-2 pr-4 font-mono font-medium text-text-main">{v.code}</td>
                        <td className="py-2 pr-4 text-text-main">{fmtMoney(v.amountCents)}</td>
                        <td className="py-2 pr-4 text-text-main">{v.redeemedCount} / {v.maxRedemptions}</td>
                        <td className="py-2 pr-4 text-text-muted text-xs">{fmtDate(v.expiresAt)}</td>
                        <td className="py-2 pr-4 text-text-muted text-xs">{fmtDate(v.createdAt)}</td>
                        <td className="py-2 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => editVoucher(v)}
                              className="px-2 py-0.5 rounded text-xs border border-border-subtle hover:border-text-main text-text-main"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteVoucher(v.id)}
                              className="px-2 py-0.5 rounded text-xs bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                            >
                              Delete
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
              <div className="py-12 text-center text-text-muted text-sm">No pending top-up requests.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-text-muted border-b border-border-subtle">
                      <th className="py-2 pr-4">User</th>
                      <th className="py-2 pr-4">Amount</th>
                      <th className="py-2 pr-4">Method</th>
                      <th className="py-2 pr-4">Reference</th>
                      <th className="py-2 pr-4">Requested</th>
                      <th className="py-2 pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r.id} className="border-b border-border-subtle last:border-b-0">
                        <td className="py-2 pr-4 text-text-main text-xs">
                          <div className="font-mono text-[11px] text-text-muted">{r.userId.slice(0, 8)}</div>
                          <div className="font-medium">{r.username || r.email || "(no name)"}</div>
                        </td>
                        <td className="py-2 pr-4 text-text-main">{fmtMoney(r.amountCents)}</td>
                        <td className="py-2 pr-4 text-text-muted text-xs">{r.method || "—"}</td>
                        <td className="py-2 pr-4 text-text-muted text-xs">{r.reference || "—"}</td>
                        <td className="py-2 pr-4 text-text-muted text-xs">{fmtDate(r.requestedAt)}</td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => resolveRequest(r.id, "approve")} className="px-2 py-1 rounded text-xs bg-green-600 hover:bg-green-700 text-white">Approve</button>
                            <button type="button" onClick={() => resolveRequest(r.id, "reject")} className="px-2 py-1 rounded text-xs border border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10">Reject</button>
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
              <div className="py-12 text-center text-text-muted text-sm">No payment records yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-text-muted border-b border-border-subtle">
                      <th className="py-2 pr-4">User</th>
                      <th className="py-2 pr-4">Amount</th>
                      <th className="py-2 pr-4">Final</th>
                      <th className="py-2 pr-4">Method</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">External Ref</th>
                      <th className="py-2 pr-4">Created</th>
                      <th className="py-2 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => {
                      const settled = p.status === "settlement" || p.status === "completed" || p.status === "captured";
                      const failed = p.status === "failed" || p.status === "cancelled" || p.status === "expired";
                      return (
                        <tr key={p.id} className="border-b border-border-subtle last:border-b-0">
                          <td className="py-2 pr-4 text-text-main text-xs">
                            <div className="font-mono text-[11px] text-text-muted">{p.userId.slice(0, 8)}</div>
                            <div className="font-medium">{p.username || p.email || "(no name)"}</div>
                          </td>
                          <td className="py-2 pr-4 text-text-main">{fmtMoney(p.amountCents)}</td>
                          <td className="py-2 pr-4 text-text-main">{fmtMoney(p.finalCents)}</td>
                          <td className="py-2 pr-4 text-text-muted text-xs">{p.method || "—"}</td>
                          <td className="py-2 pr-4 text-text-muted text-xs">
                            <span className={
                              settled
                                ? "text-green-600 dark:text-green-400"
                                : failed
                                ? "text-red-600 dark:text-red-400"
                                : "text-amber-600 dark:text-amber-400"
                            }>
                              {p.status || "—"}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-text-muted text-xs font-mono">{p.externalRef || "—"}</td>
                          <td className="py-2 pr-4 text-text-muted text-xs">{fmtDate(p.createdAt)}</td>
                          <td className="py-2 pr-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={settled || resolvingPaymentId === p.id}
                                onClick={() => resolvePayment(p.id, "approve-payment")}
                                className="px-2 py-1 rounded text-xs bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white"
                              >
                                {resolvingPaymentId === p.id ? "..." : settled ? "Credited" : "Approve"}
                              </button>
                              <button
                                type="button"
                                disabled={settled || resolvingPaymentId === p.id}
                                onClick={() => resolvePayment(p.id, "reject-payment")}
                                className="px-2 py-1 rounded text-xs border border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Reject
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
                <div className="text-xs text-text-muted">History semua top-up request user.</div>
                <select
                  value={historyStatus}
                  onChange={(e) => setHistoryStatus(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-border-subtle bg-bg text-xs text-text-main"
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              {history.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-sm">No top-up history.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-text-muted border-b border-border-subtle">
                        <th className="py-2 pr-4">User</th>
                        <th className="py-2 pr-4">Amount</th>
                        <th className="py-2 pr-4">Method</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Requested</th>
                        <th className="py-2 pr-4">Resolved</th>
                        <th className="py-2 pr-4">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((r) => (
                        <tr key={r.id} className="border-b border-border-subtle last:border-b-0">
                          <td className="py-2 pr-4 text-text-main text-xs">
                            <div className="font-mono text-[11px] text-text-muted">{r.userId.slice(0, 8)}</div>
                            <div className="font-medium">{r.username || r.email || "(no name)"}</div>
                          </td>
                          <td className="py-2 pr-4 text-text-main">{fmtMoney(r.amountCents)}</td>
                          <td className="py-2 pr-4 text-text-muted text-xs">{r.method || "—"}</td>
                          <td className="py-2 pr-4 text-text-muted text-xs uppercase">{r.status || "—"}</td>
                          <td className="py-2 pr-4 text-text-muted text-xs">{fmtDate(r.requestedAt)}</td>
                          <td className="py-2 pr-4 text-text-muted text-xs">{fmtDate(r.resolvedAt)}</td>
                          <td className="py-2 pr-4 text-text-muted text-xs">{r.resolutionNote || "—"}</td>
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
