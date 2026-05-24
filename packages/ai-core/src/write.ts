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
  maxTokens = 4096
): Promise<{ text: string | null; error?: string; degraded?: boolean }> {
  const client = getClient();
  if (!client) {
    return { text: null, error: "ANTHROPIC_API_KEY not configured", degraded: true };
  }
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
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
