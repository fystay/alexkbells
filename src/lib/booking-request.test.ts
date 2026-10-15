import { describe, expect, it } from "vitest";
import {
  MIN_FILL_MS,
  bookingDeliveryConfig,
  bookingEmail,
  isBookingFormEnabled,
  parseBookingRequest,
} from "./booking-request";

const NOW = 1_800_000_000_000;
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};
const valid = {
  session: "Monday 6:30 pm",
  experience: "new",
  name: "Sam Example",
  email: "Sam@Example.com",
  phone: "07700 900123",
  message: "First class!",
  consent: "yes",
  website: "",
  startedAt: String(NOW - 20_000),
  submissionId: "abc-123",
};

describe("parseBookingRequest", () => {
  it("accepts a complete request and normalises it", () => {
    const result = parseBookingRequest(form(valid), NOW);
    expect(result.kind).toBe("valid");
    if (result.kind === "valid") {
      expect(result.data.email).toBe("sam@example.com");
      expect(result.data.experience).toBe("new");
    }
  });

  it("allows phone and message to be blank", () => {
    expect(parseBookingRequest(form({ ...valid, phone: "", message: "" }), NOW).kind).toBe("valid");
  });

  it("reports each invalid field", () => {
    const result = parseBookingRequest(
      form({ ...valid, session: "", experience: "expert", name: "", email: "nope", phone: "abc", consent: "" }),
      NOW,
    );
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") {
      expect(Object.keys(result.errors).sort()).toEqual(
        ["consent", "email", "experience", "name", "phone", "session"].sort(),
      );
    }
  });

  it("enforces length limits", () => {
    const result = parseBookingRequest(form({ ...valid, name: "x".repeat(101), message: "y".repeat(1001) }), NOW);
    expect(result.kind === "invalid" && result.errors.name && result.errors.message).toBeTruthy();
  });

  it("treats a filled honeypot or an instant submission as spam", () => {
    expect(parseBookingRequest(form({ ...valid, website: "http://spam" }), NOW).kind).toBe("spam");
    expect(parseBookingRequest(form({ ...valid, startedAt: String(NOW - MIN_FILL_MS + 1) }), NOW).kind).toBe("spam");
  });

  it("still works without JavaScript (no timestamp)", () => {
    expect(parseBookingRequest(form({ ...valid, startedAt: "" }), NOW).kind).toBe("valid");
  });

  it("strips newlines from single-line fields (no header injection)", () => {
    const result = parseBookingRequest(form({ ...valid, name: "Sam\r\nBcc: evil@example.com" }), NOW);
    expect(result.kind === "valid" && result.data.name).toBe("Sam Bcc: evil@example.com");
  });
});

describe("bookingEmail", () => {
  it("is plain text, marked as a request, with every field", () => {
    const result = parseBookingRequest(form(valid), NOW);
    if (result.kind !== "valid") throw new Error("expected valid");
    const email = bookingEmail(result.data);
    expect(email.subject).toBe("Class booking request: Sam Example");
    expect(email.text).toContain("Class: Monday 6:30 pm");
    expect(email.text).toContain("Experience: New to kettlebells");
    expect(email.text).toContain("not a confirmed booking");
  });
});

describe("bookingDeliveryConfig", () => {
  const env = {
    RESEND_API_KEY: "re_test",
    BOOKING_NOTIFY_EMAIL: "alex@example.com",
    BOOKING_FROM_EMAIL: "Alex K Bells <bookings@example.com>",
  };

  it("is enabled only when every setting is present and valid", () => {
    expect(bookingDeliveryConfig(env)?.endpoint).toBe("https://api.resend.com/emails");
    expect(isBookingFormEnabled({ ...env, RESEND_API_KEY: "" })).toBe(false);
    expect(isBookingFormEnabled({ ...env, BOOKING_NOTIFY_EMAIL: "not-an-email" })).toBe(false);
    expect(isBookingFormEnabled({ ...env, BOOKING_FROM_EMAIL: "Alex <nope>" })).toBe(false);
    expect(isBookingFormEnabled({})).toBe(false);
  });

  it("only allows endpoint overrides that are https or localhost", () => {
    expect(bookingDeliveryConfig({ ...env, RESEND_API_URL: "http://localhost:3299/emails" })?.endpoint).toBe(
      "http://localhost:3299/emails",
    );
    expect(isBookingFormEnabled({ ...env, RESEND_API_URL: "http://evil.example/emails" })).toBe(false);
  });
});
