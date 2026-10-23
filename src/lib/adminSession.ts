/**
 * Admin sign-in without any third-party login: an approved email + the shared ADMIN_PASSWORD.
 * Approved emails come from the ADMIN_EMAILS environment variable (comma-separated) and, optionally,
 * src/config/adminWhitelist.ts. The session is a signed, httpOnly cookie that lasts 8 hours.
 * Removing an email from the list revokes that person's session immediately.
 */
import { cookies } from "next/headers";
import { ADMIN_WHITELIST } from "@/config/adminWhitelist";

export const ADMIN_COOKIE = "admin_session";
export const ADMIN_MAX_AGE = 60 * 60 * 8;

const enc = new TextEncoder();
const secret = () => process.env.GATE_SECRET || process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev-only-secret");

export function adminEmails(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS ?? "").split(/[,;\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const fromFile = ADMIN_WHITELIST.map((a) => a.email.trim().toLowerCase()).filter((e) => e && !e.endsWith("@example.com"));
  return Array.from(new Set([...fromEnv, ...fromFile]));
}

export const isApprovedAdmin = (email: string) => adminEmails().includes(email.trim().toLowerCase());
export const adminConfigured = () => !!process.env.ADMIN_PASSWORD && secret() !== "" && adminEmails().length > 0;

async function hmac(payload: string): Promise<string> {
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

/** Compares via hashes so the comparison is constant-time and length doesn't leak. */
export async function adminPasswordMatches(input: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return false;
  return safeEqual(await hmac(`pw:${input}`), await hmac(`pw:${expected}`));
}

export async function createAdminToken(email: string): Promise<string> {
  const body = `${Date.now() + ADMIN_MAX_AGE * 1000}.${Buffer.from(email.trim().toLowerCase()).toString("base64url")}`;
  return `${body}.${await hmac(`admin:${body}`)}`;
}

/** Returns the admin's email if the token is genuine, unexpired, and the email is still approved. */
export async function verifyAdminToken(token?: string): Promise<string | null> {
  if (!token || secret() === "") return null;
  const [exp, enc64, sig] = token.split(".");
  if (!exp || !enc64 || !sig || Number(exp) < Date.now()) return null;
  if (!safeEqual(sig, await hmac(`admin:${exp}.${enc64}`))) return null;
  const email = Buffer.from(enc64, "base64url").toString();
  return isApprovedAdmin(email) ? email : null;
}

export async function getAdminFromCookies(): Promise<string | null> {
  try {
    return await verifyAdminToken(cookies().get(ADMIN_COOKIE)?.value);
  } catch {
    return null;
  }
}
