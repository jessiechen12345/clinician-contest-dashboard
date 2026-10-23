import { computePool, isEligible } from "./ballots";
import { defaultSettings } from "./config";
import { isMonthKey, monthLabel } from "./months";
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

export const monthChoices = (ds: Dataset) => ds.months.map((key) => ({ key, label: monthLabel(key) }));

/** Requested month if the upload has it; otherwise the admin's active month; otherwise the latest month uploaded. */
export function resolveMonth(ds: Dataset, settings: Settings, requested: unknown): MonthKey {
  if (isMonthKey(requested) && ds.months.includes(requested)) return requested;
  if (ds.months.includes(settings.activeMonth)) return settings.activeMonth;
  return ds.months[ds.months.length - 1];
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
