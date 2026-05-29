import { createHash } from "crypto";
import OpenAI from "openai";
import { isOpenAiConfigured } from "./parse";

/**
 * Hybrid AI summary engine.
 *
 * Cost-aware design:
 *   - per-entity 1-2 sentence snippets are generated with `gpt-4o-mini` and
 *     cached by content hash, so unchanged entities never re-spend tokens.
 *   - a single cheap "stitch" call assembles the cached snippets into a 3-5
 *     sentence profile narrative when the user clicks Regenerate.
 *
 * Both calls degrade gracefully if `OPENAI_API_KEY` is not configured.
 */

export const SNIPPET_MODEL = "gpt-4o-mini";
export const ASSEMBLE_MODEL = "gpt-4o-mini";

export type SummaryEntityType =
  | "experience"
  | "education"
  | "project"
  | "skill"
  | "course";

export interface SnippetEntity {
  type: SummaryEntityType;
  id: string;
  /** Free-form normalized payload describing the entity. */
  fields: Record<string, unknown>;
}

export interface SummaryProfileContext {
  target_roles?: string[] | null;
  pitch?: string | null;
  headline?: string | null;
  location?: string | null;
}

export interface CachedSnippet {
  entity_type: SummaryEntityType;
  entity_id: string;
  snippet: string;
}

function getClient(): OpenAI | null {
  if (!isOpenAiConfigured()) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/** Normalize an arbitrary value so equivalent inputs hash identically. */
function normalizeValue(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value === "string") return value.trim().toLowerCase().replace(/\s+/g, " ");
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = normalizeValue((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/**
 * Deterministic hash of an entity's content. Whitespace, case, and key order
 * differences all collapse to the same hash so we don't churn the cache on
 * cosmetic edits.
 */
export function entityHash(entity: SnippetEntity): string {
  const payload = JSON.stringify({
    type: entity.type,
    fields: normalizeValue(entity.fields),
  });
  return createHash("sha256").update(payload).digest("hex");
}

function describeEntityForPrompt(entity: SnippetEntity): string {
  const lines: string[] = [`Entity type: ${entity.type}`];
  for (const [key, value] of Object.entries(entity.fields)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${key}: ${value.join(", ")}`);
    } else if (typeof value === "object") {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`${key}: ${String(value)}`);
    }
  }
  return lines.join("\n");
}

/**
 * Generate a 1–2 sentence snippet (~25 words) for a single profile entity.
 * Returns `null` text if the OpenAI client is not configured so callers can
 * fall back to a deterministic local snippet.
 */
export async function generateSnippet(entity: SnippetEntity): Promise<{
  snippet: string | null;
  model: string;
  degraded?: boolean;
  error?: string;
}> {
  const client = getClient();
  if (!client) {
    return { snippet: null, model: SNIPPET_MODEL, degraded: true, error: "OPENAI_API_KEY not configured" };
  }

  const system =
    "You write extremely concise, factual snippets about a single career entity. " +
    "Return ONE or TWO sentences, about 25 words, no preamble, no markdown. " +
    "Use only the facts provided; never invent metrics or employers.";
  const user = `Summarize this ${entity.type} for use as a building block of a longer profile summary.\n\n${describeEntityForPrompt(entity)}`;

  try {
    const response = await client.chat.completions.create({
      model: SNIPPET_MODEL,
      temperature: 0.2,
      max_tokens: 120,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = response.choices[0]?.message?.content?.trim() ?? null;
    return { snippet: raw, model: SNIPPET_MODEL };
  } catch (e) {
    return {
      snippet: null,
      model: SNIPPET_MODEL,
      error: e instanceof Error ? e.message : "Snippet generation failed",
    };
  }
}

/**
 * Stitch cached snippets into a 3–5 sentence profile narrative. Single cheap
 * call. Falls back to a concatenation if the OpenAI client is not configured.
 */
export async function assembleSummary(
  snippets: CachedSnippet[],
  profile: SummaryProfileContext
): Promise<{
  summary: string;
  model: string;
  degraded?: boolean;
  error?: string;
}> {
  const cleanedSnippets = snippets.map((s) => s.snippet.trim()).filter(Boolean);

  if (cleanedSnippets.length === 0) {
    return {
      summary: "",
      model: ASSEMBLE_MODEL,
      degraded: true,
    };
  }

  const client = getClient();
  if (!client) {
    const fallback = cleanedSnippets.slice(0, 5).join(" ");
    return { summary: clampSentences(fallback, 5), model: ASSEMBLE_MODEL, degraded: true };
  }

  const targetRoles = (profile.target_roles ?? []).filter(Boolean);
  const pitch = profile.pitch?.trim() ?? "";

  const system =
    "You are a career coach. Write a 3-5 sentence professional summary in first-person voice. " +
    "Use only the snippets and context provided. Do not invent companies, metrics, or skills. " +
    "Lead with the candidate's target roles when present, then weave in strongest experiences, " +
    "projects, and credentials. Output plain text only.";

  const context = [
    targetRoles.length ? `Target roles: ${targetRoles.join(", ")}` : null,
    pitch ? `Personal pitch: ${pitch}` : null,
    profile.location ? `Location: ${profile.location}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const user = [
    context,
    "",
    "Per-entity snippets:",
    ...cleanedSnippets.map((s, i) => `- (${i + 1}) ${s}`),
  ].join("\n");

  try {
    const response = await client.chat.completions.create({
      model: ASSEMBLE_MODEL,
      temperature: 0.3,
      max_tokens: 320,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = response.choices[0]?.message?.content?.trim() ?? "";
    if (!raw) {
      const fallback = cleanedSnippets.slice(0, 5).join(" ");
      return { summary: clampSentences(fallback, 5), model: ASSEMBLE_MODEL, degraded: true, error: "Empty AI response" };
    }
    return { summary: clampSentences(raw, 5), model: ASSEMBLE_MODEL };
  } catch (e) {
    const fallback = cleanedSnippets.slice(0, 5).join(" ");
    return {
      summary: clampSentences(fallback, 5),
      model: ASSEMBLE_MODEL,
      degraded: true,
      error: e instanceof Error ? e.message : "Assemble failed",
    };
  }
}

/** Hard-cap to N sentences so we never exceed the design budget. */
function clampSentences(text: string, maxSentences: number): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  const parts = trimmed.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? [trimmed];
  return parts.slice(0, maxSentences).map((s) => s.trim()).join(" ");
}
