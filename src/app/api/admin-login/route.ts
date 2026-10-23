import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE, ADMIN_MAX_AGE, adminConfigured, adminPasswordMatches, createAdminToken, isApprovedAdmin
} from "@/lib/adminSession";
import { clientIp, rateLimited } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const cookieBase = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

/** POST { email, password } -> sets the admin cookie. Same error for a wrong email or a wrong password. */
export async function POST(req: Request) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: "Admin sign-in isn't set up yet. Set ADMIN_PASSWORD and ADMIN_EMAILS in the project settings." },
      { status: 503 }
    );
  }
  if (await rateLimited(clientIp(req), "admin-login", 10)) {
    return NextResponse.json({ error: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  const password = typeof body?.password === "string" ? body.password.slice(0, 200) : "";

  const passwordOk = await adminPasswordMatches(password); // always evaluate both
  const emailOk = isApprovedAdmin(email);
  if (!(passwordOk && emailOk)) {
    return NextResponse.json({ error: "That email or password isn't right." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await createAdminToken(email), { ...cookieBase, maxAge: ADMIN_MAX_AGE });
  return res;
}

/** Sign out. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { ...cookieBase, maxAge: 0 });
  return res;
}
