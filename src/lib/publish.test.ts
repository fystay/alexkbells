import { describe, expect, it } from "vitest";
import { isPublishable, publishable } from "./publish";

const prod = {};
const preview = { CONTENT_PREVIEW: "true" };

describe("content publishing gate", () => {
  it("always publishes confirmed content", () => {
    expect(isPublishable("confirmed", prod)).toBe(true);
    expect(isPublishable("confirmed", preview)).toBe(true);
  });

  it("hides provisional content unless preview mode is on", () => {
    expect(isPublishable("provisional", prod)).toBe(false);
    expect(isPublishable("provisional", { CONTENT_PREVIEW: "1" })).toBe(false);
    expect(isPublishable("provisional", preview)).toBe(true);
  });

  it("filters lists", () => {
    const items = [
      { id: 1, status: "confirmed" as const },
      { id: 2, status: "provisional" as const },
    ];
    expect(publishable(items, prod).map((i) => i.id)).toEqual([1]);
    expect(publishable(items, preview).map((i) => i.id)).toEqual([1, 2]);
  });
});
