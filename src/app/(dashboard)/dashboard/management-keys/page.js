"use client";

import { KeyRound, ShieldCheck, Plus } from "lucide-react";

const rows = [
  { name: "mgmt-admin-01", role: "admin", scope: "full", status: "active" },
  { name: "mgmt-dev-01", role: "dev", scope: "readonly", status: "active" },
];

export default function ManagementKeysPage() {
  return (
    <div className="space-y-6 text-[#e2e8f0]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-white">Management Keys</h1>
          <p className="mt-1 text-[13px] text-[#94a3b8]">Kunci internal untuk admin/dev. Kontrol akses panel, automasi, dan operasi sensitif.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-[#38bdf8] px-4 py-2 text-[13px] font-medium text-[#0b132a] hover:bg-[#67e8f9]">
          <Plus size={14} /> Create key
        </button>
      </div>

      <div className="rounded-[20px] border border-[#1f2a44] bg-[#0f1730] overflow-hidden">
        <div className="divide-y divide-[#1f2a44]">
          {rows.map((row) => (
            <div key={row.name} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#1f2a44] bg-[#0b132a] text-[#38bdf8]">
                  <KeyRound size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-[15px] font-semibold text-white">{row.name}</div>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">{row.status}</span>
                  </div>
                  <div className="mt-1 text-[12px] text-[#94a3b8]">Role {row.role} · Scope {row.scope}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-[#94a3b8]">
                <ShieldCheck size={14} className="text-[#38bdf8]" /> privileged control surface
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}