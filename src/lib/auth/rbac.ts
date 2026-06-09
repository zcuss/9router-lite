export const ROLES = ["admin", "dev", "premium+", "premium", "user"] as const;
export type Role = (typeof ROLES)[number];

const ROLE_RANK: Record<Role, number> = {
  user: 0,
  premium: 1,
  "premium+": 2,
  dev: 3,
  admin: 4,
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function hasRole(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function canManageProviderKeys(role: Role): boolean {
  return role === "admin" || role === "dev";
}

export function canApproveProviderKeys(role: Role): boolean {
  return role === "admin";
}

export function canCreateGlobalCombo(role: Role): boolean {
  return role === "admin";
}

export function canCreatePersonalCombo(role: Role): boolean {
  return role !== "user";
}

export function getDailyLimit(role: Role): number | null {
  if (role === "admin" || role === "dev" || role === "premium+") return null;
  if (role === "premium") return 1000;
  return 100;
}
