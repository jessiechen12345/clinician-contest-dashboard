import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { resolveMonthConfig } from "@/lib/config";
import { isMonthKey } from "@/lib/months";
import { ballotRuleStats } from "@/lib/ruleStats";
import { BALLOT_SOURCE } from "@/lib/ballotSource";
import { loadDataset, loadSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Admin only: the ballot rules in force for a month, and how many clinicians each rule affects. */
export async function GET(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const [ds, settings] = await Promise.all([loadDataset(), loadSettings()]);
  const q = new URL(req.url).searchParams.get("month");
  const month = isMonthKey(q) ? q : settings.activeMonth;
  const cfg = resolveMonthConfig(settings, month);
  const rules = { minConsults: cfg.minConsults, minPsat: cfg.minPsat, target: cfg.target, stretch: cfg.stretch };
  if (!ds || !ds.months.includes(month)) return NextResponse.json({ month, rules, source: BALLOT_SOURCE, counts: null });
  return NextResponse.json({ month, rules, source: BALLOT_SOURCE, counts: ballotRuleStats(ds, settings, month, cfg) });
}
