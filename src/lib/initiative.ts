import { defaultSettings, resolveMonthConfig } from "./config";
import { currentMonthKey, isMonthKey, monthLabel } from "./months";
import { loadSettings } from "./store";
import type { DashboardInputs } from "./metabase";
import type { MonthKey, Settings } from "./types";

/** Prizes, dates, thresholds and "last draw" still come from the admin settings; never fails the page. */
export async function safeSettings(): Promise<Settings> {
  try {
    return await loadSettings();
  } catch {
    return defaultSettings();
  }
}

/** Metabase has no list of months, so offer the current month, the two before it, and any admin-configured ones. */
export function monthOptions(settings: Settings): { key: MonthKey; label: string }[] {
  const now = currentMonthKey();
  const [y, m] = now.split("-").map(Number);
  const keys = new Set<string>([settings.activeMonth, ...Object.keys(settings.months)]);
  for (let i = 0; i < 3; i++) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    keys.add(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return Array.from(keys).filter(isMonthKey).sort().map((key) => ({ key, label: monthLabel(key) }));
}

export function inputsFor(settings: Settings, month: MonthKey): DashboardInputs {
  const c = resolveMonthConfig(settings, month);
  return { base_target: c.target, stretch_target: c.stretch, start_date: c.startDate, end_date: c.endDate };
}
