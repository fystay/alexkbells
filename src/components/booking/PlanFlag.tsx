"use client";

import { useEffect } from "react";
import { PLAN_ATTRIBUTE, planFromSearch } from "@/lib/plan-flag";

/**
 * Keeps `<html data-plan>` in step with `?plan=` after an in-app navigation
 * (the pre-paint script only runs on a full page load), and clears it when
 * the booking page is left.
 */
export function PlanFlag() {
  useEffect(() => {
    const root = document.documentElement;
    const plan = planFromSearch(window.location.search);
    if (plan) root.setAttribute(PLAN_ATTRIBUTE, plan);
    else root.removeAttribute(PLAN_ATTRIBUTE);
    return () => root.removeAttribute(PLAN_ATTRIBUTE);
  }, []);
  return null;
}
