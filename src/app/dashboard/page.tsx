import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { GATE_COOKIE, verifyGateToken } from "@/lib/gate";
import { LANG_COOKIE, isLang, pickInitialLang } from "@/lib/i18n";
import InitiativeDashboard from "@/components/InitiativeDashboard";

// Evaluated on every request so the cookie is always checked.
export const dynamic = "force-dynamic";

/**
 * Server component: the password check (second layer behind src/middleware.ts) and the starting language
 * (?lang=fr, then the saved choice, then the browser's language). The layout lives in InitiativeDashboard.
 */
export default async function DashboardPage({ searchParams }: { searchParams: { lang?: string } }) {
  const ok = await verifyGateToken(cookies().get(GATE_COOKIE)?.value);
  if (!ok) redirect(`/login?next=${encodeURIComponent(isLang(searchParams.lang) ? `/dashboard?lang=${searchParams.lang}` : "/dashboard")}`);
  const lang = pickInitialLang(searchParams.lang, null, cookies().get(LANG_COOKIE)?.value, headers().get("accept-language"));
  return <InitiativeDashboard apiBase="/api/data" initialLang={lang} />;
}
