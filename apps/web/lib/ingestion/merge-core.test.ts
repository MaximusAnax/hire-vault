import { describe, expect, it } from "vitest";
import { computeSourceHash } from "./dedup";
import {
  mergeRecordsWithStrategy,
  normalizeDateForHash,
  planSectionUpsert,
  type MergeExistingRow,
} from "./merge-core";

describe("normalizeDateForHash", () => {
  it("normalizes partial dates to YYYY-MM-DD", () => {
    expect(normalizeDateForHash("2020-01")).toBe("2020-01-01");
    expect(normalizeDateForHash("2020-01-15")).toBe("2020-01-15");
    expect(normalizeDateForHash("2020")).toBe("2020-01-01");
    expect(normalizeDateForHash(null)).toBeNull();
    expect(normalizeDateForHash("")).toBeNull();
  });
});

describe("mergeRecordsWithStrategy", () => {
  it("conservative unions arrays and fills empty scalars", () => {
    const merged = mergeRecordsWithStrategy(
      { bullet_points: ["Built API"], title: "Engineer" },
      { bullet_points: ["Led team"], location: "NYC" },
      "conservative"
    );
    expect(merged.bullet_points).toEqual(expect.arrayContaining(["Built API", "Led team"]));
    expect(merged.location).toBe("NYC");
    expect(merged.title).toBe("Engineer");
  });

  it("newest_wins replaces scalars and arrays", () => {
    const merged = mergeRecordsWithStrategy(
      { bullet_points: ["Built API"], title: "Engineer", location: "SF" },
      { bullet_points: ["Led team"], title: "Senior Engineer" },
      "newest_wins"
    );
    expect(merged.bullet_points).toEqual(["Led team"]);
    expect(merged.title).toBe("Senior Engineer");
    expect(merged.location).toBe("SF");
  });
});

describe("planSectionUpsert", () => {
  it("inserts all items into an empty profile", () => {
    const items = [
      { company: "Acme", title: "Engineer", start_date: "2020-01" },
      { company: "Beta", title: "Intern", start_date: "2019-06" },
    ];
    const plans = planSectionUpsert("experiences", items, [], "newest_wins");
    expect(plans).toHaveLength(2);
    expect(plans.every((p) => p.action === "insert")).toBe(true);
  });

  it("conservative merge updates non-bullet sections on hash match", () => {
    const incoming = { name: "TypeScript", category: "language" };
    const normalized = { ...incoming, start_date: undefined };
    const hash = computeSourceHash("skills", normalized);
    const existing: MergeExistingRow[] = [
      {
        id: "sk-1",
        source_hash: hash,
        source: "resume_upload",
        name: "TypeScript",
        category: "tool",
      },
    ];
    const plans = planSectionUpsert("skills", [incoming], existing, "conservative");
    expect(plans).toHaveLength(1);
    expect(plans[0]?.action).toBe("update");
    expect(plans[0]?.merged?.category).toBe("language");
  });

  it("newest_wins replaces scalars and bullets on hash match", () => {
    const incoming = {
      company: "Acme",
      title: "Engineer",
      start_date: "2020-01-01",
      bullet_points: ["Shipped v2", "Cut latency 40%"],
    };
    const hash = computeSourceHash("experiences", incoming);
    const existing: MergeExistingRow[] = [
      {
        id: "exp-1",
        source_hash: hash,
        source: "resume_upload",
        company: "Acme",
        title: "Engineer",
        start_date: "2020-01-01",
        bullet_points: ["Built API"],
      },
    ];
    const plans = planSectionUpsert("experiences", [incoming], existing, "newest_wins");
    expect(plans).toHaveLength(1);
    expect(plans[0]?.action).toBe("update");
    expect(plans[0]?.merged?.bullet_points).toEqual(["Shipped v2", "Cut latency 40%"]);
  });

  it("manual-source rows surface as conflict, not overwrite", () => {
    const incoming = {
      company: "Acme",
      title: "Engineer",
      start_date: "2020-01-01",
      bullet_points: ["New bullet"],
    };
    const hash = computeSourceHash("experiences", incoming);
    const existing: MergeExistingRow[] = [
      {
        id: "exp-1",
        source_hash: hash,
        source: "manual",
        company: "Acme",
        title: "Engineer",
        start_date: "2020-01-01",
        bullet_points: ["User edited"],
      },
    ];
    const plans = planSectionUpsert("experiences", [incoming], existing, "newest_wins");
    expect(plans).toHaveLength(1);
    expect(plans[0]?.action).toBe("conflict");
    expect(plans[0]?.merged).toBeUndefined();
  });

  it("conservative strategy conflicts on bullet diff for experiences", () => {
    const incoming = {
      company: "Acme",
      title: "Engineer",
      start_date: "2020-01-01",
      bullet_points: ["New bullet"],
    };
    const hash = computeSourceHash("experiences", incoming);
    const existing: MergeExistingRow[] = [
      {
        id: "exp-1",
        source_hash: hash,
        source: "resume_upload",
        company: "Acme",
        title: "Engineer",
        start_date: "2020-01-01",
        bullet_points: ["Old bullet"],
      },
    ];
    const plans = planSectionUpsert("experiences", [incoming], existing, "conservative");
    expect(plans).toHaveLength(1);
    expect(plans[0]?.action).toBe("conflict");
  });

  it("matches hash after normalizing incoming start_date formats", () => {
    const existingDate = "2020-01-01";
    const hash = computeSourceHash("experiences", {
      company: "Acme",
      title: "Engineer",
      start_date: existingDate,
    });
    const existing: MergeExistingRow[] = [
      {
        id: "exp-1",
        source_hash: hash,
        source: "resume_upload",
        company: "Acme",
        title: "Engineer",
        start_date: existingDate,
        is_current: false,
        bullet_points: ["Built API"],
      },
    ];
    const incoming = {
      company: "Acme",
      title: "Engineer",
      start_date: "2020-01",
      bullet_points: ["Built API"],
    };
    const plans = planSectionUpsert("experiences", [incoming], existing, "conservative");
    expect(plans).toHaveLength(1);
    expect(plans[0]?.action).toBe("skip");
  });
});
