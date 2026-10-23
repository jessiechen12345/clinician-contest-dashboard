import { NextResponse } from "next/server";
import { formatOdds } from "@/lib/ballots";
import { inputsFor, safeSettings } from "@/lib/initiative";
import { loadSnapshot, metabaseConfigured } from "@/lib/metabase";
import { lookupClinician } from "@/lib/metabaseData";
import { isMonthKey, monthLabel } from "@/lib/months";
import { clientIp, rateLimited } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LIMIT = Number(process.env.LOOKUP_RATE_LIMIT_PER_10MIN ?? 20);
const NOT_FOUND = {
  error: "not_found",
  message: "We couldn't find that Unique Clinician ID for this month. Check for typos. Still stuck? Contact your liaison."
};

/**
 * POST { clinicianId, month? }. Matches ONLY on np_id and returns that one clinician's numbers
 * plus the anonymous pool size. The full table never leaves the server.
 */
export async function POST(req: Request) {
  if (await rateLimited(clientIp(req), "lookup", LIMIT)) {
    return NextResponse.json({ error: "rate_limited", message: "Too many searches. Please wait a few minutes and try again." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const id = typeof body?.clinicianId === "string" ? body.clinicianId.trim() : "";
  if (id.length < 2 || id.length > 120) {
    return NextResponse.json({ error: "bad_request", message: "Enter your Unique Clinician ID." }, { status: 400 });
  }
  if (!metabaseConfigured()) {
    return NextResponse.json({ error: "no_data", message: "The data source isn't connected yet." }, { status: 503 });
  }

  const settings = await safeSettings();
  const month = isMonthKey(body?.month) ? body.month : settings.activeMonth;

  let snap;
  try {
    snap = await loadSnapshot(inputsFor(settings, month));
  } catch (e) {
    console.error("[metabase] lookup failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "unavailable", message: "We couldn't load the latest figures. Please try again shortly." }, { status: 502 });
  }

  const inputs = inputsFor(settings, month);
  const mine = lookupClinician(id, snap.individual, snap.ratings, { target: inputs.base_target, stretch: inputs.stretch_target });
  if (!mine) return NextResponse.json(NOT_FOUND, { status: 404 });

  const pool = snap.totalBallots ?? 0;
  const odds = formatOdds(mine.ballots, pool);
  return NextResponse.json({
    month,
    monthLabel: monthLabel(month),
    consultsPerHour: mine.consultsPerHour,
    totalConsults: mine.totalConsults,
    satisfaction: mine.satisfaction,
    ballots: mine.ballots,
    totalBallots: pool,
    odds: { percent: odds.percent, oneIn: odds.oneIn }
  });
}
