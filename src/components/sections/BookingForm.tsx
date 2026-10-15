"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { submitBookingRequest } from "@/app/book/actions";
import {
  EXPERIENCE_OPTIONS,
  initialBookingFormState,
  type BookingField,
} from "@/lib/booking-request";
import { cn } from "@/lib/cn";

interface BookingFormProps {
  /** Confirmed class times, e.g. "Monday 6:30 pm". Empty → free-text field. */
  sessions: string[];
}

const NOT_SURE = "Not sure yet";

const input =
  "block w-full min-h-12 border border-ink bg-white px-4 py-3 text-base text-ink placeholder:text-muted aria-[invalid=true]:border-2";
const label = "block font-semibold";
const hint = "mt-1 text-sm text-muted";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-sm font-semibold text-ink">
      <span aria-hidden="true">✕ </span>
      {message}
    </p>
  );
}

/**
 * Class booking request form. Works without JavaScript (server action);
 * with JavaScript it keeps typed values on error and focuses the summary.
 */
export function BookingForm({ sessions }: BookingFormProps) {
  const [state, formAction, pending] = useActionState(submitBookingRequest, initialBookingFormState);
  const startedAtRef = useRef<HTMLInputElement>(null);
  const submissionIdRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // Written after hydration so the static page has no per-visitor values.
  useEffect(() => {
    if (startedAtRef.current) startedAtRef.current.value = String(Date.now());
    if (submissionIdRef.current) submissionIdRef.current.value = crypto.randomUUID();
  }, []);

  useEffect(() => {
    if (state.status === "error") summaryRef.current?.focus();
    if (state.status === "success") successRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div ref={successRef} tabIndex={-1} role="status" className="bg-ink p-8 text-paper focus:outline-none sm:p-10">
        <p className="eyebrow text-muted-inverse">Request sent</p>
        <h2 className="mt-4 font-display text-h2">Thanks — you&apos;re nearly in</h2>
        <p className="mt-4 max-w-xl text-lede text-muted-inverse">{state.message}</p>
        <p className="mt-4 max-w-xl text-muted-inverse">
          Your place is confirmed once Alex replies. If you don&apos;t hear back, message Alex on
          Instagram.
        </p>
      </div>
    );
  }

  const v = state.values;
  const err = state.errors;
  const fieldProps = (name: BookingField) => ({
    id: name,
    name,
    "aria-invalid": err[name] ? true : undefined,
    "aria-describedby": [err[name] ? `${name}-error` : "", `${name}-hint`].filter(Boolean).join(" ") || undefined,
  });
  const errorList = Object.entries(err) as [BookingField, string][];
  // Re-mount fields after each response so defaultValue reflects the echo.
  const formKey = `${state.status}-${state.message}-${errorList.length}`;

  return (
    <form action={formAction} noValidate className="space-y-8" aria-describedby="form-note">
      {state.status === "error" ? (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="border-2 border-ink p-5 focus:outline-none">
          <p className="font-bold">{state.message}</p>
          {errorList.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5">
              {errorList.map(([field, message]) => (
                <li key={field}>
                  <a href={`#${field === "experience" ? "experience-new" : field}`} className="underline underline-offset-4">
                    {message}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <p id="form-note" className="text-sm text-muted">
        Fields marked * are required.
      </p>

      <div key={formKey} className="space-y-8">
        <div>
          <label htmlFor="session" className={label}>
            Which class would you like to join? *
          </label>
          {sessions.length > 0 ? (
            <>
              <p id="session-hint" className={hint}>
                Group classes at Media House, Cumbernauld.
              </p>
              <select {...fieldProps("session")} required defaultValue={v.session ?? ""} className={cn(input, "mt-2")}>
                <option value="" disabled>
                  Choose a class
                </option>
                {sessions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value={NOT_SURE}>{NOT_SURE}</option>
              </select>
            </>
          ) : (
            <>
              <p id="session-hint" className={hint}>
                Tell us the day and time you&apos;d prefer, and Alex will let you know the current
                class times.
              </p>
              <input
                {...fieldProps("session")}
                type="text"
                required
                maxLength={80}
                defaultValue={v.session ?? ""}
                placeholder="e.g. a weekday evening"
                className={cn(input, "mt-2")}
              />
            </>
          )}
          <FieldError id="session-error" message={err.session} />
        </div>

        <fieldset aria-describedby={err.experience ? "experience-error" : undefined}>
          <legend className={label}>Your kettlebell experience *</legend>
          <div className="mt-3 space-y-2">
            {EXPERIENCE_OPTIONS.map((o) => (
              <label key={o.value} className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  id={`experience-${o.value}`}
                  name="experience"
                  value={o.value}
                  required
                  defaultChecked={v.experience === o.value}
                  className="size-5 accent-ink"
                />
                {o.label}
              </label>
            ))}
          </div>
          <FieldError id="experience-error" message={err.experience} />
        </fieldset>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className={label}>
              Your name *
            </label>
            <input {...fieldProps("name")} type="text" required maxLength={100} autoComplete="name" defaultValue={v.name ?? ""} className={cn(input, "mt-2")} />
            <FieldError id="name-error" message={err.name} />
          </div>
          <div>
            <label htmlFor="email" className={label}>
              Email *
            </label>
            <input {...fieldProps("email")} type="email" required maxLength={254} autoComplete="email" inputMode="email" defaultValue={v.email ?? ""} className={cn(input, "mt-2")} />
            <FieldError id="email-error" message={err.email} />
          </div>
        </div>

        <div>
          <label htmlFor="phone" className={label}>
            Phone <span className="font-normal text-muted">(optional)</span>
          </label>
          <input {...fieldProps("phone")} type="tel" maxLength={30} autoComplete="tel" inputMode="tel" defaultValue={v.phone ?? ""} className={cn(input, "mt-2 sm:max-w-sm")} />
          <FieldError id="phone-error" message={err.phone} />
        </div>

        <div>
          <label htmlFor="message" className={label}>
            Anything else? <span className="font-normal text-muted">(optional)</span>
          </label>
          <p id="message-hint" className={hint}>
            Questions or anything Alex should know. Please don&apos;t include medical details.
          </p>
          <textarea {...fieldProps("message")} rows={4} maxLength={1000} defaultValue={v.message ?? ""} className={cn(input, "mt-2")} />
          <FieldError id="message-error" message={err.message} />
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              id="consent"
              name="consent"
              value="yes"
              required
              aria-invalid={err.consent ? true : undefined}
              aria-describedby={err.consent ? "consent-error consent-hint" : "consent-hint"}
              className="mt-1 size-5 shrink-0 accent-ink"
            />
            <span>I agree to Alex using these details to reply to my request. *</span>
          </label>
          <p id="consent-hint" className={cn(hint, "ml-8")}>
            How your details are used is explained in the{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              privacy notice
            </Link>
            .
          </p>
          <FieldError id="consent-error" message={err.consent} />
        </div>
      </div>

      {/* Spam trap: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input ref={startedAtRef} type="hidden" name="startedAt" defaultValue="" />
      <input ref={submissionIdRef} type="hidden" name="submissionId" defaultValue="" />

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center gap-3 bg-ink px-6 text-sm font-semibold tracking-[0.08em] text-paper uppercase transition-colors hover:bg-ink-soft disabled:cursor-wait disabled:opacity-70 sm:w-auto"
      >
        {pending ? "Sending…" : "Send booking request"}
      </button>
    </form>
  );
}
