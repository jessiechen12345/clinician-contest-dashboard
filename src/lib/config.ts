import type { MonthConfig, MonthKey, Settings } from "./types";
import { currentMonthKey, monthBounds } from "./months";

export const DEFAULT_RULES = {
  target: 2.0, // 75th percentile
  stretch: 2.15, // 85th percentile
  minConsults: 70, // mirrors the sheet's AND(SUM ON/QC >= 70, ...)
  minPsat: 4.65 // mirrors the sheet's PSAT gate
} as const;

export function defaultSettings(): Settings {
  return {
    activeMonth: currentMonthKey(),
    eligibleStatuses: ["Active"],
    months: {}
  };
}

export function resolveMonthConfig(settings: Settings, month: MonthKey): MonthConfig {
  const b = monthBounds(month);
  const o = settings.months[month] ?? {};
  return {
    prizes: o.prizes ?? [],
    target: o.target ?? DEFAULT_RULES.target,
    stretch: o.stretch ?? DEFAULT_RULES.stretch,
    minConsults: o.minConsults ?? DEFAULT_RULES.minConsults,
    minPsat: o.minPsat ?? DEFAULT_RULES.minPsat,
    startDate: o.startDate ?? b.start,
    endDate: o.endDate ?? b.end,
    lastDrawAt: o.lastDrawAt ?? null
  };
}
