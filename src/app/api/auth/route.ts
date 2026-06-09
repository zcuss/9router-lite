import { NextResponse } from "next/server";
import { createUser, verifyPassword } from "@/lib/db/users";
import { createDashboardAuthToken } from "@/lib/auth/dashboardSession";

export async function POST(request: Request) {
  try {
    const { action, username, password, role } = await request.json();

    if (action === "register") {
      const user = await createUser(username, password, role || "user");
      // Auto-login after registration
      const token = await createDashboardAuthToken({
        userId: user.id,
        username: user.username,
        role: user.role,
      });
      const response = NextResponse.json({ success: true, user });
      response.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return response;
    }

    if (action === "login") {
      const verified = await verifyPassword(username, password);
      if (!verified) {
        return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
      }

      const token = await createDashboardAuthToken({
        userId: verified.id,
        username: verified.username,
        role: verified.role,
      });
      const response = NextResponse.json({ success: true, user: verified });
      response.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return response;
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
