import { getService } from "./services";

/**
 * Membership terms and the class cancellation policy, supplied by the owner
 * on 2026-10-21 and published as written. Change the wording here only on
 * the owner's say-so.
 */
export const membershipTerms = [
  "Class credits can be used across any available Monday, Wednesday or Saturday class.",
  "Memberships renew automatically every four weeks, with new credits allocated on renewal.",
  "Unused credits expire at the end of each membership period and do not roll over.",
  `Additional classes can be purchased for £${getService("group-classes").prices[0].amountGbp}, subject to availability.`,
  "All bookings and cancellations are subject to the class cancellation policy.",
] as const;

export const cancellationPolicy = {
  intro:
    "We understand that plans can change. To ensure fairness to all members and allow others the opportunity to book available spaces, the following cancellation policy applies.",
  cancellations: [
    {
      when: "24 hours or more before class",
      outcome:
        "Your class credit will be returned to your account, allowing you to book another session within your current membership period.",
    },
    { when: "Less than 24 hours before class", outcome: "Your class credit will be forfeited." },
    {
      when: "No-shows",
      outcome: "Failure to attend a booked class without cancelling will result in the credit being forfeited.",
    },
  ],
  credits:
    "Returned credits must be used within your current four-week membership period. Unused credits expire at the end of the membership period and cannot be carried over.",
  coachCancellations:
    "If a class is cancelled by the coach, your credit will be returned to your account or an alternative session will be offered.",
  agreement: "By booking a class, you agree to these cancellation terms.",
  thanks: "Thank you for your understanding and cooperation.",
} as const;

/**
 * The four conditions a customer must see before committing to a membership,
 * in short form (the full wording is above and on /memberships).
 */
export const membershipKeyFacts = [
  { title: "Renews automatically", body: "Every four weeks, with new credits each time." },
  { title: "Credits expire", body: "Unused credits don't roll over to the next period." },
  { title: "Cancel 24 hours ahead", body: "Cancel 24 hours or more before class and your credit is returned." },
  { title: "Late or no-show", body: "Under 24 hours' notice, or not turning up, forfeits the credit." },
] as const;
