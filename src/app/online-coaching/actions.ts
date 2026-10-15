"use server";

import { onlineEnquiryMode } from "@/lib/booking";
import { bookingDeliveryConfig, type FormState } from "@/lib/booking-request";
import { onlineEnquiryEmail, parseOnlineEnquiry, type OnlineField } from "@/lib/online-enquiry";
import { idempotencyKey, sendEmail } from "@/lib/send-email";

/** Validates an online coaching enquiry and emails it to Alex. Nothing is stored. */
export async function submitOnlineEnquiry(
  _previous: FormState<OnlineField>,
  formData: FormData,
): Promise<FormState<OnlineField>> {
  const config = bookingDeliveryConfig();
  if (!config || onlineEnquiryMode() !== "send") {
    return {
      status: "error",
      message: "Online enquiries aren't available right now. Please message Alex on Instagram.",
      errors: {},
    };
  }

  const parsed = parseOnlineEnquiry(formData);
  if (parsed.kind === "spam" || parsed.kind === "demo") {
    return { status: "error", message: "We couldn't send your enquiry. Please wait a few seconds and send it again.", errors: {} };
  }
  if (parsed.kind === "invalid") {
    return { status: "error", message: "Please check the highlighted answers.", errors: parsed.errors };
  }

  const { data } = parsed;
  const result = await sendEmail(config, {
    ...onlineEnquiryEmail(data),
    replyTo: data.email,
    idempotencyKey: await idempotencyKey([data.submissionId, "online", data.email, data.name, data.goal, data.message]),
  });

  if (!result.ok) {
    console.error(`Online enquiry email failed (status ${result.status ?? "network error"})`);
    return {
      status: "error",
      message: "Sorry, your enquiry couldn't be sent. Please try again, or message Alex on Instagram.",
      errors: {},
    };
  }

  return { status: "success", message: data.email, errors: {} };
}
