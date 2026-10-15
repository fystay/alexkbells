import type { Env } from "./env";

/**
 * Booking requests from the /book form: validation, spam checks, the email
 * Alex receives, and whether the form is configured. Pure functions so they
 * can be unit-tested without a server.
 *
 * A request is not a confirmed booking: there is no capacity system, so the
 * site says Alex confirms each place, and only reports success once the
 * email has been accepted by the provider.
 */

export const EXPERIENCE_OPTIONS = [
  { value: "new", label: "New to kettlebells" },
  { value: "some", label: "Some kettlebell experience" },
  { value: "regular", label: "I train with kettlebells regularly" },
] as const;
export type Experience = (typeof EXPERIENCE_OPTIONS)[number]["value"];

export interface BookingRequest {
  session: string;
  experience: Experience;
  name: string;
  email: string;
  phone: string;
  message: string;
  submissionId: string;
}

export type BookingField = "session" | "experience" | "name" | "email" | "phone" | "message" | "consent";
export type FieldErrors = Partial<Record<BookingField, string>>;

export type ParseResult =
  | { kind: "valid"; data: BookingRequest }
  | { kind: "invalid"; errors: FieldErrors }
  | { kind: "spam" };

/** Anything with FormData's `get` — keeps the parser testable. */
interface FieldSource {
  get(name: string): FormDataEntryValue | null;
}

export const MIN_FILL_MS = 3000;
const EMAIL_RE = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[^\s@<>()[\],;:"]{2,}$/;
const PHONE_RE = /^[0-9+()\-.\s]{7,30}$/;

function text(source: FieldSource, name: string): string {
  const value = source.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Strips control characters (incl. newlines) for single-line fields. */
function singleLine(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_RE.test(value);
}

export function parseBookingRequest(source: FieldSource, now: number = Date.now()): ParseResult {
  // Spam checks first: a filled honeypot, or a form submitted faster than a
  // person could fill it in. The timestamp is set by the browser after load;
  // without JavaScript it is absent, and only the honeypot applies.
  if (text(source, "website") !== "") return { kind: "spam" };
  const startedAt = Number(text(source, "startedAt"));
  if (Number.isFinite(startedAt) && startedAt > 0 && now - startedAt < MIN_FILL_MS) {
    return { kind: "spam" };
  }

  const errors: FieldErrors = {};
  const session = singleLine(text(source, "session"));
  const experience = text(source, "experience");
  const name = singleLine(text(source, "name"));
  const email = singleLine(text(source, "email")).toLowerCase();
  const phone = singleLine(text(source, "phone"));
  const message = text(source, "message").replace(/\r\n?/g, "\n");
  const consent = text(source, "consent");
  const submissionId = singleLine(text(source, "submissionId")).slice(0, 64);

  if (!session) errors.session = "Choose a class, or tell us when you would like to come.";
  else if (session.length > 80) errors.session = "Keep this under 80 characters.";

  if (!EXPERIENCE_OPTIONS.some((o) => o.value === experience)) {
    errors.experience = "Choose the option that best describes you.";
  }

  if (!name) errors.name = "Enter your name.";
  else if (name.length > 100) errors.name = "Keep your name under 100 characters.";

  if (!email) errors.email = "Enter your email address so Alex can reply.";
  else if (!isValidEmail(email)) errors.email = "Enter a valid email address, like name@example.com.";

  if (phone && !PHONE_RE.test(phone)) errors.phone = "Enter a valid phone number, or leave it blank.";

  if (message.length > 1000) errors.message = "Keep your message under 1,000 characters.";

  if (consent !== "yes") errors.consent = "Tick the box so Alex can use your details to reply.";

  if (Object.keys(errors).length > 0) return { kind: "invalid", errors };
  return {
    kind: "valid",
    data: { session, experience: experience as Experience, name, email, phone, message, submissionId },
  };
}

/** The email Alex receives. Plain text: nothing from the visitor is rendered as HTML. */
export function bookingEmail(data: BookingRequest): { subject: string; text: string } {
  const experience = EXPERIENCE_OPTIONS.find((o) => o.value === data.experience)?.label ?? data.experience;
  const lines = [
    "New class booking request from the website.",
    "",
    `Class: ${data.session}`,
    `Experience: ${experience}`,
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone || "not given"}`,
    "",
    "Message:",
    data.message || "(none)",
    "",
    "Reply to this email to answer them directly. This is a request, not a confirmed booking.",
  ];
  return { subject: `Class booking request: ${data.name}`.slice(0, 150), text: lines.join("\n") };
}

export interface BookingDeliveryConfig {
  apiKey: string;
  to: string;
  from: string;
  endpoint: string;
}

const DEFAULT_ENDPOINT = "https://api.resend.com/emails";

/** Accepts `bookings@example.com` or `Alex K Bells <bookings@example.com>`. */
function isValidFrom(value: string): boolean {
  const match = /^(?:[^<>\n]{1,80}<([^<>\s]+)>|([^<>\s]+))$/.exec(value.trim());
  return Boolean(match && isValidEmail(match[1] ?? match[2]));
}

function parseEndpoint(raw: string | undefined): string | null {
  if (!raw) return DEFAULT_ENDPOINT;
  try {
    const url = new URL(raw);
    // Overrides exist for local testing only: https anywhere, http only on localhost.
    if (url.protocol === "https:" || (url.protocol === "http:" && url.hostname === "localhost")) {
      return url.toString();
    }
  } catch {
    // fall through
  }
  return null;
}

/** Null unless every setting needed to deliver requests is present and valid. */
export function bookingDeliveryConfig(env: Env = process.env): BookingDeliveryConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  const to = env.BOOKING_NOTIFY_EMAIL?.trim();
  const from = env.BOOKING_FROM_EMAIL?.trim();
  const endpoint = parseEndpoint(env.RESEND_API_URL?.trim());
  if (!apiKey || !to || !from || !endpoint) return null;
  if (!isValidEmail(to) || !isValidFrom(from)) return null;
  return { apiKey, to, from, endpoint };
}

export function isBookingFormEnabled(env: Env = process.env): boolean {
  return bookingDeliveryConfig(env) !== null;
}

/** State shared between the /book server action and the form (useActionState). */
export interface BookingFormState {
  status: "idle" | "error" | "success";
  message: string;
  errors: FieldErrors;
  /** Echoed back so a failed submission keeps what the visitor typed. */
  values: Partial<Record<Exclude<BookingField, "consent">, string>>;
}

export const initialBookingFormState: BookingFormState = { status: "idle", message: "", errors: {}, values: {} };
