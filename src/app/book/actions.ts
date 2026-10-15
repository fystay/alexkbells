"use server";

import { bookingMode } from "@/lib/booking";
import {
  bookingDeliveryConfig,
  bookingEmail,
  parseBookingRequest,
  type BookingField,
  type FormState,
} from "@/lib/booking-request";
import { publishedSessionLabels } from "@/lib/class-sessions";
import { idempotencyKey, sendEmail } from "@/lib/send-email";

/**
 * Validates a booking request on the server and emails it to Alex.
 * Reports success only when the email provider has accepted the message.
 * Never runs for demonstration availability. Nothing is stored.
 */
export async function submitBookingRequest(
  _previous: FormState<BookingField>,
  formData: FormData,
): Promise<FormState<BookingField>> {
  const config = bookingDeliveryConfig();
  if (!config || bookingMode() !== "request") {
    return {
      status: "error",
      message: "Online booking requests aren't available right now. Please message Alex on Instagram to book.",
      errors: {},
    };
  }

  const parsed = parseBookingRequest(formData, { sessions: publishedSessionLabels() });
  if (parsed.kind === "demo") {
    return { status: "error", message: "Demonstration times can't be booked.", errors: {} };
  }
  if (parsed.kind === "spam") {
    // Never pretend a request was sent; a real person can simply resend.
    return { status: "error", message: "We couldn't send your request. Please wait a few seconds and send it again.", errors: {} };
  }
  if (parsed.kind === "invalid") {
    return { status: "error", message: "Please check the highlighted fields.", errors: parsed.errors };
  }

  const { data } = parsed;
  const result = await sendEmail(config, {
    ...bookingEmail(data),
    replyTo: data.email,
    idempotencyKey: await idempotencyKey([
      data.submissionId,
      data.service,
      data.email,
      data.name,
      data.session,
      data.days.join(","),
      data.times.join(","),
      data.message,
    ]),
  });

  if (!result.ok) {
    // No personal data in logs.
    console.error(`Booking request email failed (status ${result.status ?? "network error"})`);
    return {
      status: "error",
      message: "Sorry, your request couldn't be sent. Please try again, or message Alex on Instagram.",
      errors: {},
    };
  }

  return { status: "success", message: data.email, errors: {} };
}
