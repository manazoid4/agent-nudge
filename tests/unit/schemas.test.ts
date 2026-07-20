import { describe, expect, it } from "vitest";
import { buildScenario } from "../../src/core/demo.js";
import {
  factSchema,
  nudgeSchema,
  sessionSchema,
} from "../../src/core/schemas.js";

describe("versioned schemas", () => {
  it("accepts current demo protocol objects", () => {
    const data = buildScenario("decision");
    expect(sessionSchema.parse(data.author).schemaVersion).toBe(1);
    expect(factSchema.parse(data.fact).schemaVersion).toBe(1);
    expect(nudgeSchema.parse(data.nudge).schemaVersion).toBe(1);
  });

  it("rejects unknown schema versions", () => {
    const data = buildScenario("decision");
    expect(() =>
      factSchema.parse({ ...data.fact, schemaVersion: 2 }),
    ).toThrow();
  });
});
