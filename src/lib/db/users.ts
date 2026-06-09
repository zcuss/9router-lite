import * as crypto from "crypto";
import type { Role } from "../auth/rbac";
import { getAdapter } from "./driver.js";
import { encrypt, decrypt } from "../crypto";

export async function getUserByUsername(username: string) {
  const db = await getAdapter();
  const row = await db.get(`SELECT * FROM users WHERE username = ?`, [username]);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role as Role,
    status: row.status,
  } as const;
}

export async function createUser(username: string, password: string, role: Role = "user") {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha256").toString("hex");
  const passwordHash = `${salt}:${hash}`;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const db = await getAdapter();
  await db.run(
    `INSERT INTO users (id, username, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, username, passwordHash, role, "approved", now, now]
  );
  return { id, username, role };
}

export async function verifyPassword(username: string, password: string): Promise<{ id: string; username: string; role: Role; status: string } | null> {
  const user = await getUserByUsername(username);
  if (!user) return null;
  const [salt, hash] = user.passwordHash.split(":");
  const computedHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha256").toString("hex");
  if (computedHash !== hash) return null;
  return { id: user.id, username: user.username, role: user.role, status: user.status };
}

export async function encryptAndStoreApiKey(connectionId: string, plainApiKey: string): Promise<string> {
  const encrypted = encrypt(plainApiKey);
  const db = await getAdapter();
  await db.run(`UPDATE providerConnections SET api_key = ? WHERE id = ?`, [encrypted, connectionId]);
  return encrypted;
}

export function decryptStoredApiKey(encryptedApiKey: string): string {
  return decrypt(encryptedApiKey);
}
