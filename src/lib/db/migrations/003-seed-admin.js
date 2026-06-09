import * as crypto from "node:crypto";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

export default {
  version: 3,
  name: "seed_admin_dev_role",
  async up(db) {
    const now = new Date().toISOString();
    const existing = await db.get("SELECT id FROM users WHERE username = ?", ["admin"]);
    if (!existing) {
      await db.run(
        `INSERT INTO users (id, username, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), "admin", hashPassword("admin123"), "dev", "approved", now, now]
      );
    } else {
      await db.run("UPDATE users SET role = ?, status = ?, updated_at = ? WHERE username = ?", ["dev", "approved", now, "admin"]);
    }
  }
};
