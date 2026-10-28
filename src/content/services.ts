import type { Service } from "./types";

/**
 * Coaching offers. Descriptions use only previously published wording.
 * Prices confirmed by the project owner on 2026-10-15 (the figures from the
 * original brief); the group class price (£10 per person) on 2026-10-17, raised to £12 per class by the owner on 2026-10-21 (memberships brief).
 */
export const services: Service[] = [
  {
    id: "group-classes",
    name: "Group classes",
    shortName: "Classes",
    href: "/classes",
    summary:
      "Coached group kettlebell sessions at Media House in Cumbernauld.",
    points: [],
    prices: [
      {
        status: "confirmed",
        label: "Per class",
        amountGbp: 12,
        unit: "per person",
      },
    ],
  },
  {
    id: "one-to-one",
    name: "1:1 coaching",
    shortName: "1:1",
    href: "/coaching",
    summary:
      "Face-to-face kettlebell coaching, tailored to you as an individual.",
    points: [
      "Face-to-face sessions with Alex",
      "Coaching tailored to the individual",
    ],
    prices: [
      {
        status: "confirmed",
        label: "Single session",
        prefix: "From",
        amountGbp: 35,
        unit: "per session",
        sessions: 1,
      },
      {
        status: "confirmed",
        label: "Four sessions",
        amountGbp: 130,
        unit: "per month",
        sessions: 4,
      },
    ],
  },
  {
    id: "online-coaching",
    name: "Online coaching",
    shortName: "Online",
    href: "/online-coaching",
    summary:
      "Personalised kettlebell programming with ongoing support and progression, wherever you train.",
    points: ["Personalised programming", "Ongoing support", "Progression"],
    prices: [
      {
        status: "confirmed",
        label: "Monthly",
        amountGbp: 79,
        unit: "per month",
      },
    ],
  },
];

export function getService(id: Service["id"]): Service {
  const service = services.find((s) => s.id === id);
  if (!service) throw new Error(`Unknown service: ${id}`);
  return service;
}
