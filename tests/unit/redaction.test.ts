import { describe, expect, it } from "vitest";
import { redactText, sanitizeObject } from "../../src/core/redaction.js";

describe("redaction", () => {
  it("redacts common credential shapes before persistence", () => {
    const result = redactText(
      "Authorization: Bearer very-secret-token-value-123 password=hunterhunter",
    );
    expect(result.applied).toBe(true);
    expect(result.value).not.toContain("very-secret");
    expect(result.value).not.toContain("hunterhunter");
  });

  it("walks nested payloads", () => {
    const value = sanitizeObject({
      command: "API_KEY=abcdefghijk12345",
      nested: ["safe"],
    });
    expect(JSON.stringify(value)).toContain("[REDACTED:");
    expect(JSON.stringify(value)).not.toContain("abcdefghijk12345");
  });
});
