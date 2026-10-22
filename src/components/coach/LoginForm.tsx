"use client";

import { useActionState } from "react";
import { signInCoach, type LoginState } from "@/app/coach/actions";

const input =
  "mt-2 block w-full min-h-12 border border-muted bg-white px-4 py-3 text-base text-ink transition-colors duration-150 hover:border-ink focus-visible:border-ink aria-[invalid=true]:border-2 aria-[invalid=true]:border-ink";

const initialState: LoginState = { message: "", email: "" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInCoach, initialState);
  const error = state.message || undefined;

  return (
    <form action={formAction} className="grid grid-cols-1 gap-6" noValidate>
      {error ? (
        <p id="login-error" role="alert" className="border-2 border-ink bg-white p-4 font-semibold">
          {error}
        </p>
      ) : null}
      <div>
        <label htmlFor="email" className="eyebrow block text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          defaultValue={state.email}
          key={state.email}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "login-error" : undefined}
          className={input}
        />
      </div>
      <div>
        <label htmlFor="password" className="eyebrow block text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "login-error" : undefined}
          className={input}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center bg-ink px-6 text-sm font-semibold uppercase tracking-[0.16em] text-paper transition-colors duration-150 border border-ink hover:bg-white hover:text-ink disabled:cursor-not-allowed disabled:bg-muted"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
