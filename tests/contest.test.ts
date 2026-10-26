import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { parseProductivityCsv, ParseError } from "../src/lib/csv";
import { computeBallots, computePool, formatOdds } from "../src/lib/ballots";
import { DEFAULT_RULES, defaultSettings, resolveMonthConfig } from "../src/lib/config";

const csv = readFileSync(path.join(__dirname, "../sample-data/Contests_Ballot_Calculation_Productivity.sample.csv"), "utf8");
const ds = parseProductivityCsv(csv);
const settings = { ...defaultSettings(), activeMonth: "2026-10" };

describe("CSV parser", () => {
  it("detects all four month blocks by date, not by column letter", () => {
    expect(ds.months).toEqual(["2026-09", "2026-10", "2026-11", "2026-12"]);
  });
  it("skips #N/A / blank rows and keeps only minimal fields", () => {
    expect(ds.records.every((r) => r.id && !r.id.startsWith("#"))).toBe(true);
    expect(Object.keys(ds.records[0]).sort()).toEqual(["email", "id", "months", "name", "status"]);
  });
  it("reads All Up consults/hr from the right column (not the ratio column)", () => {
    const r = ds.records.find((x) => x.id === "EDGE-TARGET")!;
    expect(r.months["2026-09"].rate).toBe(2.0);
    expect(r.months["2026-09"].consults).toBe(80);
  });
  it("rejects files without the expected header", () => {
    expect(() => parseProductivityCsv("a,b\n1,2")).toThrow(ParseError);
  });
});

describe("ballot rules (mirror the sheet formula)", () => {
  // the synthetic sample file was generated with the old 70-consult rule, so test against that rule explicitly
  const cfg = { ...resolveMonthConfig(settings, "2026-09"), minConsults: 70 };
  const get = (id: string) => ds.records.find((r) => r.id === id)!.months["2026-09"];
  it("1 ballot at target", () => expect(computeBallots(get("EDGE-TARGET"), cfg).ballots).toBe(1));
  it("2 ballots at stretch", () => expect(computeBallots(get("EDGE-STRETCH"), cfg).ballots).toBe(2));
  it("0 ballots below the 70-consult minimum even with a high rate", () => expect(computeBallots(get("EDGE-LOWVOL"), cfg).ballots).toBe(0));
  it("0 ballots below the PSAT minimum", () => expect(computeBallots(get("EDGE-LOWPSAT"), cfg).ballots).toBe(0));
  it("PSAT rule can be switched off", () =>
    expect(computeBallots(get("EDGE-LOWPSAT"), { ...DEFAULT_RULES, minPsat: 0 }).ballots).toBe(2));
  it("agrees with the sheet's own Ballots Earned column for every clinician", () => {
    for (const rec of ds.records) {
      const m = rec.months["2026-09"];
      if (m.sheetBallots !== null) expect(computeBallots(m, cfg).ballots).toBe(m.sheetBallots);
    }
  });
  it("no data -> hasData false", () => expect(computeBallots(undefined, cfg).hasData).toBe(false));
});

describe("pool and odds", () => {
  it("excludes inactive clinicians from the pool", () => {
    const cfg = resolveMonthConfig(settings, "2026-09");
    const pool = computePool(ds, settings, "2026-09", cfg);
    expect(pool.entries.every((e) => e.rec.status === "Active")).toBe(true);
    expect(pool.totalBallots).toBe(pool.entries.reduce((s, e) => s + e.ballots, 0));
  });
  it("formats odds", () => {
    expect(formatOdds(1, 54)).toEqual({ percent: "1.85%", oneIn: 54 });
    expect(formatOdds(0, 54)).toEqual({ percent: "0%", oneIn: null });
  });
});
