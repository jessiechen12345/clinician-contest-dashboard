import { NextResponse } from "next/server";
import { loadDataset, loadSettings } from "@/lib/store";
import { resolveMonthConfig } from "@/lib/config";
import { computeBallots, computePool, formatOdds, isEligible } from "@/lib/ballots";
import { isMonthKey, monthLabel } from "@/lib/months";
import { clientIp, rateLimited } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const LIMIT = Number(process.env.LOOKUP_RATE_LIMIT_PER_10MIN ?? 20);
const NOT_FOUND = {
  error: "not_found",
  message:
    "We couldn't find that ID for this month. Check for typos, or use the Unique ID / THVC email on your contest record. Still stuck? Contact your liaison."
};

/**
 * POST { clinicianId: string, month?: "YYYY-MM" }
 * Returns ONLY the matched clinician's own stats + the anonymous global pool size.
 * Never returns names, e-mails, peer rows, rankings or the dataset.
 */
export async function POST(req: Request) {
  if (await rateLimited(clientIp(req), "lookup", LIMIT)) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many searches. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  let body: { clinicianId?: unknown; month?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request", message: "Invalid request." }, { status: 400 });
  }
  const query = typeof body.clinicianId === "string" ? body.clinicianId.trim().toLowerCase() : "";
  if (query.length < 2 || query.length > 120) {
    return NextResponse.json({ error: "bad_request", message: "Enter your Unique ID or THVC email." }, { status: 400 });
  }

  const [ds, settings] = await Promise.all([loadDataset(), loadSettings()]);
  if (!ds) {
    return NextResponse.json({ error: "no_data", message: "Contest data isn't available yet." }, { status: 503 });
  }

  const month = isMonthKey(body.month) ? body.month : settings.activeMonth;
  if (!ds.months.includes(month)) {
    return NextResponse.json(
      { error: "no_month_data", message: `Results for ${monthLabel(month)} haven't been published yet.` },
      { status: 404 }
    );
  }

  const rec = ds.records.find((r) => r.id.toLowerCase() === query || r.email === query);
  // Same response for "unknown" and "not eligible" so IDs can't be probed.
  if (!rec || !isEligible(rec, settings)) return NextResponse.json(NOT_FOUND, { status: 404 });

  const cfg = resolveMonthConfig(settings, month);
  const result = computeBallots(rec.months[month], cfg);
  if (!result.hasData) {
    return NextResponse.json(
      {
        error: "no_month_data",
        message: `We found your record, but there's no productivity data for ${monthLabel(month)} yet.`
      },
      { status: 404 }
    );
  }

  const pool = computePool(ds, settings, month, cfg);
  const odds = formatOdds(result.ballots, pool.totalBallots);
  const m = rec.months[month];

  return NextResponse.json({
    month,
    monthLabel: monthLabel(month),
    consultsPerHour: m.rate,
    totalConsults: m.consults,
    psat: m.psat,
    ballots: result.ballots,
    breakdown: result.breakdown,
    checks: result.checks,
    target: cfg.target,
    stretch: cfg.stretch,
    totalBallots: pool.totalBallots,
    odds: { percent: odds.percent, oneIn: odds.oneIn },
    lastSyncAt: ds.syncedAt
  });
}
