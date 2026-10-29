import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountUnavailable } from "@/components/members/Cards";
import { CoachingShell } from "@/components/members/CoachingShell";
import { Icon } from "@/components/members/icons";
import { COACHING_UNLOCK_PATH, markCoachingRead, statusOf } from "@/lib/coaching";
import { toLondon } from "@/lib/coach/time";
import { formatLongDate } from "@/lib/availability/dates";
import { pageMetadata } from "@/lib/metadata";
import { loadCoaching } from "../../data";
import { sendMessage } from "../actions";

export const metadata: Metadata = pageMetadata({
  title: "Coaching: messages",
  description: "Messages with your coach.",
  path: "/account/coaching/messages",
  noindex: true,
});

/**
 * Coaching Messages (owner's members design): a thread with Alex and a box to
 * write. Opening it marks his messages read (the dot on the tab goes). No
 * promise is made about how quickly he replies.
 */
export default async function CoachingMessagesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const d = await loadCoaching(searchParams);
  if (!d.overview.ok || !d.coaching) return <AccountUnavailable />;
  const c = d.coaching;
  if (!c.active) redirect(COACHING_UNLOCK_PATH);
  if (c.unread > 0) await markCoachingRead(d.member.db, d.member.clientId);
  const shell = { overview: d.overview.data, settings: d.settings, coaching: statusOf(c), unread: 0, done: d.done, error: d.error };
  // A date line above the first message of each day.
  const days = c.messages.map((m) => toLondon(m.created_at).date);

  return (
    <CoachingShell view="messages" {...shell}>
      <div className="flex flex-col gap-2">
        <p className="members-eyebrow">Messages</p>
        <h1 className="text-[clamp(1.875rem,8.4vw,2.625rem)] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance">Alex.</h1>
        <p>Your coach.</p>
      </div>

      <div className="flex flex-col gap-2" aria-label="Messages with Alex" role="log">
        {c.messages.length === 0 ? <p className="border-y border-line py-4">No messages yet. Say hello.</p> : null}
        {c.messages.map((m, i) => {
          const day = days[i];
          const sep = i === 0 || day !== days[i - 1] ? (
            <span key={`d-${m.id}`} className="self-center pt-3 pb-1 text-xs font-semibold tracking-[0.14em] uppercase">
              {formatLongDate(day)}
            </span>
          ) : null;
          return [
            sep,
            <div
              key={m.id}
              className={`max-w-[84%] rounded-[18px] px-3.5 py-2.5 leading-[1.45] [overflow-wrap:anywhere] ${m.from_client ? "self-end rounded-br-md bg-ink text-paper" : "self-start rounded-bl-md border border-line"}`}
            >
              <span className="sr-only">{m.from_client ? "You: " : "Alex: "}</span>
              {m.body}
            </div>,
          ];
        })}
      </div>

      <form action={sendMessage} className="grid grid-cols-[1fr_48px] items-end gap-2">
        <label className="block">
          <span className="sr-only">Message Alex</span>
          <textarea name="body" rows={2} required maxLength={2000} placeholder="Message Alex…" className="members-input" />
        </label>
        <button type="submit" className="grid size-12 place-items-center rounded-full bg-ink text-paper">
          <Icon name="send" className="size-5 fill-none stroke-current stroke-2" />
          <span className="sr-only">Send</span>
        </button>
      </form>
    </CoachingShell>
  );
}
