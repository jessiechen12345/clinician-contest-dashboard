import Papa from "papaparse";
import type { ClinicianRecord, Dataset, MonthKey, MonthMetrics } from "./types";
import { monthKeyFromSheetDate } from "./months";

/**
 * Header-driven parser for the "Productivity" tab layout:
 *   row A: month label + date ("September", "09/01/2026") above each month's block of columns
 *   row B: headers: Full Name, THVC Email, Status, Unique ID, then per month a block such as
 *          ON | QC | SUM ON/QC | ON/QC Ratio | All Up: Consults/hr | Consults/Hr Adj | PSAT | Ballots Earned
 *
 * Every column is found by its HEADER TEXT inside its own month's block, never by position, so:
 *   - blocks can be 7 or 8 columns wide and can appear in any order (e.g. Jul/Aug after Dec);
 *   - columns can move (PSAT shifted one place when "Consults/Hr Adj" was added);
 *   - "Consults/Hr Adj" is deliberately never read. Consults per hour comes from "All Up: Consults/hr",
 *     which is what the sheet's own Ballots Earned formula uses.
 */
const NAMES = {
  on: "on consults",
  qc: "qc consults",
  sum: "sum on/qc consults",
  rate: "all up: consults/hr",
  psat: "psat",
  ballots: "ballots earned"
} as const;
const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

function num(v: unknown): number | null {
  const s = String(v ?? "").replace(/,/g, "").trim();
  if (s === "" || s.startsWith("#")) return null; // "", #N/A, #DIV/0!
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export class ParseError extends Error {}

export function parseProductivityRows(rows: unknown[][], source: Dataset["source"]): Dataset {
  // 1. Find header row (contains "THVC Email") within the first 6 rows.
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    if (rows[i].some((c) => norm(c) === "thvc email")) { headerIdx = i; break; }
  }
  if (headerIdx < 0) throw new ParseError('Could not find a header row containing "THVC Email".');
  const header = rows[headerIdx];
  const dateRow = headerIdx > 0 ? rows[headerIdx - 1] : [];

  const col = (name: string) => header.findIndex((c) => norm(c) === name.toLowerCase());
  const iEmail = col("THVC Email");
  const iName = col("Full Name");
  const iStatus = col("Status");
  const iId = col("Unique ID");
  if (iEmail < 0 || iId < 0) throw new ParseError('Missing required column "THVC Email" or "Unique ID".');

  // 2. Locate month blocks from the date row, then each column by header text inside its own block.
  const starts: { month: MonthKey; start: number }[] = [];
  dateRow.forEach((cell, idx) => {
    const key = monthKeyFromSheetDate(String(cell ?? ""));
    if (!key || idx === 0) return;
    if (!starts.some((b) => b.month === key)) starts.push({ month: key, start: idx - 1 }); // label sits one column left of the date
  });
  starts.sort((x, y) => x.start - y.start);

  type Cols = { on: number; qc: number; sum: number; rate: number; psat: number; ballots: number };
  const blocks: { month: MonthKey; cols: Cols }[] = [];
  starts.forEach((b, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].start : header.length;
    const find = (name: string) => {
      for (let c = b.start; c < end; c++) if (norm(header[c]) === name) return c;
      return -1;
    };
    const cols: Cols = {
      on: find(NAMES.on), qc: find(NAMES.qc), sum: find(NAMES.sum),
      rate: find(NAMES.rate), psat: find(NAMES.psat), ballots: find(NAMES.ballots)
    };
    // A block without these three can't produce correct ballots, so that month is left out rather than guessed.
    if (cols.rate < 0 || cols.sum < 0 || cols.psat < 0) return;
    blocks.push({ month: b.month, cols });
  });
  if (blocks.length === 0)
    throw new ParseError('No month blocks found. Expected dates like 10/01/2026 above columns headed "SUM ON/QC Consults", "All Up: Consults/hr" and "PSAT".');

  // 3. Build minimal records.
  const records: ClinicianRecord[] = [];
  const seen = new Set<string>();
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    const id = String(row[iId] ?? "").trim();
    const email = String(row[iEmail] ?? "").trim().toLowerCase();
    if (!id || id.startsWith("#") || !email) continue; // blank / #N/A rows
    const key = id.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const months: Record<MonthKey, MonthMetrics> = {};
    const at = (c: number) => (c < 0 ? null : num(row[c]));
    for (const b of blocks) {
      months[b.month] = {
        on: at(b.cols.on),
        qc: at(b.cols.qc),
        consults: at(b.cols.sum),
        rate: at(b.cols.rate),
        psat: at(b.cols.psat),
        sheetBallots: at(b.cols.ballots)
      };
    }
    records.push({
      id,
      email,
      name: iName >= 0 ? String(row[iName] ?? "").trim() : "",
      status: iStatus >= 0 ? String(row[iStatus] ?? "").trim() : "Active",
      months
    });
  }
  if (records.length === 0) throw new ParseError("Header found, but no clinician rows could be read.");

  return {
    syncedAt: new Date().toISOString(),
    source,
    months: blocks.map((b) => b.month).sort(),
    records
  };
}

export function parseProductivityCsv(text: string): Dataset {
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), { skipEmptyLines: false });
  if (parsed.errors.length && parsed.data.length === 0) throw new ParseError("The file is not valid CSV.");
  return parseProductivityRows(parsed.data, "csv-upload");
}
