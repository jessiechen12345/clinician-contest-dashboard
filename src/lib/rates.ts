import type { MonthMetrics } from "./types";

/** Spreadsheet-style ROUND(x, 1): halves round up (so 1.95 becomes 2.0 and 2.15 becomes 2.2). */
export const round1 = (x: number) => Math.round(Number((x * 10).toPrecision(12))) / 10;

/**
 * The consults per hour shown to a clinician: the sheet's "Consults/Hr Adj" column.
 * If that cell is blank, use ROUND(All Up, 1), which is exactly what the Adj column calculates, so the number is the same.
 */
export function displayRate(m: MonthMetrics | undefined): number | null {
  if (!m) return null;
  if (m.rateAdj !== undefined && m.rateAdj !== null) return m.rateAdj;
  return m.rate !== null ? round1(m.rate) : null;
}
