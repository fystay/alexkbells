"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { submitBookingRequest } from "@/app/book/actions";
import {
  BOOKABLE_SERVICES,
  BOOKING_EXPERIENCE,
  PREFERRED_DAYS,
  PREFERRED_TIMES,
  labelFor,
  type BookableService,
} from "@/lib/booking-options";
import { describePreferences, initialFormState, type BookingField, type FieldErrors, type FormState } from "@/lib/booking-request";
import { emailError, messageError, nameError, phoneError } from "@/lib/form-validation";
import { formatLongDate, formatShortDate, toDateKey, type DateKey } from "@/lib/availability/dates";
import type { AvailabilityWindow } from "@/lib/availability/types";
import { formatTime } from "@/lib/schedule";
import { cn } from "@/lib/cn";
import { AvailabilityCalendar } from "./AvailabilityCalendar";
import {
  ActionBar,
  ChoiceGroup,
  DemoLabel,
  DemoNotice,
  Disclosure,
  ErrorSummary,
  PrivacyLine,
  StepHeading,
  Stepper,
  TextField,
  SubmissionMeta,
  useSubmissionMeta,
} from "./ui";

interface BookingWizardProps {
  /**
   * "demo": labelled sample availability; nothing is sent or booked.
   * "request": no live availability yet; a request is emailed to Alex.
   */
  mode: "demo" | "request";
  initialService?: BookableService;
  /** Confirmed class times (request mode); empty → preferred days/times. */
  sessions: string[];
}

type Details = { experience: string; name: string; email: string; phone: string; message: string };

// The date is read on the client only, so prerendered HTML never holds a stale "today".
const subscribe = () => () => {};
const getToday = () => toDateKey(new Date());
const getServerToday = () => null;

export function BookingWizard({ mode, initialService, sessions }: BookingWizardProps) {
  const demo = mode === "demo";
  const [step, setStep] = useState(initialService ? 1 : 0);
  const [service, setService] = useState<BookableService | "">(initialService ?? "");
  // Demo availability
  const today = useSyncExternalStore(subscribe, getToday, getServerToday);
  const [loaded, setLoaded] = useState<{ key: string; window: AvailabilityWindow } | null>(null);
  const [date, setDate] = useState<DateKey | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  // Request preferences
  const [session, setSession] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  // Details
  const [details, setDetails] = useState<Details>({ experience: "", name: "", email: "", phone: "", message: "" });
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [demoDone, setDemoDone] = useState(false);
  const meta = useSubmissionMeta();
  const [serverState, formAction, pending] = useActionState(submitBookingRequest, initialFormState as FormState<BookingField>);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const usesSessions = !demo && service === "group-class" && sessions.length > 0;
  const availabilityKey = `${service}:${today}`;
  const avail = demo && loaded?.key === availabilityKey ? loaded.window : null;
  const chosenSlot = avail?.days.find((d) => d.date === date)?.slots.find((s) => s.id === slotId && s.available) ?? null;

  const done = demo ? demoDone : serverState.status === "success";

  useEffect(() => {
    if (!demo || !service || !today) return;
    let live = true;
    // Loaded on demand: the demonstration data never reaches visitors in request mode.
    import("@/lib/availability/demo")
      .then(({ demoAvailabilityProvider }) => demoAvailabilityProvider.getAvailability(service, today))
      .then((w) => {
        if (live) setLoaded({ key: `${service}:${today}`, window: w });
      });
    return () => {
      live = false;
    };
  }, [demo, service, today]);

  // Move focus to the new step's heading so keyboard and screen-reader users follow the change.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step, done]);

  useEffect(() => {
    if (serverState.status === "error") summaryRef.current?.focus();
  }, [serverState]);

  const serviceLabel = service ? labelFor(BOOKABLE_SERVICES, service) : "";
  const noun = service === "group-class" ? "class" : "session";

  const whenComplete = demo ? chosenSlot !== null : usesSessions ? session !== "" : days.length > 0;
  const whenText = demo
    ? chosenSlot && date
      ? `${formatShortDate(date)} · ${formatTime(chosenSlot.time)}`
      : ""
    : usesSessions
      ? session
      : days.length > 0
        ? describePreferences(days, times)
        : "";

  const steps = [
    { id: "service", label: "Service" },
    { id: "when", label: demo ? "Date & time" : "When" },
    { id: "details", label: "Details" },
  ];

  const chooseService = (value: string) => {
    setService(value as BookableService);
    setDate(null);
    setSlotId(null);
    setSession("");
  };

  const toggle = (list: string[], value: string, checked: boolean) =>
    checked ? [...list.filter((v) => v !== value), value] : list.filter((v) => v !== value);

  const validateDetails = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!details.experience) errors.experience = "Choose the option that best describes you.";
    const checks = {
      name: nameError(details.name.trim()),
      email: emailError(details.email.trim().toLowerCase()),
      phone: phoneError(details.phone.trim()),
      message: messageError(details.message),
    };
    for (const [field, error] of Object.entries(checks)) if (error) errors[field as BookingField] = error;
    return errors;
  };

  const update = (field: keyof Details) => (value: string) => {
    setDetails((d) => ({ ...d, [field]: value }));
    if (clientErrors[field as BookingField]) setClientErrors((e) => ({ ...e, [field]: undefined }));
  };

  const reset = () => {
    setStep(0);
    setService("");
    setDate(null);
    setSlotId(null);
    setDemoDone(false);
  };

  if (done) {
    return (
      <Outcome
        demo={demo}
        headingRef={headingRef}
        service={serviceLabel}
        when={whenText}
        longWhen={demo && date && chosenSlot ? `${formatLongDate(date)} at ${formatTime(chosenSlot.time)}` : whenText}
        email={demo ? details.email.trim() : serverState.message}
        onRestart={reset}
      />
    );
  }

  const errors: FieldErrors = { ...serverState.errors, ...clientErrors };
  const serverErrorList = Object.entries(serverState.errors).filter((e): e is [BookingField, string] => Boolean(e[1]));

  const summary = (
    <Summary
      demo={demo}
      rows={[
        { label: "Service", value: serviceLabel, step: 0 },
        { label: demo ? "Date & time" : "When", value: whenText, step: 1 },
      ]}
      currentStep={step}
      onEdit={setStep}
    />
  );

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
      <div className="min-w-0 lg:col-span-8">
        <Stepper steps={steps} current={step} onSelect={setStep} label="Booking steps" />

        {step > 0 ? (
          <div className="mt-6 lg:hidden">
            <CompactSummary
              demo={demo}
              items={[
                { label: "Service", value: serviceLabel, step: 0 },
                ...(step > 1 ? [{ label: demo ? "Date & time" : "When", value: whenText, step: 1 }] : []),
              ]}
              onEdit={setStep}
            />
          </div>
        ) : null}

        <div key={step} className="mt-8 animate-step-in">
          {step === 0 ? (
            <section aria-labelledby="step-heading">
              <StepHeading ref={headingRef}>
                <span id="step-heading">Choose a service</span>
              </StepHeading>
              <div className="mt-6">
                <ChoiceGroup
                  type="radio"
                  name="service"
                  legend="Service"
                  hideLegend
                  options={BOOKABLE_SERVICES.map((s) => ({ value: s.value, label: s.label, detail: s.detail }))}
                  value={service}
                  onChange={chooseService}
                />
              </div>
              <div className="mt-6 flex flex-col gap-1 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <p className="text-sm text-muted">Coaching online, wherever you train?</p>
                <Link
                  href="/online-coaching"
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] underline-offset-[6px] hover:underline"
                >
                  Explore online coaching <span aria-hidden="true">→</span>
                </Link>
              </div>
              <ActionBar
                next={{ label: "Continue", disabled: !service, onClick: () => setStep(1) }}
                hint={service ? undefined : "Choose a service to continue."}
              />
            </section>
          ) : null}

          {step === 1 ? (
            <section aria-labelledby="step-heading">
              <StepHeading
                ref={headingRef}
                intro={
                  demo
                    ? undefined
                    : usesSessions
                      ? "Choose the class you'd like to join. Alex will confirm your place."
                      : "Live availability isn't online yet. Tell Alex when suits you and he'll reply with a confirmed time."
                }
              >
                <span id="step-heading">
                  {demo ? (service === "group-class" ? "Choose a class" : "Choose a date and time") : "When suits you?"}
                </span>
              </StepHeading>
              <div className="mt-6 space-y-8">
                {demo ? (
                  <>
                    <DemoLabel>Sample availability, not Alex&apos;s real timetable. Nothing is booked.</DemoLabel>
                    {avail ? (
                      <AvailabilityCalendar
                        window={avail}
                        date={date}
                        slotId={slotId}
                        noun={noun}
                        onDate={(d) => {
                          setDate(d);
                          setSlotId(null);
                          if (matchMedia("(max-width: 47.99rem)").matches) {
                            document.getElementById("times")?.scrollIntoView({
                              behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                              block: "nearest",
                            });
                          }
                        }}
                        onSlot={setSlotId}
                      />
                    ) : (
                      <p className="text-muted" role="status">
                        Loading availability…
                      </p>
                    )}
                  </>
                ) : usesSessions ? (
                  <ChoiceGroup
                    type="radio"
                    name="session"
                    legend="Class time"
                    options={sessions.map((s) => ({ value: s, label: s }))}
                    value={session}
                    onChange={setSession}
                  />
                ) : (
                  <>
                    <ChoiceGroup
                      type="checkbox"
                      name="days"
                      legend="Which days suit you?"
                      hint="Choose as many as you like."
                      layout="chips"
                      options={PREFERRED_DAYS.map((d) => ({ value: d.value, label: d.label }))}
                      value={days}
                      onChange={(v, c) => setDays((list) => toggle(list, v, c))}
                    />
                    <ChoiceGroup
                      type="checkbox"
                      name="times"
                      legend="What time of day?"
                      hint="Leave blank if any time works."
                      layout="chips"
                      optional
                      options={PREFERRED_TIMES}
                      value={times}
                      onChange={(v, c) => setTimes((list) => toggle(list, v, c))}
                    />
                  </>
                )}
              </div>
              <ActionBar
                onBack={() => setStep(0)}
                next={{ label: "Continue", disabled: !whenComplete, onClick: () => setStep(2) }}
                hint={
                  whenComplete
                    ? undefined
                    : demo
                      ? date
                        ? "Choose a time to continue."
                        : "Choose a date to continue."
                      : usesSessions
                        ? "Choose a class to continue."
                        : "Choose at least one day to continue."
                }
              />
            </section>
          ) : null}

          {step === 2 ? (
            <section aria-labelledby="step-heading">
              <StepHeading
                ref={headingRef}
                intro={demo ? undefined : "So Alex can reply to confirm. Returning? Your browser can fill these in."}
              >
                <span id="step-heading">Your details</span>
              </StepHeading>
              <form
                action={formAction}
                noValidate
                onSubmit={(e) => {
                  const found = validateDetails();
                  setClientErrors(found);
                  if (Object.keys(found).length > 0 || demo) e.preventDefault();
                  if (Object.keys(found).length > 0) {
                    requestAnimationFrame(() => document.getElementById(Object.keys(found)[0])?.focus());
                    return;
                  }
                  if (demo) setDemoDone(true);
                }}
                className="mt-6 space-y-8"
              >
                {demo ? (
                  <DemoNotice>Demonstration: these details aren&apos;t sent anywhere.</DemoNotice>
                ) : null}
                {serverState.status === "error" ? (
                  <ErrorSummary
                    focusRef={summaryRef}
                    message={serverState.message}
                    errors={serverErrorList}
                  />
                ) : null}

                <ChoiceGroup
                  type="radio"
                  name="experience"
                  legend="Your kettlebell experience"
                  options={BOOKING_EXPERIENCE}
                  value={details.experience}
                  onChange={(v) => update("experience")(v)}
                  error={errors.experience}
                />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <TextField name="name" label="Name" autoComplete="name" maxLength={100} value={details.name} onChange={update("name")} error={errors.name} />
                  <TextField
                    name="email"
                    label="Email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={254}
                    value={details.email}
                    onChange={update("email")}
                    error={errors.email}
                  />
                </div>
                <TextField
                  name="phone"
                  label="Phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  optional
                  maxLength={30}
                  value={details.phone}
                  onChange={update("phone")}
                  error={errors.phone}
                  className="sm:max-w-sm"
                />
                <Disclosure label="Add a note for Alex" initiallyOpen={Boolean(details.message || errors.message)}>
                  <TextField
                    name="message"
                    label="Note"
                    optional
                    multiline
                    maxLength={1000}
                    hint="Questions or anything Alex should know. Please don't include medical details."
                    value={details.message}
                    onChange={update("message")}
                    error={errors.message}
                  />
                </Disclosure>

                {/* The visitor's choices from earlier steps travel with the details. */}
                <input type="hidden" name="service" value={service} />
                {usesSessions ? <input type="hidden" name="session" value={session} /> : null}
                {!demo && !usesSessions ? days.map((d) => <input key={d} type="hidden" name="days" value={d} />) : null}
                {!demo && !usesSessions ? times.map((t) => <input key={t} type="hidden" name="times" value={t} />) : null}
                <SubmissionMeta meta={meta} />

                <PrivacyLine action={demo ? "continuing" : "sending this request"} />
                <ActionBar
                  onBack={() => setStep(1)}
                  next={{ label: demo ? "Finish demo" : "Send request", type: "submit", pending }}
                />
              </form>
            </section>
          ) : null}
        </div>
      </div>

      <aside aria-label={demo ? "Your selection (demonstration)" : "Your booking request"} className="hidden lg:col-span-4 lg:block">
        <div className="sticky top-28">{summary}</div>
      </aside>
    </div>
  );
}

function Summary({
  demo,
  rows,
  currentStep,
  onEdit,
}: {
  demo: boolean;
  rows: { label: string; value: string; step: number }[];
  currentStep: number;
  onEdit: (step: number) => void;
}) {
  return (
    <div className="border border-ink bg-white">
      <p className="flex items-center justify-between border-b border-ink px-5 py-3 eyebrow">
        <span>{demo ? "Your selection" : "Your request"}</span>
        {demo ? <span className="bg-ink px-2 py-0.5 text-paper">Demo</span> : null}
      </p>
      <dl className="divide-y divide-line">
        {rows.map((row) => (
          <div key={row.label} className="relative min-h-14 px-5 py-3">
            <dt className="text-xs text-muted">{row.label}</dt>
            <dd className="flex items-center justify-between gap-4">
              <span className={cn("font-semibold", !row.value && "font-normal text-muted")}>{row.value || "Not chosen yet"}</span>
              {row.value && row.step < currentStep ? (
                <button
                  type="button"
                  onClick={() => onEdit(row.step)}
                  className="-my-3 inline-flex min-h-11 shrink-0 items-center text-sm font-semibold underline underline-offset-4 hover:no-underline"
                >
                  Change<span className="sr-only"> {row.label.toLowerCase()}</span>
                </button>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-line px-5 py-3 text-sm text-muted">
        {demo ? "Demonstration only. Nothing is booked." : "Alex confirms every place personally by email."}
      </p>
    </div>
  );
}

/** Phones: one line per choice so the current step stays near the top. */
function CompactSummary({
  demo,
  items,
  onEdit,
}: {
  demo: boolean;
  items: { label: string; value: string; step: number }[];
  onEdit: (step: number) => void;
}) {
  return (
    <dl aria-label={demo ? "Your selection (demonstration)" : "Your request so far"} className="divide-y divide-line border-y border-ink">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 py-1">
          <dt className="shrink-0 text-xs text-muted">{item.label}</dt>
          <dd className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <span className="truncate text-sm font-semibold">{item.value}</span>
            <button
              type="button"
              onClick={() => onEdit(item.step)}
              className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold underline underline-offset-4"
            >
              Change<span className="sr-only"> {item.label.toLowerCase()}</span>
            </button>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Outcome({
  demo,
  headingRef,
  service,
  when,
  longWhen,
  email,
  onRestart,
}: {
  demo: boolean;
  headingRef: React.Ref<HTMLHeadingElement>;
  service: string;
  when: string;
  longWhen: string;
  email: string;
  onRestart: () => void;
}) {
  return (
    <div className="animate-step-in" role="status">
      <div className="bg-ink p-8 text-paper sm:p-12">
        <p className="eyebrow text-muted-inverse">{demo ? "Demonstration complete" : "Request sent"}</p>
        <h2 ref={headingRef} tabIndex={-1} className="mt-4 font-display text-h2 text-balance focus:outline-none">
          {demo ? "No booking has been made" : "Thanks — Alex will be in touch"}
        </h2>
        <p className="mt-5 max-w-xl text-lede text-muted-inverse">
          {demo
            ? `This was sample availability, so nothing was booked or sent. Once real availability is connected, this screen would confirm ${service.toLowerCase()} on ${longWhen}.`
            : `Your request is with Alex. He'll reply to ${email} to confirm a time. Your place is booked once he confirms.`}
        </p>
        <dl className="mt-8 grid max-w-xl grid-cols-1 border-t border-line-inverse sm:grid-cols-2">
          <div className="border-b border-line-inverse py-4 sm:border-b-0">
            <dt className="eyebrow text-muted-inverse">Service</dt>
            <dd className="mt-1 font-semibold">{service}</dd>
          </div>
          <div className="py-4">
            <dt className="eyebrow text-muted-inverse">{demo ? "Sample time" : "When"}</dt>
            <dd className="mt-1 font-semibold">{when}</dd>
          </div>
        </dl>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
        {demo ? (
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex min-h-12 items-center justify-center bg-ink px-6 text-sm font-semibold uppercase tracking-[0.08em] text-paper transition-colors hover:bg-ink-soft"
          >
            Try another booking
          </button>
        ) : null}
        <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold uppercase tracking-[0.08em] underline-offset-[6px] hover:underline">
          Back to the homepage
        </Link>
      </div>
    </div>
  );
}
