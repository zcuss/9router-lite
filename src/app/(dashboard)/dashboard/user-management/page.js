"use client";


export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";

const roles = ["user", "premium", "dev", "admin"];
const statuses = ["pending", "approved", "blocked", "active", "suspended"];

const statusTone = {
  pending: "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/20",
  approved: "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20",
  active: "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20",
  blocked: "bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20",
  suspended: "bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20",
};

const roleTone = {
  admin: "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/20",
  dev: "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/20",
  premium: "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/20",
  user: "bg-[var(--color-surface)]/5 text-[var(--color-text-muted)] border-[var(--color-border-subtle)]/10",
};

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load users");
      setUsers(data.users || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const update = async (user, patch) => {
    const next = { ...user, ...patch };
    setUsers((items) => items.map((x) => (x.id === user.id ? next : x)));
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, role: next.role, status: next.status })
    });
    if (!res.ok) load();
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-main)]">User Management</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Dev/Admin role manager, approval status, account login control.</p>
      </div>

      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)]/70 backdrop-blur-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-[var(--color-text-main)]">Users</h2>
            <p className="text-xs text-[var(--color-text-muted)]">Login accounts, not provider API accounts.</p>
          </div>
          <button onClick={load} className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-xs font-semibold hover:bg-[var(--color-accent)]/20">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-[var(--color-text-muted)]">Loading...</div>
        ) : error ? (
          <div className="p-6 text-sm text-[var(--color-danger)]">{error}</div>
        ) : (
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {users.map((user) => (
              <div key={user.id} className="p-5 grid grid-cols-1 md:grid-cols-[1fr_180px_180px_120px] gap-4 items-center hover:bg-[var(--color-surface)]/[0.02]">
                <div>
                  <div className="font-mono text-sm text-[var(--color-text-main)]">{user.username}</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-1">{user.id} · {user.created_at || "no timestamp"}</div>
                </div>
                <div className="space-y-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-semibold uppercase ${roleTone[user.role] || roleTone.user}`}>
                    {user.role || "user"}
                  </span>
                  <select value={user.role || "user"} onChange={(e) => update(user, { role: e.target.value })} className="w-full bg-[var(--color-surface-2)]/30 border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm">
                    {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-semibold uppercase ${statusTone[user.status] || statusTone.pending}`}>
                    {user.status || "pending"}
                  </span>
                  <select value={user.status || "pending"} onChange={(e) => update(user, { status: e.target.value })} className="w-full bg-[var(--color-surface-2)]/30 border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm">
                    {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  {user.status === "pending" && (
                    <button onClick={() => update(user, { status: "approved" })} className="px-3 py-1.5 rounded-lg bg-[var(--color-success)]/10 text-[var(--color-success)] text-xs font-semibold hover:bg-[var(--color-success)]/20">
                      Approve
                    </button>
                  )}
                  {(user.status === "approved" || user.status === "active") && (
                    <button onClick={() => update(user, { status: "blocked" })} className="px-3 py-1.5 rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-xs font-semibold hover:bg-[var(--color-danger)]/20">
                      Block
                    </button>
                  )}
                  {(user.status === "blocked" || user.status === "suspended") && (
                    <button onClick={() => update(user, { status: "approved" })} className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-xs font-semibold hover:bg-[var(--color-accent)]/20">
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
