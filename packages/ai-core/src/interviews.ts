import { claudeComplete } from "./write";
import { parseJobDescription } from "./parse";
import type { QuestionCategory } from "./schemas";

export interface GeneratedQuestion {
  question: string;
  category: QuestionCategory;
  difficulty: number;
  technical_topics?: string[];
}

const FALLBACK_QUESTIONS: GeneratedQuestion[] = [
  { question: "Tell me about yourself.", category: "behavioral", difficulty: 2 },
  { question: "Describe a challenging project and your role.", category: "behavioral", difficulty: 3 },
  { question: "Why are you interested in this company?", category: "situational", difficulty: 2 },
  { question: "Walk me through a technical decision you made recently.", category: "technical", difficulty: 4 },
  { question: "How do you handle conflicting priorities?", category: "situational", difficulty: 3 },
];

export async function generateInterviewQuestions(
  jobDescription: string,
  count = 8
): Promise<{ questions: GeneratedQuestion[]; degraded?: boolean; error?: string }> {
  const jd = await parseJobDescription(jobDescription);
  const stack = jd.data?.tech_stack?.join(", ") ?? "general";

  const result = await claudeComplete(
    `Generate interview prep questions. Return ONLY JSON: { "questions": [{ "question", "category" (behavioral|technical|situational|role_specific), "difficulty" (1-5), "technical_topics"?: string[] }] }`,
    `Generate ${count} interview questions for this role. Emphasize stack: ${stack}.\n\nJD:\n${jobDescription.slice(0, 8000)}`
  );

  if (!result.text) {
    return {
      questions: FALLBACK_QUESTIONS.slice(0, count),
      degraded: true,
      error: result.error,
    };
  }

  try {
    const parsed = JSON.parse(result.text) as { questions?: GeneratedQuestion[] };
    if (parsed.questions?.length) return { questions: parsed.questions.slice(0, count) };
  } catch {
    /* fallback */
  }
  return { questions: FALLBACK_QUESTIONS.slice(0, count), degraded: result.degraded };
}

export async function personalizeAnswer(
  question: string,
  profileJson: string,
  jobContext: string
): Promise<{ answer: string; degraded?: boolean; error?: string }> {
  const result = await claudeComplete(
    `Write a concise STAR-style interview answer (150-250 words) using ONLY facts from the candidate profile. No fabrication.`,
    `Question: ${question}\n\nProfile:\n${profileJson.slice(0, 10000)}\n\nJob:\n${jobContext.slice(0, 4000)}`
  );

  if (!result.text) {
    return {
      answer:
        "Configure ANTHROPIC_API_KEY to generate personalized answers from your profile. Draft your own STAR response: Situation, Task, Action, Result.",
      degraded: true,
      error: result.error,
    };
  }
  return { answer: result.text.trim() };
}

export async function refineAnswer(
  question: string,
  draft: string,
  feedback?: string
): Promise<{ answer: string; degraded?: boolean }> {
  const result = await claudeComplete(
    `Improve interview answers: clearer structure, metrics, specificity. Return only the improved answer text.`,
    `Question: ${question}\nDraft:\n${draft}\n${feedback ? `Feedback: ${feedback}` : ""}`
  );
  return {
    answer: result.text?.trim() ?? draft,
    degraded: result.degraded,
  };
}

export function technicalPrepTopics(
  techStack: string[],
  jobDescription: string
): string[] {
  const topics = new Set<string>(techStack);
  const patterns: [RegExp, string][] = [
    [/\b(system design|distributed|scale)\b/i, "System design fundamentals"],
    [/\b(algorithm|leetcode|coding)\b/i, "Algorithms & data structures"],
    [/\b(sql|postgres|database)\b/i, "SQL & database design"],
    [/\b(react|frontend|ui)\b/i, "Frontend architecture"],
    [/\b(kubernetes|docker|aws|cloud)\b/i, "Cloud & DevOps"],
    [/\b(machine learning|ml|ai)\b/i, "ML concepts"],
  ];
  for (const [re, label] of patterns) {
    if (re.test(jobDescription)) topics.add(label);
  }
  return [...topics].slice(0, 12);
}
