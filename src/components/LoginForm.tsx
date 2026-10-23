"use client";

import { useEffect, useState } from "react";
import LanguageToggle from "./LanguageToggle";
import { Lang, persistLang, t } from "@/lib/i18n";

export default function LoginForm({ initialLang }: { initialLang: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<"wrong" | "many" | "network" | "generic" | null>(null);

  useEffect(() => {
    document.documentElement.lang = initialLang === "fr" ? "fr-CA" : "en-CA";
  }, [initialLang]);

  function chooseLang(l: Lang) {
    setLang(l);
    persistLang(l, { rewriteUrl: false });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw, next })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setErr(res.status === 401 ? "wrong" : res.status === 429 ? "many" : "generic");
      else {
        persistLang(lang, { rewriteUrl: false }); // remember the language they used to sign in
        const target = new URL(data.next ?? "/dashboard", window.location.origin);
        if (!target.searchParams.has("lang") && target.pathname === "/dashboard") target.searchParams.set("lang", lang);
        window.location.assign(target.pathname + target.search);
      }
    } catch {
      setErr("network");
    } finally {
      setBusy(false);
    }
  }

  const message = err === "wrong" ? t(lang, "loginWrong") : err === "many" ? t(lang, "loginTooMany") : err === "network" ? t(lang, "errNetwork") : err ? t(lang, "errGeneric") : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <div className="mb-4 flex justify-end">
        <LanguageToggle lang={lang} onChange={chooseLang} label={t(lang, "language")} />
      </div>
      <form onSubmit={submit} className="rounded-xl border border-teal-200 bg-white p-6">
        <h1 className="text-2xl font-bold">{t(lang, "brand")}</h1>
        <p className="mt-2">{t(lang, "loginIntro")}</p>
        <label htmlFor="pw" className="mt-5 block font-bold">{t(lang, "loginPassword")}</label>
        <input
          id="pw"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="current-password"
          autoFocus
          required
          className="mt-1 w-full rounded-md border-2 border-teal-300 px-4 py-3 text-lg"
        />
        {message && <p role="alert" className="mt-3 rounded-md bg-alert-soft p-3 text-alert">{message}</p>}
        <button disabled={busy} className="mt-4 w-full rounded-md bg-teal-700 px-6 py-3 text-lg font-bold text-white hover:bg-teal-800 disabled:opacity-60">
          {busy ? t(lang, "checking") : t(lang, "loginContinue")}
        </button>
      </form>
    </main>
  );
}
