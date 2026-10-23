import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, gateSecretConfigured, verifyGateToken } from "@/lib/gate";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // The login API must always be reachable.
  if (pathname === "/api/login") return NextResponse.next();

  if (!gateSecretConfigured()) {
    return new NextResponse("Set GATE_SECRET or NEXTAUTH_SECRET to enable the app password.", { status: 503 });
  }

  const authed = await verifyGateToken(req.cookies.get(GATE_COOKIE)?.value);

  if (pathname === "/login") {
    if (!authed) return NextResponse.next();
    const url = req.nextUrl.clone(); // already signed in -> skip the login screen
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (authed) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Password required." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
