import { Redis } from "@upstash/redis";
import { promises as fs } from "fs";
import path from "path";

/**
 * Tiny KV abstraction.
 *  - Production / Vercel: Upstash Redis (UPSTASH_REDIS_REST_URL + _TOKEN)
 *  - Local dev: JSON files in ./.data (git-ignored)
 */
const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = hasRedis ? Redis.fromEnv() : null;
const DIR = path.join(process.cwd(), ".data");
const mem = new Map<string, { v: unknown; exp?: number }>();

export const storageMode = hasRedis ? "redis" : "local-file";

async function fileGet<T>(key: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(DIR, `${key}.json`), "utf8")) as T;
  } catch {
    return null;
  }
}

export async function getJSON<T>(key: string): Promise<T | null> {
  if (redis) return ((await redis.get<T>(key)) ?? null) as T | null;
  return fileGet<T>(key);
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  if (redis) {
    await redis.set(key, value as never);
    return;
  }
  try {
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(path.join(DIR, `${key}.json`), JSON.stringify(value));
  } catch {
    throw new Error(
      "No writable storage. Configure UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (required on Vercel)."
    );
  }
}

/** Atomic counter with TTL – used for rate limiting. */
export async function incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
  if (redis) {
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, ttlSeconds);
    return n;
  }
  const now = Date.now();
  const cur = mem.get(key);
  if (!cur || (cur.exp && cur.exp < now)) {
    mem.set(key, { v: 1, exp: now + ttlSeconds * 1000 });
    return 1;
  }
  cur.v = (cur.v as number) + 1;
  return cur.v as number;
}
