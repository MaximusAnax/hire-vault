import type {
  OverviewAction,
  OverviewActionGroup,
  OverviewActionKind,
  OverviewQueueItem,
} from "@hirevault/types";

const GLOBAL_KINDS = new Set<OverviewActionKind>([
  "profile_blocker",
  "import_conflicts",
  "capture_review",
]);

const GROUPABLE_KINDS = new Set<OverviewActionKind>([
  "tailor_resume",
  "keyword_gaps",
  "export_pdf",
  "apply_saved",
  "generate_questions",
  "practice_interview",
]);

/** Max child actions shown inline before linking to Applications. */
export const INLINE_GROUP_MAX = 5;

const GROUP_TITLES: Record<OverviewActionKind, (count: number) => string> = {
  tailor_resume: (n) => (n === 1 ? "Tailor resume" : `Tailor resumes · ${n} roles`),
  keyword_gaps: (n) => (n === 1 ? "Fix keyword gaps" : `Fix keyword gaps · ${n} roles`),
  export_pdf: (n) => (n === 1 ? "Export resume PDF" : `Export resume PDFs · ${n} roles`),
  apply_saved: (n) => (n === 1 ? "Apply to saved role" : `Apply to saved roles · ${n} roles`),
  generate_questions: (n) =>
    n === 1 ? "Generate interview questions" : `Generate interview questions · ${n} roles`,
  practice_interview: (n) => {
    return n === 1 ? "Practice interview questions" : `Practice interview questions · ${n} roles`;
  },
  profile_blocker: (n) => `${n} profile blockers`,
  import_conflicts: (n) => `${n} import conflicts`,
  capture_review: (n) => `Review ${n} captured roles`,
  skill_nudge: (n) =>
    n === 1 ? "Add skill from job descriptions" : `Add skills from job descriptions · ${n}`,
};

const GROUP_SUBTITLES: Partial<Record<OverviewActionKind, string>> = {
  tailor_resume: "No tailored resume yet",
  keyword_gaps: "Resume missing JD keywords",
  export_pdf: "Tailored but no PDF exported",
  apply_saved: "Saved roles ready to apply",
  generate_questions: "Screening and interview stage",
  practice_interview: "Questions not practiced yet",
};

const OVERVIEW_TASK_HREF: Partial<Record<OverviewActionKind, string>> = {
  tailor_resume: "/applications?overviewTask=tailor",
  keyword_gaps: "/applications?overviewTask=gaps",
  export_pdf: "/applications?overviewTask=pdf",
  apply_saved: "/applications?overviewTask=saved",
  generate_questions: "/applications?overviewTask=prep",
  practice_interview: "/applications?overviewTask=prep",
};

function compareActions(a: OverviewAction, b: OverviewAction): number {
  if (b.priority !== a.priority) return b.priority - a.priority;

  const statusA = (a.metadata?.statusWeight as number | undefined) ?? 0;
  const statusB = (b.metadata?.statusWeight as number | undefined) ?? 0;
  if (statusB !== statusA) return statusB - statusA;

  const updatedA = (a.metadata?.lastUpdated as string | undefined) ?? "";
  const updatedB = (b.metadata?.lastUpdated as string | undefined) ?? "";
  if (updatedA !== updatedB) return updatedA.localeCompare(updatedB);

  return a.title.localeCompare(b.title);
}

function compareQueueItems(a: OverviewQueueItem, b: OverviewQueueItem): number {
  const priorityA = a.type === "global" ? a.action.priority : a.group.priority;
  const priorityB = b.type === "global" ? b.action.priority : b.group.priority;
  if (priorityB !== priorityA) return priorityB - priorityA;

  const titleA = a.type === "global" ? a.action.title : a.group.title;
  const titleB = b.type === "global" ? b.action.title : b.group.title;
  return titleA.localeCompare(titleB);
}

function buildGroup(kind: OverviewActionKind, items: OverviewAction[]): OverviewActionGroup {
  const sorted = [...items].sort(compareActions);
  const count = sorted.length;
  const priority = Math.max(...sorted.map((item) => item.priority));

  let subtitle = GROUP_SUBTITLES[kind] ?? sorted[0]?.subtitle ?? "";
  if (kind === "practice_interview") {
    const totalUnpracticed = sorted.reduce(
      (sum, item) => sum + ((item.metadata?.unpracticed as number | undefined) ?? 0),
      0
    );
    if (totalUnpracticed > 0) {
      subtitle =
        count === 1
          ? `${totalUnpracticed} question${totalUnpracticed === 1 ? "" : "s"} not practiced`
          : `${count} roles · ${totalUnpracticed} questions total`;
    }
  }

  return {
    kind,
    priority,
    title: GROUP_TITLES[kind](count),
    subtitle,
    href: OVERVIEW_TASK_HREF[kind] ?? sorted[0]?.href ?? "/applications",
    count,
    items: sorted,
  };
}

function buildSkillNudgeGroup(items: OverviewAction[]): OverviewActionGroup {
  const sorted = [...items].sort(compareActions);
  return {
    kind: "skill_nudge",
    priority: Math.max(...sorted.map((item) => item.priority)),
    title: GROUP_TITLES.skill_nudge(sorted.length),
    subtitle: "Mentioned in multiple job descriptions you're tracking",
    href: "/profile?tab=skills",
    count: sorted.length,
    items: sorted,
  };
}

export function aggregateOverviewActions(actions: OverviewAction[]): OverviewQueueItem[] {
  const queue: OverviewQueueItem[] = [];
  const groupBuckets = new Map<OverviewActionKind, OverviewAction[]>();
  const skillNudges: OverviewAction[] = [];

  for (const action of actions) {
    if (GLOBAL_KINDS.has(action.kind)) {
      queue.push({ type: "global", action });
      continue;
    }

    if (action.kind === "skill_nudge") {
      skillNudges.push(action);
      continue;
    }

    if (GROUPABLE_KINDS.has(action.kind)) {
      const bucket = groupBuckets.get(action.kind) ?? [];
      bucket.push(action);
      groupBuckets.set(action.kind, bucket);
    }
  }

  for (const [kind, items] of groupBuckets) {
    if (items.length > 0) {
      queue.push({ type: "group", group: buildGroup(kind, items) });
    }
  }

  if (skillNudges.length >= 2) {
    queue.push({ type: "group", group: buildSkillNudgeGroup(skillNudges) });
  } else {
    for (const action of skillNudges) {
      queue.push({ type: "global", action });
    }
  }

  return queue.sort(compareQueueItems);
}

export function groupSupportsInlineExpand(group: OverviewActionGroup): boolean {
  return group.count <= INLINE_GROUP_MAX;
}
