import { describe, expect, it } from "vitest";
import { collect, rpc, select, type Db } from "./db";
import { dbMessage } from "./errors";
import { formatPence, parsePounds, penceToInput } from "./money";
import { expectedMonthly, monthlyNet, outstanding, packageSales, paymentState, periodRange, receivedIn } from "./revenue";
import { addMonths, endOfMonth, formatDateTime, londonToUtc, londonToday, monthsBetween, startOfWeek, toLondon } from "./time";
import type { Payment, Refund } from "./types";

type P = Pick<Payment, "id" | "service" | "amount_pence" | "paid_on" | "status">;
type R = Pick<Refund, "payment_id" | "amount_pence" | "refunded_on">;

const payments: P[] = [
  { id: "a", service: "group", amount_pence: 1000, paid_on: "2026-10-01", status: "received" },
  { id: "b", service: "pt", amount_pence: 3500, paid_on: "2026-10-15", status: "received" },
  { id: "c", service: "online", amount_pence: 7900, paid_on: "2026-10-31", status: "received" },
  { id: "d", service: "group", amount_pence: 1000, paid_on: "2026-10-16", status: "failed" },
  { id: "e", service: "group", amount_pence: 1000, paid_on: "2026-10-17", status: "void" },
  { id: "f", service: "pt", amount_pence: 13000, paid_on: "2026-09-20", status: "received" },
];
const refunds: R[] = [
  { payment_id: "f", amount_pence: 3000, refunded_on: "2026-10-02" }, // September payment refunded in October
  { payment_id: "b", amount_pence: 500, refunded_on: "2026-11-01" },
];

describe("revenue definitions", () => {
  it("counts received payments in the period, less refunds in the period, by service", () => {
    const oct = receivedIn(payments, refunds, { from: "2026-10-01", to: "2026-10-31" });
    expect(oct.total).toEqual({ received: 1000 + 3500 + 7900, refunds: 3000, net: 12400 - 3000 });
    expect(oct.byService.group).toEqual({ received: 1000, refunds: 0, net: 1000 });
    // The refund follows its payment's service even though the payment was in September.
    expect(oct.byService.pt).toEqual({ received: 3500, refunds: 3000, net: 500 });
    expect(oct.byService.online.net).toBe(7900);
    // Failed and void payments never count.
    expect(receivedIn(payments, [], { from: "2026-10-16", to: "2026-10-17" }).total.received).toBe(0);
  });

  it("filters by service and is inclusive of both ends", () => {
    expect(receivedIn(payments, refunds, { from: "2026-10-01", to: "2026-10-01" }, "group").total.net).toBe(1000);
    expect(receivedIn(payments, refunds, { from: "2026-10-01", to: "2026-10-31" }, "pt").total).toEqual({ received: 3500, refunds: 3000, net: 500 });
  });

  it("builds a monthly series", () => {
    const series = monthlyNet(payments, refunds, ["2026-09", "2026-10", "2026-11"]);
    expect(series.map((m) => m.net)).toEqual([13000, 9400, -500]);
    expect(monthlyNet(payments, refunds, ["2026-10"], "online")[0].byService).toEqual({ group: 0, pt: 0, online: 7900, other: 0 });
  });

  it("outstanding counts only due, uncancelled charges; later ones separately", () => {
    const charges = [
      { due_on: "2026-10-01", voided_at: null, outstanding_pence: 1000, service: "group" as const },
      { due_on: "2026-10-20", voided_at: null, outstanding_pence: 500, service: "pt" as const },
      { due_on: "2026-10-02", voided_at: "2026-10-03T00:00:00Z", outstanding_pence: 1000, service: "group" as const },
      { due_on: "2026-10-03", voided_at: null, outstanding_pence: 0, service: "group" as const },
    ];
    expect(outstanding(charges, "2026-10-19")).toEqual({ due: 1000, later: 500 });
    expect(outstanding(charges, "2026-10-19", "pt")).toEqual({ due: 0, later: 500 });
  });

  it("expected recurring income is only active, unended subscriptions", () => {
    expect(
      expectedMonthly(
        [
          { status: "active", price_pence: 7900, end_on: null },
          { status: "active", price_pence: 7900, end_on: "2026-10-01" },
          { status: "paused", price_pence: 7900, end_on: null },
        ],
        "2026-10-19",
      ),
    ).toBe(7900);
  });

  it("package sales: sold, collected and delivered", () => {
    const packages = [
      { id: "k1", price_pence: 13000, purchased_on: "2026-10-02", status: "active" as const, sessions_delivered: 1, sessions_total: 4 },
      { id: "k2", price_pence: 13000, purchased_on: "2026-09-02", status: "active" as const, sessions_delivered: 4, sessions_total: 4 },
    ];
    const charges = [
      { package_id: "k1", paid_pence: 6500, voided_at: null },
      { package_id: "k2", paid_pence: 13000, voided_at: null },
    ];
    expect(packageSales(packages, charges, { from: "2026-10-01", to: "2026-10-31" })).toEqual({ count: 1, sold: 13000, collected: 6500, sessionsSold: 4, sessionsDelivered: 1 });
  });

  it("names payment states", () => {
    expect(paymentState(undefined)).toBe("none");
    expect(paymentState({ amount_pence: 1000, paid_pence: 0, voided_at: null })).toBe("unpaid");
    expect(paymentState({ amount_pence: 1000, paid_pence: 400, voided_at: null })).toBe("part");
    expect(paymentState({ amount_pence: 1000, paid_pence: 1000, voided_at: null })).toBe("paid");
  });

  it("date filters: this week, this month, last month, custom", () => {
    expect(periodRange("week", "2026-10-21")).toMatchObject({ from: "2026-10-19", to: "2026-10-25" });
    expect(periodRange("month", "2026-10-21")).toMatchObject({ from: "2026-10-01", to: "2026-10-31" });
    expect(periodRange("last-month", "2026-03-31")).toMatchObject({ from: "2026-02-01", to: "2026-02-28" });
    expect(periodRange("custom", "2026-10-21", "2026-01-01", "2026-06-30")).toMatchObject({ from: "2026-01-01", to: "2026-06-30" });
    // Backwards or invalid custom ranges fall back to this month.
    expect(periodRange("custom", "2026-10-21", "2026-06-30", "2026-01-01")).toMatchObject({ period: "month" });
    expect(periodRange("custom", "2026-10-21", "nope", "2026-01-01")).toMatchObject({ period: "month" });
  });
});

describe("UK time", () => {
  it("converts wall-clock times across daylight saving", () => {
    expect(londonToUtc("2026-07-01", "18:30")).toBe("2026-07-01T17:30:00.000Z");
    expect(londonToUtc("2026-12-01", "18:30")).toBe("2026-12-01T18:30:00.000Z");
    // Clocks go back 25 Oct 2026: 01:30 happens twice; the first (BST) is used.
    expect(londonToUtc("2026-10-25", "01:30")).toBe("2026-10-25T00:30:00.000Z");
    // Clocks go forward 29 Mar 2026: 01:30 doesn't exist.
    expect(londonToUtc("2026-03-29", "01:30")).toBe("2026-03-29T01:30:00.000Z");
    expect(toLondon("2026-07-01T17:30:00.000Z")).toEqual({ date: "2026-07-01", time: "18:30" });
    expect(londonToday(new Date("2026-06-30T23:30:00Z"))).toBe("2026-07-01");
    expect(formatDateTime("2026-10-24T09:15:00Z")).toBe("Sat 24 Oct 2026, 10:15 am");
  });

  it("does calendar maths", () => {
    expect(startOfWeek("2026-10-25")).toBe("2026-10-19");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(endOfMonth("2028-02-10")).toBe("2028-02-29");
    expect(monthsBetween("2026-11-15", "2027-02-01")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });
});

describe("money", () => {
  it("parses pounds strictly into pence", () => {
    expect(parsePounds("10")).toBe(1000);
    expect(parsePounds("£12.5")).toBe(1250);
    expect(parsePounds("1,250.99")).toBe(125099);
    for (const bad of ["", "-5", "10.555", "abc", "1e3", "10000.01", "£"]) expect(parsePounds(bad), bad).toBeNull();
  });

  it("formats GBP", () => {
    expect(formatPence(1050)).toBe("£10.50");
    expect(formatPence(-500)).toBe("−£5.00");
    expect(penceToInput(1000)).toBe("10");
    expect(penceToInput(1050)).toBe("10.50");
  });
});

describe("database errors", () => {
  const db = (respond: () => Promise<Response>): Db => ({ config: { url: "https://x.supabase.co", secretKey: "k" }, fetchImpl: respond as unknown as typeof fetch });

  it("reports an unreachable database as unavailable", async () => {
    const r = await select(db(() => Promise.reject(new Error("ECONNREFUSED"))), "akb_clients");
    expect(r).toEqual({ ok: false, error: { kind: "unavailable", code: "network" } });
    expect(dbMessage(r.ok ? ({} as never) : r.error)).toMatch(/nothing was saved/);
    const down = await select(db(() => Promise.resolve(new Response("{}", { status: 503 }))), "akb_clients");
    expect(down).toMatchObject({ ok: false, error: { kind: "unavailable" } });
  });

  it("reports missing tables as not set up", async () => {
    const r = await rpc(db(() => Promise.resolve(Response.json({ code: "PGRST205", message: "Could not find the table" }, { status: 404 }))), "akb_x", {});
    expect(r).toMatchObject({ ok: false, error: { kind: "not-set-up" } });
  });

  it("never sends the key anywhere but the apikey header", async () => {
    let seen: RequestInit | undefined;
    let seenUrl = "";
    await select(
      db(async () => Response.json([])),
      "akb_clients",
    );
    const spy: Db = {
      config: { url: "https://x.supabase.co", secretKey: "sb_secret_abc" },
      fetchImpl: (async (url: string, init: RequestInit) => {
        seenUrl = url;
        seen = init;
        return Response.json([]);
      }) as unknown as typeof fetch,
    };
    await select(spy, "akb_clients", [["status", "eq.active"]]);
    expect(seenUrl).toBe("https://x.supabase.co/rest/v1/akb_clients?select=*&status=eq.active");
    expect(seenUrl).not.toContain("sb_secret");
    expect(seen?.headers).toMatchObject({ apikey: "sb_secret_abc" });
    expect(JSON.stringify(seen?.headers)).not.toContain("Bearer");
  });

  it("collects results or returns the first error", () => {
    expect(collect([{ ok: true, data: 1 }, { ok: true, data: "x" }] as const)).toEqual({ ok: true, data: [1, "x"] });
    expect(collect([{ ok: true, data: 1 }, { ok: false, error: { kind: "unavailable", code: "x" } }] as const)).toEqual({ ok: false, error: { kind: "unavailable", code: "x" } });
  });
});

describe("CSV export", () => {
  it("neutralises formulas and quotes awkward cells", async () => {
    const { csvCell, toCsv } = await import("./csv");
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("+44 7700")).toBe("'+44 7700");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell('Say "hi", ok')).toBe('"Say ""hi"", ok"');
    expect(csvCell(-5)).toBe("-5");
    expect(toCsv([["a", "b"]])).toBe("﻿a,b\r\n");
  });
});
