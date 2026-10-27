import { beforeEach, describe, expect, it, vi } from "vitest";
import { localizePrize } from "../src/lib/i18n";
import { parseRich } from "../src/lib/richText";

const saved: any[] = [];
vi.mock("@/lib/auth", () => ({ requireAdmin: async () => ({ email: "admin@telus.test" }) }));
vi.mock("@/lib/store", async () => {
  const { defaultSettings } = await import("../src/lib/config");
  return {
    loadSettings: async () => ({ ...defaultSettings(), activeMonth: "2026-11" }),
    saveSettings: async (s: unknown) => { saved.push(s); },
    loadDataset: async () => null
  };
});
import { PUT } from "../src/app/api/admin/settings/route";

// The exact prizes entered by the admin (English | French), each far longer than the old 120-character limit.
const GRAND =
  "Grand prize: One lucky winner per province will receive a Google Pixel 10 Pro XL phone! | Grand prix : Un·e gagnant·e chanceux·se par province recevra un téléphone Google Pixel 10 Pro XL !";
const RUNNER =
  "Runner up prizes: Three winners from across both provinces will be awarded $100 Amazon e-Gift Cards! | Prix de finaliste : Trois gagnant·es de l'ensemble des deux provinces recevront des Cartes-cadeaux Amazon de 100 $ !";

beforeEach(() => { saved.length = 0; });

describe("long prize lines are saved in full", () => {
  it("keeps both languages of each prize (they were cut at 120 characters before)", async () => {
    expect(GRAND.length).toBeGreaterThan(120);
    expect(RUNNER.length).toBeGreaterThan(120);
    const res = await PUT(new Request("http://x/api/admin/settings", { method: "PUT", body: JSON.stringify({ month: "2026-11", config: { prizes: [GRAND, RUNNER] } }) }));
    expect(res.status).toBe(200);
    expect(saved[0].months["2026-11"].prizes).toEqual([GRAND, RUNNER]);
  });
  it("shows the complete French text, not a fragment", () => {
    expect(localizePrize(GRAND, "fr")).toBe("Grand prix : Un·e gagnant·e chanceux·se par province recevra un téléphone Google Pixel 10 Pro XL !");
    expect(localizePrize(RUNNER, "fr")).toBe("Prix de finaliste : Trois gagnant·es de l'ensemble des deux provinces recevront des Cartes-cadeaux Amazon de 100 $ !");
    expect(localizePrize(GRAND, "en")).toBe("Grand prize: One lucky winner per province will receive a Google Pixel 10 Pro XL phone!");
  });
  it("formatting works inside each language separately", () => {
    const line = "**Grand prize:** One winner per __province__! | **Grand prix :** Un·e gagnant·e par __province__ !";
    expect(parseRich(localizePrize(line, "en")).filter((p) => p.bold || p.underline).map((p) => p.text)).toEqual(["Grand prize:", "province"]);
    expect(parseRich(localizePrize(line, "fr")).filter((p) => p.bold || p.underline).map((p) => p.text)).toEqual(["Grand prix :", "province"]);
  });
  it("still caps absurdly long input", async () => {
    await PUT(new Request("http://x", { method: "PUT", body: JSON.stringify({ month: "2026-11", config: { prizes: ["x".repeat(5000)] } }) }));
    expect(saved[0].months["2026-11"].prizes[0].length).toBe(1000);
  });
});
