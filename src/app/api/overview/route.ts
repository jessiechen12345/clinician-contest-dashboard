import { NextResponse } from "next/server";
import { loadDataset, loadSettings } from "@/lib/store";
import { resolveMonthConfig } from "@/lib/config";
import { computePool } from "@/lib/ballots";
import { isMonthKey, monthLabel } from "@/lib/months";

export const dynamic = "force-dynamic";

/** Public, anonymous aggregates only: targets, prizes, total pool, sync timestamps. No clinician data. */
export async function GET(req: Request) {
  const [ds, settings] = await Promise.all([loadDataset(), loadSettings()]);
  const q = new URL(req.url).searchParams.get("month");
  const month = isMonthKey(q) ? q : settings.activeMonth;

  if (!ds) {
    return NextResponse.json({
      ready: false,
      month,
      monthLabel: monthLabel(month),
      message: "Contest data hasn't been loaded yet. Please check back soon."
    });
  }

  const cfg = resolveMonthConfig(settings, month);
  const hasMonth = ds.months.includes(month);
  const pool = hasMonth ? computePool(ds, settings, month, cfg) : null;

  return NextResponse.json({
    ready: true,
    month,
    monthLabel: monthLabel(month),
    activeMonth: settings.activeMonth,
    availableMonths: ds.months.map((m) => ({ key: m, label: monthLabel(m) })),
    hasData: hasMonth,
    prizes: cfg.prizes,
    target: cfg.target,
    stretch: cfg.stretch,
    minConsults: cfg.minConsults,
    minPsat: cfg.minPsat,
    startDate: cfg.startDate,
    endDate: cfg.endDate,
    totalBallots: pool?.totalBallots ?? 0,
    lastSyncAt: ds.syncedAt,
    lastDrawAt: cfg.lastDrawAt
  });
}
