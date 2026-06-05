import { describe, expect, it } from "vitest";
import { normalizeLocations } from "./locations";

describe("normalizeLocations", () => {
  it("dedupes case-insensitive entries", () => {
    expect(normalizeLocations(["NYC", "nyc", "Remote"])).toEqual(["NYC", "Remote"]);
  });

  it("splits comma-separated strings", () => {
    expect(normalizeLocations("SF, NYC, SF")).toEqual(["SF", "NYC"]);
  });
});
