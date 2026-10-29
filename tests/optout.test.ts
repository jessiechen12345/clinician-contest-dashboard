import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParseError, parseProductivityCsv } from "../src/lib/csv";
import { defaultSettings } from "../src/lib/config";
import type { Dataset } from "../src/lib/types";

/** A file shaped like the real one: Nov block, then the "Opted-Out?" column, then the Dec block (which moved one column right). */
const BLOCK = ["ON Consults", "QC Consults", "SUM ON/QC Consults", "ON/QC Ratio", "All Up: Consults/hr", "Consults/Hr Adj", "PSAT", "Ballots Earned"];
const pad = (n: number) => Array(n).fill("");
const csvOf = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

type Row = { id: string; email?: string; opt?: string; sep: string[]; oct: string[] };
function build(rows: Row[], withOptOutColumn = true) {
  const r1 = [...pad(25), "November", "11/01/2026", ...pad(6), ...(withOptOutColumn ? [""] : []), "December", "12/01/2026", ...pad(6)];
  const r2 = [...pad(24).map((_, i) => (i === 1 ? "Full Name" : i === 2 ? "THVC Email" : i === 7 ? "Status" : "")), "Unique ID", ...BLOCK, ...(withOptOutColumn ? ["Opted-Out?"] : []), ...BLOCK];
  const data = rows.map((r) => [
    ...pad(24).map((_, i) => (i === 1 ? r.id : i === 2 ? (r.email ?? `${r.id}@x.org`) : i === 7 ? "Active" : "")),
    r.id, ...r.sep, ...(withOptOutColumn ? [r.opt ?? ""] : []), ...r.oct
  ]);
  return csvOf([r1, r2, ...data]);
}
// on, qc, sum, ratio, all-up rate, adj, psat, ballots
const SEP = ["10", "90", "100", "10.0%", "2.01", "2.0", "4.8", "1"];
const OCT = ["20", "180", "200", "10.0%", "2.52", "2.5", "4.96", "2"];
const row = (id: string, opt?: string, extra: Partial<Row> = {}): Row => ({ id, opt, sep: SEP, oct: OCT, ...extra });

describe("opted-out clinicians are removed completely", () => {
  const ds = parseProductivityCsv(build([
    row("u1", "Yes"), row("u2", ""), row("u3", "No"), row("u4", "YES "), row("u5", "x"), row("u6", "#N/A"),
    row("u7", ""), row("u7", "Yes"),                       // same ID on two rows, one says Yes
    row("u8", "Yes", { email: "" }),                       // Yes with a blank email
    row("u9", "yes"), row("u10", "n/a"), row("u11", "false")
  ]));
  const ids = ds.records.map((r) => r.id).sort();

  it("keeps only clinicians who are blank or an explicit 'no'", () => expect(ids).toEqual(["u10", "u11", "u2", "u3"]));
  it("treats 'Yes' in any capitalisation or spacing as opted out", () => {
    for (const id of ["u1", "u4", "u9"]) expect(ids).not.toContain(id);
  });
  it("treats an unexpected value or a formula error as opted out (consent comes first)", () => {
    expect(ids).not.toContain("u5");
    expect(ids).not.toContain("u6");
  });
  it("removes an ID entirely if ANY of its rows says Yes", () => expect(ids).not.toContain("u7"));
  it("removes a 'Yes' row even when its email is blank", () => expect(ids).not.toContain("u8"));
  it("reports how many were left out and the labels used, never who", () => {
    expect(ds.optOut).toEqual({ found: true, excluded: 7, values: { Yes: 3, YES: 1, x: 1, "#N/A": 1, yes: 1 } });
    expect(JSON.stringify(ds)).not.toMatch(/"id":"u(1|4|5|6|7|8|9)"/); // no trace of an opted-out ID in the stored data
  });
  it("still reads every month correctly when the column sits between two blocks (the second month moved one column)", () => {
    const x = ds.records.find((r) => r.id === "u2")!;
    expect(x.months["2026-11"]).toMatchObject({ consults: 100, rate: 2.01, rateAdj: 2.0, psat: 4.8, sheetBallots: 1 });
    expect(x.months["2026-12"]).toMatchObject({ consults: 200, rate: 2.52, rateAdj: 2.5, psat: 4.96, sheetBallots: 2 });
  });
});

describe("a file without the column", () => {
  it("is flagged as having no opt-out column, and nobody is removed", () => {
    const ds = parseProductivityCsv(build([row("a"), row("b")], false));
    expect(ds.optOut).toEqual({ found: false, excluded: 0, values: {} });
    expect(ds.records.map((r) => r.id)).toEqual(["a", "b"]);
  });
  it("recognises the other spellings of the header", () => {
    for (const header of ["Opted-Out?", "Opted Out", "Opt Out?", "opt-out", "Opted_Out"]) {
      const csv = build([row("a", "Yes"), row("b")]).replace("Opted-Out?", header);
      expect(parseProductivityCsv(csv).records.map((r) => r.id), header).toEqual(["b"]);
    }
  });
});

// ---------- what the public routes do ----------
let current: Dataset;
vi.mock("@/lib/store", async () => {
  const { defaultSettings } = await import("../src/lib/config");
  return { loadDataset: async () => current, loadSettings: async () => ({ ...defaultSettings(), activeMonth: "2026-11" }), saveSettings: async () => {}, saveDataset: async (d: Dataset) => { current = d; } };
});
vi.mock("@/lib/auth", () => ({ requireAdmin: async () => ({ email: "admin@telus.test" }) }));
import { POST as lookup } from "../src/app/api/data/lookup/route";
import { POST as upload } from "../src/app/api/admin/upload/route";
import { GET as summary } from "../src/app/api/data/summary/route";

const ask = (id: string) => lookup(new Request("http://x/api/data/lookup", { method: "POST", headers: { "x-forwarded-for": `9.9.9.${Math.floor(Math.random() * 250)}` }, body: JSON.stringify({ clinicianId: id, month: "2026-11" }) }));

describe("searching for an opted-out clinician", () => {
  beforeEach(() => { current = parseProductivityCsv(build([row("opted-out-1", "Yes"), row("stays-1")])); });
  it("finds nothing: the answer is identical to an ID that never existed", async () => {
    const optedOut = await ask("opted-out-1");
    const neverExisted = await ask("does-not-exist");
    expect(optedOut.status).toBe(404);
    expect(await optedOut.json()).toEqual(await neverExisted.json());
  });
  it("still finds everyone else", async () => {
    const res = await ask("stays-1");
    expect(res.status).toBe(200);
  });
});

describe("uploading", () => {
  const post = (csv: string) => {
    const fd = new FormData();
    fd.append("file", new File([csv], "x.csv", { type: "text/csv" }));
    return upload(new Request("http://x/api/admin/upload", { method: "POST", body: fd }));
  };
  it("refuses a file with no 'Opted-Out?' column, so an old export can't put opted-out clinicians back", async () => {
    const res = await post(build([row("a"), row("b")], false));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Opted-Out\?/);
  });
  it("accepts a file with the column and reports how many were left out", async () => {
    const res = await post(build([row("a", "Yes"), row("b"), row("c")]));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, clinicians: 2, optedOut: 1, optOutValues: { Yes: 1 } });
    expect(current.records.map((r) => r.id)).toEqual(["b", "c"]);
  });
});

describe("dashboard totals leave opted-out clinicians out", () => {
  it("counts only the clinicians who are still in", async () => {
    current = parseProductivityCsv(build([row("in-1"), row("in-2"), row("out-1", "Yes"), row("out-2", "Yes")]));
    const body = await (await summary(new Request("http://x/api/data/summary?month=2026-11"))).json();
    expect(body.totalConsults).toBe(200); // two clinicians x 100 consults; the opted-out pair's 200 is not included
    expect(body.satisfaction).toBeCloseTo(4.8, 5);
  });
  it("does not even reveal that they exist: the same totals as a file that never had them", async () => {
    current = parseProductivityCsv(build([row("in-1"), row("in-2"), row("out-1", "Yes")]));
    const withOptOut = await (await summary(new Request("http://x/api/data/summary?month=2026-11"))).json();
    current = parseProductivityCsv(build([row("in-1"), row("in-2")]));
    const without = await (await summary(new Request("http://x/api/data/summary?month=2026-11"))).json();
    const strip = ({ lastSyncAt, ...rest }: Record<string, unknown>) => rest;
    expect(strip(withOptOut)).toEqual(strip(without));
  });
});
