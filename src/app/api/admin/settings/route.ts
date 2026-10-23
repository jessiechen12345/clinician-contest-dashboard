import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { loadSettings, saveSettings, loadDataset } from "@/lib/store";
import { resolveMonthConfig } from "@/lib/config";
import { isMonthKey } from "@/lib/months";
import { storageMode } from "@/lib/storage";
import { ADMIN_WHITELIST } from "@/config/adminWhitelist";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const [settings, ds] = await Promise.all([loadSettings(), loadDataset()]);
  const q = new URL(req.url).searchParams.get("month");
  const month = isMonthKey(q) ? q : settings.activeMonth;
  return NextResponse.json({
    admin: { email: a.email, name: ADMIN_WHITELIST.find((x) => x.email.toLowerCase() === a.email.toLowerCase())?.name },
    storageMode,
    settings,
    month,
    config: resolveMonthConfig(settings, month),
    dataset: ds ? { syncedAt: ds.syncedAt, source: ds.source, months: ds.months, clinicians: ds.records.length } : null
  });
}

const num = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined;
const dateStr = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export async function PUT(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const body = await req.json().catch(() => null);
  if (!body || !isMonthKey(body.month)) return NextResponse.json({ error: "Invalid month." }, { status: 400 });

  const settings = await loadSettings();
  const cur = settings.months[body.month] ?? {};
  const c = body.config ?? {};

  const target = num(c.target, 0, 50);
  const stretch = num(c.stretch, 0, 50);
  const effTarget = target ?? cur.target ?? 2.0;
  const effStretch = stretch ?? cur.stretch ?? 2.15;
  if (effStretch < effTarget)
    return NextResponse.json({ error: "Stretch target must be greater than or equal to the target." }, { status: 400 });

  settings.months[body.month] = {
    ...cur,
    ...(target !== undefined && { target }),
    ...(stretch !== undefined && { stretch }),
    ...(num(c.minConsults, 0, 10000) !== undefined && { minConsults: num(c.minConsults, 0, 10000) }),
    ...(num(c.minPsat, 0, 5) !== undefined && { minPsat: num(c.minPsat, 0, 5) }),
    ...(dateStr(c.startDate) && { startDate: dateStr(c.startDate) }),
    ...(dateStr(c.endDate) && { endDate: dateStr(c.endDate) }),
    ...(Array.isArray(c.prizes) && {
      prizes: c.prizes.map((p: unknown) => String(p).trim().slice(0, 120)).filter(Boolean).slice(0, 20)
    })
  };
  if (typeof body.activeMonth === "string" && isMonthKey(body.activeMonth)) settings.activeMonth = body.activeMonth;
  if (Array.isArray(body.eligibleStatuses))
    settings.eligibleStatuses = body.eligibleStatuses.map((s: unknown) => String(s).trim()).filter(Boolean);

  await saveSettings(settings);
  return NextResponse.json({ ok: true });
}
