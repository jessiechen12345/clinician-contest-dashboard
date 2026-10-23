import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { parseProductivityCsv } from "../src/lib/csv";
import { defaultSettings } from "../src/lib/config";
import { averageSatisfaction, monthChoices, resolveMonth, totalConsults } from "../src/lib/uploaded";

const csv = readFileSync(path.join(__dirname, "../sample-data/Contests_Ballot_Calculation_Productivity.sample.csv"), "utf8");
const ds = parseProductivityCsv(csv);
const settings = { ...defaultSettings(), activeMonth: "2026-09" };

describe("uploaded data helpers", () => {
  it("lists the months found in the upload and falls back sensibly", () => {
    expect(monthChoices(ds).map((m) => m.label)).toEqual(["September 2026", "October 2026", "November 2026", "December 2026"]);
    expect(resolveMonth(ds, settings, "2026-10")).toBe("2026-10");
    expect(resolveMonth(ds, settings, "2031-01")).toBe("2026-09");
  });
  it("sums combined consults and averages satisfaction over eligible clinicians", () => {
    const elig = ds.records.filter((r) => r.status === "Active" && r.months["2026-09"].rate !== null);
    expect(totalConsults(ds, settings, "2026-09")).toBe(elig.reduce((t, r) => t + (r.months["2026-09"].consults ?? 0), 0));
    const scores = elig.map((r) => r.months["2026-09"].psat).filter((n): n is number => !!n && n > 0);
    expect(averageSatisfaction(ds, settings, "2026-09")).toBeCloseTo(scores.reduce((a, b) => a + b, 0) / scores.length, 6);
  });
});

describe("real export formats (rows copied from the live sheet's layout, IDs replaced)", () => {
  // Layout verified against the live Productivity tab: dates and numbers arrive as text, "#N/A" IDs, "0.0%" ratios.
  const filler = (n: number) => Array(n).fill("");
  const head1 = [...filler(25), "September", "09/01/2026", "", "", "", "", "", "October", "10/01/2026"];
  const blk = ["ON Consults", "QC Consults", "SUM ON/QC Consults", "ON/QC Ratio", "All Up: Consults/hr", "PSAT", "Ballots Earned"];
  const head2 = [...filler(24).map((_, i) => (i === 2 ? "THVC Email" : i === 7 ? "Status" : i === 1 ? "Full Name" : "")), "Unique ID", ...blk, ...blk];
  const rowOf = (id: string, v: string[]) => [...filler(24).map((_, i) => (i === 2 ? `${id}@x.org` : i === 7 ? "Active" : "")), id, ...v];
  const rows = [
    head1, head2,
    rowOf("#N/A", ["0", "0", "0", "", "0", "0", "0", "0", "0", "0", "", "0", "0", "0"]),
    rowOf("test-uuid-1", ["0", "404", "404", "0.0%", "2.09", "4.59", "0", "0", "283", "283", "", "1.98", "0", "0"])
  ];
  it("skips #N/A rows and reads text numbers and dates", () => {
    const text = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const d = parseProductivityCsv(text);
    expect(d.months).toEqual(["2026-09", "2026-10"]);
    expect(d.records).toHaveLength(1);
    expect(d.records[0].months["2026-09"]).toMatchObject({ on: 0, qc: 404, consults: 404, rate: 2.09, psat: 4.59, sheetBallots: 0 });
    expect(d.records[0].months["2026-10"]).toMatchObject({ consults: 283, rate: 1.98, psat: 0 });
  });
});
