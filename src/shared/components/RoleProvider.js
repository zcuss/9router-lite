"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

const RoleContext = createContext({
  realRole: "user",
  effectiveRole: "user",
  user: null,
  loading: true,
  canImpersonate: false,
  viewAs: null,
  setViewAs: () => {},
});

const VIEW_AS_KEY = "9router:viewAs";

export function RoleProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewAs, setViewAsState] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        if (data && !data.error) {
          setUser(data);
          try {
            const stored = localStorage.getItem(VIEW_AS_KEY);
            if (stored && ["user", "admin", null].includes(stored)) {
              if (data.canImpersonate) setViewAsState(stored);
            }
          } catch {}
        }
        setLoading(false);
      })
      .catch(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const setViewAs = useCallback((v) => {
    if (v !== "user" && v !== "admin" && v !== null) return;
    if (v !== null && user && !user.canImpersonate) return;
    setViewAsState(v);
    try {
      if (v) localStorage.setItem(VIEW_AS_KEY, v);
      else localStorage.removeItem(VIEW_AS_KEY);
    } catch {}
  }, [user]);

  const realRole = user?.role || "user";
  const effectiveRole = viewAs || realRole;
  const canImpersonate = !!user?.canImpersonate;

  return (
    <RoleContext.Provider
      value={{ realRole, effectiveRole, user, loading, canImpersonate, viewAs, setViewAs }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}

export function isAdminLike(role) {
  return ["admin", "dev"].includes(String(role || "").toLowerCase());
}
