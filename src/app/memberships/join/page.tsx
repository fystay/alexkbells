import type { Metadata } from "next";
import { site } from "@/content/site";
import { getService } from "@/content/services";
import { bookingMode } from "@/lib/booking";
import { onlineJoinEnabled } from "@/lib/membership-checkout";
import { publishedClasses } from "@/lib/class-sessions";
import { pageMetadata } from "@/lib/metadata";
import { MembershipJoin } from "@/components/booking/MembershipJoin";
import { InstagramFallback } from "@/components/booking/ui";

export const metadata: Metadata = pageMetadata({
  title: "Join a Membership",
  description: "Join a RAENG Fitness kettlebell membership in Cumbernauld: choose your plan and your first class.",
  path: "/memberships/join",
});

/**
 * Joining a membership (owner, 2026-10-26): its own journey, reached from
 * "Join <plan>" on the plan list (`?plan=`). Paid on Stripe's page where
 * online joining is on (lib/membership-checkout.ts); otherwise the same switch
 * as booking: requests reach Alex when booking requests are on, previews show
 * a demonstration, otherwise an honest Instagram route.
 */
export default function JoinMembershipPage() {
  const booking = bookingMode();
  const mode = booking === "request" && onlineJoinEnabled() ? "pay" : booking;
  const payg = getService("group-classes").prices[0];
  return (
    <section aria-labelledby="join-heading" className="bg-paper">
      <div className="container-page pt-6 pb-16 sm:pt-10 lg:pb-24">
        <header className="max-w-2xl">
          <p className="eyebrow">Memberships · {site.location.town}</p>
          <h1 id="join-heading" className="mt-3 font-display text-h2 text-balance">
            Join a membership.
          </h1>
          <p className="mt-5 text-lede">
            {mode === "pay"
              ? "Choose your plan and first class, then pay securely with Stripe. Your membership starts straight away."
              : "Choose your plan and first class. Alex confirms every membership personally, and there's nothing to pay now."}
          </p>
        </header>
        <div className="mt-8 lg:mt-10">
          {mode === "pay" || mode === "request" || mode === "demo" ? (
            <>
              <noscript>
                <p className="mb-6 rounded-2xl border-2 border-ink p-5">
                  Joining online needs JavaScript. You can also message Alex on Instagram ({site.social.instagram.handle}).
                </p>
              </noscript>
              <MembershipJoin mode={mode} classes={publishedClasses()} paygGbp={payg.amountGbp} />
            </>
          ) : (
            <div className="max-w-2xl">
              <InstagramFallback>To join a membership, send Alex a message on Instagram with the plan you&apos;d like.</InstagramFallback>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
