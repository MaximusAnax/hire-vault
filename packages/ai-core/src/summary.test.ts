import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assembleSummary,
  entityHash,
  generateSnippet,
  type CachedSnippet,
  type SnippetEntity,
} from "./summary";

/**
 * These tests intentionally run in degraded mode (no OPENAI_API_KEY) so
 * the cost-aware fallback paths are exercised. The real network calls are
 * not in scope for unit tests.
 */

const ORIGINAL_KEY = process.env.OPENAI_API_KEY;

beforeEach(() => {
  delete process.env.OPENAI_API_KEY;
});

afterEach(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = ORIGINAL_KEY;
  }
});

function baseEntity(overrides: Partial<SnippetEntity> = {}): SnippetEntity {
  return {
    type: "experience",
    id: "exp-1",
    fields: {
      company: "Acme",
      title: "Software Engineer",
      bullet_points: ["Built React dashboards", "Owned the design system"],
      technologies: ["React", "TypeScript"],
    },
    ...overrides,
  };
}

describe("entityHash", () => {
  it("is stable across whitespace differences", () => {
    const a = baseEntity({
      fields: {
        company: "Acme",
        title: "  Software   Engineer  ",
        bullet_points: ["Built React dashboards", "Owned the design system"],
        technologies: ["React", "TypeScript"],
      },
    });
    const b = baseEntity({
      fields: {
        company: "ACME",
        title: "software engineer",
        bullet_points: ["built react dashboards", "owned   the design system"],
        technologies: ["react", "typescript"],
      },
    });
    expect(entityHash(a)).toBe(entityHash(b));
  });

  it("is stable across key order", () => {
    const a = baseEntity({
      fields: {
        company: "Acme",
        title: "Engineer",
        technologies: ["a", "b"],
      },
    });
    const b = baseEntity({
      fields: {
        technologies: ["a", "b"],
        title: "Engineer",
        company: "Acme",
      },
    });
    expect(entityHash(a)).toBe(entityHash(b));
  });

  it("treats null and undefined as the same value for irrelevant fields", () => {
    // Both rows have the SAME set of keys — what differs is null vs undefined for
    // optional fields. The hash should not flip on that distinction since the
    // database driver can return either one for an absent column.
    const withNulls = baseEntity({
      fields: {
        company: "Acme",
        title: "Engineer",
        bullet_points: ["Did things"],
        location: null,
        end_date: null,
        notes: null,
      },
    });
    const withUndefineds = baseEntity({
      fields: {
        company: "Acme",
        title: "Engineer",
        bullet_points: ["Did things"],
        location: undefined,
        end_date: undefined,
        notes: undefined,
      },
    });
    expect(entityHash(withNulls)).toBe(entityHash(withUndefineds));
  });

  it("produces different hashes for different content", () => {
    const a = baseEntity({
      fields: { company: "Acme", title: "Engineer" },
    });
    const b = baseEntity({
      fields: { company: "Acme", title: "Senior Engineer" },
    });
    expect(entityHash(a)).not.toBe(entityHash(b));
  });

  it("distinguishes between entity types even when fields match", () => {
    const exp: SnippetEntity = {
      type: "experience",
      id: "1",
      fields: { name: "Project Aurora" },
    };
    const proj: SnippetEntity = {
      type: "project",
      id: "1",
      fields: { name: "Project Aurora" },
    };
    expect(entityHash(exp)).not.toBe(entityHash(proj));
  });
});

describe("assembleSummary (degraded / no API key)", () => {
  it("returns an empty string for an empty snippet array", async () => {
    const result = await assembleSummary([], { target_roles: ["AI Engineer"] });
    expect(result.summary).toBe("");
    expect(result.degraded).toBe(true);
  });

  it("joins snippets and caps to at most 5 sentences", async () => {
    const snippets: CachedSnippet[] = [
      { entity_type: "experience", entity_id: "1", snippet: "Built React dashboards at Acme." },
      { entity_type: "experience", entity_id: "2", snippet: "Led the design system rollout at Globex." },
      { entity_type: "project", entity_id: "3", snippet: "Shipped an OSS chart library." },
      { entity_type: "skill", entity_id: "4", snippet: "Strong in TypeScript and React." },
      { entity_type: "education", entity_id: "5", snippet: "BS in Computer Science from State University." },
      { entity_type: "course", entity_id: "6", snippet: "Completed an ML specialization." },
      { entity_type: "course", entity_id: "7", snippet: "Completed a Distributed Systems course." },
    ];

    const result = await assembleSummary(snippets, {
      target_roles: ["AI Engineer", "SWE"],
      pitch: "Builder who turns research into product.",
    });

    expect(result.degraded).toBe(true);
    expect(result.summary.length).toBeGreaterThan(0);

    const sentenceCount = (result.summary.match(/[.!?]+/g) ?? []).length;
    expect(sentenceCount).toBeLessThanOrEqual(5);
  });

  it("ignores empty snippet strings safely", async () => {
    const snippets: CachedSnippet[] = [
      { entity_type: "experience", entity_id: "1", snippet: "" },
      { entity_type: "experience", entity_id: "2", snippet: "   " },
    ];
    const result = await assembleSummary(snippets, {});
    expect(result.summary).toBe("");
    expect(result.degraded).toBe(true);
  });
});

describe("generateSnippet (degraded / no API key)", () => {
  it("returns a degraded result without throwing when OPENAI_API_KEY is missing", async () => {
    const entity = baseEntity();
    const result = await generateSnippet(entity);
    expect(result.snippet).toBeNull();
    expect(result.degraded).toBe(true);
    expect(result.error).toMatch(/OPENAI_API_KEY/);
    expect(result.model).toBeTruthy();
  });

  it("never throws for entities with missing optional fields", async () => {
    const entity: SnippetEntity = {
      type: "skill",
      id: "skill-1",
      fields: { name: "Kubernetes" },
    };
    await expect(generateSnippet(entity)).resolves.toMatchObject({
      degraded: true,
      snippet: null,
    });
  });
});
