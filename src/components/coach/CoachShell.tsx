import Link from "next/link";
import type { ReactNode } from "react";
import { signOutCoach } from "@/app/coach/actions";
import { AccountMenu } from "@/components/members/AccountMenu";
import { external, Icon, MENU_ICON, NEW_TAB } from "@/components/members/icons";
import { MembersDrawer } from "@/components/members/MembersDrawer";
import { mapsUrl } from "@/content/site";
import { whenLabel, type ShellData } from "@/lib/coach/overview";
import { CoachTabs } from "./CoachTabs";

/** Every section of the portal, so nothing built is out of reach (the tabs hold four; the rest are here). */
const SECTIONS = [
  { href: "/coach/requests", label: "Requests" },
  { href: "/coach/clients", label: "Clients" },
  { href: "/coach/classes", label: "Classes" },
  { href: "/coach/memberships", label: "Memberships" },
  { href: "/coach/sessions", label: "1:1 sessions" },
  { href: "/coach/online", label: "Online coaching" },
  { href: "/coach/finances", label: "Finances" },
] as const;

/**
 * The coach portal's frame (owner's coach design, 2026-10-28): the members
 * area's shell for the coach. A slim header (menu, RAENG COACH, the avatar's
 * account menu), the page, and the four tabs (Today, Schedule, Members,
 * Inbox). Holds no authority: every page and action checks the session
 * itself. `shell` is null when the database can't be read; the frame still
 * shows.
 */
export function CoachShell({ email, shell, children }: { email: string; shell: ShellData | null; children: ReactNode }) {
  const initial = (email.trim()[0] ?? "C").toUpperCase();
  const next = shell?.next ?? null;
  const nextClass = next ? `/coach/classes/${next.occurrence.date}/${next.occurrence.slot.id}` : "/coach/classes";
  return (
    <div data-coach-app className="members-app min-h-dvh bg-paper text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-paper">
        <div className="mx-auto grid h-[60px] max-w-[720px] grid-cols-[44px_1fr_44px] items-center px-5">
          <MembersDrawer label="Coach menu">
            <div className="flex items-center gap-3.5 border-b border-line pb-4.5">
              <span aria-hidden="true" className="grid size-[46px] shrink-0 place-items-center rounded-full bg-ink text-lg font-bold text-paper">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="text-[1.0625rem] font-bold">Coach</p>
                <p className="text-sm [overflow-wrap:anywhere]">{email}</p>
              </div>
            </div>
            <Link href="/coach" className="mt-4 flex flex-col gap-0.5 rounded-[20px] bg-ink px-4.5 py-4 text-paper">
              <span className="text-[0.6875rem] font-semibold tracking-[0.2em] uppercase opacity-75">Next session</span>
              <span className="text-lg font-bold tracking-[-0.01em]">{next ? whenLabel(next.occurrence.startsAt) : "Nothing coming up"}</span>
              <span className="text-[0.8125rem] opacity-80">
                {next ? `${next.booked}${next.capacity ? ` of ${next.capacity}` : ""} booked` : "No class in the next two weeks"}
              </span>
            </Link>
            <Link href="/coach/members" className="mt-3 flex flex-col gap-0.5 rounded-[20px] border-[1.5px] border-ink px-4.5 py-4">
              <span className="text-[0.6875rem] font-semibold tracking-[0.2em] uppercase">Online coaching</span>
              <span className="text-lg font-bold tracking-[-0.01em]">
                {shell ? `${shell.online.clients} client${shell.online.clients === 1 ? "" : "s"}` : "Online clients"}
              </span>
              <span className="text-[0.8125rem]">{shell ? (shell.online.waiting ? `${shell.online.waiting} to reply to` : "All replied") : ""}</span>
            </Link>
            <Link href="/coach" className="members-btn mt-3">
              Check in members
            </Link>
            <ul className="mt-3.5 grid grid-cols-2 gap-2.5">
              <li>
                <Link href={nextClass} className="members-tile">
                  <Icon name="plus" />
                  Add walk-in
                </Link>
              </li>
              <li>
                <Link href="/coach/finances/payments/new" className="members-tile">
                  <Icon name="money" />
                  Record a payment
                </Link>
              </li>
              <li>
                <Link href="/coach/clients/new" className="members-tile">
                  <Icon name="person" />
                  Add a client
                </Link>
              </li>
              <li>
                <Link href="/coach/sessions/new" className="members-tile">
                  <Icon name="calendar" />
                  Add a 1:1
                </Link>
              </li>
            </ul>
            <nav aria-label="Coach sections" className="mt-6 border-t border-line pt-3">
              <p className="members-eyebrow">All sections</p>
              <ul className="mt-1">
                {SECTIONS.map((s) => (
                  <li key={s.href}>
                    <Link href={s.href} className="flex min-h-11 items-center font-semibold hover:underline">
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Website" className="mt-auto flex flex-wrap gap-x-3.5 gap-y-0.5 border-t border-line pt-4.5 text-sm">
              <Link href="/" className="inline-flex min-h-11 items-center hover:underline">
                View website
              </Link>
              <Link href="/classes" className="inline-flex min-h-11 items-center hover:underline">
                Classes
              </Link>
              <Link href="/memberships" className="inline-flex min-h-11 items-center hover:underline">
                Memberships
              </Link>
              <a href={mapsUrl()} {...external} className="inline-flex min-h-11 items-center hover:underline">
                Media House{NEW_TAB}
              </a>
            </nav>
          </MembersDrawer>

          <Link href="/coach" className="justify-self-center pl-[0.34em] text-center text-[1.0625rem] leading-tight font-extrabold tracking-[0.34em]">
            RAENG
            <span className="-mt-0.5 block text-[0.5625rem] font-semibold tracking-[0.4em]">COACH</span>
            <span className="sr-only"> coach home</span>
          </Link>

          <AccountMenu initial={initial} label="Account menu">
            <div className="mb-1.5 flex items-center gap-3 border-b border-line px-2.5 pt-2.5 pb-3.5">
              <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-[1.0625rem] font-bold text-paper">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="font-bold">Coach</p>
                <p className="text-[0.8125rem] [overflow-wrap:anywhere]">{email}</p>
              </div>
            </div>
            <ul>
              <li>
                <Link href="/coach/finances" className="members-menu-item">
                  <Icon name="money" className={MENU_ICON} />
                  Finances
                </Link>
              </li>
              <li>
                <Link href="/" className="members-menu-item">
                  <Icon name="eye" className={MENU_ICON} />
                  View website
                </Link>
              </li>
            </ul>
            <hr className="my-1.5 border-line" />
            <form action={signOutCoach}>
              <button type="submit" className="members-menu-item text-ink">
                <Icon name="out" className={MENU_ICON} />
                Sign out
              </button>
            </form>
          </AccountMenu>
        </div>
      </header>

      <div className="container-page pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:pt-8">{children}</div>
      <CoachTabs inbox={shell?.inbox ?? 0} />
    </div>
  );
}
