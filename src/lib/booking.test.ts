import { describe, expect, it } from "vitest";
import { BOOK_LABEL, ENQUIRY_HREF, bookingConfigWarning, getClassBookingAction, parseBookingUrl } from "./booking";

const env = (BOOKING_URL?: string) => ({ BOOKING_URL });

describe("parseBookingUrl", () => {
  it("accepts https URLs only", () => {
    expect(parseBookingUrl("https://example.setmore.com/")?.hostname).toBe("example.setmore.com");
    expect(parseBookingUrl("http://example.com")).toBeNull();
    expect(parseBookingUrl("javascript:alert(1)")).toBeNull();
    expect(parseBookingUrl("not a url")).toBeNull();
    expect(parseBookingUrl("")).toBeNull();
    expect(parseBookingUrl(undefined)).toBeNull();
  });
});

describe("getClassBookingAction", () => {
  it("falls back to an enquiry when no booking URL is configured", () => {
    const action = getClassBookingAction(env());
    expect(action).toMatchObject({ kind: "enquiry", href: ENQUIRY_HREF, external: false });
    expect(action.label).not.toMatch(/book/i);
  });

  it("falls back to an enquiry for an invalid URL", () => {
    expect(getClassBookingAction(env("http://insecure.example")).kind).toBe("enquiry");
  });

  it("links to the external provider when configured", () => {
    const action = getClassBookingAction(env("https://booking.example.com/classes"));
    expect(action).toMatchObject({
      kind: "booking",
      label: "Book your class",
      href: "https://booking.example.com/classes",
      external: true,
    });
    expect(BOOK_LABEL).toBe("Book your class");
  });
});

const formEnv = {
  RESEND_API_KEY: "re_test",
  BOOKING_NOTIFY_EMAIL: "alex@example.com",
  BOOKING_FROM_EMAIL: "bookings@example.com",
};

describe("booking routes", () => {
  it("uses the on-site form when delivery is configured and no external page is set", () => {
    expect(getClassBookingAction(formEnv)).toMatchObject({ kind: "booking", label: "Book your class", href: "/book", external: false });
  });

  it("prefers an external booking page when both exist", () => {
    expect(getClassBookingAction({ ...formEnv, BOOKING_URL: "https://booking.example.com" }).href).toBe("https://booking.example.com/");
  });
});

describe("bookingConfigWarning", () => {
  it("flags a missing or invalid booking URL on production only", () => {
    expect(bookingConfigWarning({ VERCEL_ENV: "production" })).toMatch(/No booking route is configured/);
    expect(bookingConfigWarning({ VERCEL_ENV: "production", BOOKING_URL: "http://x.example" })).toMatch(/not a valid https URL/);
    expect(bookingConfigWarning({ VERCEL_ENV: "production", BOOKING_URL: "https://x.example/book" })).toBeNull();
    expect(bookingConfigWarning({ VERCEL_ENV: "preview" })).toBeNull();
    expect(bookingConfigWarning({ VERCEL_ENV: "production", ...formEnv })).toBeNull();
    expect(bookingConfigWarning({})).toBeNull();
  });
});
