import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountUnavailable } from "@/components/members/Cards";
import { CoachingShell } from "@/components/members/CoachingShell";
import { Icon } from "@/components/members/icons";
import { getOnlineCoachingAction } from "@/lib/booking";
import { COACHING_PATH, onlineCoachingPrice } from "@/lib/coaching";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
import { loadCoaching } from "../../data";

export const metadata: Metadata = pageMetadata({
  title: "Unlock coaching",
  description: "Online coaching with Alex, inside your RAENG members area.",
  path: "/account/coaching/unlock",
  noindex: true,
});

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

// What coaching gives, in the words the public Online coaching page already confirms
// (content/services.ts), plus the features of this area. Nothing about how fast Alex replies.
const PERKS = [
  { title: "A programme written for you", body: "Training written for you, not a template handed to everyone.", icon: "programme" },
  { title: "Demo links", body: "Alex adds a link to a demo where a lift needs one, so you know how it should look.", icon: "today" },
  { title: "Log every set", body: "Weights and reps in a tap, with last week's numbers beside them so you know what to beat.", icon: "checkin" },
  { title: "Check-ins and messages", body: "Tell Alex how the week went, and message him whenever you need to.", icon: "message" },
] as const;

const STEPS = [
  { title: "Tell Alex about you", body: "Your goal, your experience and how to reach you, in a few quick questions." },
  { title: "Alex reviews it personally", body: "Every enquiry is read and answered by Alex himself." },
  { title: "Decide together", body: "If online coaching is a good fit, Alex explains how it works and what happens next." },
] as const;

/**
 * Unlock coaching (owner's members design, 2026-10-28): what online coaching
 * adds, how it starts and its one published price, for members without it.
 * The workout behind the lock is an example, blurred and hidden from screen
 * readers. Enquiring goes to the same form as the public page; Alex switches
 * coaching on when he starts the subscription, so nothing is bought here.
 */
export default async function CoachingUnlockPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const d = await loadCoaching(searchParams);
  if (!d.overview.ok) return <AccountUnavailable />;
  if (d.coaching?.active) redirect(COACHING_PATH);
  const price = onlineCoachingPrice();
  const enquiry = getOnlineCoachingAction();

  return (
    <CoachingShell view="unlock" overview={d.overview.data} settings={d.settings} coaching={{ active: false }} unread={0} done={d.done} error={d.error}>
      <div className="flex flex-col gap-2">
        <p className="members-eyebrow">Raeng Coaching</p>
        <h1 className="text-[clamp(1.875rem,8.4vw,2.625rem)] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance">Train with Alex, wherever you are.</h1>
        <p>Online kettlebell coaching, right here in your members area. It sits alongside your classes.</p>
      </div>

      <div className="relative overflow-hidden rounded-3xl border-[1.5px] border-line p-5.5" aria-hidden="true">
        <div className="flex flex-col gap-3 blur-[5px]">
          <p className="members-eyebrow">Example workout</p>
          {[
            ["Snatch", "6 × 5 each · 16 kg"],
            ["Two-hand swing", "10 × 10 · 20 kg"],
            ["Goblet squat", "3 × 10 · 16 kg"],
          ].map(([name, rx]) => (
            <div key={name} className="flex flex-col border-t border-line pt-3">
              <b>{name}</b>
              <span className="text-sm">{rx} · Watch demo</span>
            </div>
          ))}
        </div>
        <div className="absolute inset-0 grid place-items-center">
          <span className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink bg-paper px-4 py-2 text-sm font-semibold">
            <Icon name="lock" className="size-[18px] fill-none stroke-current stroke-[1.8]" />
            Your programme lives here
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-5">
        {PERKS.map((p) => (
          <li key={p.title} className="grid grid-cols-[28px_1fr] gap-3.5">
            <Icon name={p.icon} className="mt-0.5 size-6 fill-none stroke-current stroke-[1.6]" />
            <div className="flex flex-col">
              <b>{p.title}</b>
              <span className="text-sm">{p.body}</span>
            </div>
          </li>
        ))}
      </ul>

      <section aria-labelledby="how-heading" className="flex flex-col gap-4">
        <h2 id="how-heading" className="members-eyebrow">
          How it works
        </h2>
        <ol className="flex flex-col gap-4.5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[34px_1fr] gap-3.5">
              <span className="pt-0.5 text-sm font-bold tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <div className="flex flex-col">
                <b>{s.title}</b>
                <span className="text-sm">{s.body}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {price ? (
        <section aria-labelledby="price-heading" className="flex flex-col gap-1.5 rounded-3xl border-[1.5px] border-ink p-5.5">
          <h2 id="price-heading" className="members-eyebrow">
            One monthly price
          </h2>
          <p className="text-[2.875rem] leading-none font-extrabold tracking-[-0.04em]">
            £{price}
            <small className="ml-1.5 text-base font-semibold tracking-normal">a month</small>
          </p>
          <p>Online kettlebell coaching with Alex.</p>
        </section>
      ) : null}

      <p className="text-sm">
        Questions first?{" "}
        <a href={site.social.instagram.url} {...external} className="underline underline-offset-4">
          Message Alex on Instagram<span className="sr-only"> (opens in a new tab)</span>
        </a>
        . Or <a href={enquiry.href} className="underline underline-offset-4">enquire about online coaching</a>.
      </p>
    </CoachingShell>
  );
}
