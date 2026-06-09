type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, ttl?: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
  exists(key: string): Promise<number>;
  zadd(key: string, score: number, member: string): Promise<unknown>;
  zcard(key: string): Promise<number>;
  zremrangebyscore(key: string, min: number, max: number): Promise<unknown>;
  expire(key: string, seconds: number): Promise<unknown>;
};

class MemoryRedis implements RedisLike {
  private data = new Map<string, { value: string; expiresAt?: number }>();
  private zsets = new Map<string, Map<string, number>>();

  private cleanup(key: string) {
    const row = this.data.get(key);
    if (row?.expiresAt && row.expiresAt <= Date.now()) this.data.delete(key);
  }

  async get(key: string) {
    this.cleanup(key);
    return this.data.get(key)?.value ?? null;
  }

  async set(key: string, value: string, mode?: string, ttl?: number) {
    const expiresAt = mode?.toUpperCase() === "EX" && ttl ? Date.now() + ttl * 1000 : undefined;
    this.data.set(key, { value, expiresAt });
  }

  async del(key: string) {
    this.data.delete(key);
    this.zsets.delete(key);
  }

  async exists(key: string) {
    this.cleanup(key);
    return this.data.has(key) || this.zsets.has(key) ? 1 : 0;
  }

  async zadd(key: string, score: number, member: string) {
    if (!this.zsets.has(key)) this.zsets.set(key, new Map());
    this.zsets.get(key)!.set(member, score);
  }

  async zcard(key: string) {
    return this.zsets.get(key)?.size ?? 0;
  }

  async zremrangebyscore(key: string, min: number, max: number) {
    const z = this.zsets.get(key);
    if (!z) return;
    Array.from(z.entries()).forEach(([member, score]) => {
      if (score >= min && score <= max) z.delete(member);
    });
  }

  async expire(key: string, _seconds: number) {
    // Memory fallback keeps zsets process-local; no TTL needed for build/dev fallback.
  }
}

let client: RedisLike | null = null;

export async function getRedis(): Promise<RedisLike> {
  if (client) return client;
  client = new MemoryRedis();
  return client;
}
