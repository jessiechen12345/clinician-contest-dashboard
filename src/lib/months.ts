import type { MonthKey } from "./types";

const NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const isMonthKey = (v: unknown): v is MonthKey =>
  typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

export function monthLabel(key: MonthKey): string {
  const [y, m] = key.split("-").map(Number);
  return `${NAMES[m - 1]} ${y}`;
}

/** "09/01/2026" or "9/1/2026" -> "2026-09" (US month-first, matching the sheet). */
export function monthKeyFromSheetDate(raw: string): MonthKey | null {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(raw ?? "");
  if (!m) return null;
  const mm = Number(m[1]);
  if (mm < 1 || mm > 12) return null;
  return `${m[3]}-${String(mm).padStart(2, "0")}`;
}

export function currentMonthKey(now = new Date()): MonthKey {
  // Contest runs on Pacific time.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric",
    month: "2-digit"
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  return `${y}-${m}`;
}

export function monthBounds(key: MonthKey): { start: string; end: string } {
  const [y, m] = key.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${String(last).padStart(2, "0")}` };
}
