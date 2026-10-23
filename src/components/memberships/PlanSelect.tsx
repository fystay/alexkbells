"use client";

import Link from "next/link";
import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** What the "Your plan" bar needs to know about each plan (all from content). */
export interface PlanChoice {
  id: string;
  name: string;
  priceGbp: number;
  credits: number;
  weeks: number;
}

interface PlanSelectState {
  selected: string | null;
  select: (id: string) => void;
}

const PlanSelectContext = createContext<PlanSelectState>({ selected: null, select: () => {} });

/**
 * Choose a plan, then continue to the calendar (owner, 2026-10-23): one plan at
 * a time; the chosen card turns ink and the "Your plan" bar fills in. The cards'
 * content stays server-rendered; this only tracks which one is chosen.
 */
export function PlanSelectProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<string | null>(null);
  return <PlanSelectContext.Provider value={{ selected, select: setSelected }}>{children}</PlanSelectContext.Provider>;
}

/** A plan card that marks itself when chosen (styles read `data-selected`). */
export function SelectableCard({ planId, className, children }: { planId: string; className?: string; children: ReactNode }) {
  const { selected } = useContext(PlanSelectContext);
  return (
    <li data-selected={selected === planId} className={cn("group", className)}>
      {children}
    </li>
  );
}

export function SelectPlanButton({ planId, name }: { planId: string; name: string }) {
  const { selected, select } = useContext(PlanSelectContext);
  const on = selected === planId;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => select(planId)}
      className={cn(
        "mt-4 inline-flex min-h-11 items-center self-start text-sm font-semibold uppercase tracking-[0.08em]",
        on ? "cursor-default" : "underline underline-offset-[6px] hover:no-underline",
      )}
    >
      {on ? "Selected" : "Select"}
      <span className="sr-only"> {name}</span>
    </button>
  );
}

/** Under the cards: the chosen plan and Book now, which opens the calendar with the plan carried over. */
export function YourPlanBar({ plans, bookHref, external }: { plans: PlanChoice[]; bookHref: string; external: boolean }) {
  const { selected } = useContext(PlanSelectContext);
  const plan = plans.find((p) => p.id === selected) ?? null;
  const href = plan && !external ? `${bookHref}?plan=${plan.id}` : bookHref;
  const button = "inline-flex min-h-12 w-full items-center justify-center rounded-md border px-7 text-[0.8125rem] font-semibold tracking-[0.08em] uppercase sm:w-auto sm:min-w-64";
  return (
    <div className="mt-5 flex flex-col gap-4 rounded-lg border border-ink bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-6">
      <div aria-live="polite">
        <p className="eyebrow">Your plan</p>
        {plan ? (
          <>
            <p className="mt-2 font-display text-h3">{plan.name}</p>
            <p className="mt-1 text-sm">
              £{plan.priceGbp} / {plan.weeks} weeks · {plan.credits} class credits. Next, pick your first class.
            </p>
          </>
        ) : (
          <p className="mt-2">Select a plan above to continue.</p>
        )}
      </div>
      {plan ? (
        <Link
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className={cn(button, "border-ink bg-ink text-white hover:bg-white hover:text-ink")}
        >
          Book now<span className="sr-only"> with the {plan.name} plan</span>
          {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
        </Link>
      ) : (
        <button type="button" disabled className={cn(button, "cursor-not-allowed border-grey bg-white text-ink")}>
          Book now
        </button>
      )}
    </div>
  );
}
