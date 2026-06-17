"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const useRoleStore = create(
  persist(
    (set, get) => ({
      realRole: "dev",
      viewAs: null,
      username: null,
      setRealUser: (user) => set({
        realRole: user?.role || "dev",
        username: user?.username || null,
      }),
      setViewAs: (role) => set({ viewAs: role || null }),
      clear: () => set({ realRole: "dev", viewAs: null, username: null }),
    }),
    {
      name: "9router-role",
      storage: createJSONStorage(() => (typeof window === "undefined" ? { getItem: () => null, setItem: () => {}, removeItem: () => {} } : window.localStorage)),
    }
  )
);

export default useRoleStore;

export function useEffectiveRole() {
  const real = useRoleStore((s) => s.realRole);
  const viewAs = useRoleStore((s) => s.viewAs);
  return viewAs || real;
}

export function useCanViewAs() {
  return useRoleStore((s) => s.realRole) === "dev";
}
