import { describe, expect, it } from "vitest";
import { BALLOT_SOURCE } from "../src/lib/ballotSource";
import { computePool, resolveBallots } from "../src/lib/ballots";
import { DEFAULT_RULES, defaultSettings } from "../src/lib/config";
import type { ClinicianRecord, Dataset, MonthConfig } from "../src/lib/types";

const cfg: MonthConfig = { ...DEFAULT_RULES, prizes: [], startDate: "2026-11-01", endDate: "2026-11-30", lastDrawAt: null };
const m = (consults: number | null, rate: number | null, psat: number | null, sheetBallots: number | null) => ({ consults, rate, psat, sheetBallots });

describe("ballots come from the sheet", () => {
  it("is the current setting", () => expect(BALLOT_SOURCE).toBe("sheet"));

  it("uses the sheet's Ballots Earned value, whatever the app's own rules would say", () => {
    // 25 consults and a rounded-up rate: the sheet gives 2; a 70-consult rule would give 0
    const x = m(25, 2.2, 4.8, 2);
    expect(resolveBallots(x, { ...cfg, minConsults: 70 })).toEqual({ ballots: 2, hasData: true });
    expect(resolveBallots(x, { ...cfg, minConsults: 70 }, "rules")).toEqual({ ballots: 0, hasData: true });
  });
  it("shows the sheet's 0 as 0 and its 1 as 1", () => {
    expect(resolveBallots(m(100, 2.5, 4.9, 0), cfg).ballots).toBe(0);
    expect(resolveBallots(m(100, 2.5, 4.9, 1), cfg).ballots).toBe(1);
  });
  it("treats a blank Ballots Earned cell, or missing figures, as 'no data' instead of a silent 0", () => {
    expect(resolveBallots(m(100, 2.5, 4.9, null), cfg).hasData).toBe(false);
    expect(resolveBallots(m(null, 2.5, 4.9, 1), cfg).hasData).toBe(false);
    expect(resolveBallots(m(100, null, 4.9, 1), cfg).hasData).toBe(false);
    expect(resolveBallots(undefined, cfg).hasData).toBe(false);
  });
  it("keeps odd values inside 0 to 2", () => {
    expect(resolveBallots(m(100, 2.5, 4.9, 3), cfg).ballots).toBe(2);
    expect(resolveBallots(m(100, 2.5, 4.9, -1), cfg).ballots).toBe(0);
    expect(resolveBallots(m(100, 2.5, 4.9, 1.2), cfg).ballots).toBe(1);
  });
  it("calculating in the app ignores the sheet's column", () => {
    expect(resolveBallots(m(100, 2.5, 4.9, 0), cfg, "rules").ballots).toBe(2);
  });
});

describe("the pool (and so the draw) follows the same source", () => {
  const rec = (id: string, mo: ReturnType<typeof m>, status = "Active"): ClinicianRecord => ({ id, email: `${id}@x.org`, name: id, status, months: { "2026-11": mo } });
  const ds: Dataset = {
    syncedAt: "2026-11-02T00:00:00Z", source: "csv-upload", months: ["2026-11"],
    records: [rec("a", m(25, 2.2, 4.8, 2)), rec("b", m(30, 2.0, 4.9, 1)), rec("c", m(200, 3, 5, 0)), rec("d", m(40, 2.4, 4.9, 2), "Inactive"), rec("e", m(null, null, null, null))]
  };
  const settings = { ...defaultSettings(), activeMonth: "2026-11" };
  it("counts the sheet's ballots for eligible clinicians only", () => {
    const p = computePool(ds, settings, "2026-11", cfg);
    expect(p.totalBallots).toBe(3);
    expect(p.participants).toBe(2);
    expect(p.eligible).toBe(3);
    expect(p.distribution).toEqual({ 0: 1, 1: 1, 2: 1 });
  });
  it("can still be calculated from the rules instead", () => {
    const p = computePool(ds, settings, "2026-11", cfg, "rules");
    expect(p.totalBallots).toBe(2 + 1 + 2); // a=2, b=1, c=2 by the app's rules (Inactive d excluded)
  });
});
