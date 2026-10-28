"use client";

import { useEffect, useState } from "react";

export interface SignedInDetails {
  name: string;
  email: string;
  phone: string;
}

/**
 * The signed-in customer's details for the booking and join forms
 * (2026-10-28: the first paid booking is the account; next time the form is
 * filled in). Asks /api/account/details once; signed out, or if it fails,
 * nothing happens and the form stays empty. `onFound` should only fill
 * fields that are still empty.
 */
export function useSignedInDetails(onFound: (details: SignedInDetails) => void): boolean {
  const [found, setFound] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/account/details", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: Partial<SignedInDetails>) => {
        if (!live || typeof d.email !== "string" || !d.email) return;
        onFound({ name: d.name ?? "", email: d.email, phone: d.phone ?? "" });
        setFound(true);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
    // Once per visit to the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return found;
}
