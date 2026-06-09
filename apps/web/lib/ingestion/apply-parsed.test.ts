import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeSourceHash } from "./dedup";
import {
  applyParsedProfile,
  applyReviewedPlans,
  buildProfileHeaderUpdate,
  queueDedupConflicts,
} from "./apply-parsed";

const REIMPORT_EXISTING = JSON.parse(
  readFileSync(join(__dirname, "fixtures", "reimport-existing.json"), "utf8")
);
const REIMPORT_INCOMING = JSON.parse(
  readFileSync(join(__dirname, "fixtures", "reimport-incoming.json"), "utf8")
);

type Row = Record<string, unknown>;

function createMockSupabase(state: {
  profile: Row;
  sections: Record<string, Row[]>;
  conflicts?: Row[];
}) {
  const tables = {
    profiles: [state.profile],
    experiences: [...(state.sections.experiences ?? [])],
    education: [...(state.sections.education ?? [])],
    leadership: [...(state.sections.leadership ?? [])],
    projects: [...(state.sections.projects ?? [])],
    skills: [...(state.sections.skills ?? [])],
    courses: [...(state.sections.courses ?? [])],
    dedup_conflicts: [...(state.conflicts ?? [])],
  };

  function table(name: keyof typeof tables) {
    const rows = tables[name];
    return {
      select: () => {
        const filters: Array<(row: Row) => boolean> = [];
        const builder = {
          eq: (field: string, value: unknown) => {
            filters.push((row) => row[field] === value);
            return builder;
          },
          maybeSingle: async () => {
            const match = rows.find((row) => filters.every((fn) => fn(row)));
            return { data: match ?? null, error: null };
          },
          single: async () => {
            const match = rows.find((row) => filters.every((fn) => fn(row)));
            return { data: match ?? null, error: match ? null : { message: "not found" } };
          },
          then: (
            resolve: (value: { data: Row[]; error: null }) => void,
            reject?: (reason: unknown) => void
          ) => {
            try {
              const data = rows.filter((row) => filters.every((fn) => fn(row)));
              resolve({ data, error: null });
            } catch (error) {
              reject?.(error);
            }
          },
        };
        return builder;
      },
      insert: (payload: Row | Row[]) => {
        const items = Array.isArray(payload) ? payload : [payload];
        for (const item of items) {
          rows.push({
            id: `${String(name)}-${rows.length + 1}`,
            ...item,
          });
        }
        return Promise.resolve({ error: null });
      },
      update: (payload: Row) => {
        const filters: Array<(row: Row) => boolean> = [];
        const builder = {
          eq: (field: string, value: unknown) => {
            filters.push((row) => row[field] === value);
            return builder;
          },
          then: (
            resolve: (value: { error: null }) => void,
            reject?: (reason: unknown) => void
          ) => {
            try {
              for (const row of rows) {
                if (filters.every((fn) => fn(row))) {
                  Object.assign(row, payload);
                }
              }
              resolve({ error: null });
            } catch (error) {
              reject?.(error);
            }
          },
        };
        return builder;
      },
    };
  }

  return {
    from: (name: keyof typeof tables) => table(name),
    _state: tables,
  };
}

describe("buildProfileHeaderUpdate", () => {
  it("fills empty fields on manual profiles", () => {
    const update = buildProfileHeaderUpdate(
      { source: "manual", full_name: "User Name", email: null },
      { full_name: "Import Name", email: "new@example.com", location: "NYC" },
      "resume_upload"
    );
    expect(update.full_name).toBeUndefined();
    expect(update.email).toBe("new@example.com");
    expect(update.location).toBe("NYC");
    expect(update.source).toBe("resume_upload");
  });

  it("overwrites populated fields on import-sourced profiles", () => {
    const update = buildProfileHeaderUpdate(
      { source: "resume_upload", full_name: "Jane Doe", location: "SF" },
      { full_name: "Jane Doe", location: "NYC" },
      "resume_upload"
    );
    expect(update.location).toBe("NYC");
  });
});

describe("applyParsedProfile", () => {
  it("newest_wins updates import-sourced experience bullets on re-import", async () => {
    const incoming = REIMPORT_INCOMING.experiences[0];
    const hash = computeSourceHash("experiences", incoming);
    const supabase = createMockSupabase({
      profile: { ...REIMPORT_EXISTING.profile },
      sections: {
        experiences: [{ ...REIMPORT_EXISTING.experiences[0], source_hash: hash }],
      },
    });

    const stats = await applyParsedProfile(
      supabase as never,
      "profile-1",
      REIMPORT_INCOMING,
      "resume_upload"
    );

    expect(stats.merged).toBe(1);
    expect(stats.conflicts).toHaveLength(0);
    const updated = supabase._state.experiences[0];
    expect(updated.title).toBe("Senior Engineer");
    expect(updated.bullet_points).toEqual(["Shipped v2", "Cut latency 40%"]);
    expect(supabase._state.profiles[0].location).toBe("NYC");
  });

  it("surfaces manual rows as conflicts instead of overwriting", async () => {
    const incoming = {
      company: "Acme",
      title: "Engineer",
      start_date: "2020-01-01",
      bullet_points: ["Incoming bullet"],
    };
    const hash = computeSourceHash("experiences", incoming);
    const supabase = createMockSupabase({
      profile: { id: "profile-1", source: "manual" },
      sections: {
        experiences: [
          {
            id: "exp-manual",
            profile_id: "profile-1",
            company: "Acme",
            title: "Engineer",
            start_date: "2020-01-01",
            bullet_points: ["User edited"],
            source: "manual",
            source_hash: hash,
          },
        ],
      },
    });

    const stats = await applyParsedProfile(
      supabase as never,
      "profile-1",
      { experiences: [incoming] },
      "resume_upload"
    );

    expect(stats.conflicts).toHaveLength(1);
    expect(stats.merged).toBe(0);
    expect(supabase._state.experiences[0].bullet_points).toEqual(["User edited"]);
  });

  it("inserts new rows when hash does not match", async () => {
    const supabase = createMockSupabase({
      profile: { id: "profile-1", source: "resume_upload" },
      sections: { experiences: [] },
    });

    const stats = await applyParsedProfile(
      supabase as never,
      "profile-1",
      {
        experiences: [
          { company: "Beta", title: "Intern", start_date: "2021-06-01", bullet_points: [] },
        ],
      },
      "resume_upload"
    );

    expect(stats.inserted).toBe(1);
    expect(supabase._state.experiences).toHaveLength(1);
    expect(supabase._state.experiences[0].company).toBe("Beta");
  });

  it("supports conservative merge strategy", async () => {
    const incoming = {
      company: "Acme",
      title: "Engineer",
      start_date: "2020-01-01",
      bullet_points: ["New bullet"],
    };
    const hash = computeSourceHash("experiences", incoming);
    const supabase = createMockSupabase({
      profile: { id: "profile-1", source: "resume_upload" },
      sections: {
        experiences: [
          {
            id: "exp-1",
            profile_id: "profile-1",
            company: "Acme",
            title: "Engineer",
            start_date: "2020-01-01",
            bullet_points: ["Old bullet"],
            source: "resume_upload",
            source_hash: hash,
          },
        ],
      },
    });

    const stats = await applyParsedProfile(
      supabase as never,
      "profile-1",
      { experiences: [incoming] },
      "resume_upload",
      { mergeStrategy: "conservative" }
    );

    expect(stats.conflicts).toHaveLength(1);
    expect(stats.merged).toBe(0);
  });
});

describe("applyReviewedPlans", () => {
  it("applies only reviewed plans with user edits", async () => {
    const supabase = createMockSupabase({
      profile: { id: "profile-1", source: "resume_upload", location: null },
      sections: { skills: [], experiences: [] },
    });

    const stats = await applyReviewedPlans(
      supabase as never,
      "profile-1",
      { location: "Boston", skills: [{ name: "ignored" }] },
      "resume_upload",
      [
        {
          action: "insert",
          section: "skills",
          incoming: { name: "Rust", source_hash: "stale" },
        },
        {
          action: "insert",
          section: "experiences",
          incoming: {
            company: "Startup",
            title: "Founding Engineer",
            start_date: "2024-01-01",
            bullet_points: ["Built MVP"],
            source_hash: "stale",
          },
        },
      ]
    );

    expect(stats.inserted).toBe(2);
    expect(supabase._state.skills[0].name).toBe("Rust");
    expect(supabase._state.experiences[0].title).toBe("Founding Engineer");
    expect(supabase._state.profiles[0].location).toBe("Boston");
  });
});

describe("queueDedupConflicts", () => {
  it("skips insert when pending conflict exists for same existing_id", async () => {
    const supabase = createMockSupabase({
      profile: { id: "profile-1", source: "manual" },
      sections: {},
      conflicts: [
        {
          id: "conflict-1",
          profile_id: "profile-1",
          existing_id: "exp-1",
          resolution: "pending",
        },
      ],
    });

    const queued = await queueDedupConflicts(
      supabase as never,
      "profile-1",
      [{ section: "experiences", existingId: "exp-1", incoming: { company: "Acme" } }],
      "resume_upload"
    );

    expect(queued).toBe(0);
    expect(supabase._state.dedup_conflicts).toHaveLength(1);
  });

  it("inserts when no pending conflict exists", async () => {
    const supabase = createMockSupabase({
      profile: { id: "profile-1", source: "manual" },
      sections: {},
      conflicts: [],
    });

    const queued = await queueDedupConflicts(
      supabase as never,
      "profile-1",
      [{ section: "experiences", existingId: "exp-1", incoming: { company: "Acme" } }],
      "resume_upload"
    );

    expect(queued).toBe(1);
    expect(supabase._state.dedup_conflicts).toHaveLength(1);
  });
});
