import OpenAI from "openai";
import {
  parsedResumeSchema,
  parsedJobDescriptionSchema,
  profileValidationSchema,
  linkedInImportSchema,
  type ParsedResume,
  type ParsedJobDescription,
  type ProfileValidation,
  type LinkedInImport,
} from "./schemas";
import {
  RESUME_PARSE_SYSTEM,
  RESUME_PARSE_USER,
  JD_PARSE_SYSTEM,
  JD_PARSE_USER,
  VALIDATION_SYSTEM,
  VALIDATION_USER,
} from "./prompts";
import { polishBullets } from "./write";

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function getClient(): OpenAI | null {
  if (!isOpenAiConfigured()) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function parseJson<T>(
  client: OpenAI,
  system: string,
  user: string,
  schemaName: string
): Promise<T | null> {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.1,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: schemaName,
        strict: false,
        schema: { type: "object", additionalProperties: true },
      },
    },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

export async function parseResumeText(text: string): Promise<{
  data: ParsedResume | null;
  error?: string;
  degraded?: boolean;
}> {
  const client = getClient();
  if (!client) {
    return { data: null, error: "OPENAI_API_KEY not configured", degraded: true };
  }
  try {
    const raw = await parseJson<unknown>(
      client,
      RESUME_PARSE_SYSTEM,
      RESUME_PARSE_USER(text),
      "parsed_resume"
    );
    if (!raw) return { data: null, error: "Empty AI response" };
    const parsed = parsedResumeSchema.safeParse(raw);
    if (!parsed.success) {
      return { data: null, error: parsed.error.message };
    }
    const polished = await polishParsedResumeBullets(parsed.data);
    return { data: polished };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Parse failed" };
  }
}

/**
 * Run every experience/project bullet through `polishBullets`. Import-time
 * only — manual entries are NOT polished (see plan: A4).
 */
export async function polishParsedResumeBullets(
  resume: ParsedResume
): Promise<ParsedResume> {
  const experiences = await Promise.all(
    (resume.experiences ?? []).map(async (exp) => {
      const bullets = exp.bullet_points ?? [];
      if (bullets.length === 0) return exp;
      const result = await polishBullets(bullets, exp.title);
      return { ...exp, bullet_points: result.bullets };
    })
  );
  const projects = await Promise.all(
    (resume.projects ?? []).map(async (proj) => {
      const bullets = proj.bullet_points ?? [];
      if (bullets.length === 0) return proj;
      const result = await polishBullets(bullets, proj.name);
      return { ...proj, bullet_points: result.bullets };
    })
  );
  return {
    ...resume,
    experiences: resume.experiences ? experiences : resume.experiences,
    projects: resume.projects ? projects : resume.projects,
  };
}

/**
 * Polish bullets on a LinkedIn import payload. Same rules as resume parse:
 * import-time only. Skills/education/courses have no bullets so we leave them.
 */
export async function polishLinkedInImportBullets(
  data: LinkedInImport
): Promise<LinkedInImport> {
  const experiences = await Promise.all(
    (data.experiences ?? []).map(async (exp) => {
      const bullets = exp.bullet_points ?? [];
      if (bullets.length === 0) return exp;
      const result = await polishBullets(bullets, exp.title);
      return { ...exp, bullet_points: result.bullets };
    })
  );
  const projects = await Promise.all(
    (data.projects ?? []).map(async (proj) => {
      const bullets = proj.bullet_points ?? [];
      if (bullets.length === 0) return proj;
      const result = await polishBullets(bullets, proj.name);
      return { ...proj, bullet_points: result.bullets };
    })
  );
  return {
    ...data,
    experiences: data.experiences ? experiences : data.experiences,
    projects: data.projects ? projects : data.projects,
  };
}

export async function parseJobDescription(text: string): Promise<{
  data: ParsedJobDescription | null;
  error?: string;
  degraded?: boolean;
}> {
  const client = getClient();
  if (!client) {
    return { data: null, error: "OPENAI_API_KEY not configured", degraded: true };
  }
  try {
    const raw = await parseJson<unknown>(
      client,
      JD_PARSE_SYSTEM,
      JD_PARSE_USER(text),
      "parsed_jd"
    );
    if (!raw) return { data: null, error: "Empty AI response" };
    const parsed = parsedJobDescriptionSchema.safeParse(raw);
    if (!parsed.success) return { data: null, error: parsed.error.message };
    return { data: parsed.data };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Parse failed" };
  }
}

export async function validateProfileData(
  profileJson: string
): Promise<{ data: ProfileValidation | null; error?: string; degraded?: boolean }> {
  const client = getClient();
  if (!client) {
    return {
      data: {
        completeness_score: 0,
        suggestions: [
          {
            field: "ai",
            severity: "info",
            message: "AI validation unavailable without OPENAI_API_KEY.",
            suggestion: "Configure the key to enable enrichment suggestions.",
          },
        ],
      },
      degraded: true,
    };
  }
  try {
    const raw = await parseJson<unknown>(
      client,
      VALIDATION_SYSTEM,
      VALIDATION_USER(profileJson),
      "profile_validation"
    );
    if (!raw) return { data: null, error: "Empty AI response" };
    const parsed = profileValidationSchema.safeParse(raw);
    if (!parsed.success) return { data: null, error: parsed.error.message };
    return { data: parsed.data };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Validation failed" };
  }
}

export function parseLinkedInJson(jsonText: string): {
  data: LinkedInImport | null;
  error?: string;
} {
  try {
    const raw = JSON.parse(jsonText) as unknown;
    const parsed = linkedInImportSchema.safeParse(raw);
    if (!parsed.success) return { data: null, error: parsed.error.message };
    return { data: parsed.data };
  } catch {
    return { data: null, error: "Invalid JSON" };
  }
}

/** Rule-based validation when AI is unavailable */
export function validateProfileLocally(profile: {
  headline?: string | null;
  summary?: string | null;
  experiences: { bullet_points?: string[] }[];
  skills: { name: string }[];
}): ProfileValidation {
  const suggestions: ProfileValidation["suggestions"] = [];
  if (!profile.headline?.trim()) {
    suggestions.push({
      field: "headline",
      severity: "warning",
      message: "Add a professional headline.",
      suggestion: "e.g. Software Engineer | Full-Stack",
    });
  }
  if (!profile.summary?.trim() || (profile.summary?.length ?? 0) < 80) {
    suggestions.push({
      field: "summary",
      severity: "warning",
      message: "Summary is missing or short.",
      suggestion: "Write 2–4 sentences highlighting your focus and impact.",
    });
  }
  if (profile.experiences.length === 0) {
    suggestions.push({
      field: "experiences",
      severity: "error",
      message: "No work experience on profile.",
    });
  }
  const thinBullets = profile.experiences.filter(
    (e) => (e.bullet_points?.length ?? 0) < 2
  );
  if (thinBullets.length > 0) {
    suggestions.push({
      field: "experiences.bullet_points",
      severity: "info",
      message: `${thinBullets.length} role(s) have fewer than 2 bullet points.`,
      suggestion: "Add quantified accomplishments (metrics, scope, outcomes).",
    });
  }
  if (profile.skills.length < 5) {
    suggestions.push({
      field: "skills",
      severity: "info",
      message: "Consider adding more skills for ATS matching.",
    });
  }
  let score = 100;
  for (const s of suggestions) {
    if (s.severity === "error") score -= 25;
    else if (s.severity === "warning") score -= 10;
    else score -= 5;
  }
  return {
    completeness_score: Math.max(0, Math.min(100, score)),
    suggestions,
  };
}
