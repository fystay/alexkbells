"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { buttonClasses } from "./ButtonLink";

export interface Choice {
  value: string;
  /** Read out once chosen, e.g. "Regular plan". */
  label: string;
  href: string;
  /** The button's text once this card is chosen, e.g. "Book now". */
  action: string;
  /** Said under the button once chosen, after "… selected.", e.g. what happens next. */
  next?: string;
  external?: boolean;
}

interface ChoiceCardsProps {
  name: string;
  legend: string;
  choices: readonly Choice[];
  /** The button's text before anything is chosen. */
  idle: string;
  /** Under the button until a card is chosen, e.g. "Choose a plan to continue." */
  prompt: string;
  children: ReactNode;
  className?: string;
  buttonClassName?: string;
}

/**
 * Selectable cards (see ./choice) plus the button under them, which goes on
 * with the chosen card. Disabled until a card is chosen.
 */
export function ChoiceCards({
  name,
  legend,
  choices,
  idle,
  prompt,
  children,
  className,
  buttonClassName,
}: ChoiceCardsProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLFieldSetElement>(null);
  const chosen = choices.find((c) => c.value === value);

  // The browser can restore a checked radio when coming back to the page.
  useEffect(() => {
    const restored = ref.current?.querySelector<HTMLInputElement>(
      `input[name="${name}"]:checked`,
    );
    if (restored) setValue(restored.value);
  }, [name]);

  const button = buttonClasses(
    "action",
    cn("w-full px-6 sm:w-72", buttonClassName),
  );
  return (
    <fieldset
      ref={ref}
      className={cn("min-w-0", className)}
      onChange={(e) => {
        const input: EventTarget = e.target;
        if (input instanceof HTMLInputElement && input.name === name && input.checked) setValue(input.value);
      }}
    >
      <legend className="sr-only">{legend}</legend>
      {children}
      <div className="mt-6">
        {chosen ? (
          chosen.external ? (
            <a
              href={chosen.href}
              target="_blank"
              rel="noopener noreferrer"
              className={button}
            >
              {chosen.action}
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            <Link href={chosen.href} className={button}>
              {chosen.action}
            </Link>
          )
        ) : (
          <button
            type="button"
            disabled
            aria-describedby={`${name}-choice`}
            className={cn(
              button,
              "disabled:cursor-not-allowed disabled:border-grey disabled:bg-transparent disabled:text-grey disabled:active:translate-y-0",
            )}
          >
            {idle}
          </button>
        )}
        <p
          id={`${name}-choice`}
          aria-live="polite"
          className="mt-2 min-h-5 text-sm"
        >
          {chosen ? `${chosen.label} selected.${chosen.next ? ` ${chosen.next}` : ""}` : prompt}
        </p>
      </div>
      {/* Without JavaScript the button can't follow the choice: plain links instead. */}
      <noscript>
        <ul className="mt-2 flex flex-wrap gap-x-6 text-sm font-semibold underline underline-offset-4">
          {choices.map((c) => (
            <li key={c.value}>
              <a href={c.href} className="inline-flex min-h-11 items-center">
                {c.action}: {c.label}
              </a>
            </li>
          ))}
        </ul>
      </noscript>
    </fieldset>
  );
}
