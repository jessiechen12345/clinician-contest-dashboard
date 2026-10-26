import { computeBallots, isEligible } from "./ballots";
import type { Dataset, MonthConfig, MonthKey, Settings } from "./types";

export interface RuleStats {
  eligibleWithData: number;
  metConsults: number;
  metSatisfaction: number;
  metBoth: number;
  reachedThreshold: number;
  blockedByConsults: number;
  blockedBySatisfaction: number;
  oneBallot: number;
  twoBallots: number;
  noBallots: number;
}

/** How the ballot rules play out on the uploaded data for one month (counts only; no clinician details). */
export function ballotRuleStats(ds: Dataset, settings: Settings, month: MonthKey, cfg: MonthConfig): RuleStats {
  const s: RuleStats = {
    eligibleWithData: 0, metConsults: 0, metSatisfaction: 0, metBoth: 0, reachedThreshold: 0,
    blockedByConsults: 0, blockedBySatisfaction: 0, oneBallot: 0, twoBallots: 0, noBallots: 0
  };
  for (const rec of ds.records) {
    if (!isEligible(rec, settings)) continue;
    const r = computeBallots(rec.months[month], cfg);
    if (!r.hasData) continue;
    const met = (key: string) => r.checks.find((c) => c.key === key)?.met ?? true; // satisfaction rule off => met
    const volume = met("volume"), psat = met("psat"), target = met("target");
    s.eligibleWithData++;
    if (volume) s.metConsults++;
    if (psat) s.metSatisfaction++;
    if (volume && psat) s.metBoth++;
    if (target) {
      s.reachedThreshold++;
      if (!volume) s.blockedByConsults++;
      else if (!psat) s.blockedBySatisfaction++;
    }
    if (r.ballots === 2) s.twoBallots++;
    else if (r.ballots === 1) s.oneBallot++;
    else s.noBallots++;
  }
  return s;
}
