/** Node-only: password storage and checking. (Never import from middleware.) */
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { getJSON, setJSON } from "./storage";

export const DEFAULT_PASSWORD = "password";
const KEY = "gate";

export interface GateRecord {
  salt: string;
  hash: string;
  epoch: string;
  updatedAt: string;
  updatedBy: string;
}

export function hashPassword(pw: string, salt = randomBytes(16).toString("hex")) {
  return { salt, hash: scryptSync(pw, salt, 32).toString("hex") };
}

export function verifyHash(pw: string, salt: string, hash: string): boolean {
  const a = scryptSync(pw, salt, 32);
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export const loadGate = () => getJSON<GateRecord>(KEY);

/** Until an admin sets a password: APP_PASSWORD (or legacy SITE_PASSWORD) if set, otherwise "password". */
const envPassword = () => process.env.APP_PASSWORD || process.env.SITE_PASSWORD || "";
const bootstrapPassword = () => envPassword() || DEFAULT_PASSWORD;

export async function checkPassword(input: string): Promise<{ ok: boolean; epoch: string }> {
  const rec = await loadGate();
  if (rec) return { ok: verifyHash(input, rec.salt, rec.hash), epoch: rec.epoch };
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(bootstrapPassword()).digest();
  return { ok: timingSafeEqual(a, b), epoch: "0" };
}

export async function gateStatus() {
  const rec = await loadGate();
  return {
    usingDefault: !rec && bootstrapPassword() === DEFAULT_PASSWORD,
    usingEnvPassword: !rec && !!envPassword(),
    updatedAt: rec?.updatedAt ?? null,
    updatedBy: rec?.updatedBy ?? null
  };
}

/** Set a new password (and/or just rotate the epoch to sign everyone out). Returns the new epoch. */
export async function rotateGate(by: string, newPassword?: string): Promise<string> {
  const rec = await loadGate();
  const base = newPassword
    ? hashPassword(newPassword)
    : rec
    ? { salt: rec.salt, hash: rec.hash }
    : hashPassword(bootstrapPassword());
  const epoch = randomUUID();
  await setJSON(KEY, { ...base, epoch, updatedAt: new Date().toISOString(), updatedBy: by } satisfies GateRecord);
  return epoch;
}
