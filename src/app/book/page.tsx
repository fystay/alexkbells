import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { BookingPage } from "@/components/booking/BookingPage";

export const metadata: Metadata = pageMetadata({
  title: "Book a Session",
  description:
    "Book a group kettlebell class or a one-to-one session at Media House, Cumbernauld. Alex confirms every booking personally.",
  path: "/book",
  // Not linked from the site: bookings are arranged via /contact.
  noindex: true,
});

export default function BookPage() {
  return <BookingPage title="Book your session" />;
}
