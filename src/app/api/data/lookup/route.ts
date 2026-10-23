import { NextResponse } from "next/server";
import { computeBallots, computePool, formatOdds, isEligible } from "@/lib/ballots";
import { resolveMonthConfig } from "@/lib/config";
import { monthLabel } from "@/lib/months";
import { clientIp, rateLimited } from "@/lib/rateLimit";
import { loadDataset } from "@/lib/store";
import { resolveMonth, safeSettings } from "@/lib/uploaded";

export const dynamic = "force-dynamic";

const LIMIT = Number(process.env.LOOKUP_RATE_LIMIT_PER_10MIN ?? 20);
const NOT_FOUND = {
  error: "not_found",
  message: "We couldn't find that Unique Clinician ID for this month. Check for typos. Still stuck? Contact your liaison."
};

/**
 * POST { clinicianId, month? }. Matches ONLY on the Unique ID and returns that one clinician's numbers
 * plus the anonymous pool size. The rest of the data never leaves the server.
 */
export async function POST(req: Request) {
  if (await rateLimited(clientIp(req), "lookup", LIMIT)) {
    return NextResponse.json({ error: "rate_limited", message: "Too many searches. Please wait a few minutes and try again." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const query = typeof body?.clinicianId === "string" ? body.clinicianId.trim().toLowerCase() : "";
  if (query.length < 2 || query.length > 120) {
    return NextResponse.json({ error: "bad_request", message: "Enter your Unique Clinician ID." }, { status: 400 });
  }

  let ds = null;
  try {
    ds = await loadDataset();
  } catch (e) {
    console.error("[data] couldn't read stored data:", e instanceof Error ? e.message : e);
  }
  if (!ds) return NextResponse.json({ error: "no_data", message: "No data has been uploaded yet." }, { status: 503 });

  const settings = await safeSettings();
  const month = resolveMonth(ds, settings, body?.month);
  const rec = ds.records.find((r) => r.id.toLowerCase() === query);
  // Same answer for "unknown" and "not eligible", so IDs can't be probed.
  if (!rec || !isEligible(rec, settings)) return NextResponse.json(NOT_FOUND, { status: 404 });

  const cfg = resolveMonthConfig(settings, month);
  const result = computeBallots(rec.months[month], cfg);
  if (!result.hasData) {
    return NextResponse.json(
      { error: "no_month_data", message: `We found your record, but there's no data for ${monthLabel(month)} yet.` },
      { status: 404 }
    );
  }

  const m = rec.months[month];
  const pool = computePool(ds, settings, month, cfg);
  const odds = formatOdds(result.ballots, pool.totalBallots);
  return NextResponse.json({
    month,
    monthLabel: monthLabel(month),
    consultsPerHour: m.rate,
    totalConsults: m.consults,
    satisfaction: m.psat && m.psat > 0 ? m.psat : null,
    ballots: result.ballots,
    totalBallots: pool.totalBallots,
    odds: { percent: odds.percent, oneIn: odds.oneIn }
  });
}
