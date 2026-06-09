import { describe, expect, it } from "vitest";
import { deriveTailoringReadiness } from "./readiness";

describe("deriveTailoringReadiness", () => {
  it("early-career path: 0 experiences + 2 leadership is ready (no error blockers)", () => {
    const result = deriveTailoringReadiness({
      profile: {
        full_name: "Alex Chen",
        target_roles: ["Software Engineer"],
      },
      experiences: [],
      leadershipCount: 2,
      projectsCount: 0,
      skills: [
        { name: "TypeScript" },
        { name: "React" },
        { name: "Node.js" },
        { name: "Python" },
        { name: "SQL" },
      ],
    });

    expect(result.ready).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });

  it("blocks when no experience and no campus bridge content", () => {
    const result = deriveTailoringReadiness({
      profile: { full_name: "Alex Chen", target_roles: ["Engineer"] },
      experiences: [],
      leadershipCount: 0,
      projectsCount: 0,
      skills: [],
    });

    expect(result.ready).toBe(false);
    expect(result.blockers.some((b) => b.title.includes("No work experience"))).toBe(true);
  });

  it("blocks on missing full name even with campus bridge", () => {
    const result = deriveTailoringReadiness({
      profile: { full_name: null, target_roles: ["Engineer"] },
      experiences: [],
      leadershipCount: 2,
      projectsCount: 1,
      skills: [],
    });

    expect(result.ready).toBe(false);
    expect(result.blockers.some((b) => b.metadata?.field === "full_name")).toBe(true);
  });
});
