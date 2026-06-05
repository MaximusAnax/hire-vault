import { describe, expect, it } from "vitest";
import { hashExtensionToken, normalizeExtensionToken } from "./auth";

describe("normalizeExtensionToken", () => {
  it("trims and strips Bearer prefix", () => {
    const raw = "  Bearer hv_abc123  ";
    expect(normalizeExtensionToken(raw)).toBe("hv_abc123");
  });

  it("strips surrounding quotes", () => {
    expect(normalizeExtensionToken('"hv_deadbeef"')).toBe("hv_deadbeef");
  });
});

describe("hashExtensionToken", () => {
  it("matches hash after normalize", () => {
    const a = hashExtensionToken("hv_test");
    const b = hashExtensionToken(normalizeExtensionToken("  Bearer hv_test  "));
    expect(a).toBe(b);
  });
});
