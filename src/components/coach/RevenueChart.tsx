import { SERVICE } from "@/lib/coach/labels";
import { formatPence } from "@/lib/coach/money";
import { SERVICES } from "@/lib/coach/revenue";
import { formatMonth, formatShortMonth } from "@/lib/coach/time";
import type { ServiceKey } from "@/lib/coach/types";
import { cn } from "@/lib/cn";

/** Monochrome fills; the legend and the table carry the meaning, not the shade. */
const FILL: Record<ServiceKey, string> = {
  group: "bg-ink",
  pt: "bg-muted",
  online: "bg-grey",
  other: "bg-line",
};

/**
 * Net money received per month, stacked by service, with the exact figures
 * in a table underneath (the bars are decorative). Refund-heavy months can go
 * below zero: the bar is empty and the table shows the negative figure.
 */
export function RevenueChart({ months, id }: { months: { month: string; byService: Record<ServiceKey, number>; net: number }[]; id: string }) {
  const max = Math.max(1, ...months.map((m) => SERVICES.reduce((sum, s) => sum + Math.max(0, m.byService[s]), 0)));
  const used = SERVICES.filter((s) => months.some((m) => m.byService[s] !== 0));
  return (
    <figure aria-labelledby={`${id}-caption`}>
      <figcaption id={`${id}-caption`} className="sr-only">
        Money received per month, after refunds, by service
      </figcaption>
      <div aria-hidden="true" className="flex h-44 items-end gap-2 border-b border-ink sm:gap-3">
        {months.map((m) => (
          <div key={m.month} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            <span className="mb-1 truncate text-center text-[0.7rem] font-semibold tabular-nums">{m.net ? formatPence(m.net).replace(/\.00$/, "") : ""}</span>
            <div className="flex flex-col-reverse">
              {SERVICES.map((s) =>
                m.byService[s] > 0 ? <div key={s} className={FILL[s]} style={{ height: `${(m.byService[s] / max) * 9}rem` }} /> : null,
              )}
            </div>
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="mt-1 flex gap-2 sm:gap-3">
        {months.map((m) => (
          <span key={m.month} className="min-w-0 flex-1 truncate text-center text-xs text-muted">
            {formatShortMonth(m.month)}
          </span>
        ))}
      </div>
      {used.length ? (
        <ul aria-hidden="true" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {used.map((s) => (
            <li key={s} className="inline-flex items-center gap-1.5">
              <span className={cn("inline-block size-3 border border-ink", FILL[s])} />
              {SERVICE[s]}
            </li>
          ))}
        </ul>
      ) : null}
      <details className="mt-3">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold underline underline-offset-4">Show the figures</summary>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full min-w-[32rem] text-sm">
            <caption className="sr-only">Money received per month, after refunds</caption>
            <thead>
              <tr className="border-b border-ink text-left">
                <th scope="col" className="py-2 pr-3">Month</th>
                {SERVICES.map((s) => (
                  <th key={s} scope="col" className="py-2 pr-3 text-right">
                    {SERVICE[s]}
                  </th>
                ))}
                <th scope="col" className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month} className="border-b border-line">
                  <th scope="row" className="py-2 pr-3 text-left font-normal">
                    {formatMonth(m.month)}
                  </th>
                  {SERVICES.map((s) => (
                    <td key={s} className="py-2 pr-3 text-right tabular-nums">
                      {formatPence(m.byService[s])}
                    </td>
                  ))}
                  <td className="py-2 text-right font-semibold tabular-nums">{formatPence(m.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
