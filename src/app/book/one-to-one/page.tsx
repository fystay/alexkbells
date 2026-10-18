import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { BookingPage } from "@/components/booking/BookingPage";

export const metadata: Metadata = pageMetadata({
  title: "Book a One-to-One Session",
  description: "Book an individual kettlebell coaching session with Alex at Media House, Cumbernauld.",
  path: "/book/one-to-one",
});

export default function BookOneToOnePage() {
  return <BookingPage title="Book a one-to-one" initialService="one-to-one" />;
}
