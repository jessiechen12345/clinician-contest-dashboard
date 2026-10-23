/**
 * Server-only Metabase client. It reads METABASE_API_KEY, so never import it from a client component.
 * Flow: GET /api/dashboard/:id -> find each report (dashcard) by name -> run it with the dashboard's filter values.
 */
import { MbResult, Row, scalar, sumTotalConsults, toObjects, overallSatisfaction } from "./metabaseData";

export class MetabaseError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

const baseUrl = () => (process.env.METABASE_URL || "https://metabase.akira.md").replace(/\/+$/, "");
export const dashboardId = () => process.env.METABASE_DASHBOARD_ID || "207";
export const metabaseConfigured = () => !!process.env.METABASE_API_KEY;

/** Report (card) names on the dashboard. Defaults match your dashboard; override with env vars if they change. */
export const cardNames = () => ({
  totalBallots: process.env.METABASE_CARD_TOTAL_BALLOTS || "Contest - Total ballots in pool",
  individual: process.env.METABASE_CARD_INDIVIDUAL || "V2 Contest - individual ballots",
  satisfaction: process.env.METABASE_CARD_SATISFACTION || "patient satisfaction ratings, by practitioner - modified",
  /** Optional. If empty, total consults is summed from the individual ballots table. */
  totalConsults: process.env.METABASE_CARD_TOTAL_CONSULTS || ""
});

export interface MbParameter { id: string; slug: string; type: string }
export interface MbDashcard {
  id: number;
  card_id?: number | null;
  card?: { id: number; name: string } | null;
  visualization_settings?: Record<string, unknown>;
}
export interface MbDashboard {
  id: number;
  name: string;
  parameters?: MbParameter[];
  dashcards?: MbDashcard[];
  ordered_cards?: MbDashcard[]; // older Metabase versions
}

async function mb<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env.METABASE_API_KEY;
  if (!apiKey) throw new MetabaseError("METABASE_API_KEY is not set.");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      ...init,
      headers: { "x-api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      signal: ctrl.signal,
      cache: "no-store"
    });
    if (!res.ok) throw new MetabaseError(`Metabase returned HTTP ${res.status} for ${path.split("?")[0]}`, res.status);
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof MetabaseError) throw e;
    throw new MetabaseError(e instanceof Error && e.name === "AbortError" ? "Metabase timed out." : "Couldn't reach Metabase.");
  } finally {
    clearTimeout(timer);
  }
}

// ---- dashboard definition (cached 5 min) ----
let dashCache: { at: number; value: MbDashboard } | null = null;
export async function getDashboard(): Promise<MbDashboard> {
  if (dashCache && Date.now() - dashCache.at < 300_000) return dashCache.value;
  const value = await mb<MbDashboard>(`/api/dashboard/${dashboardId()}`);
  dashCache = { at: Date.now(), value };
  return value;
}

export const dashcardsOf = (d: MbDashboard): MbDashcard[] =>
  (d.dashcards ?? d.ordered_cards ?? []).filter((c) => c.card?.id ?? c.card_id);

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const titlesOf = (c: MbDashcard) =>
  [c.card?.name, c.visualization_settings?.["card.title"]].filter((x): x is string => typeof x === "string").map(norm);

/** Matches the underlying question name or the title shown on the dashboard; exact match first, then "contains". */
export function findDashcard(dash: MbDashboard, name: string): MbDashcard | null {
  const want = norm(name);
  const cards = dashcardsOf(dash);
  return cards.find((c) => titlesOf(c).includes(want)) ?? cards.find((c) => titlesOf(c).some((t) => t.includes(want))) ?? null;
}

// ---- dashboard filter values (base_target, stretch_target, start_date, end_date) ----
export interface DashboardInputs { base_target: number; stretch_target: number; start_date: string; end_date: string }

function coerce(type: string, raw: string | number): unknown {
  if (type.startsWith("number")) return [Number(raw)];
  if (type.startsWith("date/")) return String(raw);
  return [String(raw)];
}

export function buildParameters(dash: MbDashboard, inputs: Record<string, string | number>) {
  return (dash.parameters ?? [])
    .filter((p) => p.slug in inputs)
    .map((p) => ({ id: p.id, type: p.type, value: coerce(p.type, inputs[p.slug]) }));
}

// ---- run a report (cached 60 s per report + filter values) ----
const TTL = 60_000;
const results = new Map<string, Promise<{ res: MbResult; at: number }>>();

export async function runDashcard(dash: MbDashboard, dc: MbDashcard, params: unknown[]) {
  const cardId = dc.card?.id ?? dc.card_id;
  const cacheKey = `${dc.id}|${JSON.stringify(params)}`;
  const hit = results.get(cacheKey);
  if (hit) {
    const v = await hit.catch(() => null);
    if (v && Date.now() - v.at < TTL) return v;
    results.delete(cacheKey);
  }
  const p = mb<{ data?: MbResult; status?: string; error?: unknown }>(
    `/api/dashboard/${dash.id}/dashcard/${dc.id}/card/${cardId}/query`,
    { method: "POST", body: JSON.stringify({ parameters: params }) }
  ).then((r) => {
    if (r.status === "failed" || !r.data) throw new MetabaseError(`Metabase couldn't run report ${dc.card?.name ?? dc.id}.`);
    return { res: r.data, at: Date.now() };
  });
  results.set(cacheKey, p);
  p.catch(() => results.delete(cacheKey));
  if (results.size > 60) results.delete(results.keys().next().value as string);
  return p;
}

export interface Snapshot {
  totalBallots: number | null;
  totalConsults: number | null;
  satisfaction: number | null;
  individual: Row[];
  ratings: Row[];
  fetchedAt: number;
}

export async function loadSnapshot(inputs: DashboardInputs): Promise<Snapshot> {
  const dash = await getDashboard();
  const params = buildParameters(dash, { ...inputs });
  const names = cardNames();

  const run = async (name: string, required: boolean) => {
    const dc = findDashcard(dash, name);
    if (!dc) {
      if (required) throw new MetabaseError(`Report "${name}" wasn't found on the dashboard.`);
      console.warn(`[metabase] optional report "${name}" not found`);
      return null;
    }
    try {
      return await runDashcard(dash, dc, params);
    } catch (e) {
      if (required) throw e;
      console.warn(`[metabase] optional report "${name}" failed: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  };

  const [ballots, indiv, sat, consults] = await Promise.all([
    run(names.totalBallots, true),
    run(names.individual, true),
    run(names.satisfaction, false),
    names.totalConsults ? run(names.totalConsults, false) : Promise.resolve(null)
  ]);

  const individual = indiv ? toObjects(indiv.res) : [];
  const ratings = sat ? toObjects(sat.res) : [];
  const stamps = [ballots, indiv, sat, consults].filter(Boolean).map((x) => x!.at);
  return {
    totalBallots: ballots ? scalar(ballots.res) : null,
    totalConsults: consults ? scalar(consults.res) : sumTotalConsults(individual),
    satisfaction: overallSatisfaction(ratings),
    individual,
    ratings,
    fetchedAt: Math.min(...stamps)
  };
}
