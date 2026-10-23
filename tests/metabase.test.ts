import { describe, expect, it } from "vitest";
import {
  ballotsFromRate, lookupClinician, overallSatisfaction, satisfactionParts, scalar, sumTotalConsults, toNumber, toObjects
} from "../src/lib/metabaseData";
import { buildParameters, findDashcard, type MbDashboard } from "../src/lib/metabase";

const T = { target: 2, stretch: 2.15 };

const indiv = toObjects({
  cols: [{ name: "np_id" }, { name: "consults_per_hour" }, { name: "total_consults" }, { name: "ballots" }],
  rows: [["THVC-0042", 2.2, 120, 2], ["thvc-0007", 2.01, "95", 1], ["THVC-0001", 1.2, 40, 0]]
});
const ratings = toObjects({
  cols: [{ name: "np_id" }, { name: "rating" }],
  rows: [["THVC-0042", 4.8], ["THVC-0042", 4.6], ["THVC-0007", "4.9"], ["THVC-0500", 4.4]]
});

describe("mapping", () => {
  it("indexes columns by name and by display name", () => {
    const rows = toObjects({ cols: [{ name: "NP_ID", display_name: "NP ID" }, { name: "x", display_name: "Consults Per Hour" }], rows: [["a", 2]] });
    expect(rows[0]).toMatchObject({ np_id: "a", consults_per_hour: 2 });
  });
  it("parses numbers that arrive as formatted strings", () => {
    expect(toNumber("1,234")).toBe(1234);
    expect(toNumber("96.5%")).toBe(96.5);
    expect(toNumber("")).toBeNull();
    expect(toNumber("n/a")).toBeNull();
  });
  it("reads a scalar report", () => expect(scalar({ cols: [{ name: "n" }], rows: [[1234]] })).toBe(1234));
});

describe("clinician lookup (np_id only)", () => {
  it("finds a clinician case-insensitively and returns only their numbers", () => {
    const m = lookupClinician("thvc-0042", indiv, ratings, T)!;
    expect(m).toMatchObject({ consultsPerHour: 2.2, totalConsults: 120, ballots: 2 });
    expect(m.satisfaction).toBeCloseTo(4.7, 5);
  });
  it("coerces string numbers", () => {
    expect(lookupClinician("THVC-0007", indiv, ratings, T)).toMatchObject({ totalConsults: 95, satisfaction: 4.9, ballots: 1 });
  });
  it("returns null for an unknown id (and does not match on partial ids)", () => {
    expect(lookupClinician("THVC-99", indiv, ratings, T)).toBeNull();
    expect(lookupClinician("THVC", indiv, ratings, T)).toBeNull();
  });
  it("shows zero ballots when a clinician only appears in the satisfaction table", () => {
    expect(lookupClinician("THVC-0500", indiv, ratings, T)).toEqual({ consultsPerHour: null, totalConsults: null, satisfaction: 4.4, ballots: 0 });
  });
  it("derives ballots from the thresholds when there is no ballots column", () => {
    const rows = toObjects({ cols: [{ name: "np_id" }, { name: "consults_per_hour" }, { name: "total_consults" }], rows: [["A1", 2.15, 80], ["A2", 2.0, 80], ["A3", 1.99, 80]] });
    expect(lookupClinician("A1", rows, [], T)!.ballots).toBe(2);
    expect(lookupClinician("A2", rows, [], T)!.ballots).toBe(1);
    expect(lookupClinician("A3", rows, [], T)!.ballots).toBe(0);
    expect(ballotsFromRate(null, T)).toBe(0);
  });
  it("counts rows when the table lists one row per ballot", () => {
    const rows = toObjects({ cols: [{ name: "np_id" }, { name: "consults_per_hour" }, { name: "total_consults" }], rows: [["B1", 2.3, 90], ["B1", 2.3, 90]] });
    expect(lookupClinician("B1", rows, [], T)!.ballots).toBe(2);
  });
});

describe("aggregates", () => {
  it("sums total consults once per clinician", () => {
    const rows = toObjects({ cols: [{ name: "np_id" }, { name: "total_consults" }], rows: [["A", 100], ["A", 100], ["B", 50]] });
    expect(sumTotalConsults(rows)).toBe(150);
  });
  it("averages satisfaction per practitioner, then across practitioners", () => {
    expect(overallSatisfaction(ratings)).toBeCloseTo((4.7 + 4.9 + 4.4) / 3, 5);
  });
  it("formats satisfaction as out-of-5 or percent", () => {
    expect(satisfactionParts(4.8)).toEqual({ value: "4.80", unit: "out of 5" });
    expect(satisfactionParts(96.25)).toEqual({ value: "96.3%" });
    expect(satisfactionParts(null)).toEqual({ value: "—" });
  });
});

describe("dashboard wiring", () => {
  const dash: MbDashboard = {
    id: 207,
    name: "d",
    parameters: [
      { id: "p1", slug: "base_target", type: "number/=" },
      { id: "p2", slug: "stretch_target", type: "number/=" },
      { id: "p3", slug: "start_date", type: "date/single" },
      { id: "p4", slug: "end_date", type: "date/single" },
      { id: "p5", slug: "other", type: "category" }
    ],
    dashcards: [
      { id: 1, card: { id: 11, name: "Contest - Total ballots in pool" } },
      { id: 2, card: { id: 12, name: "Q2" }, visualization_settings: { "card.title": "V2 Contest - individual ballots" } },
      { id: 3, card: null, card_id: null }
    ]
  };
  it("matches reports by name, by dashboard title, case-insensitively and by 'contains'", () => {
    expect(findDashcard(dash, "contest - total ballots in pool")?.id).toBe(1);
    expect(findDashcard(dash, "V2 Contest - individual ballots")?.id).toBe(2);
    expect(findDashcard(dash, "total ballots")?.id).toBe(1);
    expect(findDashcard(dash, "nope")).toBeNull();
  });
  it("builds filter values by type and skips filters we don't set", () => {
    const p = buildParameters(dash, { base_target: 2, stretch_target: 2.15, start_date: "2026-10-01", end_date: "2026-10-31" });
    expect(p).toEqual([
      { id: "p1", type: "number/=", value: [2] },
      { id: "p2", type: "number/=", value: [2.15] },
      { id: "p3", type: "date/single", value: "2026-10-01" },
      { id: "p4", type: "date/single", value: "2026-10-31" }
    ]);
  });
});
