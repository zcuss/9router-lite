"use client";

import { useEffect, useRef } from "react";
import useRoleStore from "@/store/roleStore";

const STATUS_ENDPOINT = "/api/auth/status";
const FETCH_COOLDOWN_MS = 5 * 60 * 1000; // 5 min between status fetches

export default function RoleSync({ children }) {
  const setRealUser = useRoleStore((s) => s.setRealUser);
  const clear = useRoleStore((s) => s.clear);
  const lastFetchedRef = useRef(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const now = Date.now();
      if (now - lastFetchedRef.current < FETCH_COOLDOWN_MS) return;
      lastFetchedRef.current = now;
      try {
        const res = await fetch(STATUS_ENDPOINT, { cache: "no-store" });
        if (!res.ok) {
          if (alive) clear();
          return;
        }
        const data = await res.json();
        if (!alive) return;
        if (data?.authenticated && data?.user) {
          setRealUser({
            role: data.user.role || "dev",
            username: data.user.username || data.user.displayName || null,
          });
        } else {
          clear();
        }
      } catch {
        if (alive) clear();
      }
    })();
    return () => {
      alive = false;
    };
    // intentionally empty: fetch once on mount, throttled by ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return children;
}
