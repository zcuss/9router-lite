import { getAdapter } from "../db/driver.js";

const PROVIDER_DEFS = {
  google: {
    label: "Google",
    icon: "google",
    color: "#4285F4",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid email profile",
    idField: "sub",
    emailField: "email",
    nameField: "name",
    pictureField: "picture",
    emailVerifiedField: "email_verified",
  },
  github: {
    label: "GitHub",
    icon: "github",
    color: "#181717",
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userInfoUrl: "https://api.github.com/user",
    emailsUrl: "https://api.github.com/user/emails",
    scope: "read:user user:email",
    idField: "id",
    emailField: "email",
    nameField: "name",
    pictureField: "avatar_url",
  },
  discord: {
    label: "Discord",
    icon: "discord",
    color: "#5865F2",
    authUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    userInfoUrl: "https://discord.com/api/users/@me",
    scope: "identify email",
    idField: "id",
    emailField: "email",
    nameField: "global_name",
    pictureField: "avatar",
    avatarUrlBuilder: (id, avatar) => avatar
      ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.${avatar.startsWith("a_") ? "gif" : "png"}`
      : null,
  },
};

export function listProviders() {
  return Object.entries(PROVIDER_DEFS).map(([id, def]) => ({
    id,
    label: def.label,
    icon: def.icon,
    color: def.color,
  }));
}

export function getProvider(id) {
  return PROVIDER_DEFS[id] || null;
}

export function getProviderConfig(id) {
  const def = PROVIDER_DEFS[id];
  if (!def) return null;
  return {
    clientId: process.env[`${id.toUpperCase()}_CLIENT_ID`] || "",
    clientSecret: process.env[`${id.toUpperCase()}_CLIENT_SECRET`] || "",
    enabled: !!process.env[`${id.toUpperCase()}_CLIENT_ID`],
  };
}

export async function getOauthState(state) {
  const db = await getAdapter();
  const row = await db.get(`SELECT * FROM oauth_states WHERE state = ?`, [state]);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db.run(`DELETE FROM oauth_states WHERE state = ?`, [state]);
    return null;
  }
  return row;
}

export async function saveOauthState({ state, provider, codeVerifier, redirect, ttlMs = 600000 }) {
  const db = await getAdapter();
  const expires = new Date(Date.now() + ttlMs).toISOString();
  await db.run(
    `INSERT INTO oauth_states (state, provider, code_verifier, redirect, expires_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (state) DO UPDATE SET provider = EXCLUDED.provider, code_verifier = EXCLUDED.code_verifier, redirect = EXCLUDED.redirect, expires_at = EXCLUDED.expires_at`,
    [state, provider, codeVerifier || null, redirect || null, expires]
  );
}

export async function deleteOauthState(state) {
  const db = await getAdapter();
  await db.run(`DELETE FROM oauth_states WHERE state = ?`, [state]);
}

export async function findUserByProviderSubject(provider, subject) {
  const db = await getAdapter();
  return await db.get(
    `SELECT u.id, u.username, u.email, u.role, u.status, u.provider, u.provider_subject, u.display_name, u.avatar_url 
     FROM users u 
     JOIN user_providers up ON u.id = up.user_id 
     WHERE up.provider = ? AND up.provider_subject = ? 
     LIMIT 1`,
    [provider, String(subject)]
  );
}

export async function findUserByEmail(email) {
  const db = await getAdapter();
  if (!email) return null;
  return await db.get(
    `SELECT id, username, email, role, status, provider, provider_subject, display_name, avatar_url FROM users WHERE email = ?`,
    [String(email).toLowerCase()]
  );
}

export async function upsertOAuthUser({ provider, subject, email, emailVerified, displayName, avatarUrl }) {
  const db = await getAdapter();
  const lowerEmail = email ? String(email).toLowerCase() : null;
  const now = new Date().toISOString();

  // Helper to ensure the (user, provider, subject) trio exists in user_providers
  const linkProvider = async (userId) => {
    await db.run(
      `INSERT INTO user_providers (user_id, provider, provider_subject, created_at) 
       VALUES (?, ?, ?, ?) 
       ON CONFLICT DO NOTHING`,
      [userId, provider, String(subject), now]
    );
  };

  // 1. Existing user matched by (provider, subject) in user_providers
  const existing = await findUserByProviderSubject(provider, subject);
  if (existing) {
    await linkProvider(existing.id);
    await db.run(
      `UPDATE users SET email = COALESCE(?, email), email_verified = COALESCE(?, email_verified), display_name = COALESCE(?, display_name), avatar_url = COALESCE(?, avatar_url), updated_at = ? WHERE id = ?`,
      [lowerEmail, emailVerified ?? null, displayName || null, avatarUrl || null, now, existing.id]
    );
    return { id: existing.id, isNew: false };
  }

  // 2. Existing user matched by email — link the provider to it
  if (lowerEmail) {
    const byEmail = await findUserByEmail(lowerEmail);
    if (byEmail) {
      await linkProvider(byEmail.id);
      // DO NOT overwrite `provider` or `provider_subject` columns in `users` because the user
      // may have already linked multiple providers. We only persist the link in `user_providers`.
      await db.run(
        `UPDATE users SET email_verified = COALESCE(?, email_verified), display_name = COALESCE(?, display_name), avatar_url = COALESCE(?, avatar_url), updated_at = ? WHERE id = ?`,
        [emailVerified ?? null, displayName || null, avatarUrl || null, now, byEmail.id]
      );
      return { id: byEmail.id, isNew: false };
    }
  }

  // 3. Brand new user
  const id = crypto.randomUUID();
  const baseUsername = (lowerEmail ? lowerEmail.split("@")[0] : `${provider}_${subject}`).toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 32) || `user_${id.slice(0, 8)}`;
  let username = baseUsername;
  let n = 0;
  while (await db.get(`SELECT 1 FROM users WHERE username = ?`, [username])) {
    n += 1;
    username = `${baseUsername}_${n}`;
    if (n > 50) { username = `user_${id.slice(0, 12)}`; break; }
  }
  await db.run(
    `INSERT INTO users (id, username, email, email_verified, provider, provider_subject, display_name, avatar_url, role, status, balance_cents, voucher_cents, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user', 'approved', 0, 0, '', ?, ?)`,
    [id, username, lowerEmail, emailVerified ?? false, provider, String(subject), displayName || null, avatarUrl || null, now, now]
  );
  await linkProvider(id);
  return { id, isNew: true, username };
}
