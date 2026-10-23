import { NextResponse } from "next/server";
import { resolveMonthConfig } from "@/lib/config";
import { computePool } from "@/lib/ballots";
import { monthLabel } from "@/lib/months";
import { loadDataset } from "@/lib/store";
import { averageSatisfaction, monthChoices, resolveMonth, safeSettings, totalConsults } from "@/lib/uploaded";

export const dynamic = "force-dynamic";

/** Anonymous, pool-level numbers for the dashboard cards, from the CSV an admin uploaded. No clinician rows. */
export async function GET(req: Request) {
  const settings = await safeSettings();
  const requested = new URL(req.url).searchParams.get("month");
  let ds = null;
  try {
    ds = await loadDataset();
  } catch (e) {
    console.error("[data] couldn't read stored data:", e instanceof Error ? e.message : e);
  }

  if (!ds) {
    const cfg = resolveMonthConfig(settings, settings.activeMonth);
    return NextResponse.json({
      ready: false,
      reason: "no_data",
      message: "No data has been uploaded yet.",
      month: settings.activeMonth,
      monthLabel: monthLabel(settings.activeMonth),
      prizes: cfg.prizes,
      threshold: cfg.target,
      stretch: cfg.stretch,
      startDate: cfg.startDate,
      endDate: cfg.endDate,
      lastDrawAt: cfg.lastDrawAt
    });
  }

  const month = resolveMonth(ds, settings, requested);
  const cfg = resolveMonthConfig(settings, month);
  const pool = computePool(ds, settings, month, cfg);
  return NextResponse.json({
    ready: true,
    month,
    monthLabel: monthLabel(month),
    availableMonths: monthChoices(ds),
    prizes: cfg.prizes,
    threshold: cfg.target,
    stretch: cfg.stretch,
    startDate: cfg.startDate,
    endDate: cfg.endDate,
    lastDrawAt: cfg.lastDrawAt,
    totalBallots: pool.totalBallots,
    totalConsults: totalConsults(ds, settings, month),
    satisfaction: averageSatisfaction(ds, settings, month),
    lastSyncAt: ds.syncedAt
  });
}
