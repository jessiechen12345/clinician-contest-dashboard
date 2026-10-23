import { Redis } from "@upstash/redis";

/** Vercel's Upstash integration may inject either naming scheme; accept both. */
export function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

export function getRedis(): Redis | null {
  const c = redisConfig();
  return c ? new Redis(c) : null;
}
