import { describe, expect, it } from "vitest";
import { computeBallots } from "../src/lib/ballots";
import { DEFAULT_RULES } from "../src/lib/config";

// These test the app's OWN calculation (used only when BALLOT_SOURCE is "rules").
const rules = { ...DEFAULT_RULES };
const ballots = (consults: number | null, psat: number | null, rate: number | null) =>
  computeBallots({ consults, psat, rate, sheetBallots: null }, rules).ballots;

describe("the app's own ballot calculation", () => {
  it("defaults to 20 consults, a 4.65 satisfaction score, and 2.00 / 2.15 consults per hour", () => {
    expect(rules).toMatchObject({ minConsults: 20, minPsat: 4.65, target: 2, stretch: 2.15 });
  });
  it("needs at least 20 consults in the month (19 fails, 20 passes)", () => {
    expect(ballots(19, 4.9, 2.5)).toBe(0);
    expect(ballots(20, 4.9, 2.5)).toBe(2);
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
    expect(ballots(19, 4.64, 2.5)).toBe(0);
    expect(ballots(20, 4.65, 2.0)).toBe(1);
  });
});
