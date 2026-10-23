export default function StatCard({
  label,
  value,
  unit,
  chip,
  detail
}: {
  label: string;
  value: string;
  unit?: string;
  /** Small gold pill, e.g. "1 ballot". */
  chip?: string;
  detail?: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-teal-200 bg-white p-5">
      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">{label}</dt>
      <dd className="mt-2 text-4xl font-bold tabular-nums leading-none">
        {value}
        {unit && <span className="ml-1.5 text-base font-normal text-teal-800">{unit}</span>}
      </dd>
      {chip && (
        <dd className="mt-3">
          <span className="inline-block rounded-full bg-stub-soft px-3 py-1 text-sm font-bold text-ink ring-1 ring-stub">{chip}</span>
        </dd>
      )}
      {detail && <dd className="mt-3 text-sm text-teal-800">{detail}</dd>}
    </div>
  );
}
