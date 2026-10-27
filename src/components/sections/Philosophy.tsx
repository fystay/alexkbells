import { Noto_Sans_Thai_Looped } from "next/font/google";
import type { ReactNode } from "react";
import { philosophy } from "@/content/about";

// Only the large แรง needs a Thai face, looped as on the card (Archivo has no Thai); loaded on /about only.
const thai = Noto_Sans_Thai_Looped({ subsets: ["thai"], weight: "900", display: "swap" });

/**
 * /about's opening, laid out like RAENG's philosophy card (owner, 2026-10-27):
 * the label, แรง large with RAENG spaced beneath, "More than strength." as the
 * page's h1, the three paragraphs as written (the values follow in their own section). No rules
 * under titles (removed site-wide 2026-10-26).
 */
export function Philosophy({ children }: { children?: ReactNode }) {
  return (
    <header className="bg-paper">
      <div className="container-page pt-12 pb-12 sm:pt-20 sm:pb-16 lg:py-24">
        <p className="eyebrow">{philosophy.eyebrow}</p>
        <p className="mt-8" aria-hidden="true">
          <span lang="th" className={`${thai.className} block text-[clamp(6rem,4rem+9vw,10rem)] font-black leading-[0.9]`}>
            {philosophy.thai}
          </span>
          <span className="mt-3 block text-lg tracking-[0.6em]">{philosophy.word}</span>
        </p>
        <h1 className="mt-10 max-w-4xl font-display text-h1 text-balance">{philosophy.title}</h1>
        <div className="mt-5 max-w-2xl space-y-4 text-lede">
          {philosophy.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        {/* The card's "Strength • Community • Discipline" line is left out here: "What we stand for" lists the three just below (audit, 2026-10-27). */}
        {children ? <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">{children}</div> : null}
      </div>
    </header>
  );
}
