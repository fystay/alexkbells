"use server";

import { bookingMode } from "@/lib/booking";
import { BOOKING_EXPERIENCE, labelFor } from "@/lib/booking-options";
import { describePlan, isBookingFormEnabled, type FormState } from "@/lib/booking-request";
import { publishedClasses } from "@/lib/class-sessions";
import { fullClasses, fullKey } from "@/lib/class-capacity";
import { londonToday } from "@/lib/coach/time";
import { deliverRequest } from "@/lib/deliver-request";
import { MEMBERSHIP_SERVICE, membershipEmail, membershipSummary, parseMembershipRequest, type MembershipField } from "@/lib/membership-request";
import { idempotencyKey } from "@/lib/send-email";

/**
 * Validates a membership join request on the server and gets it to Alex
 * (stored for the coach area and/or emailed), like a booking request.
 * The stored request carries the plan, so "Start this membership" works on
 * it in the coach area, and the first class (if chosen) so it can be
 * confirmed as a place. Reports success only once a route accepted it.
 * Nothing is charged. Never runs on demonstration previews.
 */
export async function submitMembershipRequest(
  _previous: FormState<MembershipField>,
  formData: FormData,
): Promise<FormState<MembershipField>> {
  if (!isBookingFormEnabled() || bookingMode() !== "request") {
    return {
      status: "error",
      message: "Membership requests can't be sent online right now. Please message Alex on Instagram to join.",
      errors: {},
    };
  }

  const parsed = parseMembershipRequest(formData, { classes: publishedClasses() });
  if (parsed.kind === "spam" || parsed.kind === "demo") {
    // Never pretend a request was sent; a real person can simply resend.
    return { status: "error", message: "We couldn't send your request. Please wait a few seconds and send it again.", errors: {} };
  }
  if (parsed.kind === "invalid") {
    return { status: "error", message: "Please check the highlighted answers.", errors: parsed.errors };
  }

  const { data } = parsed;
  // Never trust the calendar: a first class that is full or cancelled can't be requested.
  const slot = publishedClasses().find((c) => c.label === data.session);
  if (data.classDate && slot) {
    const full = await fullClasses(londonToday());
    const key = fullKey(slot.id, data.classDate);
    if (full.known && full.keys.includes(key)) {
      return { status: "error", message: "Please check the highlighted answers.", errors: { when: "That class is now full. Choose another date, or book your first class later." } };
    }
    if (full.known && full.cancelled.includes(key)) {
      return { status: "error", message: "Please check the highlighted answers.", errors: { when: "That class has been cancelled. Choose another date, or book your first class later." } };
    }
  }

  const agreedAt = new Date().toISOString();
  const key = await idempotencyKey([data.submissionId, "membership", data.plan, data.email, data.name, data.session, data.classDate, data.message]);
  const details: Record<string, string> = {
    experience: labelFor(BOOKING_EXPERIENCE, data.experience),
    // The plan id lets the coach area start this membership from the request.
    plan: data.plan,
    membership: describePlan(data.plan),
    terms: `Agreed to the membership terms and class cancellation policy (${agreedAt})`,
  };
  if (data.classDate && slot) {
    details.classDate = data.classDate;
    details.classSlot = slot.id;
  }

  const delivered = await deliverRequest(
    {
      idempotencyKey: key,
      kind: "booking",
      service: MEMBERSHIP_SERVICE,
      summary: membershipSummary(data),
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
      details,
    },
    { ...membershipEmail(data, agreedAt), replyTo: data.email },
  );

  if (!delivered) {
    return { status: "error", message: "Sorry, your request couldn't be sent. Please try again, or message Alex on Instagram.", errors: {} };
  }
  return { status: "success", message: data.email, errors: {} };
}
