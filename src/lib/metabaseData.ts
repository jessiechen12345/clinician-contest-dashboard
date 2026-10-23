/** Pure helpers that turn Metabase query results into the numbers the dashboard needs. No network here. */

export type Row = Record<string, unknown>;
export interface MbCol { name: string; display_name?: string }
export interface MbResult { rows: unknown[][]; cols: MbCol[] }

const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "_");

/** Column aliases (lower-case, spaces -> underscores). Both Metabase's `name` and `display_name` are indexed. */
export const COL = {
  id: ["np_id", "npid"],
  rate: ["consults_per_hour", "consults_per_hr", "consults_hr", "consults/hr"],
  total: ["total_consults", "consults_total"],
  ballots: ["ballots", "ballots_earned", "total_ballots", "num_ballots", "ballot_count"],
  rating: ["rating", "avg_rating", "average_rating"]
};

export function toObjects(res: MbResult): Row[] {
  const names = res.cols.map((c) => key(c.name ?? ""));
  const shown = res.cols.map((c) => key(c.display_name ?? ""));
  return res.rows.map((r) => {
    const o: Row = {};
    r.forEach((v, i) => { if (names[i]) o[names[i]] = v; });
    r.forEach((v, i) => { if (shown[i] && !(shown[i] in o)) o[shown[i]] = v; });
    return o;
  });
}

export function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const s = v.replace(/[,%\s]/g, "");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function pick(row: Row, aliases: string[]): unknown {
  for (const a of aliases) if (row[a] !== undefined && row[a] !== null) return row[a];
  return undefined;
}

export const sameId = (a: unknown, b: string) => String(a ?? "").trim().toLowerCase() === b.trim().toLowerCase();
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** First cell of the first row, e.g. a "Total ballots in pool" number card. */
export function scalar(res: MbResult): number | null {
  return toNumber(res.rows[0]?.[0]);
}

export interface Thresholds { target: number; stretch: number }

export function ballotsFromRate(rate: number | null, t: Thresholds): 0 | 1 | 2 {
  if (rate === null) return 0;
  return rate >= t.stretch ? 2 : rate >= t.target ? 1 : 0;
}

export interface Mine {
  consultsPerHour: number | null;
  totalConsults: number | null;
  satisfaction: number | null;
  ballots: number;
}

/**
 * Finds ONE clinician by np_id. Returns only that person's numbers.
 * Ballots: use a ballots-style column if the table has one; otherwise, if the table lists one row per ballot,
 * count the rows; otherwise derive from consults per hour and the thresholds.
 */
export function lookupClinician(id: string, individual: Row[], ratingRows: Row[], t: Thresholds): Mine | null {
  const mine = individual.filter((r) => sameId(pick(r, COL.id), id));
  const ratings = ratingRows
    .filter((r) => sameId(pick(r, COL.id), id))
    .map((r) => toNumber(pick(r, COL.rating)))
    .filter((n): n is number => n !== null);
  if (!mine.length && !ratings.length) return null;

  const satisfaction = ratings.length ? mean(ratings) : null;
  if (!mine.length) return { consultsPerHour: null, totalConsults: null, satisfaction, ballots: 0 };

  const first = mine[0];
  const rate = toNumber(pick(first, COL.rate));
  const fromColumn = toNumber(pick(first, COL.ballots));
  const ballots = fromColumn !== null ? fromColumn : mine.length > 1 ? mine.length : ballotsFromRate(rate, t);
  return { consultsPerHour: rate, totalConsults: toNumber(pick(first, COL.total)), satisfaction, ballots };
}

/** Sum of total_consults, counting each np_id once (Québec + Ontario are already combined per clinician). */
export function sumTotalConsults(rows: Row[]): number | null {
  const byId = new Map<string, number>();
  let anonymous = 0;
  let any = false;
  for (const r of rows) {
    const n = toNumber(pick(r, COL.total));
    if (n === null) continue;
    any = true;
    const id = pick(r, COL.id);
    if (id === undefined) anonymous += n;
    else if (!byId.has(String(id).toLowerCase())) byId.set(String(id).toLowerCase(), n);
  }
  if (!any) return null;
  let sum = anonymous;
  byId.forEach((n) => { sum += n; });
  return sum;
}

/** Mean of each practitioner's mean rating. */
export function overallSatisfaction(rows: Row[]): number | null {
  const groups = new Map<string, number[]>();
  rows.forEach((r, i) => {
    const n = toNumber(pick(r, COL.rating));
    if (n === null) return;
    const id = pick(r, COL.id);
    const k = id === undefined ? `__row${i}` : String(id).toLowerCase();
    groups.set(k, [...(groups.get(k) ?? []), n]);
  });
  if (!groups.size) return null;
  const perPerson: number[] = [];
  groups.forEach((v) => perPerson.push(mean(v)));
  return mean(perPerson);
}

/** Shows ratings out of 5 as "4.80 out of 5"; anything larger is treated as a percent. */
export function satisfactionParts(r: number | null | undefined): { value: string; unit?: string } {
  if (r === null || r === undefined || !Number.isFinite(r)) return { value: "—" };
  return r <= 5 ? { value: r.toFixed(2), unit: "out of 5" } : { value: `${r.toFixed(1)}%` };
}
