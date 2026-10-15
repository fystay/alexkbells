import { describe, expect, it, vi } from "vitest";
import { idempotencyKey, sendEmail } from "./send-email";

const config = { apiKey: "re_test", to: "alex@example.com", from: "bookings@example.com", endpoint: "https://api.resend.com/emails" };
const email = { subject: "S", text: "T", replyTo: "sam@example.com", idempotencyKey: "k" };

describe("sendEmail", () => {
  it("posts the documented Resend payload and reports success", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    expect(await sendEmail(config, email, fetchImpl as unknown as typeof fetch)).toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer re_test");
    expect(headers["Idempotency-Key"]).toBe("k");
    expect(JSON.parse(init.body as string)).toEqual({
      from: "bookings@example.com",
      to: ["alex@example.com"],
      reply_to: "sam@example.com",
      subject: "S",
      text: "T",
    });
  });

  it("reports provider errors and network failures as failures", async () => {
    const rejected = vi.fn(async () => new Response("{}", { status: 422 }));
    expect(await sendEmail(config, email, rejected as unknown as typeof fetch)).toEqual({ ok: false, status: 422 });
    const offline = vi.fn(async () => {
      throw new TypeError("network");
    });
    expect(await sendEmail(config, email, offline as unknown as typeof fetch)).toEqual({ ok: false, status: null });
  });
});

describe("idempotencyKey", () => {
  it("is stable for identical input and differs otherwise", async () => {
    const a = await idempotencyKey(["id", "sam@example.com"]);
    expect(a).toBe(await idempotencyKey(["id", "sam@example.com"]));
    expect(a).not.toBe(await idempotencyKey(["id", "other@example.com"]));
    expect(a.length).toBeLessThanOrEqual(256);
  });
});
