"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ProductivityRuler from "@/components/ProductivityRuler";
import ResultView, { LookupResult } from "@/components/ResultView";
import { fmtDate, fmtDateTime } from "@/lib/format";

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

export default function Home() {
  const [month, setMonth] = useState<string | undefined>();
  const [ov, setOv] = useState<Overview | null>(null);
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);

  const loadOverview = useCallback(async (m?: string) => {
    const res = await fetch(`/api/overview${m ? `?month=${m}` : ""}`, { cache: "no-store" });
    const data: Overview = await res.json();
    setOv(data);
    if (!m) setMonth(data.month);
  }, []);

  useEffect(() => { loadOverview().catch(() => setError("Couldn't load contest details. Refresh to try again.")); }, [loadOverview]);

  function changeMonth(m: string) {
    setMonth(m);
    setResult(null);
    setError(null);
    loadOverview(m);
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

  function clear() {
    setResult(null);
    setId("");
    setError(null);
  }

  const noData = ov?.ready && ov.hasData === false;

  return (
    <div className="min-h-screen">
      <header className="border-b border-teal-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <span className="text-lg font-bold text-teal-800">Clinician Contest</span>
          <Link href="/admin" className="text-sm text-teal-700 underline underline-offset-4 hover:text-teal-900">Admin sign in</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20 pt-10">
        {/* Month + hero */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{ov?.monthLabel ?? "Contest"} ballot draw</h1>
            <p className="mt-3 max-w-xl text-lg">
              Hit the target to earn a ballot. Hit the stretch target to earn a second. Look yourself up to see where you stand.
            </p>
          </div>
          {ov?.availableMonths && ov.availableMonths.length > 1 && (
            <label className="text-sm">
              <span className="mb-1 block text-teal-800">Month</span>
              <select
                value={month}
                onChange={(e) => changeMonth(e.target.value)}
                className="rounded-md border border-teal-300 bg-white px-3 py-2 text-base"
              >
                {ov.availableMonths.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </label>
          )}
        </div>

        {ov && !ov.ready && (
          <p role="status" className="mt-8 rounded-lg border border-teal-200 bg-white p-5">{ov.message}</p>
        )}

        {ov?.ready && (
          <>
            {/* Search */}
            <form onSubmit={onSearch} className="mt-8 rounded-xl border border-teal-200 bg-white p-5 sm:p-6" aria-describedby="id-help">
              <label htmlFor="clinician-id" className="block text-lg font-bold">Find your results</label>
              <p id="id-help" className="mt-1 text-sm text-teal-800">Enter your Unique ID or your THVC email. You can only see your own results.</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  id="clinician-id"
                  name="clinicianId"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  minLength={2}
                  maxLength={120}
                  className="min-w-0 flex-1 rounded-md border-2 border-teal-300 px-4 py-3 text-lg"
                  placeholder="Unique ID or name@thvc email"
                />
                <button
                  type="submit"
                  disabled={busy || noData}
                  className="rounded-md bg-teal-700 px-6 py-3 text-lg font-bold text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {busy ? "Searching…" : "Show my results"}
                </button>
              </div>
              {noData && <p className="mt-3 text-sm">Results for {ov.monthLabel} haven't been published yet. Pick another month.</p>}
              {error && <p role="alert" className="mt-3 rounded-md bg-alert-soft p-3 text-alert">{error}</p>}
            </form>

            {result ? (
              <>
                <ResultView r={result} />
                <button onClick={clear} className="mt-8 text-teal-700 underline underline-offset-4">Clear results and search again</button>
              </>
            ) : (
              <section aria-labelledby="glance-h" className="mt-10">
                <h2 id="glance-h" className="text-2xl font-bold">How it works this month</h2>
                {ov.target != null && ov.stretch != null && (
                  <div className="mt-3 rounded-xl border border-teal-200 bg-white px-5 sm:px-8">
                    <ProductivityRuler target={ov.target} stretch={ov.stretch} />
                  </div>
                )}
                <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-teal-200 bg-white p-4">
                    <dt className="text-sm text-teal-800">Ballots in the pool</dt>
                    <dd className="mt-1 text-3xl font-bold tabular-nums">{ov.hasData ? ov.totalBallots?.toLocaleString("en-CA") : "—"}</dd>
                  </div>
                  <div className="rounded-lg border border-teal-200 bg-white p-4">
                    <dt className="text-sm text-teal-800">Contest window</dt>
                    <dd className="mt-1 text-lg font-bold">{fmtDate(ov.startDate)} to {fmtDate(ov.endDate)}</dd>
                  </div>
                  <div className="rounded-lg border border-teal-200 bg-white p-4">
                    <dt className="text-sm text-teal-800">Prizes</dt>
                    <dd className="mt-1 text-lg font-bold">
                      {ov.prizes && ov.prizes.length ? (
                        <ul className="list-inside list-disc font-normal">{ov.prizes.map((p) => <li key={p}>{p}</li>)}</ul>
                      ) : "To be announced"}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm text-teal-800">Data last synced {fmtDateTime(ov.lastSyncAt)} (Pacific time).</p>
                <p className="text-sm text-teal-800">Last draw: {ov.lastDrawAt ? fmtDateTime(ov.lastDrawAt) : "not yet held"}.</p>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
