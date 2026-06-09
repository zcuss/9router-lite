import { getRedis } from "./redis";

export async function isLocked(connectionId: string, model: string): Promise<boolean> {
  const redis = await getRedis();
  const exists = await redis.exists(`lock:${connectionId}:${model}`);
  return exists === 1;
}

export async function lockModel(
  connectionId: string,
  model: string,
  reason: string,
  ttlSeconds?: number
): Promise<void> {
  const redis = await getRedis();
  const key = `lock:${connectionId}:${model}`;
  const payload = JSON.stringify({ reason, timestamp: Date.now() });
  if (ttlSeconds) {
    await redis.set(key, payload, "EX", ttlSeconds);
  } else {
    await redis.set(key, payload);
  }
}

export async function unlockModel(connectionId: string, model: string): Promise<void> {
  const redis = await getRedis();
  await redis.del(`lock:${connectionId}:${model}`);
}
