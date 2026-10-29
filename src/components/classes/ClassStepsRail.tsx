"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { revealDelay } from "@/lib/reveal";
import { costForFrequency, formatPenceShort } from "@/lib/membership";
import { buttonClasses } from "@/components/ui/ButtonLink";
import type { MembershipPlan } from "@/content/memberships";

export interface RailClass {
  id: string;
  day: string;
  /** "6:30 pm" */
  time: string;
}

export interface RailBook {
  href: string;
  label: string;
  external: boolean;
  /** Booking is on the site, so a chosen class and a plan can be passed on. */
  onSite: boolean;
}

const TITLES = [
  "Pick a class",
  "Book your place",
  "Turn up and train",
] as const;
const FREQUENCIES = [1, 2, 3] as const;

const radio =
  "relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-[1.5px] border-ink text-center transition-colors duration-150 " +
  "hover:bg-white has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-ink";

/**
 * How to join a class, as a rail you can open one step at a time (owner's pick,
 * option B, 2026-10-29). 1 Pick a class (tap one: step 2 opens), 2 Book your
 * place (the price, "How often will you train?" with what pay as you go costs
 * against the plan that fits, then Join or Book), 3 Turn up and train (where,
 * the first session, what to bring: rendered on the server and passed in).
 * A finished step shows a one-line summary. Without JavaScript every step is
 * open (globals.css). Every figure is passed in from content or calculated
 * from it (lib/membership.ts).
 */
export function ClassStepsRail({
  classes,
  minutes,
  scaled,
  priceGbp,
  plans,
  book,
  payNote,
  beginners,
  where,
  className,
}: {
  classes: RailClass[];
  minutes: number | null;
  scaled: string | null;
  priceGbp: number | null;
  plans: MembershipPlan[];
  book: RailBook;
  payNote: string | null;
  beginners: string | null;
  where: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [perWeek, setPerWeek] = useState<number>(2);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const cls = classes.find((c) => c.id === chosen) ?? null;
  const clsLabel = cls ? `${cls.day} ${cls.time}` : null;
  const figures = priceGbp ? costForFrequency(plans, perWeek, priceGbp) : null;
  const saves = figures !== null && figures.savingPence > 0;
  const plan = figures?.plan ?? null;
  const joinHref =
    plan && book.onSite ? `/memberships/join?plan=${plan.id}` : book.href;
  const bookHref =
    cls && book.onSite ? `${book.href}?class=${cls.id}` : book.href;
  const bookLabel = cls && book.onSite ? `Book ${clsLabel}` : book.label;

  const summaries = [
    clsLabel
      ? `${clsLabel}${minutes ? ` · ${minutes} min` : ""}`
      : "Choose a day",
    priceGbp
      ? `£${priceGbp} a class${plan && saves ? ` · or ${plan.name} £${plan.priceGbp}` : ""}`
      : "How to book",
    null,
  ];

  /** Opens a step and puts focus on its heading button, so a screen reader hears where it went. */
  function go(i: number) {
    setOpen(i);
    requestAnimationFrame(() => buttons.current[i]?.focus());
  }

  return (
    <>
      {/* Without JavaScript no step can be opened, so every one is shown. */}
      <noscript>
        <style>{".step-panel[hidden]{display:flex!important}"}</style>
      </noscript>
      <ol className={className}>
        {TITLES.map((title, i) => {
          const last = i === TITLES.length - 1;
          const isOpen = open === i;
          return (
            <li
              key={title}
              data-reveal
              style={revealDelay(i)}
              className={`relative grid grid-cols-[2.25rem_1fr] gap-x-4 sm:gap-x-5 ${last ? "" : "pb-8"}`}
            >
              {/* The rail joining the steps. */}
              {last ? null : (
                <span
                  aria-hidden="true"
                  className="absolute top-[2.375rem] bottom-0.5 left-[1.0625rem] w-px bg-line"
                />
              )}
              <span
                aria-hidden="true"
                className={`relative grid size-9 place-items-center rounded-full border-[1.5px] border-ink text-sm font-bold tabular-nums transition-colors ${isOpen ? "bg-ink text-paper" : "bg-paper"}`}
              >
                {i === 0 && cls && !isOpen ? "✓" : i + 1}
              </span>
              <div className="min-w-0 pt-px">
                <h3 className="font-display text-xl font-bold">
                  <button
                    ref={(el) => {
                      buttons.current[i] = el;
                    }}
                    id={`step-${i}-button`}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`step-${i}-panel`}
                    onClick={() => setOpen(i)}
                    className="flex min-h-11 w-full items-center text-left"
                  >
                    {title}
                  </button>
                </h3>
                {!isOpen && summaries[i] ? (
                  <p className="-mt-1 text-[0.9375rem]">{summaries[i]}</p>
                ) : null}
                <div
                  id={`step-${i}-panel`}
                  role="region"
                  aria-labelledby={`step-${i}-button`}
                  hidden={!isOpen}
                  className="step-panel mt-2 flex flex-col gap-4"
                >
                  {i === 0 ? (
                    <>
                      <p>
                        {[
                          minutes
                            ? `${minutes} minutes, all levels.`
                            : "All levels.",
                          scaled,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                      {classes.length > 0 ? (
                        <fieldset>
                          <legend className="sr-only">Choose a class</legend>
                          <div className="grid grid-cols-3 gap-2">
                            {classes.map((c) => (
                              <label
                                key={c.id}
                                className={`${radio} min-h-[5.5rem] gap-0.5 px-1 py-3`}
                              >
                                <input
                                  type="radio"
                                  name="class"
                                  value={c.id}
                                  checked={chosen === c.id}
                                  onChange={() => {
                                    setChosen(c.id);
                                    go(1);
                                  }}
                                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                                />
                                <span className="text-xs font-semibold tracking-[0.16em] uppercase">
                                  {c.day.slice(0, 3)}
                                </span>
                                <span
                                  aria-hidden="true"
                                  className="font-display text-2xl leading-none font-bold tabular-nums"
                                >
                                  {c.time.replace(/\s?[ap]m$/i, "")}
                                </span>
                                <span aria-hidden="true" className="text-xs">
                                  {c.time.match(/[ap]m$/i)?.[0]}
                                </span>
                                <span className="sr-only">{`${c.day} ${c.time}`}</span>
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      ) : null}
                      {cls ? (
                        <button
                          type="button"
                          onClick={() => go(1)}
                          className="inline-flex min-h-11 items-center self-start font-semibold underline underline-offset-4 hover:no-underline"
                        >
                          Next: see what it costs
                        </button>
                      ) : null}
                    </>
                  ) : null}

                  {i === 1 ? (
                    <>
                      {priceGbp ? (
                        <p className="flex flex-wrap items-baseline gap-x-2.5">
                          <strong className="font-display text-[2.5rem] leading-none font-bold tracking-tight">
                            £{priceGbp}
                          </strong>
                          <span>
                            a class. Training more than once a week? See what a
                            membership saves.
                          </span>
                        </p>
                      ) : null}
                      {figures ? (
                        <>
                          <fieldset>
                            <legend className="sr-only">
                              How often will you train?
                            </legend>
                            <div className="grid grid-cols-3 gap-2">
                              {FREQUENCIES.map((n) => (
                                <label
                                  key={n}
                                  className={`${radio} min-h-12 rounded-full px-2 text-sm font-semibold`}
                                >
                                  <input
                                    type="radio"
                                    name="frequency"
                                    value={n}
                                    checked={perWeek === n}
                                    onChange={() => setPerWeek(n)}
                                    className="absolute inset-0 size-full cursor-pointer opacity-0"
                                  />
                                  {n} a week
                                </label>
                              ))}
                            </div>
                          </fieldset>
                          <div
                            aria-live="polite"
                            className="flex flex-col gap-3"
                          >
                            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border-[1.5px] border-ink bg-ink">
                              <div className="bg-paper p-4">
                                <p className="text-xs font-semibold tracking-[0.16em] uppercase">
                                  Pay as you go
                                </p>
                                <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                                  {formatPenceShort(figures.payAsYouGoPence)}
                                </p>
                                <p className="text-sm">
                                  {figures.classes} classes in 4 weeks
                                </p>
                              </div>
                              <div className="bg-ink p-4 text-paper">
                                <p className="text-xs font-semibold tracking-[0.16em] uppercase">
                                  {figures.plan.name} plan
                                </p>
                                <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                                  {formatPenceShort(figures.planPence)}
                                </p>
                                <p className="text-sm">
                                  {figures.plan.credits} credits every 4 weeks
                                </p>
                              </div>
                            </div>
                            <p className="font-semibold">
                              {saves
                                ? `You'd save ${formatPenceShort(figures.savingPence)} every 4 weeks.`
                                : "Pay as you go suits this best."}
                            </p>
                          </div>
                        </>
                      ) : null}
                      <div className="flex flex-col gap-2.5 sm:flex-row">
                        {saves && plan ? (
                          <Link
                            href={joinHref}
                            className={buttonClasses(
                              "action",
                              "w-full px-6 sm:w-auto",
                            )}
                          >
                            Join {plan.name}
                          </Link>
                        ) : null}
                        {book.external ? (
                          <a
                            href={bookHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={
                              saves
                                ? "inline-flex min-h-12 w-full items-center justify-center rounded-full border-[1.5px] border-ink px-6 font-semibold sm:w-auto"
                                : buttonClasses(
                                    "action",
                                    "w-full px-6 sm:w-auto",
                                  )
                            }
                          >
                            {bookLabel}
                            <span className="sr-only">
                              {" "}
                              (opens in a new tab)
                            </span>
                          </a>
                        ) : (
                          <Link
                            href={bookHref}
                            className={
                              saves
                                ? "inline-flex min-h-12 w-full items-center justify-center rounded-full border-[1.5px] border-ink px-6 font-semibold sm:w-auto"
                                : buttonClasses(
                                    "action",
                                    "w-full px-6 sm:w-auto",
                                  )
                            }
                          >
                            {saves
                              ? cls && book.onSite
                                ? bookLabel
                                : "Book one class"
                              : bookLabel}
                          </Link>
                        )}
                      </div>
                      {payNote ? <p>{payNote}</p> : null}
                      {beginners ? <p>{beginners}</p> : null}
                      <p className="text-[0.9375rem]">
                        Memberships renew every 4 weeks and unused credits
                        don&apos;t roll over.{" "}
                        <Link
                          href="/memberships#how-it-works"
                          className="font-semibold underline underline-offset-4 hover:no-underline"
                        >
                          How memberships work
                        </Link>
                      </p>
                      <button
                        type="button"
                        onClick={() => go(2)}
                        className="inline-flex min-h-11 items-center self-start font-semibold underline underline-offset-4 hover:no-underline"
                      >
                        Next: turn up and train
                      </button>
                    </>
                  ) : null}

                  {i === 2 ? where : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
