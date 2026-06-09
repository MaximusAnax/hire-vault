"use client";

import type {
  Course,
  Education,
  Experience,
  Leadership,
  Project,
  Skill,
} from "@hirevault/types";
import { cn } from "@/lib/utils";

type ProfileTab =
  | "experiences"
  | "leadership"
  | "education"
  | "projects"
  | "skills"
  | "courses";

type SkimItem = { label: string; tab: ProfileTab };

function topWorkItems(experiences: Experience[], leadership: Leadership[]): SkimItem[] {
  const items: SkimItem[] = [
    ...experiences.map((e) => ({
      label: `${e.title} @ ${e.company}`,
      tab: "experiences" as const,
    })),
    ...leadership.map((l) => ({
      label: `${l.title} @ ${l.organization}`,
      tab: "leadership" as const,
    })),
  ];
  return items.slice(0, 2);
}

function topBuildItems(projects: Project[], skills: Skill[]): SkimItem[] {
  const items: SkimItem[] = [
    ...projects.map((p) => ({ label: p.name, tab: "projects" as const })),
    ...skills.map((s) => ({ label: s.name, tab: "skills" as const })),
  ];
  return items.slice(0, 2);
}

function topCredItems(education: Education[], courses: Course[]): SkimItem[] {
  const items: SkimItem[] = [
    ...education.map((e) => ({
      label:
        [[e.degree, e.field_of_study].filter(Boolean).join(" in "), e.institution]
          .filter(Boolean)
          .join(" @ ") || e.institution,
      tab: "education" as const,
    })),
    ...courses.map((c) => ({ label: c.name, tab: "courses" as const })),
  ];
  return items.slice(0, 2);
}

function Bucket({
  title,
  count,
  items,
  defaultTab,
  onSelectTab,
}: {
  title: string;
  count: number;
  items: SkimItem[];
  defaultTab: ProfileTab;
  onSelectTab: (tab: ProfileTab) => void;
}) {
  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={() => onSelectTab(items[0]?.tab ?? defaultTab)}
      className={cn(
        "rounded-md border border-border bg-muted/20 p-3 text-left transition-colors",
        "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {items.map((item) => (
            <li key={item.label} className="truncate">
              {item.label}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Add entries</p>
      )}
    </button>
  );
}

export function ProfileSummary({
  experiences,
  leadership,
  projects,
  skills,
  education,
  courses,
  onSelectTab,
}: {
  experiences: Experience[];
  leadership: Leadership[];
  projects: Project[];
  skills: Skill[];
  education: Education[];
  courses: Course[];
  onSelectTab: (tab: ProfileTab) => void;
}) {
  const workCount = experiences.length + leadership.length;
  const buildCount = projects.length + skills.length;
  const credCount = education.length + courses.length;

  if (workCount + buildCount + credCount === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Bucket
        title="Work"
        count={workCount}
        items={topWorkItems(experiences, leadership)}
        defaultTab="experiences"
        onSelectTab={onSelectTab}
      />
      <Bucket
        title="Build"
        count={buildCount}
        items={topBuildItems(projects, skills)}
        defaultTab="projects"
        onSelectTab={onSelectTab}
      />
      <Bucket
        title="Cred"
        count={credCount}
        items={topCredItems(education, courses)}
        defaultTab="education"
        onSelectTab={onSelectTab}
      />
    </div>
  );
}

export type { ProfileTab };
