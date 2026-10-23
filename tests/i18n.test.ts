import { describe, expect, it } from "vitest";
import {
  DICTIONARIES, ballotsLabel, deMonth, fmtInt, fmtPercent, fmtRate, langFromAcceptLanguage, localizePrize, monthName, pickInitialLang, satisfaction, t
} from "../src/lib/i18n";

const tokens = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
const nb = (s: string) => s.replace(/[\u00a0\u202f]/g, " ");

describe("dictionaries", () => {
  it("English and French have exactly the same keys and placeholders", () => {
    const en = DICTIONARIES.en, fr = DICTIONARIES.fr;
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
    for (const k of Object.keys(en) as (keyof typeof en)[]) {
      if (k === "overviewTitle" || k === "resultsTitle") continue; // French uses {de_month} for correct elision
      expect(tokens(fr[k]), k).toBe(tokens(en[k]));
    }
    expect(tokens(fr.overviewTitle)).toBe("{de_month}");
    expect(tokens(fr.resultsTitle)).toBe("{de_month}");
  });
  it("never uses the word contest/concours anywhere", () => {
    for (const lang of ["en", "fr"] as const)
      for (const [k, v] of Object.entries(DICTIONARIES[lang])) expect(v, `${lang}.${k}`).not.toMatch(/contest|concours/i);
  });
  it("uses Threshold/Seuil, Patient Satisfaction Score and Consults per Hour wording", () => {
    expect(t("en", "monthlyThreshold")).toBe("Monthly Threshold");
    expect(t("en", "satisfactionScore")).toBe("Patient Satisfaction Score");
    expect(t("en", "rate")).toBe("Consults per Hour");
    expect(t("fr", "monthlyThreshold")).toMatch(/^Seuil/);
    expect(DICTIONARIES.en.stretchThreshold).not.toMatch(/target/i);
  });
  it("the ballot chips no longer say 'total'", () => {
    expect(ballotsLabel("en", 1)).toBe("1 ballot");
    expect(ballotsLabel("en", 2)).toBe("2 ballots");
    expect(ballotsLabel("fr", 2)).toBe("2 bulletins");
    expect(ballotsLabel("fr", 1)).toBe("1 bulletin");
  });
});

describe("French formatting", () => {
  it("uses a decimal comma and a space as the thousands separator", () => {
    expect(fmtRate(2.15, "fr")).toBe("2,15");
    expect(fmtRate(2.15, "en")).toBe("2.15");
    expect(nb(fmtInt(11013, "fr"))).toBe("11 013");
    expect(fmtInt(11013, "en")).toBe("11,013");
  });
  it("formats percentages for each language", () => {
    expect(fmtPercent(0.105, "en")).toBe("10.5%");
    expect(nb(fmtPercent(0.105, "fr"))).toBe("10,5 %");
    expect(fmtPercent(0, "en")).toBe("0%");
    expect(nb(fmtPercent(0.0185, "fr"))).toBe("1,85 %");
  });
  it("formats satisfaction as out-of-5 or percent", () => {
    expect(satisfaction(4.7, "en")).toEqual({ value: "4.70", unit: "out of 5" });
    expect(satisfaction(4.7, "fr")).toEqual({ value: "4,70", unit: "sur 5" });
    expect(satisfaction(null, "fr")).toEqual({ value: "—" });
  });
  it("names months and elides correctly", () => {
    expect(monthName("2026-10", "en")).toBe("October 2026");
    expect(monthName("2026-10", "fr")).toBe("octobre 2026");
    expect(deMonth("2026-10", "fr")).toBe("d’octobre 2026");
    expect(deMonth("2026-09", "fr")).toBe("de septembre 2026");
    expect(deMonth("2026-08", "fr")).toBe("d’août 2026");
    expect(deMonth("2026-04", "fr")).toBe("d’avril 2026");
    expect(t("fr", "overviewTitle", { de_month: deMonth("2026-10", "fr") })).toBe("Aperçu d’octobre 2026");
  });
});

describe("choosing the language", () => {
  it("reads the browser's preference with q-values", () => {
    expect(langFromAcceptLanguage("fr-CA,fr;q=0.9,en;q=0.8")).toBe("fr");
    expect(langFromAcceptLanguage("en-US,en;q=0.9,fr;q=0.8")).toBe("en");
    expect(langFromAcceptLanguage("fr;q=0.2,en;q=0.9")).toBe("en");
    expect(langFromAcceptLanguage("de,es")).toBe("en");
    expect(langFromAcceptLanguage(null)).toBe("en");
  });
  it("explicit choices beat saved ones, which beat the browser", () => {
    expect(pickInitialLang("fr", "en", "en", "en")).toBe("fr");
    expect(pickInitialLang(undefined, "fr", "en", "en")).toBe("fr");
    expect(pickInitialLang(undefined, null, "fr", "en-US")).toBe("fr");
    expect(pickInitialLang("xx", null, undefined, "fr-CA")).toBe("fr");
    expect(pickInitialLang(undefined, null, undefined, "en-US")).toBe("en");
  });
});

describe("prizes", () => {
  it("lets admins write English | Français in one line", () => {
    expect(localizePrize("$100 gift card | Carte-cadeau de 100 $", "fr")).toBe("Carte-cadeau de 100 $");
    expect(localizePrize("$100 gift card | Carte-cadeau de 100 $", "en")).toBe("$100 gift card");
    expect(localizePrize("Extra day off", "fr")).toBe("Extra day off");
  });
});
