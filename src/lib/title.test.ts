import { describe, expect, it } from "vitest";
import { statement } from "./title";

describe("statement", () => {
  it("adds a full stop to a title without one", () => {
    expect(statement("Class times")).toBe("Class times.");
  });
  it("leaves titles that already end with a stop or a question mark", () => {
    expect(statement("Find us.")).toBe("Find us.");
    expect(statement("Ready to train 1:1?")).toBe("Ready to train 1:1?");
  });
  it("returns non-string titles unchanged", () => {
    expect(statement(null)).toBe(null);
  });
});
