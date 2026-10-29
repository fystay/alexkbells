import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { BookingPage } from "@/components/booking/BookingPage";

export const metadata: Metadata = pageMetadata({
  title: "Book a Session",
  description:
    "Book a group kettlebell class or a one-to-one session in Cumbernauld. Alex confirms every booking personally.",
  path: "/book",
});

export default function BookPage() {
  return <BookingPage title="Book your session" />;
}
