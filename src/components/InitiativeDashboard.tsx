"use client";

import { useCallback, useEffect, useState } from "react";
import StatCard from "./StatCard";
import LanguageToggle from "./LanguageToggle";
import RichText from "./RichText";
import { DEFAULT_RULES } from "@/lib/config";
import { monthBounds } from "@/lib/months";
import { startingMonthKey } from "@/lib/launch";
import {
  Lang, ballotsLabel, capitalize, deMonth, fmtDateTime, fmtInt, fmtRate, localizePrize, monthName, persistLang, satisfaction, t
} from "@/lib/i18n";

interface Summary {
  ready: boolean;
  reason?: string;
  message?: string;
  month: string;
  availableMonths?: { key: string }[];
  prizes?: string[];
  threshold?: number;
  stretch?: number;
  startDate?: string;
  endDate?: string;
  lastDrawAt?: string | null;
  totalConsults?: number | null;
  satisfaction?: number | null;
  lastSyncAt?: string;
}

interface Mine {
  consultsPerHour: number | null;
  totalConsults: number | null;
  satisfaction: number | null;
  ballots: number;
}

type LoadState = "loading" | "ready" | "error";
const DASH = "—";
const label = "text-xs font-bold uppercase tracking-[0.14em]";

/**
 * Always renders the complete layout (placeholders until data arrives), in English or French.
 * `initialLang` is chosen on the server so the first paint is already in the right language.
 */
export default function InitiativeDashboard({ apiBase = "/api/metabase", initialLang = "en" }: { apiBase?: string; initialLang?: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [month, setMonth] = useState<string | undefined>();
  const [sum, setSum] = useState<Summary | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [errCode, setErrCode] = useState<{ code: string; fallback?: string } | null>(null);
  const [mine, setMine] = useState<Mine | null>(null);

  const load = useCallback(async (m?: string) => {
    setLoadState("loading");
    try {
      const res = await fetch(`${apiBase}/summary${m ? `?month=${m}` : ""}`, { cache: "no-store" });
      if (!res.ok) throw new Error("summary");
      const data: Summary = await res.json();
      setSum(data);
      if (!m) setMonth(data.month);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, [apiBase]);

  useEffect(() => { load(); }, [load]);

  // Keep <html lang> right; save the choice only if the visitor picked it (a ?lang= link), not a guess from the browser.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("lang")) persistLang(initialLang, { rewriteUrl: false });
    else document.documentElement.lang = initialLang === "fr" ? "fr-CA" : "en-CA";
  }, [initialLang]);

  function chooseLang(l: Lang) {
    setLang(l);
    persistLang(l);
  }

  function changeMonth(m: string) {
    setMonth(m);
    setMine(null);
    setErrCode(null);
    load(m);
  }

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setErrCode(null);
    setMine(null);
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicianId: id, month })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setErrCode({ code: data.error ?? "generic", fallback: data.message });
      else setMine(data);
    } catch {
      setErrCode({ code: "network" });
    } finally {
      setBusy(false);
    }
  }

  // ---- values, with defaults so every section can render ----
  const activeMonth = month ?? sum?.month ?? startingMonthKey();
  const bounds = monthBounds(activeMonth);
  const monthText = monthName(activeMonth, lang);
  const monthVars = { month: monthText, de_month: deMonth(activeMonth, lang) };
  const months = sum?.availableMonths?.length ? sum.availableMonths.map((m) => m.key) : [activeMonth];
  const prizes = (sum?.prizes ?? []).map((p) => ({ raw: p, text: localizePrize(p, lang) }));
  const threshold = sum?.threshold ?? DEFAULT_RULES.target;
  const stretch = sum?.stretch ?? DEFAULT_RULES.stretch;
  const live = !!sum?.ready;
  const overall = satisfaction(live ? sum?.satisfaction : null, lang);
  const mySat = satisfaction(mine?.satisfaction, lang);

  const errorText = (e: { code: string; fallback?: string }) => {
    switch (e.code) {
      case "bad_request": return t(lang, "errBadRequest");
      case "not_found": return t(lang, "errNotFound");
      case "no_month_data": return t(lang, "errNoMonthData", { month: monthText });
      case "rate_limited": return t(lang, "errRateLimited");
      case "no_data": return t(lang, "noData");
      case "unavailable": return t(lang, "errUnavailable");
      case "network": return t(lang, "errNetwork");
      default: return t(lang, "errGeneric");
    }
  };

  const notice =
    loadState === "loading" && !sum ? t(lang, "loading")
    : loadState === "error" ? t(lang, "loadError")
    : sum && !sum.ready ? (sum.reason === "no_data" ? t(lang, "noData") : sum.reason === "unavailable" ? t(lang, "errUnavailable") : (sum.message ?? t(lang, "noData")))
    : null;

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-5xl px-5 pb-16 pt-6 sm:pt-8">
        {/* 1. Header + language switch */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-700">{t(lang, "brand")}</p>
          <LanguageToggle lang={lang} onChange={chooseLang} label={t(lang, "language")} />
        </div>
        <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">{t(lang, "headline")}</h1>

        {/* 2. Dark teal overview card */}
        <section aria-labelledby="overview-h" className="mt-8 rounded-2xl bg-teal-900 p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="overview-h" className="text-2xl font-bold sm:text-3xl">{t(lang, "overviewTitle", monthVars)}</h2>
            <select
              aria-label={t(lang, "month")}
              value={activeMonth}
              onChange={(e) => changeMonth(e.target.value)}
              className="rounded-md border border-teal-300/60 bg-teal-800 px-3 py-2 text-base text-white [&>option]:text-ink"
            >
              {months.map((k) => <option key={k} value={k}>{capitalize(monthName(k, lang))}</option>)}
            </select>
          </div>
          <div className="mt-6 grid gap-6 border-t border-white/20 pt-6 sm:grid-cols-2">
            <div>
              <h3 className={`${label} text-teal-200`}>{t(lang, "prizes")}</h3>
              <ul className="mt-3 list-inside list-disc space-y-1 text-lg">
                {prizes.length ? prizes.map((p) => <li key={p.raw}><RichText text={p.text} /></li>) : <li>{t(lang, "prizeTbd")}</li>}
              </ul>
            </div>
            <dl className="space-y-3">
              <div>
                <dt className={`${label} text-teal-200`}>{t(lang, "dateRange")}</dt>
                <dd className="mt-1 text-lg tabular-nums">{sum?.startDate ?? bounds.start} → {sum?.endDate ?? bounds.end}</dd>
              </div>
              <div>
                <dt className={`${label} text-teal-200`}>{t(lang, "lastSync")}</dt>
                <dd className="mt-1">{sum?.lastSyncAt ? `${fmtDateTime(sum.lastSyncAt, lang)} (${t(lang, "pacific")})` : t(lang, "notSynced")}</dd>
              </div>
              <div>
                <dt className={`${label} text-teal-200`}>{t(lang, "lastDraw")}</dt>
                <dd className="mt-1">{sum?.lastDrawAt ? fmtDateTime(sum.lastDrawAt, lang) : t(lang, "noDraw")}</dd>
              </div>
            </dl>
          </div>
        </section>

        {notice && <p role="status" className="mt-4 rounded-lg border border-teal-200 bg-white px-4 py-3 text-sm">{notice}</p>}

        {/* 3. Thresholds */}
        <dl className="mt-6 grid gap-4 md:grid-cols-2">
          <StatCard label={t(lang, "monthlyThreshold")} value={fmtRate(threshold, lang)} unit={t(lang, "perHour")} chip={ballotsLabel(lang, 1)} />
          <StatCard label={t(lang, "stretchThreshold")} value={fmtRate(stretch, lang)} unit={t(lang, "perHour")} chip={ballotsLabel(lang, 2)} />
        </dl>

        {/* 4. Combined consults + satisfaction */}
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          <StatCard
            label={t(lang, "totalConsults")}
            value={live && sum?.totalConsults != null ? fmtInt(sum.totalConsults, lang) : DASH}
            detail={live && sum?.totalConsults != null ? t(lang, "consultsNote") : t(lang, "pending")}
          />
          <StatCard
            label={t(lang, "overallSatisfaction")}
            value={overall.value}
            unit={overall.unit}
            detail={overall.value === DASH ? t(lang, "pending") : undefined}
          />
        </dl>

        {/* 5. Find your results */}
        <section aria-labelledby="find-h" className="mt-10 rounded-xl border border-teal-200 bg-white p-5 sm:p-6">
          <h2 id="find-h" className="text-2xl font-bold">{t(lang, "findTitle")}</h2>
          <form onSubmit={onSearch}>
            <p id="id-help" className="mt-1 text-base text-teal-800">{t(lang, "findHelp")}</p>
            <label htmlFor="clinician-id" className="sr-only">{t(lang, "idLabel")}</label>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                id="clinician-id"
                name="clinicianId"
                aria-describedby="id-help"
                value={id}
                onChange={(e) => setId(e.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                required
                minLength={2}
                maxLength={120}
                className="min-w-0 flex-1 rounded-md border-2 border-teal-300 px-4 py-3 text-lg"
                placeholder={t(lang, "placeholder")}
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-teal-700 px-6 py-3 text-lg font-bold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {busy ? t(lang, "checking") : t(lang, "checkBtn")}
              </button>
            </div>
            {errCode && <p role="alert" className="mt-3 rounded-md bg-alert-soft p-3 text-alert">{errorText(errCode)}</p>}
          </form>

          {mine && (
            <div className="mt-6 border-t border-teal-100 pt-6" aria-live="polite">
              <h3 className="text-xl font-bold">{t(lang, "resultsTitle", monthVars)}</h3>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label={t(lang, "rate")} value={fmtRate(mine.consultsPerHour, lang)} />
                <StatCard label={t(lang, "mineTotalConsults")} value={fmtInt(mine.totalConsults, lang)} />
                <StatCard label={t(lang, "satisfactionScore")} value={mySat.value} unit={mySat.unit} />
                <StatCard
                  label={t(lang, "ballotsEarned")}
                  value={String(mine.ballots)}
                  chip={mine.ballots >= 2 ? t(lang, "thresholdPlusStretch") : mine.ballots === 1 ? t(lang, "thresholdBallot") : undefined}
                  detail={mine.ballots === 0 ? t(lang, "noBallots") : undefined}
                />
              </dl>
            </div>
          )}
        </section>

        {/* 6. Footer disclaimer */}
        <p className="mt-12 max-w-3xl border-t border-teal-200 pt-5 text-sm text-teal-800">{t(lang, "footer")}</p>
      </main>
    </div>
  );
}
