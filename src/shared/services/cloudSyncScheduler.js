import { getSettings } from "@/lib/localDb";
import crypto from "crypto";

let syncInterval = null;

function encryptData(data, key) {
  if (!key) return data;
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag
    };
  } catch (e) {
    console.error("[CloudSync] Encryption failed:", e.message);
    return data;
  }
}

export async function startCloudSync() {
  if (syncInterval) clearInterval(syncInterval);
  
  const settings = await getSettings();
  const isEnabled = process.env.CLOUD_SYNC_ENABLED === 'true' || settings.cloudEnabled;
  
  if (!isEnabled) {
    console.log("[CloudSync] Sync is disabled.");
    return;
  }

  console.log("[CloudSync] Starting scheduler...");
  
  syncInterval = setInterval(async () => {
    try {
      const settings = await getSettings();
      if (!(process.env.CLOUD_SYNC_ENABLED === 'true' || settings.cloudEnabled)) {
        clearInterval(syncInterval);
        return;
      }
      
      console.log("[CloudSync] Running periodic sync...");
      const dataToSync = { timestamp: Date.now() };
      const encryptionKey = process.env.ENCRYPTION_KEY;
      
      const payload = encryptionKey ? encryptData(dataToSync, encryptionKey) : dataToSync;
      
    } catch (e) {
      console.error("[CloudSync] Sync failed:", e.message);
    }
  }, 60000);
}

export function stopCloudSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log("[CloudSync] Scheduler stopped.");
  }
}
