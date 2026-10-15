/**
 * Field rules shared by the booking and online coaching journeys. Used in the
 * browser for instant feedback and again on the server, which is the
 * authority. Keep this module free of server configuration: it ships to the
 * browser.
 */

const EMAIL_RE = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[^\s@<>()[\],;:"]{2,}$/;
const PHONE_RE = /^[0-9+()\-.\s]{7,30}$/;
const INSTAGRAM_RE = /^@?[A-Za-z0-9._]{1,30}$/;

export const LIMITS = { name: 100, email: 254, phone: 30, message: 1000, short: 200 } as const;

export function isValidEmail(value: string): boolean {
  return value.length <= LIMITS.email && EMAIL_RE.test(value);
}

/** Strips control characters (incl. newlines) and squeezes spaces for single-line fields. */
export function singleLine(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

export function nameError(value: string): string | undefined {
  if (!value) return "Enter your name.";
  if (value.length > LIMITS.name) return "Keep your name under 100 characters.";
  return undefined;
}

export function emailError(value: string): string | undefined {
  if (!value) return "Enter your email address so Alex can reply.";
  if (!isValidEmail(value)) return "Enter a valid email address, like name@example.com.";
  return undefined;
}

/** Phone is optional unless `required`. */
export function phoneError(value: string, required = false): string | undefined {
  if (!value) return required ? "Enter your phone number." : undefined;
  if (!PHONE_RE.test(value)) return required ? "Enter a valid phone number." : "Enter a valid phone number, or leave it blank.";
  return undefined;
}

export function instagramError(value: string): string | undefined {
  if (!value) return "Enter your Instagram username.";
  if (!INSTAGRAM_RE.test(value)) return "Enter a valid Instagram username, like @yourname.";
  return undefined;
}

export function messageError(value: string): string | undefined {
  return value.length > LIMITS.message ? "Keep your message under 1,000 characters." : undefined;
}
