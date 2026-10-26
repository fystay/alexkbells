import { describe, expect, it } from "vitest";
import { PLAN_SCRIPT, planFromSearch } from "./plan-flag";

describe("plan flag", () => {
  it("accepts only real plan ids", () => {
    expect(planFromSearch("?plan=regular")).toBe("regular");
    expect(planFromSearch("?plan=platinum")).toBeNull();
    expect(planFromSearch("?plan=%22%3E%3Cscript%3E")).toBeNull();
    expect(planFromSearch("")).toBeNull();
  });

  it("the pre-paint script lists the plan ids and writes nothing else", () => {
    expect(PLAN_SCRIPT).toContain('["starter","regular","dedicated"]');
    expect(PLAN_SCRIPT).not.toMatch(/innerHTML|eval|document\.write/);
  });
});
