import { describe, expect, it } from "vitest";
import { computeSourceHash, mergeRecords, resolveDedup } from "./dedup";

describe("dedup", () => {
  it("mergeRecords unions array fields", () => {
    const merged = mergeRecords(
      { bullet_points: ["Built API"] },
      { bullet_points: ["Led team"] }
    );
    expect(merged.bullet_points).toEqual(expect.arrayContaining(["Built API", "Led team"]));
  });

  it("resolveDedup inserts when hash is new", () => {
    const incoming = { company: "Acme", title: "Engineer", start_date: "2020-01" };
    const outcome = resolveDedup("experiences", incoming, []);
    expect(outcome.action).toBe("insert");
    if (outcome.action === "insert") {
      expect(outcome.data.source_hash).toBe(computeSourceHash("experiences", incoming));
    }
  });

  it("resolveDedup merges when hash matches (non-experience section)", () => {
    const incoming = { name: "TypeScript" };
    const hash = computeSourceHash("skills", incoming);
    const outcome = resolveDedup("skills", incoming, [{ id: "sk-1", source_hash: hash }]);
    expect(outcome.action).toBe("merge");
  });
});
