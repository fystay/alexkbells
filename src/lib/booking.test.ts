import { describe, expect, it } from "vitest";
import { ENQUIRY_HREF, getClassBookingAction, parseBookingUrl } from "./booking";

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
      href: "https://booking.example.com/classes",
      external: true,
    });
  });
});
