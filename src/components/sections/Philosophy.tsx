import { Noto_Sans_Thai_Looped } from "next/font/google";
import type { ReactNode } from "react";
import { philosophy } from "@/content/about";
import { SenseEntry } from "./SenseEntry";

// Only the large แรง needs a Thai face, looped as on the card (Archivo has no Thai); loaded on /about only.
const thai = Noto_Sans_Thai_Looped({ subsets: ["thai"], weight: "900", display: "swap" });

/**
 * /about's opening (owner's design, 2026-10-28): แรง set like a dictionary
 * entry (the word, "raeng  Thai, noun", the four senses to tap, each with its
 * line), a thin rule, then "More than strength." as the page's h1 and the
 * paragraph. The values follow in their own section.
 */
export function Philosophy({ children }: { children?: ReactNode }) {
  return (
    <header className="bg-paper">
      <div className="container-page pt-12 pb-12 sm:pt-20 sm:pb-16 lg:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow">{philosophy.eyebrow}</p>
          <div className="mt-5 border-b border-line pb-5">
            <p lang="th" className={`${thai.className} text-[clamp(5.5rem,26vw,8.75rem)] leading-[1.1] font-black`}>
              {philosophy.thai}
            </p>
            <p className="flex flex-wrap items-baseline gap-x-3.5 text-[0.9375rem]">
              <b className="font-semibold">{philosophy.pronunciation}</b>
              <i>{philosophy.partOfSpeech}</i>
            </p>
            <SenseEntry senses={philosophy.senses} />
          </div>
          <h1 className="mt-8 font-display text-h1 text-balance">{philosophy.title}</h1>
          <div className="mt-5 space-y-4 text-lede">
            {philosophy.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          {children ? <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">{children}</div> : null}
        </div>
      </div>
    </header>
  );
}
