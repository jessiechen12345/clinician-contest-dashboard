import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { displayRate, round1 } from "../src/lib/rates";
import { parseProductivityCsv } from "../src/lib/csv";

const m = (rate: number | null, rateAdj?: number | null) => ({ consults: 100, rate, rateAdj, psat: 4.8, sheetBallots: 1 });

describe("round1 matches the spreadsheet's ROUND(x, 1)", () => {
  it("rounds halves up", () => {
    const cases: [number, number][] = [[1.94, 1.9], [1.949, 1.9], [1.95, 2.0], [1.96, 2.0], [2.04, 2.0], [2.05, 2.1], [2.14, 2.1], [2.15, 2.2], [2.16, 2.2], [2.5, 2.5], [0, 0], [4.35, 4.4], [0.35, 0.4]];
    for (const [x, want] of cases) expect(round1(x), String(x)).toBe(want);
  });
});

describe("the consults per hour clinicians see", () => {
  it("is the sheet's Adj value, not All Up", () => {
    expect(displayRate(m(1.96, 2.0))).toBe(2.0);
    expect(displayRate(m(2.73, 2.7))).toBe(2.7);
  });
  it("keeps a real zero", () => expect(displayRate(m(0, 0))).toBe(0));
  it("falls back to ROUND(All Up, 1), which is what the Adj column calculates, when the Adj cell is blank", () => {
    expect(displayRate(m(1.96, null))).toBe(2.0);
    expect(displayRate(m(2.15))).toBe(2.2); // older files without an Adj column
  });
  it("is empty when there are no figures", () => {
    expect(displayRate(m(null, null))).toBeNull();
    expect(displayRate(undefined)).toBeNull();
  });
  it("works on the older 7-column layout too", () => {
    const ds = parseProductivityCsv(readFileSync(path.join(__dirname, "../sample-data/Contests_Ballot_Calculation_Productivity.sample.csv"), "utf8"));
    const x = ds.records.find((r) => r.id === "EDGE-STRETCH")!.months["2026-09"];
    expect(x.rateAdj ?? null).toBeNull();
    expect(displayRate(x)).toBe(round1(x.rate as number));
  });
});
