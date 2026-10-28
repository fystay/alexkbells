import { describe, expect, it } from "vitest";
import { membershipPlans } from "@/content/memberships";
import { getService } from "@/content/services";
import { bestPlanFor, extraCostPence, formatPenceShort, maxSavingPence, planFigures } from "./membership";

const payg = getService("group-classes").prices[0].amountGbp;

// The figures supplied by the owner on 2026-10-21 (class price £12).
const expected = {
  starter: { price: 40, credits: 4, payg: "£48", saving: "£8", perClass: "£10" },
  regular: { price: 65, credits: 8, payg: "£96", saving: "£31", perClass: "£8.13" },
  dedicated: { price: 85, credits: 12, payg: "£144", saving: "£59", perClass: "£7.08" },
};

describe("membership figures", () => {
  it("pay as you go is £12 per class", () => {
    expect(payg).toBe(12);
  });

  it.each(membershipPlans)("$name matches the owner's figures", (plan) => {
    const want = expected[plan.id];
    expect(plan.priceGbp).toBe(want.price);
    expect(plan.credits).toBe(want.credits);
    const f = planFigures(plan, payg);
    expect(formatPenceShort(f.payAsYouGoPence)).toBe(want.payg);
    expect(formatPenceShort(f.savingPence)).toBe(want.saving);
    expect(formatPenceShort(f.perClassPence)).toBe(want.perClass);
  });

  it("rounds a half-penny up, to the nearest penny", () => {
    expect(planFigures({ id: "regular", name: "x", priceGbp: 65, credits: 8 }, 12).perClassPence).toBe(813);
  });

  it("makes no popularity or promotional claim about any plan", () => {
    // The middle plan is only drawn with a heavier border (`featured`); plans carry no badge text.
    expect(membershipPlans.filter((p) => p.featured).map((p) => p.id)).toEqual(["regular"]);
    for (const p of membershipPlans) expect(Object.keys(p).sort()).toEqual(["credits", "featured", "id", "name", "priceGbp"].filter((k) => k in p).sort());
  });
});

describe("maxSavingPence", () => {
  it("is the Dedicated plan's £59 against £12 a class", async () => {
    const { membershipPlans } = await import("@/content/memberships");
    expect(maxSavingPence(membershipPlans, 12)).toBe(5900);
  });
});

describe("extra cost of pay as you go", () => {
  it.each([
    ["starter", "£2", "£8", "£104"],
    ["regular", "£7.75", "£31", "£403"],
    ["dedicated", "£14.75", "£59", "£767"],
  ])("%s: per week, per 4 weeks, per year", (id, week, period, year) => {
    const plan = membershipPlans.find((p) => p.id === id)!;
    const x = extraCostPence(plan, payg);
    expect([formatPenceShort(x.week), formatPenceShort(x.period), formatPenceShort(x.year)]).toEqual([week, period, year]);
  });
});

describe("bestPlanFor (pay-as-you-go account)", () => {
  const payg = getService("group-classes").prices[0].amountGbp;
  it("says nothing until a plan would have been cheaper", () => {
    expect(bestPlanFor(membershipPlans, 0, payg)).toBeNull();
    expect(bestPlanFor(membershipPlans, 3, payg)).toBeNull();
  });
  it("picks the plan that saves most, counting extra classes at the class price", () => {
    // 4 classes: £48 singly, Starter £40.
    expect(bestPlanFor(membershipPlans, 4, payg)).toMatchObject({ plan: { id: "starter" }, savingPence: 800 });
    // 8 classes: £96 singly; Regular £65 saves £31, Starter £40 + 4 × £12 = £88 saves £8.
    expect(bestPlanFor(membershipPlans, 8, payg)).toMatchObject({ plan: { id: "regular" }, savingPence: 3100 });
  });
});
