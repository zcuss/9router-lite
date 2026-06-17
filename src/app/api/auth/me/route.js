import { NextResponse } from "next/server";
import { getCurrentDashboardUser } from "@/lib/auth/currentUser";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentDashboardUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    id: user.userId || user.id,
    username: user.username,
    role: user.role,
    canManageUsers: ["admin", "dev"].includes(String(user.role || "").toLowerCase()),
    canImpersonate: String(user.role || "").toLowerCase() === "dev",
  });
}
