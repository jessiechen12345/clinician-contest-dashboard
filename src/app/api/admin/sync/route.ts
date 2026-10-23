import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { fetchDatasetFromSheet } from "@/lib/sheets";
import { saveDataset } from "@/lib/store";
import { ParseError } from "@/lib/csv";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  try {
    const ds = await fetchDatasetFromSheet();
    await saveDataset(ds);
    return NextResponse.json({ ok: true, clinicians: ds.records.length, months: ds.months, syncedAt: ds.syncedAt });
  } catch (e) {
    const msg = e instanceof ParseError ? e.message : e instanceof Error ? e.message : "Sync failed.";
    return NextResponse.json({ error: `Sync failed: ${msg}` }, { status: 400 });
  }
}
