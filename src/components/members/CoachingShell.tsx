import Link from "next/link";
import type { ReactNode } from "react";
import { ClearStatus } from "@/components/account/ClearStatus";
import { COACHING_CHECK_IN_PATH, COACHING_MESSAGES_PATH, COACHING_PATH, COACHING_PROGRAMME_PATH, COACHING_UNLOCK_PATH, onlineCoachingPrice, type CoachingStatus } from "@/lib/coaching";
import { getOnlineCoachingAction } from "@/lib/booking";
import type { MemberOverview } from "@/lib/member-auth";
import type { MemberSettings } from "@/lib/member-settings";
import { MEMBERS_VIEW_PATH } from "@/lib/members-app";
import { firstName } from "@/lib/member-view";
import { AccountMenu } from "./AccountMenu";
import { AccountMenuContent } from "./AccountMenuContent";
import { Icon, icons } from "./icons";
import { Toast } from "./Toast";

export type CoachingView = "today" | "programme" | "check-in" | "messages" | "unlock";

const TABS: { view: Exclude<CoachingView, "unlock">; label: string; href: string; icon: keyof typeof icons }[] = [
  { view: "today", label: "Today", href: COACHING_PATH, icon: "today" },
  { view: "programme", label: "Programme", href: COACHING_PROGRAMME_PATH, icon: "programme" },
  { view: "check-in", label: "Check-in", href: COACHING_CHECK_IN_PATH, icon: "checkin" },
  { view: "messages", label: "Messages", href: COACHING_MESSAGES_PATH, icon: "message" },
];

/**
 * The coaching area's frame (owner's members design, 2026-10-28): a dark
 * version of the members frame with its own label (RAENG COACHING), a back
 * arrow to the members area, and its own tabs (Today / Programme / Check-in /
 * Messages, with a dot for an unread message). People without coaching see
 * the unlock page with a bar to enquire instead of tabs.
 */
export function CoachingShell({
  view,
  overview: o,
  settings,
  coaching,
  unread,
  done,
  error,
  children,
}: {
  view: CoachingView;
  overview: MemberOverview;
  settings: MemberSettings | null;
  coaching: CoachingStatus | null;
  unread: number;
  done: string | null;
  error: string | null;
  children: ReactNode;
}) {
  const initial = (firstName(o.client.name) || "Member").slice(0, 1).toUpperCase();
  const price = onlineCoachingPrice();
  const enquiry = getOnlineCoachingAction();
  return (
    <div data-members-app data-coaching className="coaching-dark members-app min-h-dvh bg-paper text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-paper">
        <div className="mx-auto grid h-[60px] max-w-[620px] grid-cols-[44px_1fr_44px] items-center px-5">
          <Link href={MEMBERS_VIEW_PATH.home} className="grid size-11 place-items-center">
            <Icon name="back" />
            <span className="sr-only">Back to the members area</span>
          </Link>
          <Link href={view === "unlock" ? COACHING_UNLOCK_PATH : COACHING_PATH} className="justify-self-center pl-[0.34em] text-center text-[1.0625rem] leading-tight font-extrabold tracking-[0.34em]">
            RAENG
            <span className="-mt-0.5 block text-[0.5625rem] font-semibold tracking-[0.4em]">COACHING</span>
            <span className="sr-only"> coaching home</span>
          </Link>
          <AccountMenu initial={initial} label="Account menu" coaching={coaching?.active === true}>
            <AccountMenuContent overview={o} settings={settings} coaching={coaching} />
          </AccountMenu>
        </div>
      </header>

      <div className="mx-auto max-w-[620px] px-5 pt-7 pb-[calc(7rem+env(safe-area-inset-bottom))]">
        {error ? (
          <p role="alert" className="mb-6 rounded-2xl border-2 border-ink bg-white px-5 py-4 font-semibold">
            {error}
          </p>
        ) : null}
        <div className="members-view flex flex-col gap-7">{children}</div>
      </div>

      {view === "unlock" ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto flex max-w-[620px] items-center justify-between gap-4 px-5 py-3">
            <div className="flex flex-col leading-tight">
              <b className="text-[1.0625rem]">{price ? `£${price} a month` : "Online coaching"}</b>
              <span className="text-[0.8125rem]">Online coaching with Alex</span>
            </div>
            <Link href={enquiry.href} className="members-btn members-btn-solid shrink-0 px-6">
              Unlock coaching
            </Link>
          </div>
        </div>
      ) : (
        <nav aria-label="Coaching" className="members-tabs fixed inset-x-0 bottom-0 z-20 border-t border-line pb-[env(safe-area-inset-bottom)]">
          <ul className="mx-auto grid max-w-[620px] grid-cols-4">
            {TABS.map((t) => (
              <li key={t.view}>
                <Link href={t.href} aria-current={t.view === view ? "page" : undefined} className="members-tab">
                  <span className="relative">
                    <Icon name={t.icon} />
                    {t.view === "messages" && unread > 0 ? <b className="absolute -top-0.5 -right-1.5 size-2.5 rounded-full border-2 border-paper bg-ink" aria-hidden="true" /> : null}
                  </span>
                  {t.label}
                  {t.view === "messages" && unread > 0 ? <span className="sr-only">, {unread} new</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <Toast message={done} />
      {done || error ? <ClearStatus /> : null}
    </div>
  );
}
