type Props = {
  year: number;
  minYear?: number;
  maxYear?: number;
  onChange: (year: number) => void;
};

export function YearNav({ year, minYear = 2008, maxYear, onChange }: Props) {
  const max = maxYear ?? new Date().getUTCFullYear();
  const canPrev = year > minYear;
  const canNext = year < max;

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => canPrev && onChange(year - 1)}
        disabled={!canPrev}
        className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
        aria-label="Previous year"
      >
        &lt;
      </button>
      <span className="font-medium tabular-nums w-12 text-center">{year}</span>
      <button
        type="button"
        onClick={() => canNext && onChange(year + 1)}
        disabled={!canNext}
        className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
        aria-label="Next year"
      >
        &gt;
      </button>
    </div>
  );
}
