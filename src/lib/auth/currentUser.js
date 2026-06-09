import { cookies } from "next/headers";
import { verifyDashboardAuthToken } from "./dashboardSession";

export async function getCurrentDashboardUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = await verifyDashboardAuthToken(token);
  return payload || null;
}

export function canManageUsers(user) {
  return ["admin", "dev"].includes(String(user?.role || "").toLowerCase());
}
