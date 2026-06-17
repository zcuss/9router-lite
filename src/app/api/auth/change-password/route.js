import { NextResponse } from "next/server";
import * as crypto from "node:crypto";
import { getAdapter } from "@/lib/db/driver";
import { getCurrentDashboardUser } from "@/lib/auth/currentUser";

export async function POST(request) {
  try {
    const user = await getCurrentDashboardUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const current = String(body?.currentPassword || "");
    const next = String(body?.newPassword || "");

    if (!next || next.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }
    if (next === current) {
      return NextResponse.json({ error: "New password must differ from current" }, { status: 400 });
    }

    const db = await getAdapter();
    const row = await db.get(`SELECT id, password_hash FROM users WHERE id = ? LIMIT 1`, [user.id]);
    if (!row) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Verify current password (skip for password-less providers like env/magic_link)
    const stored = row.password_hash || "";
    if (stored && !stored.startsWith("env:")) {
      const [salt, hash] = stored.split(":");
      if (salt && hash) {
        const computed = crypto.pbkdf2Sync(current, salt, 1000, 64, "sha256").toString("hex");
        if (computed !== hash) {
          return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
        }
      }
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const newHash = crypto.pbkdf2Sync(next, salt, 1000, 64, "sha256").toString("hex");
    const newStored = `${salt}:${newHash}`;
    const now = new Date().toISOString();
    await db.run(
      `UPDATE users SET password_hash = ?, provider = CASE WHEN provider = 'env' THEN 'password' ELSE provider END, updated_at = ? WHERE id = ?`,
      [newStored, now, user.id]
    );
    return NextResponse.json({ success: true, message: "Password updated" });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
