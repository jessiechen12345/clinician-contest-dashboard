"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import StatCard from "./StatCard";
import { DEFAULT_RULES } from "@/lib/config";
import { currentMonthKey, monthBounds, monthLabel } from "@/lib/months";
import { satisfactionParts } from "@/lib/metabaseData";
import { fmtDateTime, fmtInt, fmtRate } from "@/lib/format";

interface Summary {
  ready: boolean;
  message?: string;
  month: string;
  monthLabel: string;
  availableMonths?: { key: string; label: string }[];
  prizes?: string[];
  threshold?: number;
  stretch?: number;
  startDate?: string;
  endDate?: string;
  lastDrawAt?: string | null;
  totalBallots?: number | null;
  totalConsults?: number | null;
  satisfaction?: number | null;
  lastSyncAt?: string;
}

interface Mine {
  monthLabel: string;
  consultsPerHour: number | null;
  totalConsults: number | null;
  satisfaction: number | null;
  ballots: number;
  totalBallots: number;
  odds: { percent: string; oneIn: number | null };
}

type LoadState = "loading" | "ready" | "error";
const DASH = "—";
const PENDING = "Appears once data is loaded.";
const label = "text-xs font-bold uppercase tracking-[0.14em]";

/**
 * Always renders the complete layout. Anything not loaded yet falls back to a default or a dash,
 * so there is never a blank or "loading-only" screen.
 */
export default function InitiativeDashboard() {
  const [month, setMonth] = useState<string | undefined>();
  const [sum, setSum] = useState<Summary | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState<Mine | null>(null);

  const load = useCallback(async (m?: string) => {
    setLoadState("loading");
    try {
      const res = await fetch(`/api/metabase/summary${m ? `?month=${m}` : ""}`, { cache: "no-store" });
      if (!res.ok) throw new Error("summary");
      const data: Summary = await res.json();
      setSum(data);
      if (!m) setMonth(data.month);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function changeMonth(m: string) {
    setMonth(m);
    setMine(null);
    setError(null);
    load(m);
  }

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMine(null);
    setBusy(true);
    try {
      const res = await fetch("/api/metabase/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicianId: id, month })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.message ?? data.error ?? "Something went wrong. Try again.");
      else setMine(data);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  // ---- values, with defaults so every section can render ----
  const activeMonth = month ?? sum?.month ?? currentMonthKey();
  const bounds = monthBounds(activeMonth);
  const monthText = sum?.monthLabel ?? monthLabel(activeMonth);
  const months = sum?.availableMonths?.length ? sum.availableMonths : [{ key: activeMonth, label: monthText }];
  const prizes = sum?.prizes ?? [];
  const threshold = sum?.threshold ?? DEFAULT_RULES.target;
  const stretch = sum?.stretch ?? DEFAULT_RULES.stretch;
  const live = !!sum?.ready;
  const overall = satisfactionParts(live ? sum?.satisfaction : null);
  const mySat = satisfactionParts(mine?.satisfaction);

  const notice =
    loadState === "loading" && !sum ? "Loading the latest figures…"
    : loadState === "error" ? "Couldn't load the latest figures. Showing default values for now."
    : sum && !sum.ready ? (sum.message ?? "Data hasn't been loaded yet.")
    : null;

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-5xl px-5 pb-16 pt-8 sm:pt-10">
        {/* 1. Header */}
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-700">Care Capacity Initiative</p>
          <Link href="/admin" className="text-sm text-teal-700 underline underline-offset-4 hover:text-teal-900">Admin Portal</Link>
        </div>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
          Check your ballots &amp; winning odds
        </h1>

        {/* 2. Dark teal overview card */}
        <section aria-labelledby="overview-h" className="mt-8 rounded-2xl bg-teal-900 p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="overview-h" className="text-2xl font-bold sm:text-3xl">{monthText} overview</h2>
            <select
              aria-label="Month"
              value={activeMonth}
              onChange={(e) => changeMonth(e.target.value)}
              className="rounded-md border border-teal-300/60 bg-teal-800 px-3 py-2 text-base text-white [&>option]:text-ink"
            >
              {months.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
          <div className="mt-6 grid gap-6 border-t border-white/20 pt-6 sm:grid-cols-2">
            <div>
              <h3 className={`${label} text-teal-200`}>Prizes</h3>
              <ul className="mt-3 list-inside list-disc space-y-1 text-lg">
                {prizes.length ? prizes.map((p) => <li key={p}>{p}</li>) : <li>Prize to be announced</li>}
              </ul>
            </div>
            <dl className="space-y-3">
              <div>
                <dt className={`${label} text-teal-200`}>Date range</dt>
                <dd className="mt-1 text-lg tabular-nums">{sum?.startDate ?? bounds.start} → {sum?.endDate ?? bounds.end}</dd>
              </div>
              <div>
                <dt className={`${label} text-teal-200`}>Last data sync</dt>
                <dd className="mt-1">{sum?.lastSyncAt ? `${fmtDateTime(sum.lastSyncAt)} (Pacific)` : "Not synced yet"}</dd>
              </div>
              <div>
                <dt className={`${label} text-teal-200`}>Last draw</dt>
                <dd className="mt-1">{sum?.lastDrawAt ? fmtDateTime(sum.lastDrawAt) : "No draw yet"}</dd>
              </div>
            </dl>
          </div>
        </section>

        {notice && <p role="status" className="mt-4 rounded-lg border border-teal-200 bg-white px-4 py-3 text-sm">{notice}</p>}

        {/* 3. Thresholds + total ballots */}
        <dl className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard label="Monthly Threshold" value={fmtRate(threshold)} unit="consults per hour" chip="1 ballot" />
          <StatCard label="Stretch Threshold" value={fmtRate(stretch)} unit="consults per hour" chip="2 ballots total" />
          <StatCard
            label="Total Ballots"
            value={live && sum?.totalBallots != null ? sum.totalBallots.toLocaleString("en-CA") : DASH}
            detail="Total ballots in the pool across all eligible clinicians."
          />
        </dl>

        {/* 4. Combined consults + satisfaction */}
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          <StatCard
            label="Total Consults in Québec & Ontario"
            value={live && sum?.totalConsults != null ? fmtInt(sum.totalConsults) : DASH}
            detail={live && sum?.totalConsults != null ? "Québec and Ontario combined." : PENDING}
          />
          <StatCard
            label="Overall Patient Satisfaction Score"
            value={overall.value}
            unit={overall.unit}
            detail={overall.value === DASH ? PENDING : undefined}
          />
        </dl>

        {/* 5. Find your results */}
        <section aria-labelledby="find-h" className="mt-10 rounded-xl border border-teal-200 bg-white p-5 sm:p-6">
          <h2 id="find-h" className="text-2xl font-bold">Find your results</h2>
          <form onSubmit={onSearch}>
            <p id="id-help" className="mt-1 text-base text-teal-800">Enter your Unique Clinician ID. You can only see your own results.</p>
            <label htmlFor="clinician-id" className="sr-only">Unique Clinician ID</label>
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
                placeholder="e.g. THVC-0042"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-teal-700 px-6 py-3 text-lg font-bold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {busy ? "Checking…" : "Check my results"}
              </button>
            </div>
            {error && <p role="alert" className="mt-3 rounded-md bg-alert-soft p-3 text-alert">{error}</p>}
          </form>

          {mine && (
            <div className="mt-6 border-t border-teal-100 pt-6" aria-live="polite">
              <h3 className="text-xl font-bold">Your {mine.monthLabel} results</h3>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard label="Consults per Hour" value={mine.consultsPerHour != null ? fmtRate(mine.consultsPerHour) : DASH} />
                <StatCard label="Total Consults" value={mine.totalConsults != null ? fmtInt(mine.totalConsults) : DASH} />
                <StatCard label="Patient Satisfaction Score" value={mySat.value} unit={mySat.unit} />
              </dl>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <StatCard
                  label="Ballots Earned"
                  value={String(mine.ballots)}
                  chip={mine.ballots >= 2 ? "Threshold + stretch" : mine.ballots === 1 ? "Threshold ballot" : undefined}
                  detail={mine.ballots === 0 ? "No ballots yet this month." : undefined}
                />
                <StatCard
                  label="Winning Odds"
                  value={mine.odds.percent}
                  detail={
                    mine.odds.oneIn
                      ? `About 1 in ${mine.odds.oneIn.toLocaleString("en-CA")} (${mine.ballots} of ${mine.totalBallots.toLocaleString("en-CA")} ballots).`
                      : "Earn a ballot to enter the draw."
                  }
                />
              </dl>
            </div>
          )}
        </section>

        {/* 6. Footer disclaimer */}
        <p className="mt-12 max-w-3xl border-t border-teal-200 pt-5 text-sm text-teal-800">
          For multi-licensed clinicians, Ontario and Québec consults are combined.
          Winning odds shown are for a single prize draw; with multiple prizes your overall chance is higher.
        </p>
      </main>
    </div>
  );
}
