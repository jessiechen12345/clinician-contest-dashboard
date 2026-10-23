import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { GATE_COOKIE, GATE_MAX_AGE, createGateToken } from "@/lib/gate";
import { DEFAULT_PASSWORD, gateStatus, rotateGate } from "@/lib/gatePassword";

export const dynamic = "force-dynamic";

export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  return NextResponse.json(await gateStatus());
}

/** PUT { newPassword?: string, signOutAll?: boolean } – changing the password always signs everyone else out. */
export async function PUT(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const body = await req.json().catch(() => null);
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : undefined;

  if (newPassword !== undefined) {
    if (newPassword.length < 8 || newPassword.length > 200)
      return NextResponse.json({ error: "Use a password of 8 to 200 characters." }, { status: 400 });
    if (newPassword.toLowerCase() === DEFAULT_PASSWORD)
      return NextResponse.json({ error: "Choose something other than the default password." }, { status: 400 });
  } else if (body?.signOutAll !== true) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const epoch = await rotateGate(a.email, newPassword);
  // Keep the admin who made the change signed in.
  const res = NextResponse.json({ ok: true, changed: newPassword !== undefined });
  res.cookies.set(GATE_COOKIE, await createGateToken(epoch), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GATE_MAX_AGE
  });
  return res;
}
