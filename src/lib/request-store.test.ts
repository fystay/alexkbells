import { describe, expect, it, vi } from "vitest";
import { listRequests, saveRequest, type StoredRequest } from "./request-store";

const config = { url: "https://ref.supabase.co", secretKey: "sb_secret_x" };
const request: StoredRequest = {
  idempotencyKey: "booking-request/abc",
  kind: "booking",
  service: "Group class",
  summary: "Saturday 24 October 2026, 10:15 am",
  name: "Sam",
  email: "sam@example.com",
  phone: "",
  message: "",
  details: { experience: "New to kettlebells" },
};

describe("saveRequest", () => {
  it("inserts once per idempotency key with the secret key", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 201 }));
    expect(await saveRequest(config, request, fetchImpl)).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://ref.supabase.co/rest/v1/akb_booking_requests?on_conflict=idempotency_key");
    expect(init?.headers).toMatchObject({ apikey: "sb_secret_x", Prefer: "resolution=ignore-duplicates,return=minimal" });
    expect(JSON.parse(String(init?.body))).toMatchObject({ idempotency_key: "booking-request/abc", kind: "booking", summary: request.summary });
  });

  it("reports failures", async () => {
    expect(await saveRequest(config, request, vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 500 })))).toBe(false);
    expect(await saveRequest(config, request, vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline")))).toBe(false);
  });
});

describe("listRequests", () => {
  it("returns rows newest first, ignoring malformed ones", async () => {
    const rows = [
      { id: "1", created_at: "2026-10-17T10:00:00Z", kind: "booking", service: "Group class", summary: "s", name: "Sam", email: "e", phone: null, message: "", details: { experience: "New" } },
      { nope: true },
    ];
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(rows), { status: 200 }));
    const result = await listRequests(config, 50, fetchImpl);
    expect(result).toEqual([
      { id: "1", createdAt: "2026-10-17T10:00:00Z", kind: "booking", service: "Group class", summary: "s", name: "Sam", email: "e", phone: "", message: "", details: { experience: "New" } },
    ]);
    expect(String(fetchImpl.mock.calls[0][0])).toContain("order=created_at.desc&limit=50");
    expect(await listRequests(config, 50, vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 401 })))).toBeNull();
  });
});
