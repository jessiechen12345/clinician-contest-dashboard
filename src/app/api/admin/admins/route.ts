import { NextResponse } from "next/server";
import { adminEmails } from "@/lib/adminSession";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const looksLikeEmail = (e: string) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/.test(e);

/** Admin only: which emails this running copy of the site has loaded from ADMIN_EMAILS. Never returns passwords. */
export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return NextResponse.json({
    you: a.email,
    approved: adminEmails().map((email) => ({ email, looksValid: looksLikeEmail(email) })),
    environment: process.env.VERCEL_ENV ?? "local",
    version: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || null
  });
}
