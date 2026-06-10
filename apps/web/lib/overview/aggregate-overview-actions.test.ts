import { describe, expect, it } from "vitest";
import type { OverviewAction } from "@hirevault/types";
import {
  aggregateOverviewActions,
  groupSupportsInlineExpand,
  INLINE_GROUP_MAX,
} from "./aggregate-overview-actions";

function appAction(
  kind: OverviewAction["kind"],
  appId: string,
  priority: number,
  overrides: Partial<OverviewAction> = {}
): OverviewAction {
  return {
    kind,
    priority,
    title: kind,
    subtitle: `Role ${appId}`,
    href: `/resumes?application=${appId}`,
    metadata: { applicationId: appId, statusWeight: 4, lastUpdated: "2026-06-01" },
    ...overrides,
  };
}

describe("aggregateOverviewActions", () => {
  it("keeps global actions as individual rows", () => {
    const queue = aggregateOverviewActions([
      {
        kind: "import_conflicts",
        priority: 700,
        title: "2 import conflicts need review",
        subtitle: "Resolve duplicates",
        href: "/profile/import",
      },
      {
        kind: "capture_review",
        priority: 720,
        title: "Review 2 captured roles",
        subtitle: "Polish captures",
        href: "/applications?needsReview=1",
      },
    ]);

    expect(queue).toHaveLength(2);
    expect(queue.every((item) => item.type === "global")).toBe(true);
  });

  it("groups per-app tailor_resume actions into one row", () => {
    const queue = aggregateOverviewActions([
      appAction("tailor_resume", "a1", 650),
      appAction("tailor_resume", "a2", 640),
      appAction("tailor_resume", "a3", 630),
    ]);

    expect(queue).toHaveLength(1);
    expect(queue[0]?.type).toBe("group");
    if (queue[0]?.type === "group") {
      expect(queue[0].group.kind).toBe("tailor_resume");
      expect(queue[0].group.count).toBe(3);
      expect(queue[0].group.title).toContain("3 roles");
      expect(queue[0].group.href).toBe("/applications?overviewTask=tailor");
    }
  });

  it("collapses skill nudges when there are two or more", () => {
    const queue = aggregateOverviewActions([
      {
        kind: "skill_nudge",
        priority: 150,
        title: "Add kubernetes to profile",
        subtitle: "Mentioned in JDs",
        href: "/profile?tab=skills",
        metadata: { keyword: "kubernetes", jdCount: 2 },
      },
      {
        kind: "skill_nudge",
        priority: 151,
        title: "Add rust to profile",
        subtitle: "Mentioned in JDs",
        href: "/profile?tab=skills",
        metadata: { keyword: "rust", jdCount: 2 },
      },
    ]);

    expect(queue).toHaveLength(1);
    expect(queue[0]?.type).toBe("group");
    if (queue[0]?.type === "group") {
      expect(queue[0].group.kind).toBe("skill_nudge");
      expect(queue[0].group.count).toBe(2);
    }
  });

  it("keeps a single skill nudge as a global row", () => {
    const queue = aggregateOverviewActions([
      {
        kind: "skill_nudge",
        priority: 150,
        title: "Add go to profile",
        subtitle: "Mentioned in JDs",
        href: "/profile?tab=skills",
      },
    ]);

    expect(queue).toHaveLength(1);
    expect(queue[0]?.type).toBe("global");
  });

  it("sorts queue by max priority descending", () => {
    const queue = aggregateOverviewActions([
      appAction("apply_saved", "saved", 450),
      {
        kind: "import_conflicts",
        priority: 700,
        title: "Conflicts",
        subtitle: "Review",
        href: "/profile/import",
      },
      appAction("generate_questions", "prep", 800),
    ]);

    expect(queue[0]?.type).toBe("group");
    if (queue[0]?.type === "group") {
      expect(queue[0].group.kind).toBe("generate_questions");
    }
    expect(queue[1]?.type).toBe("global");
    if (queue[1]?.type === "global") {
      expect(queue[1].action.kind).toBe("import_conflicts");
    }
  });

  it("aggregates practice_interview with total unpracticed in subtitle", () => {
    const queue = aggregateOverviewActions([
      appAction("practice_interview", "a1", 780, {
        metadata: { unpracticed: 4, applicationId: "a1" },
      }),
      appAction("practice_interview", "a2", 770, {
        metadata: { unpracticed: 8, applicationId: "a2" },
      }),
    ]);

    expect(queue).toHaveLength(1);
    if (queue[0]?.type === "group") {
      expect(queue[0].group.subtitle).toContain("12 questions");
      expect(queue[0].group.href).toBe("/applications?overviewTask=prep");
    }
  });
});

describe("groupSupportsInlineExpand", () => {
  it(`returns true when count <= ${INLINE_GROUP_MAX}`, () => {
    expect(
      groupSupportsInlineExpand({
        kind: "tailor_resume",
        priority: 1,
        title: "Tailor",
        subtitle: "",
        href: "/applications",
        count: 5,
        items: [],
      })
    ).toBe(true);
  });

  it(`returns false when count > ${INLINE_GROUP_MAX}`, () => {
    expect(
      groupSupportsInlineExpand({
        kind: "tailor_resume",
        priority: 1,
        title: "Tailor",
        subtitle: "",
        href: "/applications",
        count: 6,
        items: [],
      })
    ).toBe(false);
  });
});
