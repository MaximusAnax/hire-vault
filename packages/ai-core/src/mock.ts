import { claudeComplete } from "./write";

export interface MockTurn {
  role: "interviewer" | "candidate";
  content: string;
  timestamp: string;
}

export interface MockFeedback {
  score: number;
  star_score: number;
  specificity_score: number;
  strengths: string[];
  improvements: string[];
  summary: string;
}

export async function generateMockQuestion(
  jobTitle: string,
  company: string,
  sessionType: "behavioral" | "technical" | "mixed",
  priorQuestions: string[]
): Promise<string> {
  const result = await claudeComplete(
    `You are a mock interviewer. Ask ONE question only, no preamble.`,
    `Role: ${jobTitle} at ${company}. Type: ${sessionType}. Already asked: ${priorQuestions.join("; ") || "none"}.`
  );
  return (
    result.text?.trim() ??
    `Tell me about a time you demonstrated skills relevant to ${jobTitle}.`
  );
}

export async function evaluateMockAnswer(
  question: string,
  answer: string,
  sessionType: string
): Promise<{ feedback: MockFeedback; degraded?: boolean }> {
  const result = await claudeComplete(
    `Evaluate mock interview answers. Return ONLY JSON: { score (0-100), star_score, specificity_score, strengths[], improvements[], summary }`,
    `Type: ${sessionType}\nQ: ${question}\nA: ${answer}`
  );

  const fallback: MockFeedback = {
    score: 65,
    star_score: 60,
    specificity_score: 55,
    strengths: ["Clear attempt to answer the question"],
    improvements: [
      "Add a specific Situation and measurable Result",
      "Name technologies and scope (team size, timeline)",
    ],
    summary: "Configure ANTHROPIC_API_KEY for AI scoring. Self-rate and iterate.",
  };

  if (!result.text) return { feedback: fallback, degraded: true };

  try {
    const parsed = JSON.parse(result.text) as MockFeedback;
    if (typeof parsed.score === "number") return { feedback: parsed };
  } catch {
    /* fallback */
  }
  return { feedback: fallback, degraded: result.degraded };
}
