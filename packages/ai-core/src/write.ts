import Anthropic from "@anthropic-ai/sdk";

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

function getClient(): Anthropic | null {
  if (!isAnthropicConfigured()) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function claudeComplete(
  system: string,
  user: string,
  maxTokens = 4096,
  model: string = "claude-sonnet-4-20250514"
): Promise<{ text: string | null; error?: string; degraded?: boolean }> {
  const client = getClient();
  if (!client) {
    return { text: null, error: "ANTHROPIC_API_KEY not configured", degraded: true };
  }
  try {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    const block = response.content.find((c) => c.type === "text");
    const text = block && block.type === "text" ? block.text : null;
    return { text };
  } catch (e) {
    return { text: null, error: e instanceof Error ? e.message : "Claude request failed" };
  }
}

/**
 * Light-touch bullet polishing for import paths only (resume parse, LinkedIn
 * import). Normalizes each bullet to a single sentence starting with an action
 * verb, preserving the original count and ordering. Manual create/update
 * paths intentionally do NOT call this — those entries are trusted as-is.
 *
 * Falls back to a no-op (trim + collapse whitespace) when ANTHROPIC_API_KEY is
 * absent so import never blocks on AI availability.
 */
const POLISH_MODEL = "claude-haiku-4-5";

export async function polishBullets(
  bullets: string[],
  role?: string | null
): Promise<{ bullets: string[]; degraded?: boolean; error?: string }> {
  const cleaned = bullets.map((b) => b.trim()).filter((b) => b.length > 0);
  if (cleaned.length === 0) return { bullets: [] };

  if (!isAnthropicConfigured()) {
    return { bullets: cleaned.map(localPolish), degraded: true };
  }

  const system =
    "You polish resume bullets without changing facts. Each bullet should: " +
    "(1) start with a strong action verb, (2) be a single sentence, " +
    "(3) keep any numbers and proper nouns the candidate provided. " +
    "Never invent metrics or scope. Return ONLY a JSON array of strings, " +
    "same length and same order as the input.";
  const roleHint = role?.trim() ? `Target role: ${role.trim()}.\n\n` : "";
  const user = `${roleHint}Polish these bullets:\n${JSON.stringify(cleaned)}`;

  const result = await claudeComplete(system, user, 1024, POLISH_MODEL);
  if (!result.text) {
    return { bullets: cleaned.map(localPolish), degraded: result.degraded, error: result.error };
  }

  try {
    const direct = JSON.parse(result.text) as unknown;
    if (Array.isArray(direct) && direct.every((x) => typeof x === "string")) {
      const arr = direct as string[];
      if (arr.length === cleaned.length) return { bullets: arr.map((b) => b.trim()) };
    }
    const match = result.text.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]) as unknown;
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
        const arr = parsed as string[];
        if (arr.length === cleaned.length) return { bullets: arr.map((b) => b.trim()) };
      }
    }
  } catch {
    /* fall through to local polish */
  }
  return {
    bullets: cleaned.map(localPolish),
    degraded: result.degraded,
    error: "Could not parse polish response",
  };
}

function localPolish(b: string): string {
  let s = b.replace(/\s+/g, " ").trim();
  if (!s) return s;
  s = s.replace(/^[-*•·]+\s*/, "");
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return s;
}
