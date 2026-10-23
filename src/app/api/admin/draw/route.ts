import { NextResponse } from "next/server";
import { randomInt, randomUUID } from "crypto";
import { requireAdmin } from "@/lib/auth";
import { loadDataset, loadDraws, loadSettings, saveDraws, saveSettings } from "@/lib/store";
import { resolveMonthConfig } from "@/lib/config";
import { computePool } from "@/lib/ballots";
import { isMonthKey } from "@/lib/months";
import type { DrawRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return NextResponse.json({ draws: (await loadDraws()).slice().reverse() });
}

/**
 * Weighted draw without replacement: each ballot is one entry, a clinician can win at most once per draw run.
 * Uses crypto.randomInt (CSPRNG). Pass preview:true to see winners without saving.
 */
export async function POST(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const body = await req.json().catch(() => null);
  if (!body || !isMonthKey(body.month)) return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  const count = Math.floor(Number(body.winners ?? 1));
  if (!(count >= 1 && count <= 20)) return NextResponse.json({ error: "Winners must be 1–20." }, { status: 400 });

  const [ds, settings] = await Promise.all([loadDataset(), loadSettings()]);
  if (!ds || !ds.months.includes(body.month)) return NextResponse.json({ error: "No data for that month." }, { status: 404 });

  const cfg = resolveMonthConfig(settings, body.month);
  const pool = computePool(ds, settings, body.month, cfg);
  if (pool.entries.length === 0) return NextResponse.json({ error: "No eligible ballots in the pool." }, { status: 400 });

  const remaining = pool.entries.slice();
  const winners: DrawRecord["winners"] = [];
  for (let i = 0; i < Math.min(count, remaining.length); i++) {
    const total = remaining.reduce((s, e) => s + e.ballots, 0);
    let pick = randomInt(total);
    const idx = remaining.findIndex((e) => (pick -= e.ballots) < 0);
    const [w] = remaining.splice(idx, 1);
    winners.push({ id: w.rec.id, name: w.rec.name, email: w.rec.email, ballots: w.ballots });
  }

  const record: DrawRecord = {
    id: randomUUID(),
    month: body.month,
    at: new Date().toISOString(),
    by: a.email,
    prize: typeof body.prize === "string" ? body.prize.slice(0, 120) : "",
    poolBallots: pool.totalBallots,
    poolParticipants: pool.participants,
    winners
  };

  if (!body.preview) {
    const draws = await loadDraws();
    draws.push(record);
    await saveDraws(draws);
    settings.months[body.month] = { ...(settings.months[body.month] ?? {}), lastDrawAt: record.at };
    await saveSettings(settings);
  }
  return NextResponse.json({ record, saved: !body.preview });
}
