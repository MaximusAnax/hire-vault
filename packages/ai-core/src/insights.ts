import { validateProfileLocally } from "./parse";
import type { ProfileValidation } from "./schemas";

export interface ProfileStrength {
  overall: number;
  sections: { name: string; score: number; note: string }[];
  validation: ProfileValidation;
}

export interface ApplicationStrategy {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
}

export interface SkillGap {
  skill: string;
  demandCount: number;
  hasSkill: boolean;
}

export function analyzeProfileStrength(profile: {
  headline?: string | null;
  summary?: string | null;
  experiences: { bullet_points?: string[]; technologies?: string[] }[];
  education: unknown[];
  projects: unknown[];
  skills: { name: string }[];
}): ProfileStrength {
  const validation = validateProfileLocally(profile);
  const sections = [
    {
      name: "Headline & summary",
      score: profile.headline && (profile.summary?.length ?? 0) > 80 ? 90 : 55,
      note: profile.summary?.trim() ? "Summary present" : "Expand professional summary",
    },
    {
      name: "Experience depth",
      score: Math.min(
        100,
        profile.experiences.reduce((n, e) => n + (e.bullet_points?.length ?? 0), 0) * 8
      ),
      note: `${profile.experiences.length} roles on profile`,
    },
    {
      name: "Skills breadth",
      score: Math.min(100, profile.skills.length * 8),
      note: `${profile.skills.length} skills listed`,
    },
    {
      name: "Projects & education",
      score: Math.min(100, (profile.projects.length + profile.education.length) * 25),
      note: "Supporting credentials for technical roles",
    },
  ];
  const overall = Math.round(
    sections.reduce((a, s) => a + s.score, 0) / sections.length
  );
  return { overall, sections, validation };
}

export function recommendApplicationStrategy(stats: {
  total: number;
  applied: number;
  screening: number;
  interview: number;
  offer: number;
  rejected: number;
  responseRate: number;
  velocity30d: number;
}): ApplicationStrategy[] {
  const strategies: ApplicationStrategy[] = [];

  if (stats.total < 5) {
    strategies.push({
      title: "Increase pipeline volume",
      detail: "Aim for 10–15 saved roles before heavy tailoring. Quality + quantity.",
      priority: "high",
    });
  }
  if (stats.responseRate < 15 && stats.applied > 3) {
    strategies.push({
      title: "Improve response rate",
      detail: "Tailor resumes per role, add referrals, and target closer skill matches.",
      priority: "high",
    });
  }
  if (stats.interview > 0 && stats.offer === 0) {
    strategies.push({
      title: "Convert interviews to offers",
      detail: "Run mock sessions and company research before each onsite.",
      priority: "medium",
    });
  }
  if (stats.velocity30d < 2) {
    strategies.push({
      title: "Raise weekly velocity",
      detail: "Set a goal of 2+ applications per week with extension capture.",
      priority: "medium",
    });
  }
  if (strategies.length === 0) {
    strategies.push({
      title: "Maintain momentum",
      detail: "Pipeline looks healthy — keep practicing interviews and updating profile.",
      priority: "low",
    });
  }
  return strategies;
}

export function analyzeSkillGaps(
  profileSkills: string[],
  jobTechStacks: string[][]
): SkillGap[] {
  const demand = new Map<string, number>();
  for (const stack of jobTechStacks) {
    for (const s of stack) {
      const key = s.toLowerCase().trim();
      if (key) demand.set(key, (demand.get(key) ?? 0) + 1);
    }
  }
  const profileSet = new Set(profileSkills.map((s) => s.toLowerCase().trim()));
  return [...demand.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([skill, demandCount]) => ({
      skill,
      demandCount,
      hasSkill: profileSet.has(skill) || [...profileSet].some((p) => skill.includes(p) || p.includes(skill)),
    }));
}

export function interviewPerformanceTrend(
  sessions: { score: number | null; conducted_at: string; session_type: string }[]
): { label: string; score: number }[] {
  return sessions
    .filter((s) => s.score != null)
    .slice(0, 10)
    .reverse()
    .map((s, i) => ({
      label: new Date(s.conducted_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      score: s.score as number,
    }));
}
