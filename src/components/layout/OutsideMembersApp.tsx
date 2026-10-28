"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isMembersApp } from "@/lib/members-app";

/** The public site's header and footer, left out of the members area (it has its own). */
export function OutsideMembersApp({ children }: { children: ReactNode }) {
  return isMembersApp(usePathname()) ? null : children;
}
