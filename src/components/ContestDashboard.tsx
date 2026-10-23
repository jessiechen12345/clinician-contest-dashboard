"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import StatCard from "./StatCard";
import { DEFAULT_RULES } from "@/lib/config";
import { currentMonthKey, monthBounds, monthLabel } from "@/lib/months";
import { PSAT_SCALE } from "@/lib/stats";
import { fmtDateTime, fmtInt, fmtRate } from "@/lib/format";

interface Overview {
  ready: boolean;
  message?: string;
  month: string;
  monthLabel: string;
  availableMonths?: { key: string; label: string }[];
  hasData?: boolean;
  prizes?: string[];
  target?: number;
  stretch?: number;
  startDate?: string;
  endDate?: string;
  totalBallots?: number;
  lastSyncAt?: string;
  lastDrawAt?: string | null;
}

interface Stats {
  ontarioConsults?: number | null;
  quebecConsults?: number | null;
  avgPsat?: number | null;
  psatPercent?: number | null;
}

interface Mine {
  monthLabel: string;
  consultsPerHour: number;
  psat: number | null;
  ballots: number;
  totalBallots: number;
  odds: { percent: string; oneIn: number | null };
}

type LoadState = "loading" | "ready" | "error";
const DASH = "—";
const label = "text-xs font-bold uppercase tracking-[0.14em]";

/**
 * Always renders the complete layout. Anything not loaded yet falls back to a default or a dash,
 * so there is never a blank or "loading-only" screen.
 */
export default function ContestDashboard() {
  const [month, setMonth] = useState<string | undefined>();
  const [ov, setOv] = useState<Overview | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState<Mine | null>(null);

  const load = useCallback(async (m?: string) => {
    setLoadState("loading");
    try {
      const q = m ? `?month=${m}` : "";
      const [o, s] = await Promise.all([
        fetch(`/api/overview${q}`, { cache: "no-store" }).then((r) => {
          if (!r.ok) throw new Error("overview");
          return r.json() as Promise<Overview>;
        }),
        fetch(`/api/stats${q}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
      ]);
      setOv(o);
      setStats(s);
      if (!m) setMonth(o.month);
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
      const res = await fetch("/api/clinician-lookup", {
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
  const activeMonth = month ?? ov?.month ?? currentMonthKey();
  const bounds = monthBounds(activeMonth);
  const monthText = ov?.monthLabel ?? monthLabel(activeMonth);
  const months = ov?.availableMonths?.length ? ov.availableMonths : [{ key: activeMonth, label: monthText }];
  const prizes = ov?.prizes ?? [];
  const target = ov?.target ?? DEFAULT_RULES.target;
  const stretch = ov?.stretch ?? DEFAULT_RULES.stretch;
  const live = !!(ov?.ready && ov.hasData);
  const pending = live ? "Appears after the next data sync." : "Appears once contest data is loaded.";

  const notice =
    loadState === "loading" && !ov ? "Loading the latest figures…"
    : loadState === "error" ? "Couldn't load the latest figures. Showing default values for now."
    : ov && !ov.ready ? (ov.message ?? "Contest data hasn't been loaded yet.")
    : ov?.ready && !ov.hasData ? `Results for ${monthText} haven't been published yet.`
    : null;

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-5xl px-5 pb-16 pt-8 sm:pt-10">
        {/* 1. Header */}
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-700">Clinician Contest</p>
          <Link href="/admin" className="text-sm text-teal-700 underline underline-offset-4 hover:text-teal-900">Admin Portal</Link>
        </div>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
          Check your ballots &amp; winning odds
        </h1>

        {/* 2. Dark teal overview card */}
        <section aria-labelledby="overview-h" className="mt-8 rounded-2xl bg-teal-900 p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="overview-h" className="text-2xl font-bold sm:text-3xl">{monthText} contest</h2>
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
                <dt className={`${label} text-teal-200`}>Contest window</dt>
                <dd className="mt-1 text-lg tabular-nums">{ov?.startDate ?? bounds.start} → {ov?.endDate ?? bounds.end}</dd>
              </div>
              <div>
                <dt className={`${label} text-teal-200`}>Last data sync</dt>
                <dd className="mt-1">{ov?.lastSyncAt ? `${fmtDateTime(ov.lastSyncAt)} (Pacific)` : "Not synced yet"}</dd>
              </div>
              <div>
                <dt className={`${label} text-teal-200`}>Last draw</dt>
                <dd className="mt-1">{ov?.lastDrawAt ? fmtDateTime(ov.lastDrawAt) : "No draw yet"}</dd>
              </div>
            </dl>
          </div>
        </section>

        {notice && <p role="status" className="mt-4 rounded-lg border border-teal-200 bg-white px-4 py-3 text-sm">{notice}</p>}

        {/* 3. Targets + total ballots */}
        <dl className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard label="Monthly target" value={fmtRate(target)} unit="consults/hr" chip="1 ballot" />
          <StatCard label="Stretch target" value={fmtRate(stretch)} unit="consults/hr" chip="2 ballots total" />
          <StatCard
            label="Total ballots"
            value={live ? (ov?.totalBallots ?? 0).toLocaleString("en-CA") : DASH}
            detail="Total ballots in the pool across all eligible clinicians."
          />
        </dl>

        {/* 4. Regional + PSAT */}
        <dl className="mt-4 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Total consults in Québec"
            value={live && stats?.quebecConsults != null ? fmtInt(stats.quebecConsults) : DASH}
            detail={live && stats?.quebecConsults != null ? undefined : pending}
          />
          <StatCard
            label="Total consults in Ontario"
            value={live && stats?.ontarioConsults != null ? fmtInt(stats.ontarioConsults) : DASH}
            detail={live && stats?.ontarioConsults != null ? undefined : pending}
          />
          <StatCard
            label="Overall PSAT score"
            value={live && stats?.psatPercent != null ? `${stats.psatPercent.toFixed(1)}%` : DASH}
            detail={live && stats?.avgPsat != null ? `Average score ${stats.avgPsat.toFixed(2)} out of ${PSAT_SCALE}.` : pending}
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
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Consults / hr" value={fmtRate(mine.consultsPerHour)} />
                <StatCard
                  label="PSAT score"
                  value={mine.psat ? `${((mine.psat / PSAT_SCALE) * 100).toFixed(1)}%` : DASH}
                  detail={mine.psat ? `${mine.psat.toFixed(2)} out of ${PSAT_SCALE}` : undefined}
                />
                <StatCard
                  label="Ballots earned"
                  value={String(mine.ballots)}
                  chip={mine.ballots === 2 ? "Target + stretch" : mine.ballots === 1 ? "Target ballot" : undefined}
                  detail={mine.ballots === 0 ? "No ballots yet this month." : undefined}
                />
                <StatCard
                  label="Winning odds"
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
