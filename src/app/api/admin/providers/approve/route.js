import { NextResponse } from "next/server";
import { getProviderConnectionById, updateProviderConnection } from "@/models";
import { getDashboardAuthSession } from "@/lib/auth/dashboardSession";
import { hasRole } from "@/lib/auth/rbac";

export async function POST(request) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    const session = await getDashboardAuthSession(token);
    const userRole = session?.role || "user";
    const userId = session?.userId || null;

    if (!hasRole(userRole, "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { connectionId, action, rejectionReason } = await request.json();
    if (!connectionId || !action) {
      return NextResponse.json({ error: "connectionId and action are required" }, { status: 400 });
    }

    const conn = await getProviderConnectionById(connectionId);
    if (!conn) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    if (action === "approve") {
      let updateData = {
        status: "approved",
        approvedBy: userId,
        approvedAt: new Date().toISOString(),
        rejectionReason: null
      };

      if (conn.pendingRevision) {
        updateData = {
          ...updateData,
          ...conn.pendingRevision,
          pendingRevision: null
        };
      }

      const updated = await updateProviderConnection(connectionId, updateData);
      return NextResponse.json({ success: true, connection: updated });
    } else if (action === "reject") {
      const updateData = {
        status: "rejected",
        rejectionReason: rejectionReason || "Rejected by admin",
        pendingRevision: null
      };
      const updated = await updateProviderConnection(connectionId, updateData);
      return NextResponse.json({ success: true, connection: updated });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}