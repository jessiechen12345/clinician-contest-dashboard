/**
 * Cookie signing/verification shared by middleware (Edge) and API routes (Node). Web Crypto only.
 * Token = `${expiryMs}.${epoch}.${hmac}`. The "epoch" changes whenever an admin changes the password or
 * signs everyone out, which invalidates every previously issued cookie.
 */
import { Redis } from "@upstash/redis";

export const GATE_COOKIE = "site_gate";
export const GATE_MAX_AGE = 60 * 60 * 12; // 12 hours

const enc = new TextEncoder();
const isProd = process.env.NODE_ENV === "production";
const secret = () => process.env.GATE_SECRET || process.env.NEXTAUTH_SECRET || (isProd ? "" : "dev-only-secret");
export const gateSecretConfigured = () => secret() !== "";

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/**
 * Current epoch, read from Redis (the same "gate" key the admin API writes).
 * null = epoch not enforced (local-file mode has no storage reachable from the Edge runtime).
 */
let cache: { v: string; at: number } | null = null;
const redisConfigured = () => !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

async function currentEpoch(forceFresh: boolean): Promise<string | null> {
  if (!redisConfigured()) return null;
  const age = cache ? Date.now() - cache.at : Infinity;
  if (cache && age < (forceFresh ? 2_000 : 30_000)) return cache.v;
  try {
    const rec = await Redis.fromEnv().get<{ epoch?: string }>("gate");
    cache = { v: rec?.epoch ?? "0", at: Date.now() };
    return cache.v;
  } catch {
    return "__unavailable__"; // fail closed
  }
}

export async function createGateToken(epoch: string): Promise<string> {
  const body = `${Date.now() + GATE_MAX_AGE * 1000}.${epoch}`;
  return `${body}.${await sign(body)}`;
}

export async function verifyGateToken(token?: string): Promise<boolean> {
  if (!token || !gateSecretConfigured()) return false;
  const [exp, epoch, sig] = token.split(".");
  if (!exp || !epoch || !sig || Number(exp) < Date.now()) return false;
  if (!safeEqual(sig, await sign(`${exp}.${epoch}`))) return false;
  const cur = await currentEpoch(false);
  if (cur === null || cur === epoch) return true;
  return (await currentEpoch(true)) === epoch; // re-check once in case the cache is stale
}

/** Only allow same-site relative redirects; default landing page is /dashboard. */
export function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login")
    ? next
    : "/dashboard";
}
