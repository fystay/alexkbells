import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { BookingPage } from "@/components/booking/BookingPage";
import { onlineJoinEnabled } from "@/lib/membership-checkout";

export const metadata: Metadata = pageMetadata({
  title: "Book a Group Class",
  description: onlineJoinEnabled()
    ? "Book a coached group kettlebell class at Media House, Cumbernauld, and pay online."
    : "Book a coached group kettlebell class at Media House, Cumbernauld. Alex confirms every booking personally.",
  path: "/book/group-class",
});

export default function BookGroupClassPage() {
  return <BookingPage title="Book a group class" initialService="group-class" />;
}
