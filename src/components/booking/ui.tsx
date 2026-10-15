"use client";

import Link from "next/link";
import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";

/**
 * Building blocks shared by the booking and online coaching journeys.
 * Choices are native radios/checkboxes styled as tiles, so keyboard and
 * screen-reader behaviour comes from the browser.
 */

export interface Option {
  value: string;
  label: string;
  detail?: string;
}

const tile =
  "relative flex cursor-pointer items-center gap-4 border border-muted bg-white text-ink transition-colors duration-150 " +
  "hover:border-ink has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper " +
  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-ink " +
  "has-[:disabled]:cursor-not-allowed has-[:disabled]:border-line has-[:disabled]:bg-transparent has-[:disabled]:text-muted";

function Indicator({ type }: { type: "radio" | "checkbox" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-5 shrink-0 items-center justify-center border border-current",
        type === "radio" && "rounded-full",
      )}
    >
      <span
        className={cn(
          "size-2.5 scale-0 bg-current transition-transform duration-150 group-has-[:checked]/tile:scale-100",
          type === "radio" && "rounded-full",
        )}
      />
    </span>
  );
}

interface ChoiceGroupProps {
  type: "radio" | "checkbox";
  name: string;
  legend: ReactNode;
  options: readonly Option[];
  /** Radio: the chosen value. Checkbox: every chosen value. */
  value: string | readonly string[];
  onChange: (value: string, checked: boolean) => void;
  hint?: ReactNode;
  error?: string;
  /** "list": full-width rows. "chips": compact tiles that wrap. */
  layout?: "list" | "chips";
  optional?: boolean;
  /** Visually hidden legend when the step heading already says it. */
  hideLegend?: boolean;
}

export function ChoiceGroup({
  type,
  name,
  legend,
  options,
  value,
  onChange,
  hint,
  error,
  layout = "list",
  optional = false,
  hideLegend = false,
}: ChoiceGroupProps) {
  const chosen = typeof value === "string" ? [value] : value;
  const describedBy = [hint ? `${name}-hint` : "", error ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
      <legend className={cn("font-semibold", hideLegend && "sr-only")}>
        {legend}
        {optional ? <span className="font-normal text-muted"> (optional)</span> : null}
      </legend>
      {hint ? (
        <p id={`${name}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <div
        className={cn(
          !hideLegend || hint ? "mt-3" : undefined,
          layout === "list" ? "grid grid-cols-1 gap-2" : "flex flex-wrap gap-2",
        )}
      >
        {options.map((o, i) => (
          <label
            key={o.value}
            className={cn(
              "group/tile",
              tile,
              layout === "list" ? "min-h-14 px-4 py-3" : "min-h-12 min-w-14 justify-center px-4 py-2",
            )}
          >
            <input
              type={type}
              name={name}
              id={i === 0 ? name : undefined}
              value={o.value}
              checked={chosen.includes(o.value)}
              onChange={(e) => onChange(o.value, e.target.checked)}
              className="sr-only"
            />
            {layout === "list" ? <Indicator type={type} /> : null}
            <span className="min-w-0">
              <span className="block font-semibold">{o.label}</span>
              {o.detail ? (
                <span className="mt-0.5 block text-sm text-muted group-has-[:checked]/tile:text-muted-inverse">
                  {o.detail}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      <FieldError id={`${name}-error`} message={error} />
    </fieldset>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-sm font-semibold text-ink">
      <span aria-hidden="true">✕ </span>
      {message}
    </p>
  );
}

const input =
  "mt-2 block w-full min-h-12 border border-muted bg-white px-4 py-3 text-base text-ink transition-colors duration-150 placeholder:text-muted hover:border-ink focus-visible:border-ink aria-[invalid=true]:border-2 aria-[invalid=true]:border-ink";

interface TextFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  optional?: boolean;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel";
  maxLength?: number;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
}

export function TextField({
  name,
  label,
  value,
  onChange,
  error,
  hint,
  optional = false,
  type = "text",
  autoComplete,
  inputMode,
  maxLength,
  multiline = false,
  placeholder,
  className,
}: TextFieldProps) {
  const describedBy = [hint ? `${name}-hint` : "", error ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined;
  const shared = {
    id: name,
    name,
    value,
    maxLength,
    placeholder,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    "aria-required": optional ? undefined : true,
  };
  return (
    <div className={className}>
      <label htmlFor={name} className="block font-semibold">
        {label}
        {optional ? <span className="font-normal text-muted"> (optional)</span> : null}
      </label>
      {hint ? (
        <p id={`${name}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {multiline ? (
        <textarea {...shared} rows={4} onChange={(e) => onChange(e.target.value)} className={input} />
      ) : (
        <input
          {...shared}
          type={type}
          autoComplete={autoComplete}
          inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)}
          className={input}
        />
      )}
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}

/** Reveals an optional field on request, so most people never see it. */
export function Disclosure({ label, children, initiallyOpen = false }: { label: string; children: ReactNode; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  if (open) return <div className="animate-step-in">{children}</div>;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] underline-offset-[6px] hover:underline"
    >
      <span aria-hidden="true">+</span> {label}
    </button>
  );
}

export const StepHeading = forwardRef<HTMLHeadingElement, { children: ReactNode; intro?: ReactNode }>(
  function StepHeading({ children, intro }, ref) {
    return (
      <div>
        <h2 ref={ref} tabIndex={-1} className="font-display text-h3 focus:outline-none">
          {children}
        </h2>
        {intro ? <p className="mt-2 max-w-xl text-muted">{intro}</p> : null}
      </div>
    );
  },
);

export interface StepInfo {
  id: string;
  label: string;
}

/** Progress through the steps. Completed steps can be revisited. */
export function Stepper({
  steps,
  current,
  onSelect,
  label,
}: {
  steps: readonly StepInfo[];
  current: number;
  onSelect: (index: number) => void;
  label: string;
}) {
  return (
    <nav aria-label={label}>
      <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          const content = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "block h-1 w-full transition-colors duration-200",
                  state === "todo" ? "bg-line" : "bg-ink",
                )}
              />
              <span className={cn("mt-2 flex items-baseline gap-1.5 text-xs font-semibold uppercase tracking-[0.12em]", state === "todo" ? "text-muted" : "text-ink")}>
                <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <span className={cn("truncate", state !== "current" && "max-sm:sr-only")}>{step.label}</span>
              </span>
              <span className="sr-only">
                {state === "done" ? " (completed, select to edit)" : state === "current" ? " (current step)" : ""}
              </span>
            </>
          );
          return (
            <li key={step.id} aria-current={state === "current" ? "step" : undefined}>
              {state === "done" ? (
                <button type="button" onClick={() => onSelect(i)} className="flex min-h-11 w-full flex-col justify-start text-left hover:opacity-70">
                  {content}
                </button>
              ) : (
                <span className="block min-h-11">{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const primaryButton =
  "inline-flex min-h-12 items-center justify-center gap-3 bg-ink px-6 text-sm font-semibold uppercase tracking-[0.08em] text-paper transition-[background-color,transform] duration-150 hover:bg-ink-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:active:scale-100";

/**
 * Back / next controls. Sticks to the bottom of the screen on phones so the
 * next step is always in reach; static on desktop.
 */
export function ActionBar({
  onBack,
  backLabel = "Back",
  next,
  hint,
}: {
  onBack?: () => void;
  backLabel?: string;
  next: { label: string; disabled?: boolean; onClick?: () => void; type?: "button" | "submit"; pending?: boolean };
  hint?: string;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-10 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-t-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
      <div className="flex items-center justify-between gap-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-12 items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] underline-offset-[6px] hover:underline"
          >
            <span aria-hidden="true">←</span> {backLabel}
          </button>
        ) : (
          <span />
        )}
        <button
          type={next.type ?? "button"}
          onClick={next.onClick}
          disabled={next.disabled || next.pending}
          aria-describedby={hint ? "action-hint" : undefined}
          className={primaryButton}
        >
          {next.pending ? "Sending…" : next.label}
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 8h13M9 3l5 5-5 5" />
          </svg>
        </button>
      </div>
      <p id="action-hint" aria-live="polite" className="mt-1 min-h-5 text-right text-sm text-muted">
        {hint ?? ""}
      </p>
    </div>
  );
}

export function ErrorSummary({ message, errors, focusRef }: { message: string; errors: [string, string][]; focusRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div ref={focusRef} tabIndex={-1} role="alert" className="border-2 border-ink bg-white p-5 focus:outline-none">
      <p className="font-bold">{message}</p>
      {errors.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5">
          {errors.map(([field, text]) => (
            <li key={field}>
              <a href={`#${field}`} className="underline underline-offset-4">
                {text}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Compact label for demonstration data, e.g. above the calendar. */
export function DemoLabel({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-sm">
      <span className="eyebrow shrink-0 bg-ink px-2 py-1 text-paper">Demo</span>
      <span>{children}</span>
    </p>
  );
}

/** Shown wherever demonstration data could be mistaken for the real thing. */
export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <div role="note" aria-label="Demonstration" className="flex gap-4 border-2 border-dashed border-ink bg-white p-4 sm:p-5">
      <span className="eyebrow mt-0.5 shrink-0 self-start bg-ink px-2 py-1 text-paper">Demo</span>
      <p className="text-sm">{children}</p>
    </div>
  );
}

export function PrivacyLine({ action }: { action: string }) {
  return (
    <p className="text-sm text-muted">
      By {action}, you agree to Alex using these details to reply. Read the{" "}
      <Link href="/privacy" className="underline underline-offset-4">
        privacy notice
      </Link>
      .
    </p>
  );
}

export function InstagramFallback({ children }: { children: ReactNode }) {
  return (
    <div className="bg-ink p-8 text-paper sm:p-10">
      <p className="max-w-xl text-lede text-muted-inverse">{children}</p>
      <a
        href={site.social.instagram.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex min-h-12 items-center gap-3 bg-paper px-6 text-sm font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:bg-white"
      >
        Message Alex on Instagram
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </div>
  );
}

/** Spam trap: hidden from people and assistive tech; bots tend to fill it. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
      <label htmlFor="website">Leave this field empty</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  );
}

type Meta = { startedAt: string; submissionId: string };

/**
 * Hidden spam-check fields: when the journey started and a per-visit id
 * (duplicate submissions share it, so they send once). Set after mount, so
 * prerendered HTML holds no per-visitor values.
 */
export function useSubmissionMeta(): React.RefObject<Meta | null> {
  const meta = useRef<Meta | null>(null);
  useEffect(() => {
    meta.current = { startedAt: String(Date.now()), submissionId: crypto.randomUUID() };
  }, []);
  return meta;
}

export function SubmissionMeta({ meta }: { meta: React.RefObject<Meta | null> }) {
  return (
    <>
      <input type="hidden" name="startedAt" ref={(el) => { if (el && meta.current) el.value = meta.current.startedAt; }} />
      <input type="hidden" name="submissionId" ref={(el) => { if (el && meta.current) el.value = meta.current.submissionId; }} />
      <Honeypot />
    </>
  );
}
