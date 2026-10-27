import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { onlineClassBooking } from "@/content/classes";
import { CLASS_BOOK_PATH, classBookingStatus, type ClassBookingStatus } from "@/lib/class-checkout";
import { publishedClasses } from "@/lib/class-sessions";
import { coachDb, isUuid } from "@/lib/coach/db";
import { pageMetadata } from "@/lib/metadata";
import { buttonClasses } from "@/components/ui/ButtonLink";
import { Section } from "@/components/ui/Section";

export const metadata: Metadata = pageMetadata({
  title: "Your class booking",
  description: "Your RAENG Fitness class booking after paying.",
  path: "/book/done",
  noindex: true,
});

/**
 * Where Square's payment page sends people back to after booking a class. It
 * only reads the booking's state from the database, which changes once
 * Square's verified webhook has recorded the payment: arriving here proves
 * nothing, so the page never says "booked" until the database does. While it
 * waits, it refreshes itself every few seconds. Shows the class and the state
 * only (the id in the address is random; no personal details are shown).
 */
export default async function BookDonePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const raw = (await searchParams).booking;
  const id = typeof raw === "string" && isUuid(raw) ? raw : null;
  const db = coachDb();
  const booking = id && db ? await classBookingStatus(db, id, publishedClasses()) : null;
  return (
    <Section labelledBy="done-heading">
      {booking?.status === "awaiting_payment" ? <meta httpEquiv="refresh" content="4" /> : null}
      <div className="max-w-xl" role="status">
        <Body booking={booking} />
      </div>
    </Section>
  );
}

function Body({ booking }: { booking: ClassBookingStatus | null }) {
  const heading = "mt-3 font-display text-h1 text-balance";
  const eyebrow = <p className="eyebrow">{booking?.when ? `Group class · ${booking.when}` : "Group class"}</p>;
  const bookAgain = (
    <Link href={CLASS_BOOK_PATH} className={buttonClasses("action", "mt-8 w-full px-6 sm:w-auto")}>
      Book a class
    </Link>
  );
  if (!booking) {
    return (
      <>
        {eyebrow}
        <h1 id="done-heading" className={heading}>
          We couldn&apos;t find that booking.
        </h1>
        <p className="mt-5 text-lede">If you&apos;ve paid, you&apos;ll get an email from us shortly.</p>
        {bookAgain}
      </>
    );
  }
  if (booking.status === "awaiting_payment") {
    return (
      <>
        {eyebrow}
        <h1 id="done-heading" className={heading}>
          Waiting for Square to confirm.
        </h1>
        <p className="mt-5 text-lede">This usually takes a few seconds. This page updates by itself.</p>
        {booking.payUrl ? (
          <p className="mt-6">
            Didn&apos;t finish paying?{" "}
            <a href={booking.payUrl} className="font-semibold underline underline-offset-4 hover:no-underline">
              Go back to Square to pay
            </a>
          </p>
        ) : null}
      </>
    );
  }
  if (booking.status === "needs_attention") {
    return (
      <>
        {eyebrow}
        <h1 id="done-heading" className={heading}>
          Payment received.
        </h1>
        <p className="mt-5 text-lede">Thanks. Your place couldn&apos;t be confirmed automatically (the class may have filled up), so Alex will email you to sort it out.</p>
      </>
    );
  }
  if (booking.status === "expired") {
    return (
      <>
        {eyebrow}
        <h1 id="done-heading" className={heading}>
          Your place is no longer held.
        </h1>
        <p className="mt-5 text-lede">The payment wasn&apos;t finished in time. If you did pay, you&apos;ll get an email from us. Otherwise, book again.</p>
        {bookAgain}
      </>
    );
  }
  if (booking.status === "cancelled") {
    return (
      <>
        {eyebrow}
        <h1 id="done-heading" className={heading}>
          This booking is cancelled.
        </h1>
        {bookAgain}
      </>
    );
  }
  return (
    <>
      {eyebrow}
      <h1 id="done-heading" className={heading}>
        You&apos;re booked.
      </h1>
      <p className="mt-5 text-lede">Your place is confirmed. We&apos;ve emailed you the details and a private link to cancel if you need to.</p>
      <p className="mt-4 text-muted">{onlineClassBooking.cancel}</p>
      <Link href="/" className="mt-8 inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:no-underline">
        Back to the homepage
      </Link>
    </>
  );
}
