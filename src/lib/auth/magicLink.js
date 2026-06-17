import * as crypto from "node:crypto";
import nodemailer from "nodemailer";
import { getAdapter } from "../db/driver.js";

const TOKEN_TTL_MS = 15 * 60 * 1000;
const RATE_LIMIT_MS = 60 * 1000;
const MAX_ACTIVE_PER_EMAIL = 3;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function loadSettingsAuth() {
  const url = process.env.SMTP_URL || "";
  let host, port, user, pass, from;
  if (url) {
    try {
      const u = new URL(url);
      host = u.hostname;
      port = parseInt(u.port || "587", 10);
      user = decodeURIComponent(u.username || "");
      pass = decodeURIComponent(u.password || "");
    } catch {}
  }
  host = host || process.env.SMTP_HOST || "";
  port = port || parseInt(process.env.SMTP_PORT || "587", 10);
  user = user || process.env.SMTP_USER || "";
  pass = pass || process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "";
  from = from || process.env.SMTP_FROM || (user ? user : "no-reply@9router.local");
  return { host, port, user, pass, from, enabled: !!(host && user && pass) };
}

export { loadSettingsAuth };

let cachedTransport = null;
function getTransport() {
  const s = loadSettingsAuth();
  if (!s.enabled) return null;
  if (cachedTransport) return cachedTransport;
  cachedTransport = nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.port === 465,
    auth: { user: s.user, pass: s.pass },
  });
  return cachedTransport;
}

export async function sendMagicLinkEmail(email, link) {
  const t = getTransport();
  const s = loadSettingsAuth();
  const subject = "Your 9Router sign-in link";
  const text = `Sign in to 9Router:\n\n${link}\n\nThis link expires in 15 minutes and can be used once. If you did not request it, ignore this email.`;
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#0b1220;color:#e2e8f0;padding:24px"><div style="max-width:480px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:12px;padding:32px"><h1 style="margin:0 0 8px;font-size:20px">Sign in to 9Router</h1><p style="color:#94a3b8;margin:0 0 24px">Click the button below to sign in. The link expires in 15 minutes.</p><a href="${link}" style="display:inline-block;background:#06b6d4;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">Sign in to 9Router</a><p style="color:#64748b;font-size:12px;margin-top:24px">If you did not request this email, you can safely ignore it.</p><p style="color:#475569;font-size:11px;margin-top:12px">Or paste this link: ${link}</p></div></body></html>`;

  if (!t) {
    console.log(`[magic-link] SMTP not configured. Email=${email} Link=${link}`);
    return { sent: false, transport: "console" };
  }
  await t.sendMail({ from: s.from, to: email, subject, text, html });
  return { sent: true, transport: "smtp" };
}

export async function issueMagicLink(email) {
  const lower = String(email || "").toLowerCase().trim();
  if (!lower || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) {
    return { ok: false, error: "invalid_email" };
  }
  const db = await getAdapter();
  const now = Date.now();

  const last = await db.get(`SELECT created_at FROM magic_links WHERE email = ? ORDER BY created_at DESC LIMIT 1`, [lower]);
  if (last && now - new Date(last.created_at).getTime() < RATE_LIMIT_MS) {
    return { ok: false, error: "rate_limited", retryAfterMs: RATE_LIMIT_MS - (now - new Date(last.created_at).getTime()) };
  }

  const nowIso = new Date().toISOString();
  const active = await db.all(`SELECT id FROM magic_links WHERE email = ? AND used_at IS NULL AND expires_at > ?`, [lower, nowIso]);
  if (active.length >= MAX_ACTIVE_PER_EMAIL) {
    await db.run(`DELETE FROM magic_links WHERE email = ? AND used_at IS NULL AND expires_at <= ?`, [lower, nowIso]);
  }

  const id = crypto.randomUUID();
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expires = new Date(now + TOKEN_TTL_MS).toISOString();
  await db.run(
    `INSERT INTO magic_links (id, email, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
    [id, lower, tokenHash, expires]
  );

  return { ok: true, id, token, expiresAt: expires };
}

export async function consumeMagicLink(token) {
  const tokenHash = hashToken(String(token || ""));
  const db = await getAdapter();
  const row = await db.get(`SELECT * FROM magic_links WHERE token_hash = ?`, [tokenHash]);
  if (!row) return { ok: false, error: "not_found" };
  if (row.used_at) return { ok: false, error: "already_used" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, error: "expired" };

  const nowIso = new Date().toISOString();
  await db.run(`UPDATE magic_links SET used_at = ? WHERE id = ?`, [nowIso, row.id]);

  let user = await db.get(`SELECT id, username, email, role, status, provider, display_name, avatar_url FROM users WHERE email = ?`, [row.email]);
  let created = false;
  if (!user) {
    const newId = crypto.randomUUID();
    const baseUsername = row.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 32) || `user_${newId.slice(0, 8)}`;
    let username = baseUsername;
    let n = 0;
    while (await db.get(`SELECT 1 FROM users WHERE username = ?`, [username])) {
      n += 1;
      username = `${baseUsername}_${n}`;
      if (n > 50) { username = `user_${newId.slice(0, 12)}`; break; }
    }
    await db.run(
      `INSERT INTO users (id, username, email, email_verified, provider, role, status, balance_cents, voucher_cents, password_hash, created_at, updated_at) VALUES (?, ?, ?, true, 'magic_link', 'user', 'approved', 0, 0, '', ?, ?)`,
      [newId, username, row.email, nowIso, nowIso]
    );
    user = await db.get(`SELECT id, username, email, role, status, provider, display_name, avatar_url FROM users WHERE id = ?`, [newId]);
    created = true;
  } else if (user.provider !== "magic_link") {
    // Link the existing account to magic_link provider so future logins skip the user lookup
    await db.run(`UPDATE users SET email_verified = true, updated_at = ? WHERE id = ?`, [nowIso, user.id]);
  }
  return { ok: true, user, created };
}

export function buildMagicLinkUrl(origin, token) {
  const u = new URL("/api/auth/magic-link/verify", origin);
  u.searchParams.set("token", token);
  return u.toString();
}
