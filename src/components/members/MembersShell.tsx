import Link from "next/link";
import type { ReactNode } from "react";
import { bookClass, bookClassWithCredit, cancelClass, signOutMember } from "@/app/account/actions";
import { mapsUrl, site } from "@/content/site";
import { formatPenceShort } from "@/lib/membership";
import type { MemberOverview } from "@/lib/member-auth";
import { CALENDAR_SYNC_PATH, NOTIFICATIONS_PATH, PROFILE_PATH, SECURITY_PATH, type MemberSettings } from "@/lib/member-settings";
import { MEMBERS_VIEW_PATH, type MembersView } from "@/lib/members-app";
import { countdown, firstName, shortWhen, upcomingPlaces } from "@/lib/member-view";
import { ClearStatus } from "@/components/account/ClearStatus";
import { AccountMenu } from "./AccountMenu";
import { ConfirmSheet } from "./ConfirmSheet";
import { MembersDrawer } from "./MembersDrawer";
import type { SheetPayload } from "./sheet";
import { Toast } from "./Toast";

const ICON = "size-[22px] fill-none stroke-current stroke-[1.8]";
const icons = {
  home: <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z" />,
  book: <path d="M4 8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM4 10h16M9 3v4M15 3v4M10 15l1.5 1.5L15 13" />,
  plan: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 8 8h-8z" />
    </>
  ),
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  pin: (
    <>
      <path d="M12 21s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  card: <path d="M5.5 6h13A2.5 2.5 0 0 1 21 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-8A2.5 2.5 0 0 1 5.5 6zM3 10h18M7 15h4" />,
  help: <path d="M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.8v.1" />,
  out: <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" />,
  devices: <path d="M4 6h12v9H4zM2 18h16M19 9h3v9h-3z" />,
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" />,
  calendar: <path d="M4 8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM4 10h16M9 3v4M15 3v4" />,
  lock: <path d="M7 10h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8 10V7a4 4 0 0 1 8 0v3" />,
};

function Icon({ name, className = ICON }: { name: keyof typeof icons; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
}

const PUBLIC_LINKS: [string, string][] = [
  ["/classes", "Classes"],
  ["/memberships", "Memberships"],
  ["/coaching", "1:1 Coaching"],
  ["/online-coaching", "Online Coaching"],
  ["/about", "About RAENG"],
];

const MENU_ICON = "size-[19px] shrink-0 fill-none stroke-current stroke-[1.7]";
const external = { target: "_blank", rel: "noopener noreferrer" } as const;
const NEW_TAB = <span className="sr-only"> (opens in a new tab)</span>;

/**
 * The members area's frame (owner's members design, 2026-10-28): a slim header
 * (members menu, RAENG MEMBERS, the avatar's account menu), the view, a bottom
 * tab bar (Home / Book / Plan), the confirm sheet and the toast. Every page
 * checks the session itself; this only lays out what it is given.
 */
export function MembersShell({
  view,
  overview,
  settings = null,
  now,
  done,
  error,
  sheet,
  children,
}: {
  /** The tab to mark current; null on the settings pages, which belong to the account menu. */
  view: MembersView | null;
  overview: MemberOverview;
  /** Reminders and calendar link, for the account menu's "On" and "Connected" (left out if null). */
  settings?: MemberSettings | null;
  now: Date;
  done: string | null;
  error: string | null;
  /** The sheet rendered open (no-JavaScript fallback for ?confirm=…). */
  sheet: SheetPayload | null;
  children: ReactNode;
}) {
  const o = overview;
  const m = o.membership;
  const name = firstName(o.client.name) || "Member";
  const initial = name.slice(0, 1).toUpperCase();
  const left = o.period?.left ?? 0;
  const next = upcomingPlaces(o, now)[0] ?? null;
  const status = m ? `${m.plan_name} · ${left} credit${left === 1 ? "" : "s"} left` : o.class_credits.length > 0 ? `Pay as you go · ${o.class_credits.length} class credit${o.class_credits.length === 1 ? "" : "s"}` : "Pay as you go";
  const path = MEMBERS_VIEW_PATH[view ?? "home"];

  return (
    <div data-members-app className="members-app min-h-dvh bg-paper text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-paper">
        <div className="mx-auto grid h-[60px] max-w-[620px] grid-cols-[44px_1fr_44px] items-center px-5">
          <MembersDrawer>
            <div className="flex items-center gap-3.5 border-b border-line pb-4.5">
              <span aria-hidden="true" className="grid size-[46px] shrink-0 place-items-center rounded-full bg-ink text-lg font-bold text-paper">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="text-[1.0625rem] font-bold">{o.client.name || name}</p>
                <p className="text-sm text-ink">{status}</p>
              </div>
            </div>
            <Link href={MEMBERS_VIEW_PATH.home} className="mt-4 flex flex-col gap-0.5 rounded-[20px] bg-ink px-4.5 py-4 text-paper">
              <span className="text-[0.6875rem] font-semibold tracking-[0.2em] uppercase opacity-75">Next class</span>
              <span className="text-lg font-bold tracking-[-0.01em]">{next ? shortWhen(next.starts_at) : "Nothing booked"}</span>
              <span className="text-[0.8125rem] opacity-80">
                {next ? `${countdown(next.starts_at, now)} · ${site.location.venue}` : m ? `${left} credit${left === 1 ? "" : "s"} to use` : "Book a class to see it here"}
              </span>
            </Link>
            <Link href={MEMBERS_VIEW_PATH.book} className="members-btn mt-3">
              Book a class
            </Link>
            <ul className="mt-3.5 mb-6 grid grid-cols-2 gap-2.5">
              <li>
                <Link href={`${MEMBERS_VIEW_PATH.home}#booked`} className="members-tile">
                  <Icon name="list" />
                  My bookings
                </Link>
              </li>
              <li>
                <Link href={MEMBERS_VIEW_PATH.plan} className="members-tile">
                  <Icon name="plan" />
                  {m ? `${left} credit${left === 1 ? "" : "s"}` : "Your plan"}
                </Link>
              </li>
              <li>
                <a href={mapsUrl()} {...external} className="members-tile">
                  <Icon name="pin" />
                  <span>Directions{NEW_TAB}</span>
                </a>
              </li>
              <li>
                <a href={site.social.instagram.url} {...external} className="members-tile">
                  <Icon name="chat" />
                  <span>Message Alex{NEW_TAB}</span>
                </a>
              </li>
            </ul>
            <nav aria-label="RAENG website" className="mt-auto flex flex-wrap gap-x-3.5 gap-y-0.5 border-t border-line pt-4.5 text-sm">
              {PUBLIC_LINKS.map(([href, label]) => (
                <Link key={href} href={href} className="inline-flex min-h-11 items-center text-ink hover:text-ink hover:underline">
                  {label}
                </Link>
              ))}
            </nav>
          </MembersDrawer>

          <Link href={MEMBERS_VIEW_PATH.home} className="justify-self-center pl-[0.34em] text-center text-[1.0625rem] leading-tight font-extrabold tracking-[0.34em]">
            RAENG
            <span className="-mt-0.5 block text-[0.5625rem] font-semibold tracking-[0.4em] text-ink">MEMBERS</span>
            <span className="sr-only"> members home</span>
          </Link>

          <AccountMenu initial={initial} label="Account menu">
            <div className="mb-1.5 flex items-center gap-3 border-b border-line px-2.5 pt-2.5 pb-3.5">
              <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-[1.0625rem] font-bold text-paper">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="font-bold">{o.client.name || name}</p>
                <p className="text-[0.8125rem] text-ink">{m ? `${m.plan_name} member` : "Pay as you go"}</p>
              </div>
            </div>
            <ul>
              <li>
                <Link href={PROFILE_PATH} className="members-menu-item">
                  <Icon name="person" className={MENU_ICON} />
                  Profile and details
                </Link>
              </li>
              <li>
                <Link href={MEMBERS_VIEW_PATH.plan} className="members-menu-item">
                  <Icon name="card" className={MENU_ICON} />
                  Plan and billing
                  {m ? <em className="ml-auto text-xs text-ink not-italic">{formatPenceShort(m.price_pence)} / 4 wks</em> : null}
                </Link>
              </li>
              <li>
                <Link href={NOTIFICATIONS_PATH} className="members-menu-item">
                  <Icon name="bell" className={MENU_ICON} />
                  Notifications
                  {settings ? <em className="ml-auto text-xs text-ink not-italic">{settings.class_reminders ? "On" : "Off"}</em> : null}
                </Link>
              </li>
              <li>
                <Link href={CALENDAR_SYNC_PATH} className="members-menu-item">
                  <Icon name="calendar" className={MENU_ICON} />
                  Calendar sync
                  {settings ? <em className="ml-auto text-xs text-ink not-italic">{settings.calendar_feed ? "Connected" : "Not connected"}</em> : null}
                </Link>
              </li>
              <li>
                <Link href={SECURITY_PATH} className="members-menu-item">
                  <Icon name="lock" className={MENU_ICON} />
                  Sign-in and security
                </Link>
              </li>
            </ul>
            <hr className="my-1.5 border-line" />
            <ul>
              <li>
                <a href={site.social.instagram.url} {...external} className="members-menu-item">
                  <Icon name="help" className={MENU_ICON} />
                  <span>Help and contact{NEW_TAB}</span>
                  <em className="ml-auto text-xs text-ink not-italic">Instagram</em>
                </a>
              </li>
            </ul>
            <hr className="my-1.5 border-line" />
            <form action={signOutMember}>
              <button type="submit" className="members-menu-item text-ink">
                <Icon name="out" className={MENU_ICON} />
                Sign out
              </button>
            </form>
            <form action={signOutMember}>
              <input type="hidden" name="everywhere" value="yes" />
              <button type="submit" className="members-menu-item text-ink">
                <Icon name="devices" className={MENU_ICON} />
                Sign out of every device
              </button>
            </form>
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

      <nav aria-label="Members" className="members-tabs fixed inset-x-0 bottom-0 z-20 border-t border-line pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto grid max-w-[620px] grid-cols-3">
          {(["home", "book", "plan"] as const).map((v) => (
            <li key={v}>
              <Link href={MEMBERS_VIEW_PATH[v]} aria-current={v === view ? "page" : undefined} className="members-tab">
                <Icon name={v} />
                {v === "home" ? "Home" : v === "book" ? "Book" : "Plan"}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <ConfirmSheet actions={{ book: bookClass, credit: bookClassWithCredit, cancel: cancelClass }} initial={sheet} closeHref={path} />
      <Toast message={done} />
      {done || error ? <ClearStatus /> : null}
    </div>
  );
}
