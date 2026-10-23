"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import OverviewCard from "./OverviewCard";
import StatCard from "./StatCard";
import ResultView, { LookupResult } from "./ResultView";
import { fmtInt, fmtRate } from "@/lib/format";

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
  hasData?: boolean;
  ontarioConsults?: number | null;
  quebecConsults?: number | null;
  avgPsat?: number | null;
  psatPercent?: number | null;
}

const PENDING = "Appears after the next data sync.";

export default function DashboardView() {
  const [month, setMonth] = useState<string | undefined>();
  const [ov, setOv] = useState<Overview | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);

  const load = useCallback(async (m?: string) => {
    const q = m ? `?month=${m}` : "";
    const [o, s] = await Promise.all([
      fetch(`/api/overview${q}`, { cache: "no-store" }).then((r) => r.json() as Promise<Overview>),
      fetch(`/api/stats${q}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    ]);
    setOv(o);
    setStats(s);
    if (!m) setMonth(o.month);
  }, []);

  useEffect(() => {
    load().catch(() => setError("Couldn't load contest details. Refresh to try again."));
  }, [load]);

  function changeMonth(m: string) {
    setMonth(m);
    setResult(null);
    setError(null);
    load(m).catch(() => setError("Couldn't load that month. Try again."));
  }

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch("/api/clinician-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicianId: id, month })
      });
      const data = await res.json();
      if (!res.ok) setError(data.message ?? "Something went wrong. Try again.");
      else setResult(data);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const live = ov?.ready && ov.hasData;
  const dash = "—";

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-5xl px-5 pb-16 pt-8 sm:pt-10">
        {/* 1. Header / hero */}
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-700">Clinician Contest</p>
          <Link href="/admin" className="text-sm text-teal-700 underline underline-offset-4 hover:text-teal-900">Admin sign in</Link>
        </div>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
          Check your ballots &amp; winning odds
        </h1>

        {ov && !ov.ready && (
          <p role="status" className="mt-8 rounded-lg border border-teal-200 bg-white p-5">{ov.message}</p>
        )}

        {ov?.ready && month && (
          <>
            {/* 2. Dark teal overview card */}
            <div className="mt-8">
              <OverviewCard
                monthLabel={ov.monthLabel}
                month={month}
                months={ov.availableMonths ?? []}
                onMonthChange={changeMonth}
                prizes={ov.prizes ?? []}
                startDate={ov.startDate}
                endDate={ov.endDate}
                lastSyncAt={ov.lastSyncAt}
                lastDrawAt={ov.lastDrawAt}
              />
            </div>

            {/* 3. Summary stat cards */}
            <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="Monthly target" value={fmtRate(ov.target)} unit="consults/hr" chip="1 ballot" />
              <StatCard label="Stretch target" value={fmtRate(ov.stretch)} unit="consults/hr" chip="2 ballots total" />
              <StatCard
                label="Total ballots"
                value={live ? (ov.totalBallots ?? 0).toLocaleString("en-CA") : dash}
                detail="In the pool across all eligible clinicians."
              />
              <StatCard
                label="Total consults in Québec"
                value={live && stats?.quebecConsults != null ? fmtInt(stats.quebecConsults) : dash}
                detail={live && stats?.quebecConsults == null ? PENDING : undefined}
              />
              <StatCard
                label="Total consults in Ontario"
                value={live && stats?.ontarioConsults != null ? fmtInt(stats.ontarioConsults) : dash}
                detail={live && stats?.ontarioConsults == null ? PENDING : undefined}
              />
              <StatCard
                label="Patient satisfaction"
                value={live && stats?.psatPercent != null ? `${stats.psatPercent.toFixed(1)}%` : dash}
                detail={live && stats?.avgPsat != null ? `Overall PSAT. Average score ${stats.avgPsat.toFixed(2)} out of 5.` : "Overall PSAT score."}
              />
            </dl>

            {/* 4. Search + individual results */}
            <section aria-labelledby="find-h" className="mt-10 rounded-xl border border-teal-200 bg-white p-5 sm:p-6">
              <h2 id="find-h" className="text-2xl font-bold">Find your results</h2>
              <form onSubmit={onSearch} className="mt-1">
                <p id="id-help" className="text-base text-teal-800">Enter your Unique Clinician ID. You can only see your own results.</p>
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
                    placeholder="THVC-0042"
                  />
                  <button
                    type="submit"
                    disabled={busy || !live}
                    className="rounded-md bg-teal-700 px-6 py-3 text-lg font-bold text-white hover:bg-teal-800 disabled:opacity-60"
                  >
                    {busy ? "Checking…" : "Check my results"}
                  </button>
                </div>
                {!live && <p className="mt-3 text-sm">Results for {ov.monthLabel} haven&apos;t been published yet. Pick another month.</p>}
                {error && <p role="alert" className="mt-3 rounded-md bg-alert-soft p-3 text-alert">{error}</p>}
              </form>
            </section>

            {result && (
              <>
                <ResultView r={result} />
                <button
                  onClick={() => { setResult(null); setId(""); setError(null); }}
                  className="mt-8 text-teal-700 underline underline-offset-4"
                >
                  Clear results and search again
                </button>
              </>
            )}

            {/* 5. Footer disclaimer */}
            <p className="mt-12 max-w-3xl border-t border-teal-200 pt-5 text-sm text-teal-800">
              Consults under 5 minutes are excluded. For multi-licensed clinicians, Ontario and Québec consults are combined.
              Winning odds shown are for a single prize draw; with multiple prizes your overall chance is higher.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
