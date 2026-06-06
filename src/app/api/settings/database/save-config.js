import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, "/../../../.env");

export async function POST(request) {
  try {
    const { DATABASE_URL, DB_DRIVER } = await request.json();

    // Read current .env
    let envContent = "";
    try {
      envContent = await fs.readFile(envPath, "utf8");
    } catch {
      envContent = "";
    }

    // Update or add DB settings
    const lines = envContent.split("\n");
    const updatedLines = [];
    let foundDriver = false;
    let foundUrl = false;

    for (const line of lines) {
      if (line.startsWith("DB_DRIVER=")) {
        updatedLines.push(`DB_DRIVER=${DB_DRIVER}`);
        foundDriver = true;
      } else if (line.startsWith("DATABASE_URL=")) {
        updatedLines.push(`DATABASE_URL=${DATABASE_URL}`);
        foundUrl = true;
      } else {
        updatedLines.push(line);
      }
    }

    if (!foundDriver) {
      updatedLines.push(`DB_DRIVER=${DB_DRIVER}`);
    }
    if (!foundUrl) {
      updatedLines.push(`DATABASE_URL=${DATABASE_URL}`);
    }

    await fs.writeFile(envPath, updatedLines.join("\n"), "utf8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save config error:", error);
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}