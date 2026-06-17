import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getProvider, getProviderConfig, getOauthState, deleteOauthState, upsertOAuthUser } from "@/lib/auth/oauthProviders";
import { setDashboardAuthCookie } from "@/lib/auth/dashboardSession";
import { getAdapter } from "@/lib/db/driver.js";

async function exchangeCode(provider, code, callbackUrl, cfg) {
  const def = getProvider(provider);
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code,
    redirect_uri: callbackUrl,
    grant_type: "authorization_code",
  });
  const res = await fetch(def.tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); }
  catch {
    // GitHub may return form-encoded
    const params = new URLSearchParams(text);
    json = Object.fromEntries(params.entries());
  }
  if (!json.access_token) {
    throw new Error(`token exchange failed: ${text.slice(0, 200)}`);
  }
  return json.access_token;
}

async function fetchProfile(provider, accessToken) {
  const def = getProvider(provider);
  const headers = { accept: "application/json", authorization: `Bearer ${accessToken}` };
  const userRes = await fetch(def.userInfoUrl, { headers });
  if (!userRes.ok) throw new Error(`userInfo failed: ${userRes.status}`);
  const user = await userRes.json();

  let email = user[def.emailField] || null;
  let emailVerified = user[def.emailVerifiedField] ?? null;
  let subject = String(user[def.idField] || "");

  if (provider === "github" && (!email || !emailVerified)) {
    const emailsRes = await fetch(def.emailsUrl, { headers });
    if (emailsRes.ok) {
      const emails = await emailsRes.json();
      const primary = Array.isArray(emails) ? emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified) : null;
      if (primary) {
        email = primary.email;
        emailVerified = primary.verified;
      }
    }
  }

  const avatar = user[def.pictureField] || null;
  const avatarUrl = def.avatarUrlBuilder ? def.avatarUrlBuilder(subject, avatar) : avatar;

  return {
    subject,
    email,
    emailVerified: !!emailVerified,
    displayName: user[def.nameField] || user.login || user.username || null,
    avatarUrl,
  };
}

function getBaseOrigin(req) {
  const baseEnv = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
  if (baseEnv) return baseEnv.replace(/\/$/, "");
  if (req) {
    try { return new URL(req.url).origin; } catch { return ""; }
  }
  return "";
}

export async function GET(req, { params }) {
  const { provider } = await params;
  const def = getProvider(provider);
  const cfg = getProviderConfig(provider);
  if (!def || !cfg?.enabled) {
    return NextResponse.redirect(`${getBaseOrigin(req)}/login?error=oauth_not_configured&provider=${provider}`);
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(`${getBaseOrigin(req)}/login?error=${encodeURIComponent(providerError)}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${getBaseOrigin(req)}/login?error=missing_code_or_state`);
  }

  const stateRow = await getOauthState(state);
  if (!stateRow || stateRow.provider !== provider) {
    return NextResponse.redirect(`${getBaseOrigin(req)}/login?error=invalid_state`);
  }
  await deleteOauthState(state);

  try {
    const callbackUrl = `${getBaseOrigin(req)}/api/auth/oauth/${provider}/callback`;
    const accessToken = await exchangeCode(provider, code, callbackUrl, cfg);
    const profile = await fetchProfile(provider, accessToken);
    if (!profile.subject) throw new Error("provider returned no subject id");

    const upserted = await upsertOAuthUser({
      provider,
      subject: profile.subject,
      email: profile.email,
      emailVerified: profile.emailVerified,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    });

    const db = await getAdapter();
    const userRow = await db.get(
      `SELECT id, username, email, role, status, display_name, avatar_url, provider FROM users WHERE id = ?`,
      [upserted.id]
    );
    if (!userRow) throw new Error("user row missing after upsert");

    const cookieStore = await cookies();
    await setDashboardAuthCookie(cookieStore, req, {
      userId: userRow.id,
      username: userRow.username,
      role: userRow.role,
      status: userRow.status,
      provider: userRow.provider,
      oidcEmail: userRow.email || null,
      oidcName: userRow.display_name || userRow.username,
    });

    const target = stateRow.redirect && /^\//.test(stateRow.redirect) ? stateRow.redirect : "/dashboard";
    return NextResponse.redirect(`${getBaseOrigin(req)}${target}`);
  } catch (err) {
    console.error(`[oauth:${provider}] callback failed:`, err);
    return NextResponse.redirect(`${getBaseOrigin(req)}/login?error=oauth_failed&detail=${encodeURIComponent(err.message?.slice(0, 120) || "unknown")}`);
  }
}
