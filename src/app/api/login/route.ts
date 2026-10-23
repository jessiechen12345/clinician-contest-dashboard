import { NextResponse } from "next/server";
import { GATE_COOKIE, GATE_MAX_AGE, createGateToken, safeNext } from "@/lib/gate";
import { checkPassword } from "@/lib/gatePassword";
import { clientIp, rateLimited } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (await rateLimited(clientIp(req), "gate", 10)) {
    return NextResponse.json({ error: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password.slice(0, 200) : "";
  const { ok, epoch } = await checkPassword(password);
  if (!ok) return NextResponse.json({ error: "That password isn't right. Try again." }, { status: 401 });

  const res = NextResponse.json({ ok: true, next: safeNext(body?.next) });
  res.cookies.set(GATE_COOKIE, await createGateToken(epoch), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GATE_MAX_AGE
  });
  return res;
}
