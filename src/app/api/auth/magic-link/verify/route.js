import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { consumeMagicLink } from "@/lib/auth/magicLink";
import { setDashboardAuthCookie } from "@/lib/auth/dashboardSession";

export async function GET(req) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const redirectParam = url.searchParams.get("redirect") || "/dashboard";

  const baseEnv = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
  const origin = baseEnv ? baseEnv.replace(/\/$/, "") : url.origin;

  if (!token) {
    return NextResponse.redirect(`${origin}/login?error=missing_token`);
  }

  const result = await consumeMagicLink(token);
  if (!result.ok) {
    return NextResponse.redirect(`${origin}/login?error=magic_${result.error}`);
  }

  const cookieStore = await cookies();
  await setDashboardAuthCookie(cookieStore, req, {
    userId: result.user.id,
    username: result.user.username,
    role: result.user.role,
    status: result.user.status,
    provider: result.user.provider,
    oidcEmail: result.user.email || null,
    oidcName: result.user.display_name || result.user.username,
  });

  const target = /^\//.test(redirectParam) ? redirectParam : "/dashboard";
  return NextResponse.redirect(`${origin}${target}`);
}
