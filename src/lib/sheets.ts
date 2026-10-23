import { google } from "googleapis";
import { parseProductivityRows } from "./csv";
import type { Dataset } from "./types";

/**
 * Reads ONLY the columns the contest needs, using batchGet:
 *   A:C   (Liaison, Full Name, THVC Email)
 *   H     (Status)
 *   Y:BA  (Unique ID + every month block)
 * Personal phone / address / pay-rate columns on the Productivity tab are never requested.
 * The ranges are stitched back into a sparse row array so header positions are preserved.
 */
export async function fetchDatasetFromSheet(): Promise<Dataset> {
  const sheetId = process.env.CONTEST_SHEET_ID;
  const tab = process.env.CONTEST_SHEET_TAB || "Productivity";
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!sheetId || !raw) throw new Error("CONTEST_SHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON must be set.");

  const creds = JSON.parse(raw);
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  });
  const sheets = google.sheets({ version: "v4", auth });

  const ranges = [`${tab}!A1:C3000`, `${tab}!H1:H3000`, `${tab}!Y1:BZ3000`];
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges,
    valueRenderOption: "FORMATTED_VALUE"
  });
  const [ac, h, yz] = (res.data.valueRanges ?? []).map((v) => v.values ?? []);

  const OFFSETS = { ac: 0, h: 7, yz: 24 };
  const n = Math.max(ac.length, h.length, yz.length);
  const rows: unknown[][] = [];
  for (let r = 0; r < n; r++) {
    const row: unknown[] = [];
    (ac[r] ?? []).forEach((v, i) => (row[OFFSETS.ac + i] = v));
    (h[r] ?? []).forEach((v, i) => (row[OFFSETS.h + i] = v));
    (yz[r] ?? []).forEach((v, i) => (row[OFFSETS.yz + i] = v));
    rows.push(Array.from(row, (c) => c ?? ""));
  }
  return parseProductivityRows(rows, "google-sheet");
}
