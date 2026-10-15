import type { FaqItem } from "./types";
import { site } from "./site";
import { timetable } from "./classes";
import { describeTimetable } from "@/lib/schedule";

/**
 * Only questions with reliable answers. Unresolved policy questions
 * (cancellations, equipment, duration, capacity) live in CONTENT.md until
 * Alex supplies answers.
 */
export const faq: FaqItem[] = [
  {
    id: "where",
    question: "Where are classes held?",
    answer: `At ${site.location.venue}, ${site.location.street}, ${site.location.town}, ${site.location.postcode}.`,
    status: "confirmed",
  },
  {
    id: "when",
    question: "When are the group classes?",
    answer: `${describeTimetable(timetable.sessions)}.`,
    // Derived from classes.ts, so it inherits the timetable's status.
    status: timetable.status,
  },
  {
    id: "online",
    question: "Can I be coached if I don't live near Cumbernauld?",
    answer:
      "Yes. Online coaching gives you personalised programming, support and progression wherever you train.",
    status: "confirmed",
  },
  {
    id: "one-to-one",
    question: "Do you offer one-to-one sessions?",
    answer:
      "Yes. One-to-one coaching is face to face and tailored to you as an individual. Get in touch to discuss what you're looking for.",
    status: "confirmed",
  },
  {
    id: "contact",
    question: "What's the best way to get in touch?",
    answer: `Send a message on Instagram (${site.social.instagram.handle}).`,
    status: "confirmed",
  },
];
