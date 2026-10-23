export default function BallotStubs({ ballots, max = 2 }: { ballots: number; max?: number }) {
  return (
    <div className="flex gap-3" role="img" aria-label={`${ballots} of ${max} possible ballots earned`}>
      {Array.from({ length: max }, (_, i) => {
        const on = i < ballots;
        return (
          <div
            key={i}
            className={`${on ? "stub text-ink" : "stub-empty text-teal-700"} flex h-20 w-28 flex-col items-center justify-center rounded-md border-2 border-dashed ${
              on ? "border-stub-deep" : "border-teal-300"
            }`}
          >
            <span className="text-2xl font-bold leading-none">{on ? "1" : "0"}</span>
            <span className="mt-1 text-xs font-bold">{i === 0 ? "Target ballot" : "Stretch ballot"}</span>
          </div>
        );
      })}
    </div>
  );
}
