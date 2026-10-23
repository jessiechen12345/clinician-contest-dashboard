import BallotStubs from "./BallotStubs";
import ProductivityRuler from "./ProductivityRuler";
import { fmtInt, fmtRate, fmtDateTime } from "@/lib/format";

export interface LookupResult {
  monthLabel: string;
  consultsPerHour: number;
  totalConsults: number;
  psat: number | null;
  ballots: number;
  breakdown: { label: string; ballots: number }[];
  checks: { key: string; label: string; met: boolean; actual: number | null; required: number }[];
  target: number;
  stretch: number;
  totalBallots: number;
  odds: { percent: string; oneIn: number | null };
  lastSyncAt: string;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-teal-200 bg-white p-4">
      <dt className="text-sm text-teal-800">{label}</dt>
      <dd className="mt-1 text-3xl font-bold tabular-nums">{value}</dd>
      {hint && <dd className="mt-1 text-xs text-teal-700">{hint}</dd>}
    </div>
  );
}

export default function ResultView({ r }: { r: LookupResult }) {
  const nextStep =
    r.ballots === 2
      ? "You've earned both ballots this month."
      : r.ballots === 1
      ? `${fmtRate(Math.max(0, r.stretch - r.consultsPerHour))} more consults/hr would earn your stretch ballot.`
      : null;

  return (
    <section aria-labelledby="results-h" className="mt-10 space-y-8">
      <h2 id="results-h" className="text-2xl font-bold">Your {r.monthLabel} results</h2>

      <div className="rounded-xl border border-teal-200 bg-white px-5 sm:px-8">
        <ProductivityRuler target={r.target} stretch={r.stretch} value={r.consultsPerHour} />
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        <Stat label="Consults per hour" value={fmtRate(r.consultsPerHour)} />
        <Stat label="Total consults" value={fmtInt(r.totalConsults)} hint="Ontario and Quebec combined. Consults under 5 minutes aren't counted." />
        <Stat label="Patient satisfaction (PSAT)" value={r.psat ? r.psat.toFixed(2) : "—"} />
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-teal-200 bg-white p-6">
          <h3 className="text-lg font-bold">Ballots earned</h3>
          <p className="mt-1 text-5xl font-bold tabular-nums">{r.ballots}</p>
          <div className="mt-4"><BallotStubs ballots={r.ballots} /></div>
          <ul className="mt-5 space-y-1 text-base">
            {r.breakdown.length === 0 ? (
              <li>No ballots earned this month yet. The checklist shows what's needed.</li>
            ) : (
              r.breakdown.map((b) => (
                <li key={b.label}>{b.label}: <strong>{b.ballots === 1 && r.breakdown[0] === b ? "1 ballot" : "+1 ballot"}</strong></li>
              ))
            )}
          </ul>
          {nextStep && <p className="mt-3 text-sm text-teal-800">{nextStep}</p>}
        </div>

        <div className="rounded-xl border border-teal-200 bg-white p-6">
          <h3 className="text-lg font-bold">Your odds of winning</h3>
          <p className="mt-1 text-5xl font-bold tabular-nums">{r.odds.percent}</p>
          <p className="mt-2 text-base">
            {r.odds.oneIn ? <>About <strong>1 in {r.odds.oneIn.toLocaleString("en-CA")}</strong> for each prize drawn.</> : "Earn a ballot to enter the draw."}
          </p>
          <p className="mt-3 text-sm text-teal-800">
            {r.ballots} of {r.totalBallots.toLocaleString("en-CA")} ballots in the pool. Odds change as the pool is finalized.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-teal-200 bg-white p-6">
        <h3 className="text-lg font-bold">What counts toward a ballot</h3>
        <ul className="mt-3 divide-y divide-teal-100">
          {r.checks.map((c) => (
            <li key={c.key} className="flex items-center justify-between gap-4 py-3">
              <span>
                <span aria-hidden className="mr-2 inline-block w-5 text-center font-bold">{c.met ? "✓" : "✕"}</span>
                {c.label}
              </span>
              <span className="text-right tabular-nums">
                <strong>{c.actual == null ? "—" : c.key === "volume" ? fmtInt(c.actual) : c.actual.toFixed(2)}</strong>
                <span className="text-teal-800"> / {c.key === "volume" ? fmtInt(c.required) : c.required} needed</span>
                <span className="sr-only">{c.met ? ", met" : ", not met"}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-teal-700">Data last updated {fmtDateTime(r.lastSyncAt)} (Pacific).</p>
      </div>
    </section>
  );
}
