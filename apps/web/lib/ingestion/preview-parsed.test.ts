import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeSourceHash } from "./dedup";
import { applyParsedProfile } from "./apply-parsed";
import { normalizeParsedResumeFromText } from "./normalize-parsed-resume";
import { previewParsedProfile } from "./preview-parsed";

const FIXTURE = readFileSync(
  join(__dirname, "fixtures", "resume_ref-plain.txt"),
  "utf8"
);

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
}) {
  const tables = {
    profiles: [state.profile],
    experiences: [...(state.sections.experiences ?? [])],
    education: [...(state.sections.education ?? [])],
    leadership: [...(state.sections.leadership ?? [])],
    projects: [...(state.sections.projects ?? [])],
    skills: [...(state.sections.skills ?? [])],
    courses: [...(state.sections.courses ?? [])],
    dedup_conflicts: [] as Row[],
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

describe("previewParsedProfile", () => {
  it("matches apply outcome for re-import fixture", async () => {
    const incoming = REIMPORT_INCOMING.experiences[0];
    const hash = computeSourceHash("experiences", incoming);
    const initialState = {
      profile: { ...REIMPORT_EXISTING.profile },
      sections: {
        experiences: [{ ...REIMPORT_EXISTING.experiences[0], source_hash: hash }],
      },
    };

    const previewSupabase = createMockSupabase(initialState);
    const preview = await previewParsedProfile(
      previewSupabase as never,
      "profile-1",
      REIMPORT_INCOMING,
      "resume_upload"
    );

    const applySupabase = createMockSupabase(JSON.parse(JSON.stringify(initialState)));
    const stats = await applyParsedProfile(
      applySupabase as never,
      "profile-1",
      REIMPORT_INCOMING,
      "resume_upload"
    );

    expect(preview.totals.insert).toBe(stats.inserted);
    expect(preview.totals.update).toBe(stats.merged);
    expect(preview.totals.conflict).toBe(stats.conflicts.length);
    expect(preview.totals.skip).toBe(stats.skipped - stats.conflicts.length);
    expect(preview.totals.update).toBe(1);
    expect(preview.profileHeader?.changedFields).toContain("location");
  });

  it("plans manual rows as conflicts like apply", async () => {
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

    const preview = await previewParsedProfile(
      supabase as never,
      "profile-1",
      { experiences: [incoming] },
      "resume_upload"
    );

    expect(preview.totals.conflict).toBe(1);
    expect(preview.plans[0]?.action).toBe("conflict");
  });

  it("plans one insert per unique AI experience on empty profile", async () => {
    const det = normalizeParsedResumeFromText(FIXTURE);
    const parsed = {
      experiences: det.experiences?.slice(0, 3),
      full_name: "Test User",
    };
    const supabase = createMockSupabase({
      profile: { id: "profile-1", source: "manual" },
      sections: {
        experiences: [],
      },
    });

    const preview = await previewParsedProfile(
      supabase as never,
      "profile-1",
      parsed,
      "resume_upload"
    );

    const experiencePlans = preview.plans.filter((p) => p.section === "experiences");
    expect(experiencePlans.filter((p) => p.action === "insert")).toHaveLength(3);
    expect(preview.totals.insert).toBe(3);
  });
});
