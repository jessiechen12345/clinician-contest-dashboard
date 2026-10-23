import { NextResponse } from "next/server";
import { loadDataset, loadSettings } from "@/lib/store";
import { computeStats } from "@/lib/stats";
import { isMonthKey } from "@/lib/months";

export const dynamic = "force-dynamic";

/** Anonymous, pool-level numbers for the dashboard cards. No clinician rows. */
export async function GET(req: Request) {
  const [ds, settings] = await Promise.all([loadDataset(), loadSettings()]);
  if (!ds) return NextResponse.json({ ready: false });
  const q = new URL(req.url).searchParams.get("month");
  const month = isMonthKey(q) ? q : settings.activeMonth;
  if (!ds.months.includes(month)) return NextResponse.json({ ready: true, hasData: false, month });
  return NextResponse.json({ ready: true, hasData: true, month, ...computeStats(ds, settings, month) });
}
