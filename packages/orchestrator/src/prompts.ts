import { readFile } from "node:fs/promises";
import path from "node:path";

export async function loadPrompt(repoRoot: string, role: "builder" | "tester"): Promise<string> {
  const file = path.join(repoRoot, "orchestration", "prompts", `${role}.md`);
  return readFile(file, "utf8");
}

export async function loadMilestoneSpec(repoRoot: string, milestone: string): Promise<string> {
  const file = path.join(repoRoot, "orchestration", "milestones", `${milestone}.md`);
  return readFile(file, "utf8");
}

export function buildBuilderPrompt(
  base: string,
  milestoneSpec: string,
  lastVerdict: string | null
): string {
  const verdictBlock = lastVerdict
    ? `\n\n## Previous Tester verdict (address all findings)\n\`\`\`json\n${lastVerdict}\n\`\`\`\n`
    : "";
  return `${base}\n\n## Active milestone spec\n${milestoneSpec}${verdictBlock}`;
}

export function buildTesterPrompt(base: string, milestoneSpec: string, rubricPath: string): string {
  return `${base}\n\n## Milestone under test\n${milestoneSpec}\n\nWrite verdict to: ${rubricPath}`;
}
