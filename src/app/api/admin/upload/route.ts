import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { parseProductivityCsv, ParseError } from "@/lib/csv";
import { saveDataset } from "@/lib/store";

export const dynamic = "force-dynamic";
const MAX_BYTES = 4 * 1024 * 1024; // Vercel serverless body limit is ~4.5MB

export async function POST(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Attach a CSV file." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File is larger than 4 MB." }, { status: 413 });
  try {
    const ds = parseProductivityCsv(await file.text());
    await saveDataset(ds);
    return NextResponse.json({ ok: true, clinicians: ds.records.length, months: ds.months, syncedAt: ds.syncedAt });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof ParseError ? e.message : "Could not read that file." },
      { status: 400 }
    );
  }
}
