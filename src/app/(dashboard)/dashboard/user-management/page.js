"use client";

import { useEffect, useState } from "react";

const roles = ["user", "premium", "dev", "admin"];
const statuses = ["pending", "approved", "blocked", "active", "suspended"];

const statusTone = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  blocked: "bg-red-500/10 text-red-400 border-red-500/20",
  suspended: "bg-red-500/10 text-red-400 border-red-500/20",
};

const roleTone = {
  admin: "bg-purple-500/10 text-purple-300 border-purple-500/20",
  dev: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  premium: "bg-brand-500/10 text-brand-400 border-brand-500/20",
  user: "bg-white/5 text-text-muted border-white/10",
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
        <h1 className="text-3xl font-bold text-text-main">User Management</h1>
        <p className="text-sm text-text-muted mt-1">Dev/Admin role manager, approval status, account login control.</p>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface/70 backdrop-blur-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-text-main">Users</h2>
            <p className="text-xs text-text-muted">Login accounts, not provider API accounts.</p>
          </div>
          <button onClick={load} className="px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-500 text-xs font-semibold hover:bg-brand-500/20">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-text-muted">Loading...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-400">{error}</div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {users.map((user) => (
              <div key={user.id} className="p-5 grid grid-cols-1 md:grid-cols-[1fr_180px_180px_120px] gap-4 items-center hover:bg-white/[0.02]">
                <div>
                  <div className="font-mono text-sm text-text-main">{user.username}</div>
                  <div className="text-xs text-text-muted mt-1">{user.id} · {user.created_at || "no timestamp"}</div>
                </div>
                <div className="space-y-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-semibold uppercase ${roleTone[user.role] || roleTone.user}`}>
                    {user.role || "user"}
                  </span>
                  <select value={user.role || "user"} onChange={(e) => update(user, { role: e.target.value })} className="w-full bg-black/30 border border-border rounded-lg px-3 py-2 text-sm">
                    {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-semibold uppercase ${statusTone[user.status] || statusTone.pending}`}>
                    {user.status || "pending"}
                  </span>
                  <select value={user.status || "pending"} onChange={(e) => update(user, { status: e.target.value })} className="w-full bg-black/30 border border-border rounded-lg px-3 py-2 text-sm">
                    {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  {user.status === "pending" && (
                    <button onClick={() => update(user, { status: "approved" })} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20">
                      Approve
                    </button>
                  )}
                  {(user.status === "approved" || user.status === "active") && (
                    <button onClick={() => update(user, { status: "blocked" })} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20">
                      Block
                    </button>
                  )}
                  {(user.status === "blocked" || user.status === "suspended") && (
                    <button onClick={() => update(user, { status: "approved" })} className="px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 text-xs font-semibold hover:bg-brand-500/20">
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
