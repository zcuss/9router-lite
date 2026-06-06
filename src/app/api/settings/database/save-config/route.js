import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env");
// Jika berjalan di standalone, root project ada 2 tingkat di atas
const rootEnvPath = path.join(process.cwd(), "../../.env");

function encodeDatabaseUrlPassword(urlStr) {
  if (!urlStr) return urlStr;
  try {
    const parsed = new URL(urlStr);
    if (parsed.password) {
      parsed.password = encodeURIComponent(decodeURIComponent(parsed.password));
    }
    return parsed.toString();
  } catch (e) {
    const match = urlStr.match(/^(postgresql:\/\/|postgres:\/\/)([^:]+):(.*)@([^/]+)(.*)$/);
    if (match) {
      const [_, protocol, user, password, hostAndPort, rest] = match;
      const encodedPassword = encodeURIComponent(decodeURIComponent(password));
      return `${protocol}${user}:${encodedPassword}@${hostAndPort}${rest}`;
    }
    return urlStr;
  }
}

async function updateEnvFile(filePath, DB_DRIVER, finalDatabaseUrl) {
  let envContent = "";
  try {
    envContent = await fs.readFile(filePath, "utf8");
  } catch {
    return; // Abaikan jika file tidak ada
  }

  const lines = envContent.split("\n");
  const updatedLines = [];
  let foundDriver = false;
  let foundUrl = false;

  for (const line of lines) {
    if (line.startsWith("DB_DRIVER=") || line.startsWith("# DB_DRIVER=")) {
      if (DB_DRIVER === "local") {
        updatedLines.push(`# DB_DRIVER=${DB_DRIVER}`);
      } else {
        updatedLines.push(`DB_DRIVER=${DB_DRIVER}`);
      }
      foundDriver = true;
    } else if (line.startsWith("DATABASE_URL=") || line.startsWith("# DATABASE_URL=")) {
      if (!finalDatabaseUrl || DB_DRIVER === "local") {
        updatedLines.push(`# DATABASE_URL=`);
      } else {
        updatedLines.push(`DATABASE_URL=${finalDatabaseUrl}`);
      }
      foundUrl = true;
    } else {
      updatedLines.push(line);
    }
  }

  if (!foundDriver && DB_DRIVER !== "local") {
    updatedLines.push(`DB_DRIVER=${DB_DRIVER}`);
  }
  if (!foundUrl && finalDatabaseUrl && DB_DRIVER !== "local") {
    updatedLines.push(`DATABASE_URL=${finalDatabaseUrl}`);
  }

  await fs.writeFile(filePath, updatedLines.join("\n"), "utf8");
}

export async function POST(request) {
  try {
    const { DATABASE_URL, DB_DRIVER } = await request.json();
    const finalDatabaseUrl = DB_DRIVER === "local" ? "" : encodeDatabaseUrlPassword(DATABASE_URL);

    // Update .env di cwd
    await updateEnvFile(envPath, DB_DRIVER, finalDatabaseUrl);

    // Update .env di root project jika berbeda
    if (envPath !== rootEnvPath) {
      await updateEnvFile(rootEnvPath, DB_DRIVER, finalDatabaseUrl);
    }

    // Pemicu restart otomatis setelah 1 detik
    setTimeout(() => {
      console.log("[DB Config] Exiting with code 12 to trigger CLI restart...");
      process.exit(12);
    }, 1000);

    return NextResponse.json({ success: true, DATABASE_URL: finalDatabaseUrl });
  } catch (error) {
    console.error("Save config error:", error);
    return NextResponse.json({ error: "Gagal menyimpan konfigurasi: " + error.message }, { status: 500 });
  }
}
