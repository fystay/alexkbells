/** Credits left as a ring (owner's members design): the number inside, "of 8" beneath it. */
export function CreditRing({ left, of }: { left: number; of: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const off = of > 0 ? c * (1 - Math.max(0, Math.min(left, of)) / of) : c;
  return (
    <svg viewBox="0 0 96 96" className="members-ring size-24 shrink-0" role="img" aria-label={`${left} of ${of} credits left`}>
      <circle cx="48" cy="48" r={r} className="fill-none stroke-white" strokeWidth="8" />
      <circle
        cx="48"
        cy="48"
        r={r}
        className="members-ring-fill fill-none stroke-ink"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c.toFixed(1)}
        strokeDashoffset={off.toFixed(1)}
        transform="rotate(-90 48 48)"
      />
      <text x="48" y="54" textAnchor="middle" className="fill-ink text-[28px] font-extrabold tabular-nums">
        {left}
      </text>
      <text x="48" y="70" textAnchor="middle" className="fill-ink text-[11px] font-semibold tracking-[1px]">
        OF {of}
      </text>
    </svg>
  );
}
