import { claudeComplete } from "./write";
import type { ParsedJobDescription } from "./schemas";

export interface ExperienceMatch {
  experienceId: string;
  company: string;
  title: string;
  score: number;
  matchedKeywords: string[];
  gaps: string[];
}

export function scoreExperiencesAgainstJd(
  experiences: {
    id: string;
    company: string;
    title: string;
    bullet_points: string[];
    technologies: string[];
  }[],
  jd: ParsedJobDescription | null,
  descriptionRaw?: string | null
): ExperienceMatch[] {
  const keywords = new Set<string>();
  const add = (s: string) => {
    s.toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .filter((w) => w.length > 2)
      .forEach((w) => keywords.add(w));
  };
  jd?.tech_stack?.forEach(add);
  jd?.required_qualifications?.forEach(add);
  jd?.preferred_qualifications?.forEach(add);
  if (descriptionRaw) add(descriptionRaw);

  const keywordList = [...keywords].slice(0, 80);

  return experiences.map((exp) => {
    const corpus = [
      exp.company,
      exp.title,
      ...exp.bullet_points,
      ...exp.technologies,
    ]
      .join(" ")
      .toLowerCase();

    const matchedKeywords = keywordList.filter((k) => corpus.includes(k));
    const score =
      keywordList.length === 0
        ? 50
        : Math.min(100, Math.round((matchedKeywords.length / keywordList.length) * 100));

    const gaps = keywordList
      .filter((k) => !corpus.includes(k))
      .slice(0, 8);

    return {
      experienceId: exp.id,
      company: exp.company,
      title: exp.title,
      score,
      matchedKeywords,
      gaps,
    };
  });
}

export function computeAtsScore(
  content: { summary?: string; experiences: { bullet_points: string[] }[] },
  jdKeywords: string[]
): { score: number; keywordGaps: string[]; density: Record<string, number> } {
  const text = [
    content.summary ?? "",
    ...content.experiences.flatMap((e) => e.bullet_points),
  ]
    .join(" ")
    .toLowerCase();

  const density: Record<string, number> = {};
  let hits = 0;
  const gaps: string[] = [];

  for (const kw of jdKeywords.slice(0, 40)) {
    const k = kw.toLowerCase();
    const count = (text.match(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? [])
      .length;
    density[k] = count;
    if (count > 0) hits++;
    else gaps.push(kw);
  }

  const score =
    jdKeywords.length === 0 ? 70 : Math.min(100, Math.round((hits / jdKeywords.length) * 100));

  return { score, keywordGaps: gaps.slice(0, 12), density };
}

export async function rewriteBullets(
  bullets: string[],
  jobContext: string
): Promise<{ bullets: string[]; degraded?: boolean; error?: string }> {
  if (bullets.length === 0) return { bullets: [] };

  const result = await claudeComplete(
    `You rewrite resume bullets for ATS and impact. Return ONLY a JSON array of strings, same count as input. Use strong verbs and metrics when possible.`,
    `Job context:\n${jobContext.slice(0, 6000)}\n\nRewrite these bullets:\n${JSON.stringify(bullets)}`
  );

  if (!result.text) {
    return {
      bullets: bullets.map((b) => b.trim()),
      degraded: result.degraded,
      error: result.error,
    };
  }

  try {
    const parsed = JSON.parse(result.text) as unknown;
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
      return { bullets: parsed as string[] };
    }
    const match = result.text.match(/\[[\s\S]*\]/);
    if (match) {
      const arr = JSON.parse(match[0]) as string[];
      return { bullets: arr };
    }
  } catch {
    /* fall through */
  }
  return { bullets, error: "Could not parse Claude response", degraded: result.degraded };
}
