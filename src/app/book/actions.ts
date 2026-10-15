"use server";

import {
  bookingDeliveryConfig,
  bookingEmail,
  parseBookingRequest,
  type BookingFormState,
} from "@/lib/booking-request";
import { idempotencyKey, sendEmail } from "@/lib/send-email";

const FIELDS = ["session", "experience", "name", "email", "phone", "message"] as const;

/**
 * Validates a booking request on the server and emails it to Alex.
 * Reports success only when the email provider has accepted the message.
 * Nothing is stored on the website.
 */
export async function submitBookingRequest(
  _previous: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const values: BookingFormState["values"] = {};
  for (const field of FIELDS) {
    const value = formData.get(field);
    if (typeof value === "string") values[field] = value.slice(0, 1000);
  }

  const config = bookingDeliveryConfig();
  if (!config) {
    return {
      status: "error",
      message: "Online booking requests aren't available right now. Please message Alex on Instagram to book.",
      errors: {},
      values,
    };
  }

  const parsed = parseBookingRequest(formData);
  if (parsed.kind === "spam") {
    // Never pretend a request was sent; a real person can simply resend.
    return {
      status: "error",
      message: "We couldn't send your request. Please wait a few seconds and send it again.",
      errors: {},
      values,
    };
  }
  if (parsed.kind === "invalid") {
    return { status: "error", message: "Please check the highlighted fields.", errors: parsed.errors, values };
  }

  const { data } = parsed;
  const email = bookingEmail(data);
  const result = await sendEmail(config, {
    ...email,
    replyTo: data.email,
    idempotencyKey: await idempotencyKey([data.submissionId, data.email, data.name, data.session, data.message]),
  });

  if (!result.ok) {
    // No personal data in logs.
    console.error(`Booking request email failed (status ${result.status ?? "network error"})`);
    return {
      status: "error",
      message: "Sorry, your request couldn't be sent. Please try again, or message Alex on Instagram.",
      errors: {},
      values,
    };
  }

  return {
    status: "success",
    message: `Thanks, ${data.name}. Your request has been sent to Alex, who will reply to ${data.email} to confirm your place.`,
    errors: {},
    values: {},
  };
}
