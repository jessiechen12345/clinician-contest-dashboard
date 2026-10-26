import { describe, expect, it } from "vitest";
import { ParseError, parseProductivityCsv } from "../src/lib/csv";

/** Builds a CSV in the NEW layout: 8-column month blocks with "Consults/Hr Adj" between All Up and PSAT. */
const BLOCK = ["ON Consults", "QC Consults", "SUM ON/QC Consults", "ON/QC Ratio", "All Up: Consults/hr", "Consults/Hr Adj", "PSAT", "Ballots Earned"];
const csvOf = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const pad = (n: number) => Array(n).fill("");

function build(opts: { blocks: [string, string][]; blankAdjHeaderFor?: string; dropPsatFor?: string }) {
  const r1 = pad(25), r2 = [...pad(24).map((_, i) => (i === 1 ? "Full Name" : i === 2 ? "THVC Email" : i === 7 ? "Status" : "")), "Unique ID"];
  const row = [...pad(24).map((_, i) => (i === 2 ? "a@x.org" : i === 7 ? "Active" : "")), "uuid-1"];
  for (const [label, date] of opts.blocks) {
    r1.push(label, date, ...pad(6));
    const h = [...BLOCK];
    if (label === opts.blankAdjHeaderFor) h[5] = "";
    if (label === opts.dropPsatFor) h[6] = "";
    r2.push(...h);
    // on, qc, sum, ratio, ALL UP rate, ADJ rate (different on purpose), PSAT, ballots
    row.push("10", "90", "100", "10.0%", "1.96", "2.0", "4.92", "1");
  }
  return csvOf([r1, r2, row]);
}

const ALL: [string, string][] = [["September", "09/01/2026"], ["October", "10/01/2026"], ["November", "11/01/2026"], ["December", "12/01/2026"], ["July", "07/01/2026"], ["August", "08/01/2026"]];

describe("new column layout (Consults/Hr Adj added, PSAT moved one column)", () => {
  const ds = parseProductivityCsv(build({ blocks: ALL, blankAdjHeaderFor: "December" }));
  it("finds all six months even when they are out of order, sorted oldest to newest", () => {
    expect(ds.months).toEqual(["2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"]);
  });
  it("reads consults per hour from All Up, never from the Adj column", () => {
    for (const m of ds.months) expect(ds.records[0].months[m].rate).toBe(1.96);
  });
  it("reads PSAT and Ballots Earned from their moved columns", () => {
    for (const m of ds.months) expect(ds.records[0].months[m]).toMatchObject({ psat: 4.92, sheetBallots: 1, consults: 100, on: 10, qc: 90 });
  });
  it("still works when the Adj column's header is blank (as over December in the real file)", () => {
    expect(ds.records[0].months["2026-12"]).toMatchObject({ rate: 1.96, psat: 4.92 });
  });
});

describe("safety", () => {
  it("leaves a month out (rather than guessing) if its PSAT column can't be found", () => {
    const d = parseProductivityCsv(build({ blocks: ALL, dropPsatFor: "October" }));
    expect(d.months).not.toContain("2026-10");
    expect(d.months).toContain("2026-09");
  });
  it("errors clearly when no month has the needed columns", () => {
    expect(() => parseProductivityCsv(build({ blocks: [["October", "10/01/2026"]], dropPsatFor: "October" }))).toThrow(ParseError);
  });
});
