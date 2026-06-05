import type { ParsedCourse, ParsedResume } from "@hirevault/ai-core";
import { parseResumeSections } from "./resume-section-parser";

function norm(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

function mergeScalar<T>(ai: T | null | undefined, det: T | null | undefined): T | undefined {
  if (ai != null && ai !== "") return ai;
  if (det != null && det !== "") return det;
  return undefined;
}

function dedupeByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function mergeExperiences(
  ai: ParsedResume["experiences"],
  det: ParsedResume["experiences"]
): ParsedResume["experiences"] {
  const combined = [...(ai ?? []), ...(det ?? [])];
  return dedupeByKey(combined, (e) =>
    `${norm(e.company)}|${norm(e.title)}|${e.start_date ?? ""}`
  );
}

function mergeLeadership(
  ai: ParsedResume["leadership"],
  det: ParsedResume["leadership"]
): ParsedResume["leadership"] {
  const combined = [...(ai ?? []), ...(det ?? [])];
  return dedupeByKey(combined, (l) =>
    `${norm(l.organization)}|${norm(l.title)}|${l.start_date ?? ""}`
  );
}

function mergeSkills(
  ai: ParsedResume["skills"],
  det: ParsedResume["skills"]
): ParsedResume["skills"] {
  const combined = [...(ai ?? []), ...(det ?? [])];
  return dedupeByKey(combined, (s) => norm(s.name));
}

function mergeEducation(
  ai: ParsedResume["education"],
  det: ParsedResume["education"]
): ParsedResume["education"] {
  const combined = [...(ai ?? []), ...(det ?? [])];
  return dedupeByKey(combined, (e) => `${norm(e.institution)}|${norm(e.degree ?? "")}`);
}

function mergeCourses(
  ai: ParsedResume["courses"],
  det: ParsedResume["courses"]
): ParsedResume["courses"] {
  const combined = [...(ai ?? []), ...(det ?? [])];
  return dedupeByKey(
    combined,
    (c) => `${norm(c.name)}|${norm(c.institution ?? "")}`
  );
}

/** Fan out education.relevant_courses into courses[] rows. */
export function fanOutCoursesFromEducation(
  education: ParsedResume["education"]
): ParsedCourse[] {
  const courses: ParsedCourse[] = [];
  for (const edu of education ?? []) {
    for (const name of edu.relevant_courses ?? []) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      courses.push({
        name: trimmed,
        institution: edu.institution ?? null,
      });
    }
  }
  return courses;
}

export interface ImportSectionCounts {
  experiences: number;
  education: number;
  leadership: number;
  skills: number;
  courses: number;
  projects: number;
}

export function countImportSections(parsed: ParsedResume): ImportSectionCounts {
  return {
    experiences: parsed.experiences?.length ?? 0,
    education: parsed.education?.length ?? 0,
    leadership: parsed.leadership?.length ?? 0,
    skills: parsed.skills?.length ?? 0,
    courses: parsed.courses?.length ?? 0,
    projects: parsed.projects?.length ?? 0,
  };
}

/**
 * Merge AI-parsed resume with deterministic section parse.
 * Prefer AI when present; backfill gaps from section parser.
 */
export function normalizeParsedResume(
  rawText: string,
  ai: ParsedResume | null
): ParsedResume {
  const det = parseResumeSections(rawText);
  const base: ParsedResume = ai ?? {};

  const education = mergeEducation(base.education, det.education);
  const fanOut = fanOutCoursesFromEducation(education);

  return {
    ...base,
    full_name: mergeScalar(base.full_name, det.full_name),
    email: mergeScalar(base.email, det.email),
    headline: mergeScalar(base.headline, det.headline ?? det.full_name),
    phone: mergeScalar(base.phone, det.phone),
    linkedin_url: mergeScalar(base.linkedin_url, det.linkedin_url),
    github_url: mergeScalar(base.github_url, det.github_url),
    portfolio_url: mergeScalar(base.portfolio_url, det.portfolio_url),
    location: mergeScalar(base.location, det.location),
    experiences: mergeExperiences(base.experiences, det.experiences),
    education,
    leadership: mergeLeadership(base.leadership, det.leadership),
    skills: mergeSkills(base.skills, det.skills),
    projects: base.projects?.length ? base.projects : det.projects,
    courses: mergeCourses(
      mergeCourses(base.courses, fanOut.length ? fanOut : undefined),
      fanOut
    ),
  };
}

/** Normalize when AI is unavailable — deterministic parse only. */
export function normalizeParsedResumeFromText(rawText: string): ParsedResume {
  return normalizeParsedResume(rawText, null);
}
