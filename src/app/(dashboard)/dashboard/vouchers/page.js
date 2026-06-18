"use client";

export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tag, Loader2, Ticket, X, Check, AlertCircle } from "lucide-react";
import useRoleStore, { useEffectiveRole } from "@/store/roleStore";
import { Card } from "@/shared/components";
import { ShieldOff } from "lucide-react";

function fmtUSD(cents) {
  return ((Number(cents) || 0) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function AccessDenied() {
  return (
    <div className="px-4 sm:px-6 py-12 max-w-2xl mx-auto">
      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-8 text-center space-y-3">
        <ShieldOff className="size-8 mx-auto text-[var(--color-text-subtle)]" />
        <h2 className="text-lg font-semibold">Akses Ditolak</h2>
        <p className="text-[13px] text-[var(--color-text-muted)]">Hanya admin/dev yang dapat mengelola voucher.</p>
      </div>
    </div>
  );
}

export default function UserVoucherRedeemPage() {
  const effectiveRole = useEffectiveRole();
  const realRole = useRoleStore((s) => s.realRole);
  const viewAs = useRoleStore((s) => s.viewAs);
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  // If real role is admin/dev and not currently viewing-as-user, redirect to admin page
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/status", { cache: "no-store" });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const role = String(data?.role || "").toLowerCase();
          if ((role === "admin" || role === "dev") && !viewAs) {
            router.replace("/dashboard/admin/vouchers");
            return;
          }
        }
      } catch {}
      if (!cancelled) setAuthChecked(true);
    })();
    return () => { cancelled = true; };
  }, [router, viewAs]);

  const isPrivileged = effectiveRole === "admin" || effectiveRole === "dev";

  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [msg, setMsg] = useState(null);
  const [balance, setBalance] = useState(null);
  const [history, setHistory] = useState([]);

  const load = async () => {
    try {
      const [bRes, hRes] = await Promise.all([
        fetch("/api/wallet/balance").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/wallet/history?limit=10").then((r) => (r.ok ? r.json() : null)),
      ]);
      if (bRes?.balance) setBalance(bRes.balance);
      if (hRes?.payments) setHistory(hRes.payments);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setRedeeming(true);
    setMsg(null);
    try {
      const r = await fetch("/api/wallet/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await r.json();
      if (!r.ok) {
        setMsg({ type: "error", text: data.error || "Gagal menukar voucher" });
        return;
      }
      setMsg({ type: "success", text: `Voucher berhasil ditukar! +${fmtUSD(data.amountCents || 0)}` });
      setCode("");
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setRedeeming(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="px-4 sm:px-6 py-12 max-w-2xl mx-auto">
        <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-text-muted)] text-sm">
          Memuat...
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 pb-24 lg:pb-8 max-w-2xl mx-auto space-y-6">
      <header>
        <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-subtle)]">Saldo</div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">Tukar Voucher</h1>
        <p className="text-[13px] text-[var(--color-text-muted)] mt-1">
          Masukkan kode voucher dari admin untuk menambahkan saldo ke akun Anda.
        </p>
      </header>

      <Card padding="md">
        <form onSubmit={handleRedeem} className="space-y-3">
          {msg && (
            <div className={`p-3 rounded text-[12px] flex items-center justify-between ${
              msg.type === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
            }`}>
              <div className="flex items-center gap-2">
                {msg.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
                <span>{msg.text}</span>
              </div>
              <button type="button" onClick={() => setMsg(null)}><X size={14} /></button>
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] font-medium block mb-1.5">
              Kode Voucher
            </label>
            <div className="relative">
              <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-text-subtle)]" strokeWidth={1.6} />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXXX-XXXXX"
                className="w-full h-10 pl-10 pr-3 rounded-md border border-[var(--color-border-subtle)] bg-transparent text-[13px] font-mono uppercase outline-none focus:border-[var(--color-text-main)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={redeeming || !code.trim()}
            className="w-full h-10 rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] text-[12px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-colors"
          >
            {redeeming ? <Loader2 size={14} className="animate-spin" /> : <Tag size={14} />}
            Tukar Voucher
          </button>
        </form>
      </Card>

      <Card padding="md">
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] font-medium mb-3">Saldo Anda</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] text-[var(--color-text-subtle)]">Saldo Utama</div>
            <div className="text-lg font-bold tabular-nums">{balance ? fmtUSD(balance.balanceCents) : "—"}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--color-text-subtle)]">Voucher</div>
            <div className="text-lg font-bold tabular-nums">{balance ? fmtUSD(balance.voucherCents) : "—"}</div>
          </div>
        </div>
      </Card>

      {history.length > 0 && (
        <Card padding="md">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] font-medium mb-3">Riwayat Pembayaran Terakhir</div>
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {history.slice(0, 5).map((h) => (
              <div key={h.id} className="py-2 flex items-center justify-between text-[12px]">
                <span className="text-[var(--color-text-muted)]">
                  {h.createdAt ? new Date(h.createdAt).toLocaleDateString() : "—"}
                </span>
                <span className="font-mono font-medium">{fmtUSD(h.amountCents)}</span>
                <span className="text-[10px] uppercase text-[var(--color-text-subtle)]">{h.status || "—"}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
