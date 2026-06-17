import { NextResponse } from "next/server";
import * as crypto from "node:crypto";
import { getProvider, getProviderConfig, saveOauthState } from "@/lib/auth/oauthProviders";

export async function GET(req, { params }) {
  const { provider } = await params;
  const def = getProvider(provider);
  const cfg = getProviderConfig(provider);
  if (!def || !cfg?.enabled) {
    return NextResponse.json({ error: `OAuth provider '${provider}' not configured` }, { status: 400 });
  }

  const url = new URL(req.url);
  const baseEnv = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
  const origin = baseEnv ? baseEnv.replace(/\/$/, "") : url.origin;
  const redirect = url.searchParams.get("redirect") || "/dashboard";

  const state = crypto.randomBytes(24).toString("hex");
  await saveOauthState({ state, provider, codeVerifier: null, redirect, ttlMs: 600000 });

  const callbackUrl = `${origin}/api/auth/oauth/${provider}/callback`;
  const qs = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: def.scope,
    state,
  });
  if (provider === "google") {
    qs.set("access_type", "online");
    qs.set("prompt", "select_account");
  }
  return NextResponse.redirect(`${def.authUrl}?${qs.toString()}`);
}
