import { fmtRate } from "@/lib/format";

/** The page's signature element: a ruler of consults/hr with the two thresholds marked, and (optionally) the clinician's own mark. */
export default function ProductivityRuler({
  target,
  stretch,
  value
}: {
  target: number;
  stretch: number;
  value?: number | null;
}) {
  const max = Math.max(stretch * 1.3, (value ?? 0) * 1.08, stretch + 0.3);
  const pct = (n: number) => `${Math.min(100, Math.max(0, (n / max) * 100))}%`;
  const summary =
    value == null
      ? `Target ${target} consults per hour, stretch target ${stretch}.`
      : `You are at ${fmtRate(value)} consults per hour. Target ${target}, stretch ${stretch}.`;

  return (
    <div role="img" aria-label={summary} className="w-full select-none pt-9 pb-8">
      <div className="relative h-5 rounded-full bg-teal-100 overflow-visible">
        <div className="absolute inset-y-0 rounded-l-full bg-teal-200" style={{ left: pct(target), width: `calc(${pct(stretch)} - ${pct(target)})` }} />
        <div className="absolute inset-y-0 rounded-r-full bg-teal-500" style={{ left: pct(stretch), right: 0 }} />

        {[{ v: target, t: "Target" }, { v: stretch, t: "Stretch" }].map((k) => (
          <div key={k.t} className="absolute top-0 h-5" style={{ left: pct(k.v) }}>
            <div className="absolute -top-2 h-9 w-0.5 bg-ink" />
            <div className="absolute top-8 -translate-x-1/2 whitespace-nowrap text-sm font-bold text-ink">
              {k.t} {k.v}
            </div>
          </div>
        ))}

        {value != null && (
          <div className="absolute top-0 h-5" style={{ left: pct(value) }}>
            <div className="absolute -top-9 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-sm font-bold text-white">
              You: {fmtRate(value)}
            </div>
            <div className="absolute -top-2 left-0 h-9 w-1 -translate-x-1/2 rounded bg-ink" />
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-between text-xs text-teal-800">
        <span>0</span>
        <span>{max.toFixed(1)} consults/hr</span>
      </div>
    </div>
  );
}
