import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { LAUNCH_MONTH, pickMonth, startingMonthKey, visibleMonths } from "../src/lib/launch";
import { parseProductivityCsv } from "../src/lib/csv";
import { defaultSettings } from "../src/lib/config";
import { monthChoices, resolveMonth } from "../src/lib/uploaded";

const ALL = ["2026-09", "2026-10", "2026-11", "2026-12"];
const d = (iso: string) => new Date(iso);

describe("launch month", () => {
  it("starts in November 2026", () => expect(LAUNCH_MONTH).toBe("2026-11"));

  it("before launch: only November is offered and it is the default (September and October are gone)", () => {
    const now = d("2026-10-27T18:00:00Z");
    expect(startingMonthKey(now)).toBe("2026-11");
    expect(visibleMonths(ALL, now)).toEqual(["2026-11"]);
    expect(pickMonth(visibleMonths(ALL, now), undefined, now)).toBe("2026-11");
  });

  it("during November: November only, and December is hidden until it begins", () => {
    const now = d("2026-11-15T18:00:00Z");
    expect(visibleMonths(ALL, now)).toEqual(["2026-11"]);
    expect(pickMonth(visibleMonths(ALL, now), "2026-12", now)).toBe("2026-11");
  });

  it("once December begins it becomes the default and November stays available", () => {
    const now = d("2026-12-01T09:00:00Z"); // 1:00 a.m. Pacific on Dec 1
    expect(visibleMonths(ALL, now)).toEqual(["2026-11", "2026-12"]);
    expect(pickMonth(visibleMonths(ALL, now), undefined, now)).toBe("2026-12");
    expect(pickMonth(visibleMonths(ALL, now), "2026-11", now)).toBe("2026-11");
  });

  it("uses Pacific time for the switch-over", () => {
    expect(startingMonthKey(d("2026-12-01T07:30:00Z"))).toBe("2026-11"); // still Nov 30, 11:30 p.m. Pacific
    expect(startingMonthKey(d("2026-12-01T08:30:00Z"))).toBe("2026-12"); // Dec 1, 12:30 a.m. Pacific
  });

  it("never offers an earlier month, even if asked for it directly", () => {
    const now = d("2026-12-10T18:00:00Z");
    expect(pickMonth(visibleMonths(ALL, now), "2026-10", now)).toBe("2026-12");
    expect(pickMonth(visibleMonths(ALL, now), "2026-09", now)).toBe("2026-12");
  });

  it("falls back to the latest month in the file if the current month isn't uploaded yet", () => {
    const now = d("2027-01-05T18:00:00Z");
    expect(pickMonth(visibleMonths(ALL, now), undefined, now)).toBe("2026-12");
  });

  it("with no usable month in the file, still returns the starting month", () => {
    const now = d("2026-11-03T18:00:00Z");
    expect(visibleMonths(["2026-09", "2026-10"], now)).toEqual([]);
    expect(pickMonth([], undefined, now)).toBe("2026-11");
  });
});

describe("uploaded data uses the calendar, not the saved 'active month'", () => {
  const ds = parseProductivityCsv(readFileSync(path.join(__dirname, "../sample-data/Contests_Ballot_Calculation_Productivity.sample.csv"), "utf8"));
  const stale = { ...defaultSettings(), activeMonth: "2026-09" }; // an old saved value must not matter
  it("ignores the stale saved month", () => {
    expect(resolveMonth(ds, stale, undefined, d("2026-11-20T18:00:00Z"))).toBe("2026-11");
    expect(resolveMonth(ds, stale, "2026-10", d("2026-11-20T18:00:00Z"))).toBe("2026-11");
    expect(resolveMonth(ds, stale, undefined, d("2026-12-02T18:00:00Z"))).toBe("2026-12");
  });
  it("lists only launch-onward months that have begun", () => {
    expect(monthChoices(ds, d("2026-12-02T18:00:00Z")).map((m) => m.key)).toEqual(["2026-11", "2026-12"]);
    expect(monthChoices(ds, d("2026-10-27T18:00:00Z")).map((m) => m.key)).toEqual(["2026-11"]);
  });
});
