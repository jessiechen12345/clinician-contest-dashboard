import { NextResponse } from "next/server";
import { resolveMonthConfig } from "@/lib/config";
import { inputsFor, monthOptions, safeSettings } from "@/lib/initiative";
import { loadSnapshot, metabaseConfigured } from "@/lib/metabase";
import { isMonthKey, monthLabel } from "@/lib/months";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Anonymous, pool-level numbers for the dashboard cards. Never returns clinician rows. */
export async function GET(req: Request) {
  const settings = await safeSettings();
  const q = new URL(req.url).searchParams.get("month");
  const month = isMonthKey(q) ? q : settings.activeMonth;
  const cfg = resolveMonthConfig(settings, month);

  const base = {
    month,
    monthLabel: monthLabel(month),
    availableMonths: monthOptions(settings),
    prizes: cfg.prizes,
    threshold: cfg.target,
    stretch: cfg.stretch,
    startDate: cfg.startDate,
    endDate: cfg.endDate,
    lastDrawAt: cfg.lastDrawAt
  };

  if (!metabaseConfigured()) {
    return NextResponse.json({ ...base, ready: false, message: "The data source isn't connected yet." });
  }
  try {
    const snap = await loadSnapshot(inputsFor(settings, month));
    return NextResponse.json({
      ...base,
      ready: true,
      totalBallots: snap.totalBallots,
      totalConsults: snap.totalConsults,
      satisfaction: snap.satisfaction,
      lastSyncAt: new Date(snap.fetchedAt).toISOString()
    });
  } catch (e) {
    console.error("[metabase] summary failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ...base, ready: false, message: "We couldn't load the latest figures. Please try again shortly." });
  }
}
