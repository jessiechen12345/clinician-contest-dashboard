import { NextResponse } from "next/server";
import { resolveMonthConfig } from "@/lib/config";
import { startingMonthKey } from "@/lib/launch";
import { monthLabel } from "@/lib/months";
import { loadDataset } from "@/lib/store";
import { averageSatisfaction, monthChoices, resolveMonth, safeSettings, totalConsults } from "@/lib/uploaded";

export const dynamic = "force-dynamic";

/**
 * Anonymous, pool-level numbers for the dashboard cards, from the CSV an admin uploaded.
 * No clinician rows, and no ballot totals.
 */
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
    const month = startingMonthKey();
    const cfg = resolveMonthConfig(settings, month);
    return NextResponse.json({
      ready: false,
      reason: "no_data",
      message: "No data has been uploaded yet.",
      month,
      monthLabel: monthLabel(month),
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
    totalConsults: totalConsults(ds, settings, month),
    satisfaction: averageSatisfaction(ds, settings, month),
    lastSyncAt: ds.syncedAt
  });
}
