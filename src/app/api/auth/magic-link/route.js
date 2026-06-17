import { NextResponse } from "next/server";
import { issueMagicLink, sendMagicLinkEmail, buildMagicLinkUrl } from "@/lib/auth/magicLink";

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const email = (body?.email || "").toString().trim();
  const result = await issueMagicLink(email);
  if (!result.ok) {
    if (result.error === "rate_limited") {
      return NextResponse.json({ error: "rate_limited", retryAfterMs: result.retryAfterMs }, { status: 429 });
    }
    return NextResponse.json({ error: result.error || "issue_failed" }, { status: 400 });
  }
  const baseEnv = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
  const origin = baseEnv ? baseEnv.replace(/\/$/, "") : new URL(req.url).origin;
  const link = buildMagicLinkUrl(origin, result.token);
  const transport = await sendMagicLinkEmail(email, link);
  const isDevMode = transport.transport === "console";
  return NextResponse.json({
    sent: transport.sent,
    transport: transport.transport,
    devMode: isDevMode,
    // Only included when SMTP not configured — for local dev/test usage
    devLink: isDevMode ? link : undefined,
    expiresAt: result.expiresAt,
  });
}
