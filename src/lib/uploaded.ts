import { computePool, isEligible } from "./ballots";
import { defaultSettings } from "./config";
import { monthLabel } from "./months";
import { pickMonth, visibleMonths } from "./launch";
import { loadSettings } from "./store";
import type { Dataset, MonthKey, Settings } from "./types";

/** Prizes, dates and thresholds come from the admin settings; never fails the page. */
export async function safeSettings(): Promise<Settings> {
  try {
    return await loadSettings();
  } catch {
    return defaultSettings();
  }
}

export const monthChoices = (ds: Dataset, now: Date = new Date()) => visibleMonths(ds.months, now).map((key) => ({ key, label: monthLabel(key) }));

/**
 * The requested month if it is allowed (launch month onward, not in the future); otherwise the current month once it
 * has begun, or the latest earlier month. The admin's "active month" setting is no longer used.
 */
export function resolveMonth(ds: Dataset, _settings: Settings, requested: unknown, now: Date = new Date()): MonthKey {
  return pickMonth(visibleMonths(ds.months, now), requested, now);
}

function eligibleWithData(ds: Dataset, settings: Settings, month: MonthKey) {
  return ds.records.flatMap((rec) => {
    const m = rec.months[month];
    return isEligible(rec, settings) && m && m.rate !== null && m.consults !== null ? [m] : [];
  });
}

/** Combined Québec + Ontario consults (the sheet's SUM ON/QC column). */
export function totalConsults(ds: Dataset, settings: Settings, month: MonthKey): number | null {
  const rows = eligibleWithData(ds, settings, month);
  return rows.length ? rows.reduce((s, m) => s + (m.consults ?? 0), 0) : null;
}

/** Mean Patient Satisfaction Score over clinicians who have one. */
export function averageSatisfaction(ds: Dataset, settings: Settings, month: MonthKey): number | null {
  const scores = eligibleWithData(ds, settings, month).map((m) => m.psat).filter((n): n is number => n !== null && n > 0);
  return scores.length ? scores.reduce((s, n) => s + n, 0) / scores.length : null;
}

export { computePool };
