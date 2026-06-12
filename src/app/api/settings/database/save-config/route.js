import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const envPath = process.env.ROUTER_LITE_ENV_LOADED_PATH || path.join(process.cwd(), ".env");
const rootEnvPath = process.env.ROUTER_LITE_ENV_LOADED_PATH || path.join(process.cwd(), "../../.env");

function encodeDatabaseUrlPassword(urlStr) {
  if (!urlStr) return urlStr;
  try {
    const parsed = new URL(urlStr);
    if (parsed.password) parsed.password = encodeURIComponent(decodeURIComponent(parsed.password));
    return parsed.toString();
  } catch {
    const match = urlStr.match(/^(postgresql:\/\/|postgres:\/\/)([^:]+):(.*)@([^/]+)(.*)$/);
    if (match) {
      const [_, protocol, user, password, hostAndPort, rest] = match;
      const encodedPassword = encodeURIComponent(decodeURIComponent(password));
      return `${protocol}${user}:${encodedPassword}@${hostAndPort}${rest}`;
    }
    return urlStr;
  }
}

function normalizeDriver(rawDriver) {
  const driver = (rawDriver || "").toLowerCase();
  if (["postgres", "postgresql", "cockroach", "cockroachdb"].includes(driver)) return driver.startsWith("cockroach") ? "cockroach" : "postgres";
  return "local";
}

async function updateEnvFile(filePath, DB_DRIVER, finalDatabaseUrl) {
  let envContent = "";
  try {
    envContent = await fs.readFile(filePath, "utf8");
  } catch {
    return;
  }

  const lines = envContent.split("\n");
  const updatedLines = [];
  let foundDriver = false;
  let foundUrl = false;

  for (const line of lines) {
    if (line.startsWith("DB_DRIVER=") || line.startsWith("# DB_DRIVER=")) {
      if (DB_DRIVER === "local") updatedLines.push(`# DB_DRIVER=${DB_DRIVER}`);
      else updatedLines.push(`DB_DRIVER=${DB_DRIVER}`);
      foundDriver = true;
    } else if (line.startsWith("DATABASE_URL=") || line.startsWith("# DATABASE_URL=")) {
      if (!finalDatabaseUrl || DB_DRIVER === "local") updatedLines.push(`# DATABASE_URL=`);
      else updatedLines.push(`DATABASE_URL=${finalDatabaseUrl}`);
      foundUrl = true;
    } else {
      updatedLines.push(line);
    }
  }

  if (!foundDriver && DB_DRIVER !== "local") updatedLines.push(`DB_DRIVER=${DB_DRIVER}`);
  if (!foundUrl && finalDatabaseUrl && DB_DRIVER !== "local") updatedLines.push(`DATABASE_URL=${finalDatabaseUrl}`);

  await fs.writeFile(filePath, updatedLines.join("\n"), "utf8");
}

export async function POST(request) {
  try {
    const { DATABASE_URL, DB_DRIVER } = await request.json();
    const normalizedDriver = normalizeDriver(DB_DRIVER);
    const finalDatabaseUrl = normalizedDriver === "local" ? "" : encodeDatabaseUrlPassword(DATABASE_URL);

    // Write file in background after sending response with a longer delay (1.5 seconds)
    // to give client ample time to finish save-config and subsequent config-refresh calls.
    setTimeout(async () => {
      try {
        await updateEnvFile(envPath, normalizedDriver, finalDatabaseUrl);
        if (envPath !== rootEnvPath) await updateEnvFile(rootEnvPath, normalizedDriver, finalDatabaseUrl);
        
        // Force process.exit(12) so that CLI wrapper knows database config changed and restarts
        process.exit(12);
      } catch (e) {
        console.error("Delayed env write failed:", e);
      }
    }, 1500);

    return NextResponse.json({ success: true, DATABASE_URL: finalDatabaseUrl, DB_DRIVER: normalizedDriver });
  } catch (error) {
    console.error("Save config error:", error);
    return NextResponse.json({ error: "Gagal menyimpan konfigurasi: " + error.message }, { status: 500 });
  }
}
