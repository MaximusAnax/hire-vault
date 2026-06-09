import { describe, expect, it } from "vitest";
import {
  coalesceExperiences,
  dedupeBulletTexts,
  detachLocationFromOrg,
} from "./role-dedupe";

describe("detachLocationFromOrg", () => {
  it("splits glued city/state from company", () => {
    const result = detachLocationFromOrg("Machine Learning Department - CMUPittsburgh, PA");
    expect(result.org).toBe("Machine Learning Department - CMU");
    expect(result.location).toBe("Pittsburgh, PA");
  });
});

describe("dedupeBulletTexts", () => {
  it("keeps the longer bullet when one is a prefix", () => {
    const out = dedupeBulletTexts([
      "Architecting a high-efficiency agent loop and harness design for edge-compute VLMs, enabling autonomous",
      "Architecting a high-efficiency agent loop and harness design for edge-compute VLMs, enabling autonomous computer-use capabilities from pixel-only observations without relying on frontier-scale models.",
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("computer-use capabilities");
  });
});

describe("coalesceExperiences", () => {
  it("merges AI and deterministic variants of the same role", () => {
    const ai = {
      company: "Machine Learning Department - CMU",
      title: "Student Researcher",
      start_date: "2024-05-01",
      end_date: null,
      is_current: true,
      location: null,
      bullet_points: [
        "Architecting a high-efficiency agent loop and harness design for edge-compute VLMs, enabling autonomous computer-use capabilities from pixel-only observations without relying on frontier-scale models.",
        "Pioneering an optimized training framework designed to bridge the capability gap between small models and frontier-scale systems in low-resource environments.",
      ],
    };

    const det = {
      company: "Machine Learning Department - CMUPittsburgh, PA",
      title: "Student",
      start_date: "2024-05-01",
      end_date: null,
      is_current: true,
      location: null,
      bullet_points: [
        "Architecting a high-efficiency agent loop and harness design for edge-compute VLMs, enabling autonomous",
        "computer-use capabilities from pixel-only observations without relying on frontier-scale models.",
      ],
    };

    const merged = coalesceExperiences([ai, det]);
    expect(merged).toHaveLength(1);
    expect(merged![0].title).toBe("Student Researcher");
    expect(merged![0].company).toBe("Machine Learning Department - CMU");
    expect(merged![0].location).toBe("Pittsburgh, PA");
    expect(merged![0].bullet_points?.length).toBe(2);
    expect(merged![0].bullet_points?.[0]).toContain("computer-use capabilities");
  });

  it("merges duplicate AI rows when one omits start_date", () => {
    const withDate = {
      company: "Acme Corp",
      title: "Engineer",
      start_date: "2024-05-01",
      bullet_points: ["Built systems at scale."],
    };
    const noDate = {
      company: "Acme Corp",
      title: "Engineer",
      start_date: null,
      bullet_points: ["Built systems at scale."],
    };
    const merged = coalesceExperiences([withDate, noDate]);
    expect(merged).toHaveLength(1);
  });
});
