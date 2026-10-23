import Papa from "papaparse";
import type { ClinicianRecord, Dataset, MonthKey, MonthMetrics } from "./types";
import { monthKeyFromSheetDate } from "./months";

/**
 * Header-driven parser for the "Productivity" tab layout:
 *   row A: month label + date ("September", "09/01/2026") above each 7-column block
 *   row B: headers — Full Name, THVC Email, Status, Unique ID, then per month:
 *          ON | QC | SUM ON/QC | ON/QC Ratio | All Up: Consults/hr | PSAT | Ballots Earned
 *
 * Columns are located by header text and month-date cell, NOT by hard-coded letters,
 * so inserting a column or adding a new month block won't silently break lookups.
 */
const BLOCK = { on: 0, qc: 1, sum: 2, ratio: 3, rate: 4, psat: 5, ballots: 6 } as const;
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

  // 2. Locate month blocks from the date row.
  const blocks: { month: MonthKey; start: number }[] = [];
  dateRow.forEach((cell, idx) => {
    const key = monthKeyFromSheetDate(String(cell ?? ""));
    if (!key || idx === 0) return;
    const start = idx - 1; // label sits one column left of the date
    if (norm(header[start + BLOCK.rate]) !== "all up: consults/hr") return;
    if (!blocks.some((b) => b.month === key)) blocks.push({ month: key, start });
  });
  if (blocks.length === 0)
    throw new ParseError('No month blocks found. Expected dates like 10/01/2026 above "All Up: Consults/hr" columns.');

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
    for (const b of blocks) {
      months[b.month] = {
        consults: num(row[b.start + BLOCK.sum]),
        rate: num(row[b.start + BLOCK.rate]),
        psat: num(row[b.start + BLOCK.psat]),
        sheetBallots: num(row[b.start + BLOCK.ballots])
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
