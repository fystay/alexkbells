/** Which of the programme's weeks it is: done weeks filled, this week ringed. */
export function WeekBar({ week, of }: { week: number; of: number }) {
  return (
    <div role="img" aria-label={`Week ${week} of ${of}`} className="mt-2 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${of}, 1fr)` }}>
      {Array.from({ length: of }, (_, i) => (
        <i key={i} className={`block h-2 rounded-full ${i < week - 1 ? "bg-ink" : i === week - 1 ? "border-2 border-ink bg-paper" : "bg-line"}`} />
      ))}
    </div>
  );
}
