"use client";

import { useEffect, useState } from "react";
import useRoleStore, { useEffectiveRole } from "@/store/roleStore";
import UserEndpointPage from "./UserEndpointPage";
import EndpointPageClient from "./EndpointPageClient";

export default function EndpointRoleRouter({ machineId }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const realRole = useRoleStore((s) => s.realRole);
  const viewAs = useRoleStore((s) => s.viewAs);
  // Effective: viewAs takes priority. Only show the legacy full-featured client
  // when the real role is admin/dev AND not currently impersonating a user.
  const showFull = mounted && (realRole === "dev" || realRole === "admin") && !viewAs;

  if (!mounted) {
    return <div className="p-8 text-[var(--color-text-muted)] text-sm">Loading…</div>;
  }
  if (showFull) {
    return <EndpointPageClient machineId={machineId} />;
  }
  return <UserEndpointPage />;
}
