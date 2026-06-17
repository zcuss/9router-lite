import { NextResponse } from "next/server";
import { getApiKeys, createApiKey, getApiKeyById } from "@/lib/db/repos/apiKeysRepo";
import { getCurrentDashboardUser } from "@/lib/auth/currentUser";
import { canManageUsers } from "@/lib/auth/currentUser";
import { getConsistentMachineId } from "@/shared/utils/machineId";

export const dynamic = "force-dynamic";

// GET /api/keys - List API keys (filtered by current user; admin/dev sees all)
export async function GET() {
  try {
    const user = await getCurrentDashboardUser();
    const allKeys = await getApiKeys();
    const isPrivileged = canManageUsers(user);
    const myId = user?.userId || user?.id || null;
    const keys = isPrivileged
      ? allKeys
      : allKeys.filter((k) => k.userId === myId);
    return NextResponse.json({ keys });
  } catch (error) {
    console.log("Error fetching keys:", error);
    return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
  }
}

// POST /api/keys - Create new API key (always owned by current user)
export async function POST(request) {
  try {
    const user = await getCurrentDashboardUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const { name } = body;
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const machineId = await getConsistentMachineId();
    const userId = user.userId || user.id;
    const apiKey = await createApiKey(name, machineId, userId);

    return NextResponse.json({
      key: apiKey.key,
      name: apiKey.name,
      id: apiKey.id,
      machineId: apiKey.machineId,
      userId: apiKey.userId,
    }, { status: 201 });
  } catch (error) {
    console.log("Error creating key:", error);
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }
}
