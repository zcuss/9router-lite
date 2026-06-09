import { NextResponse } from "next/server";
import { createUser, verifyPassword } from "@/lib/db/users";
import { createDashboardAuthToken, shouldUseSecureCookie } from "@/lib/auth/dashboardSession";

function setAuthCookie(response, token, request) {
  response.cookies.set("auth_token", token, {
    httpOnly: true,
    secure: shouldUseSecureCookie(request),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function POST(request) {
  try {
    const { action = "login", username, password, role } = await request.json();
    const safeUsername = String(username || "").trim();
    const safePassword = String(password || "");

    if (!safeUsername || !safePassword) {
      return NextResponse.json({ success: false, error: "Username and password required" }, { status: 400 });
    }

    if (action === "register") {
      const user = await createUser(safeUsername, safePassword, role || "user");
      const token = await createDashboardAuthToken({
        userId: user.id,
        username: user.username,
        role: user.role,
      });
      const response = NextResponse.json({ success: true, user });
      setAuthCookie(response, token, request);
      return response;
    }

    const user = await verifyPassword(safeUsername, safePassword);
    if (!user) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }

    const token = await createDashboardAuthToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });
    const response = NextResponse.json({ success: true, user });
    setAuthCookie(response, token, request);
    return response;
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
