import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { parseProductivityCsv } from "../src/lib/csv";
import { computePool } from "../src/lib/ballots";
import { DEFAULT_RULES, defaultSettings, resolveMonthConfig } from "../src/lib/config";
import { ballotRuleStats } from "../src/lib/ruleStats";

const ds = parseProductivityCsv(readFileSync(path.join(__dirname, "../sample-data/Contests_Ballot_Calculation_Productivity.sample.csv"), "utf8"));
const settings = { ...defaultSettings(), activeMonth: "2026-09" };
const cfg = resolveMonthConfig(settings, "2026-09");

describe("ballot rule statistics", () => {
  const s = ballotRuleStats(ds, settings, "2026-09", cfg);
  it("agrees with the ballot pool", () => {
    const pool = computePool(ds, settings, "2026-09", cfg);
    expect(s.eligibleWithData).toBe(pool.eligible);
    expect(s.oneBallot + s.twoBallots * 2).toBe(pool.totalBallots);
    expect(s.oneBallot + s.twoBallots + s.noBallots).toBe(s.eligibleWithData);
  });
  it("is internally consistent", () => {
    expect(s.metBoth).toBeLessThanOrEqual(Math.min(s.metConsults, s.metSatisfaction));
    expect(s.reachedThreshold - s.blockedByConsults - s.blockedBySatisfaction).toBe(s.oneBallot + s.twoBallots);
  });
  it("shows clinicians who reached the threshold but were blocked by the satisfaction or consults rule", () => {
    // the sample data includes EDGE-LOWVOL (69 consults, 2.5/hr) and EDGE-LOWPSAT (4.6, 2.5/hr)
    expect(s.blockedByConsults).toBeGreaterThanOrEqual(1);
    expect(s.blockedBySatisfaction).toBeGreaterThanOrEqual(1);
  });
  it("turning the satisfaction rule off removes those blocks", () => {
    const off = ballotRuleStats(ds, settings, "2026-09", { ...cfg, minPsat: 0 });
    expect(off.blockedBySatisfaction).toBe(0);
    expect(off.metSatisfaction).toBe(off.eligibleWithData);
    expect(DEFAULT_RULES.minPsat).toBe(4.65);
  });
});
