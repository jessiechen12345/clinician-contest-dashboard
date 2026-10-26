import { describe, expect, it } from "vitest";
import { computeBallots } from "../src/lib/ballots";
import { DEFAULT_RULES } from "../src/lib/config";

const rules = { ...DEFAULT_RULES };
const ballots = (consults: number | null, psat: number | null, rate: number | null) =>
  computeBallots({ consults, psat, rate, sheetBallots: null }, rules).ballots;

describe("ballot rules match the spreadsheet formula exactly", () => {
  it("uses 70 consults, a 4.65 satisfaction score, and 2.00 / 2.15 consults per hour", () => {
    expect(rules).toMatchObject({ minConsults: 70, minPsat: 4.65, target: 2, stretch: 2.15 });
  });
  it("needs at least 70 consults in the month (69 fails, 70 passes)", () => {
    expect(ballots(69, 4.9, 2.5)).toBe(0);
    expect(ballots(70, 4.9, 2.5)).toBe(2);
  });
  it("needs a satisfaction score of at least 4.65 (4.64 fails, 4.65 passes)", () => {
    expect(ballots(100, 4.64, 2.5)).toBe(0);
    expect(ballots(100, 4.65, 2.5)).toBe(2);
  });
  it("a missing or zero satisfaction score earns no ballots", () => {
    expect(ballots(100, null, 2.5)).toBe(0);
    expect(ballots(100, 0, 2.5)).toBe(0);
  });
  it("then 1 ballot from 2.00 consults per hour and 2 ballots from 2.15", () => {
    expect(ballots(100, 4.8, 1.99)).toBe(0);
    expect(ballots(100, 4.8, 2.0)).toBe(1);
    expect(ballots(100, 4.8, 2.14)).toBe(1);
    expect(ballots(100, 4.8, 2.15)).toBe(2);
  });
  it("needs all conditions together", () => {
    expect(ballots(69, 4.64, 2.5)).toBe(0);
    expect(ballots(70, 4.65, 2.0)).toBe(1);
  });
});
