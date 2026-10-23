import { NextResponse } from "next/server";
import { COL } from "@/lib/metabaseData";
import { buildParameters, cardNames, dashboardId, dashcardsOf, findDashcard, getDashboard, metabaseConfigured, runDashcard } from "@/lib/metabase";
import { inputsFor, safeSettings } from "@/lib/initiative";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Setup check. OFF unless METABASE_DEBUG=true. Behind the site password like everything else.
 * Reports report names, column names and row COUNTS only. It never returns row values.
 */
export async function GET() {
  if (process.env.METABASE_DEBUG !== "true") return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!metabaseConfigured()) return NextResponse.json({ error: "METABASE_API_KEY is not set." }, { status: 200 });

  try {
    const settings = await safeSettings();
    const inputs = inputsFor(settings, settings.activeMonth);
    const dash = await getDashboard();
    const params = buildParameters(dash, { ...inputs });
    const names = cardNames();

    const wanted = Object.entries(names).filter(([, n]) => n);
    const reports = await Promise.all(
      wanted.map(async ([role, name]) => {
        const dc = findDashcard(dash, name);
        if (!dc) return { role, name, found: false };
        try {
          const { res } = await runDashcard(dash, dc, params);
          const cols = res.cols.map((c) => c.name);
          const lower = res.cols.flatMap((c) => [c.name, c.display_name ?? ""]).map((s) => s.toLowerCase().replace(/\s+/g, "_"));
          const has = (aliases: string[]) => aliases.some((a) => lower.includes(a));
          return {
            role,
            name,
            found: true,
            columns: cols,
            rowCount: res.rows.length,
            maybeTruncatedAt2000: res.rows.length >= 2000,
            hasColumns: { np_id: has(COL.id), consults_per_hour: has(COL.rate), total_consults: has(COL.total), ballots: has(COL.ballots), rating: has(COL.rating) }
          };
        } catch (e) {
          return { role, name, found: true, error: e instanceof Error ? e.message : "failed" };
        }
      })
    );

    return NextResponse.json({
      dashboard: { id: dashboardId(), name: dash.name },
      filters: (dash.parameters ?? []).map((p) => ({ slug: p.slug, type: p.type, receivesValue: p.slug in inputs })),
      expectedFilters: Object.keys(inputs),
      reportsOnDashboard: dashcardsOf(dash).map((c) => c.card?.name ?? String(c.id)),
      reports
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 200 });
  }
}
