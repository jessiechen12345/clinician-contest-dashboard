import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { loadDataset, loadSettings } from "@/lib/store";
import { resolveMonthConfig } from "@/lib/config";
import { computeBallots, computePool, isEligible, resolveBallots } from "@/lib/ballots";
import { BALLOT_SOURCE } from "@/lib/ballotSource";
import { isMonthKey } from "@/lib/months";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const [ds, settings] = await Promise.all([loadDataset(), loadSettings()]);
  if (!ds) return NextResponse.json({ error: "No data loaded." }, { status: 404 });
  const q = new URL(req.url).searchParams.get("month");
  const month = isMonthKey(q) ? q : settings.activeMonth;
  if (!ds.months.includes(month)) return NextResponse.json({ error: "No data for that month." }, { status: 404 });

  const cfg = resolveMonthConfig(settings, month);
  const pool = computePool(ds, settings, month, cfg);

  // Reconciliation against the sheet's own "Ballots Earned" column.
  let mismatches = 0;
  let excludedByStatus = 0;
  let missingData = 0;
  const rates: number[] = [];
  for (const rec of ds.records) {
    if (!isEligible(rec, settings)) { excludedByStatus++; continue; }
    const m = rec.months[month];
    const used = resolveBallots(m, cfg);
    if (!used.hasData) { missingData++; continue; }
    rates.push(m!.rate as number);
    // Only meaningful when the app calculates ballots itself; with BALLOT_SOURCE = "sheet" the sheet IS the answer.
    if (BALLOT_SOURCE === "rules" && m!.sheetBallots !== null && m!.sheetBallots !== computeBallots(m, cfg).ballots) mismatches++;
  }
  rates.sort((x, y) => x - y);
  const pct = (p: number) => (rates.length ? rates[Math.min(rates.length - 1, Math.floor((p / 100) * rates.length))] : null);

  return NextResponse.json({
    month,
    eligibleWithData: pool.eligible,
    participants: pool.participants,
    totalBallots: pool.totalBallots,
    distribution: pool.distribution,
    excludedByStatus,
    missingData,
    sheetMismatches: BALLOT_SOURCE === "rules" ? mismatches : null,
    ballotSource: BALLOT_SOURCE,
    rateP50: pct(50),
    rateP75: pct(75),
    rateP85: pct(85)
  });
}
