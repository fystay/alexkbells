"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { requestSignInLink, type SignInField } from "@/app/account/actions";
import { initialFormState, type FormState } from "@/lib/booking-request";
import { buttonClasses } from "@/components/ui/ButtonLink";
import { SubmissionMeta, TextField, useSubmissionMeta } from "@/components/booking/ui";

/**
 * Email in, "check your email" out. The same answer for every address, so
 * the form never says who has an account.
 */
export function SignInForm() {
  const [email, setEmail] = useState("");
  const meta = useSubmissionMeta();
  const [state, action, pending] = useActionState(requestSignInLink, initialFormState as FormState<SignInField>);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="card p-6 focus:outline-none sm:p-8">
        <h2 className="card-title text-xl">Check your email</h2>
        <p className="mt-2">
          If <span className="font-semibold">{state.message}</span> has an account, a sign-in link is on its way. It works once, for 15
          minutes.
        </p>
        <p className="mt-3 text-sm">Nothing arrived after a few minutes? Check your junk folder, then try again.</p>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="space-y-6">
      {state.status === "error" ? (
        <div ref={statusRef} tabIndex={-1} role="alert" className="rounded-2xl border-2 border-ink bg-white p-5 font-semibold focus:outline-none">
          {state.message}
        </div>
      ) : null}
      <TextField
        name="email"
        label="Your email"
        type="email"
        inputMode="email"
        autoComplete="email"
        maxLength={254}
        hint="The one you booked or joined with."
        value={email}
        onChange={setEmail}
        error={state.errors.email}
      />
      <SubmissionMeta meta={meta} />
      <button type="submit" disabled={pending} className={buttonClasses("action", "w-full px-6 sm:w-auto")}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
