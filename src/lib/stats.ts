import { isEligible } from "./ballots";
import type { Dataset, MonthKey, Settings } from "./types";

/** PSAT is scored out of 5 (the ballot rule uses 4.65). Change if your scale differs. */
export const PSAT_SCALE = 5;

export interface MonthStats {
  /** null = data was synced before ON/QC were stored; re-sync to fill in. */
  ontarioConsults: number | null;
  quebecConsults: number | null;
  avgPsat: number | null;
  psatPercent: number | null;
  clinicians: number;
}

/** Anonymous aggregates over eligible clinicians who have data for the month. */
export function computeStats(ds: Dataset, settings: Settings, month: MonthKey): MonthStats {
  let on = 0, qc = 0, haveSplit = false, psatSum = 0, psatN = 0, clinicians = 0;
  for (const rec of ds.records) {
    if (!isEligible(rec, settings)) continue;
    const m = rec.months[month];
    if (!m || m.rate === null || m.consults === null) continue;
    clinicians++;
    if (m.on !== undefined || m.qc !== undefined) {
      haveSplit = true;
      on += m.on ?? 0;
      qc += m.qc ?? 0;
    }
    if (m.psat !== null && m.psat > 0) { psatSum += m.psat; psatN++; }
  }
  const avgPsat = psatN ? psatSum / psatN : null;
  return {
    ontarioConsults: haveSplit ? on : null,
    quebecConsults: haveSplit ? qc : null,
    avgPsat,
    psatPercent: avgPsat === null ? null : (avgPsat / PSAT_SCALE) * 100,
    clinicians
  };
}
