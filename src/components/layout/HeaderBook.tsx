"use client";

import { usePathname } from "next/navigation";
import { StartTraining } from "@/components/ui/StartTraining";
import type { CallToAction } from "@/lib/booking";

/**
 * The header's Book now: a compact black pill, white with an ink outline
 * while the visitor is in the booking flow (/book and its steps), marking
 * where they are.
 */
export function HeaderBook({ cta }: { cta: CallToAction }) {
  const pathname = usePathname();
  const inBooking = pathname === "/book" || pathname.startsWith("/book/");
  return (
    <StartTraining
      href={cta.href}
      label={cta.label}
      external={cta.external}
      variant="button"
      current={inBooking}
    />
  );
}
