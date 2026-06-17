import { NextResponse } from "next/server";
import { deleteApiKey, getApiKeyById, updateApiKey } from "@/lib/db/repos/apiKeysRepo";
import { getCurrentDashboardUser, canManageUsers } from "@/lib/auth/currentUser";

export const dynamic = "force-dynamic";

function ensureOwnerOrAdmin(key, user) {
  if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 });
  const isPrivileged = canManageUsers(user);
  if (!isPrivileged) {
    const myId = user?.userId || user?.id;
    if (key.userId && key.userId !== myId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  return null;
}

// GET /api/keys/[id] - Get single key
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const user = await getCurrentDashboardUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const key = await getApiKeyById(id);
    const guard = ensureOwnerOrAdmin(key, user);
    if (guard) return guard;
    return NextResponse.json({ key });
  } catch (error) {
    console.log("Error fetching key:", error);
    return NextResponse.json({ error: "Failed to fetch key" }, { status: 500 });
  }
}

// PUT /api/keys/[id] - Update key
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const user = await getCurrentDashboardUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const { isActive } = body;
    const existing = await getApiKeyById(id);
    const guard = ensureOwnerOrAdmin(existing, user);
    if (guard) return guard;
    const updateData = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    const updated = await updateApiKey(id, updateData);
    return NextResponse.json({ key: updated });
  } catch (error) {
    console.log("Error updating key:", error);
    return NextResponse.json({ error: "Failed to update key" }, { status: 500 });
  }
}

// DELETE /api/keys/[id] - Delete API key
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const user = await getCurrentDashboardUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const existing = await getApiKeyById(id);
    const guard = ensureOwnerOrAdmin(existing, user);
    if (guard) return guard;
    const deleted = await deleteApiKey(id);
    if (!deleted) return NextResponse.json({ error: "Key not found" }, { status: 404 });
    return NextResponse.json({ message: "Key deleted successfully" });
  } catch (error) {
    console.log("Error deleting key:", error);
    return NextResponse.json({ error: "Failed to delete key" }, { status: 500 });
  }
}
