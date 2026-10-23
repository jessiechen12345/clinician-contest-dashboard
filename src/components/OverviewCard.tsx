import { fmtDateTime } from "@/lib/format";

export interface OverviewCardProps {
  monthLabel: string;
  month: string;
  months: { key: string; label: string }[];
  onMonthChange: (m: string) => void;
  prizes: string[];
  startDate?: string;
  endDate?: string;
  lastSyncAt?: string;
  lastDrawAt?: string | null;
}

export default function OverviewCard(p: OverviewCardProps) {
  return (
    <section aria-labelledby="overview-h" className="rounded-2xl bg-teal-900 p-6 text-white sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="overview-h" className="text-2xl font-bold sm:text-3xl">{p.monthLabel} contest</h2>
        {p.months.length > 1 && (
          <label className="text-sm">
            <span className="sr-only">Month</span>
            <select
              value={p.month}
              onChange={(e) => p.onMonthChange(e.target.value)}
              className="rounded-md border border-teal-300/60 bg-teal-800 px-3 py-2 text-base text-white [&>option]:text-ink"
            >
              {p.months.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="mt-6 grid gap-6 border-t border-white/20 pt-6 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-teal-200">Prizes</h3>
          <ul className="mt-3 list-inside list-disc space-y-1 text-lg">
            {p.prizes.length ? p.prizes.map((x) => <li key={x}>{x}</li>) : <li>Prize to be announced</li>}
          </ul>
        </div>
        <dl className="space-y-3 text-base">
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.14em] text-teal-200">Contest window</dt>
            <dd className="mt-1 text-lg tabular-nums">{p.startDate} → {p.endDate}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.14em] text-teal-200">Last data sync</dt>
            <dd className="mt-1">{fmtDateTime(p.lastSyncAt)} (Pacific)</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.14em] text-teal-200">Last draw</dt>
            <dd className="mt-1">{p.lastDrawAt ? fmtDateTime(p.lastDrawAt) : "No draw yet"}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
