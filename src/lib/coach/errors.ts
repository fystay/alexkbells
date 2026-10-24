import type { DbError } from "./db";
import { RULE_MESSAGES } from "./labels";

const CONSTRAINT_MESSAGES: Record<string, string> = {
  akb_clients_email_key: "A client with this email address already exists. Open their record instead.",
  akb_pt_sessions_no_overlap: "That time overlaps another one-to-one session.",
  akb_class_attendance_class_session_id_client_id_key: "They're already on the list for that class.",
  akb_charges_subscription_id_period_start_key: "This period has already been charged.",
  akb_payment_allocations_payment_id_charge_id_key: "That payment is already set against this charge.",
  akb_memberships_one_current: "This client already has a current membership. Open it instead.",
};

/** A message the coach can act on. Nothing in it comes from the database text. */
export function dbMessage(error: DbError): string {
  switch (error.kind) {
    case "rule":
      return RULE_MESSAGES[error.rule ?? ""] ?? "That change isn't allowed.";
    case "conflict":
      if (error.code === "23503") return "This record is linked to other records, so it can't be removed.";
      return CONSTRAINT_MESSAGES[error.constraint ?? ""] ?? "That clashes with an existing record.";
    case "not-set-up":
      return "The portal's database tables aren't set up yet. Apply the Supabase migration (see DEPLOYMENT.md).";
    case "invalid":
      return "Something in the form wasn't accepted. Check it and try again.";
    default:
      return "The database isn't responding, so nothing was saved. Try again in a moment.";
  }
}

/** For pages: what to show when loading failed. */
export function loadMessage(error: DbError): string {
  if (error.kind === "not-set-up") return dbMessage(error);
  return "This couldn't be loaded because the database isn't responding. Refresh to try again.";
}
