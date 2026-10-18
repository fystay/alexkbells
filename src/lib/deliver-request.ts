import { bookingDeliveryConfig } from "./booking-request";
import { requestStoreConfig, saveRequest, type StoredRequest } from "./request-store";
import { sendEmail, type OutgoingEmail } from "./send-email";

/**
 * Gets a request to Alex by every configured route: stored in Supabase (shown
 * in the coach area) and/or emailed via Resend. Succeeds when at least one
 * route accepted it, so the visitor is never told it was sent when it wasn't.
 * Logs contain no personal data.
 */
export async function deliverRequest(stored: StoredRequest, email: Omit<OutgoingEmail, "idempotencyKey">): Promise<boolean> {
  const store = requestStoreConfig();
  const mail = bookingDeliveryConfig();
  const [saved, sent] = await Promise.all([
    store ? saveRequest(store, stored) : Promise.resolve(null),
    mail ? sendEmail(mail, { ...email, idempotencyKey: stored.idempotencyKey }).then((r) => r.ok) : Promise.resolve(null),
  ]);
  if (saved === false) console.error(`Storing a request (${stored.kind}) failed`);
  if (sent === false) console.error(`Emailing a request (${stored.kind}) failed`);
  return saved === true || sent === true;
}
