import { currentMonthKey } from "./months";
import type { MonthKey } from "./types";

/** The tracker starts in November 2026. Earlier months in the uploaded file are never shown. */
export const LAUNCH_MONTH: MonthKey = "2026-11";

/** The month shown first: this month once it has begun (Pacific time), but never earlier than the launch month. */
export function startingMonthKey(now: Date = new Date()): MonthKey {
  const current = currentMonthKey(now);
  return current < LAUNCH_MONTH ? LAUNCH_MONTH : current;
}

/** Months people can pick: from the launch month up to the month that has begun. Past months stay available. */
export function visibleMonths(months: MonthKey[], now: Date = new Date()): MonthKey[] {
  const last = startingMonthKey(now);
  return months.filter((m) => m >= LAUNCH_MONTH && m <= last).sort();
}

/** The requested month if it's allowed; otherwise this month, or the latest allowed month before it. */
export function pickMonth(visible: MonthKey[], requested: unknown, now: Date = new Date()): MonthKey {
  if (typeof requested === "string" && visible.includes(requested)) return requested;
  const start = startingMonthKey(now);
  if (visible.includes(start)) return start;
  const earlier = visible.filter((m) => m <= start);
  return earlier.length ? earlier[earlier.length - 1] : start;
}
