import { BALLOT_SOURCE, type BallotSource } from "./ballotSource";
import type {
  BallotResult,
  ClinicianRecord,
  Dataset,
  MonthConfig,
  MonthKey,
  MonthMetrics,
  Settings
} from "./types";

type Rules = Pick<MonthConfig, "target" | "stretch" | "minConsults" | "minPsat">;

/**
 * Mirrors the spreadsheet formula:
 *   IF(AND(consults>=70, psat>=4.65, rate>=2.15), 2,
 *   IF(AND(consults>=70, psat>=4.65, rate>=2),    1, 0))
 * with every threshold configurable from the admin portal.
 */
export function computeBallots(m: MonthMetrics | undefined, rules: Rules): BallotResult {
  const hasData = !!m && m.rate !== null && m.consults !== null;
  const rate = m?.rate ?? null;
  const consults = m?.consults ?? null;
  const psat = m?.psat ?? null;

  const volumeOk = consults !== null && consults >= rules.minConsults;
  const psatOk = rules.minPsat <= 0 || (psat !== null && psat >= rules.minPsat);
  const gatesOk = volumeOk && psatOk;
  const targetOk = rate !== null && rate >= rules.target;
  const stretchOk = rate !== null && rate >= rules.stretch;

  const checks: BallotResult["checks"] = [
    { key: "volume", label: "Minimum consults", met: volumeOk, actual: consults, required: rules.minConsults },
    ...(rules.minPsat > 0
      ? [{ key: "psat" as const, label: "Patient satisfaction (PSAT)", met: psatOk, actual: psat, required: rules.minPsat }]
      : []),
    { key: "target", label: "Target consults/hr", met: targetOk, actual: rate, required: rules.target },
    { key: "stretch", label: "Stretch consults/hr", met: stretchOk, actual: rate, required: rules.stretch }
  ];

  let ballots: 0 | 1 | 2 = 0;
  const breakdown: BallotResult["breakdown"] = [];
  if (hasData && gatesOk && targetOk) {
    ballots = 1;
    breakdown.push({ label: "Target achieved", ballots: 1 });
    if (stretchOk) {
      ballots = 2;
      breakdown.push({ label: "Stretch target achieved", ballots: 1 });
    }
  }
  return { ballots, hasData, checks, breakdown };
}

export interface ResolvedBallots {
  ballots: 0 | 1 | 2;
  hasData: boolean;
}

/**
 * The ballots that count for one clinician in one month. With BALLOT_SOURCE = "sheet" this is the sheet's own
 * "Ballots Earned" value (a month with no usable figures, or a blank Ballots Earned cell, counts as "no data" rather
 * than a silent 0). With "rules" it is calculated from the settings.
 */
export function resolveBallots(m: MonthMetrics | undefined, rules: Rules, source: BallotSource = BALLOT_SOURCE): ResolvedBallots {
  if (source === "rules") {
    const r = computeBallots(m, rules);
    return { ballots: r.ballots, hasData: r.hasData };
  }
  const hasData = !!m && m.rate !== null && m.consults !== null && m.sheetBallots !== null;
  if (!hasData) return { ballots: 0, hasData: false };
  const n = Math.round(m!.sheetBallots as number);
  return { ballots: n <= 0 ? 0 : n >= 2 ? 2 : 1, hasData: true };
}

export function isEligible(rec: ClinicianRecord, settings: Settings): boolean {
  const allowed = settings.eligibleStatuses.map((s) => s.toLowerCase());
  return allowed.length === 0 || allowed.includes(rec.status.trim().toLowerCase());
}

export interface PoolStats {
  totalBallots: number;
  participants: number; // clinicians with >= 1 ballot
  eligible: number; // eligible clinicians with data for the month
  distribution: { 0: number; 1: number; 2: number };
  entries: { rec: ClinicianRecord; ballots: number }[];
}

export function computePool(ds: Dataset, settings: Settings, month: MonthKey, cfg: MonthConfig, source: BallotSource = BALLOT_SOURCE): PoolStats {
  const entries: PoolStats["entries"] = [];
  const distribution = { 0: 0, 1: 0, 2: 0 };
  let totalBallots = 0;
  let eligible = 0;
  for (const rec of ds.records) {
    if (!isEligible(rec, settings)) continue;
    const r = resolveBallots(rec.months[month], cfg, source);
    if (!r.hasData) continue;
    eligible++;
    distribution[r.ballots]++;
    if (r.ballots > 0) {
      totalBallots += r.ballots;
      entries.push({ rec, ballots: r.ballots });
    }
  }
  return { totalBallots, participants: entries.length, eligible, distribution, entries };
}

export function formatOdds(ballots: number, pool: number) {
  if (ballots <= 0 || pool <= 0) return { percent: "0%", oneIn: null as number | null };
  const p = (ballots / pool) * 100;
  const percent = p >= 10 ? `${p.toFixed(1)}%` : `${p.toFixed(2)}%`;
  return { percent, oneIn: Math.max(1, Math.round(pool / ballots)) };
}
