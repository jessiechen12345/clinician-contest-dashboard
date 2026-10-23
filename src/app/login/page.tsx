import { cookies, headers } from "next/headers";
import LoginForm from "@/components/LoginForm";
import { LANG_COOKIE, langFromNextParam, pickInitialLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** Picks the starting language: ?lang=, a lang inside the page we're returning to, the saved choice, then the browser's. */
export default function LoginPage({ searchParams }: { searchParams: { lang?: string; next?: string } }) {
  const lang = pickInitialLang(searchParams.lang, langFromNextParam(searchParams.next), cookies().get(LANG_COOKIE)?.value, headers().get("accept-language"));
  return <LoginForm initialLang={lang} />;
}
