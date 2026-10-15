import { describe, expect, it } from "vitest";
import { onlineEnquiryEmail, parseOnlineEnquiry } from "./online-enquiry";

const NOW = 1_800_000_000_000;
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};
const valid = {
  goal: "strength",
  goalOther: "",
  experience: "some",
  trainingPlace: "home",
  contactMethod: "email",
  name: "Jo Online",
  email: "jo@example.com",
  phone: "",
  instagram: "",
  message: "",
  website: "",
  startedAt: String(NOW - 30_000),
  submissionId: "id-1",
};

describe("parseOnlineEnquiry", () => {
  it("accepts a short enquiry with only the required answers", () => {
    expect(parseOnlineEnquiry(form({ ...valid, trainingPlace: "" }), NOW).kind).toBe("valid");
  });

  it("asks for details only when 'something else' is chosen", () => {
    const missing = parseOnlineEnquiry(form({ ...valid, goal: "other" }), NOW);
    expect(missing.kind === "invalid" && missing.errors.goalOther).toBeTruthy();
    const given = parseOnlineEnquiry(form({ ...valid, goal: "other", goalOther: "Train for a kettlebell event" }), NOW);
    expect(given.kind === "valid" && given.data.goalOther).toBe("Train for a kettlebell event");
    // Leftover text from a different goal is dropped.
    const leftover = parseOnlineEnquiry(form({ ...valid, goalOther: "stale" }), NOW);
    expect(leftover.kind === "valid" && leftover.data.goalOther).toBe("");
  });

  it("requires the detail for the chosen contact method only", () => {
    const phone = parseOnlineEnquiry(form({ ...valid, contactMethod: "phone" }), NOW);
    expect(phone.kind === "invalid" && phone.errors.phone).toBeTruthy();
    expect(parseOnlineEnquiry(form({ ...valid, contactMethod: "phone", phone: "07700 900123" }), NOW).kind).toBe("valid");
    const insta = parseOnlineEnquiry(form({ ...valid, contactMethod: "instagram", instagram: "jo.trains" }), NOW);
    expect(insta.kind === "valid" && insta.data.instagram).toBe("@jo.trains");
    const badInsta = parseOnlineEnquiry(form({ ...valid, contactMethod: "instagram", instagram: "no spaces please" }), NOW);
    expect(badInsta.kind === "invalid" && badInsta.errors.instagram).toBeTruthy();
  });

  it("reports invalid choices", () => {
    const result = parseOnlineEnquiry(form({ ...valid, goal: "", experience: "pro", trainingPlace: "moon", contactMethod: "fax", email: "x" }), NOW);
    expect(result.kind === "invalid" && Object.keys(result.errors).sort()).toEqual([
      "contactMethod",
      "email",
      "experience",
      "goal",
      "trainingPlace",
    ]);
  });

  it("applies the same spam checks as booking requests", () => {
    expect(parseOnlineEnquiry(form({ ...valid, website: "x" }), NOW).kind).toBe("spam");
    expect(parseOnlineEnquiry(form({ ...valid, startedAt: String(NOW - 500) }), NOW).kind).toBe("spam");
  });
});

describe("onlineEnquiryEmail", () => {
  it("summarises the answers in plain text", () => {
    const result = parseOnlineEnquiry(form({ ...valid, contactMethod: "phone", phone: "07700 900123" }), NOW);
    if (result.kind !== "valid") throw new Error("expected valid");
    const email = onlineEnquiryEmail(result.data);
    expect(email.subject).toBe("Online coaching enquiry: Jo Online");
    expect(email.text).toContain("Main goal: Get stronger");
    expect(email.text).toContain("Trains: At home");
    expect(email.text).toContain("Prefers contact by: Phone (07700 900123)");
  });
});
