import { describe, expect, it } from "vitest";
import { buildExistingQuestionsBlock } from "./interviews";

/**
 * `buildExistingQuestionsBlock` is the seam used by
 * `generateInterviewQuestions` to keep newly generated questions from
 * duplicating ground already covered by the role's question bank. The
 * Anthropic SDK is not mocked here — we only assert the prompt fragment.
 */

describe("buildExistingQuestionsBlock", () => {
  it("returns an empty string when no existing questions are provided", () => {
    expect(buildExistingQuestionsBlock(undefined, 10)).toBe("");
    expect(buildExistingQuestionsBlock([], 10)).toBe("");
  });

  it("includes every existing question verbatim in the prompt block", () => {
    const existing = [
      "Tell me about a time you led a cross-team initiative.",
      "Why are you interested in this role?",
      "Walk me through your most complex system design.",
    ];
    const block = buildExistingQuestionsBlock(existing, 8);

    for (const q of existing) {
      expect(block).toContain(q);
    }
    // Numbered list, in order:
    expect(block.indexOf("1.")).toBeLessThan(block.indexOf("2."));
    expect(block.indexOf("2.")).toBeLessThan(block.indexOf("3."));
  });

  it("instructs the model not to duplicate and to target uncovered angles", () => {
    const block = buildExistingQuestionsBlock(["Tell me about yourself."], 5);
    expect(block).toMatch(/do NOT duplicate/i);
    expect(block).toMatch(/different angles/i);
    expect(block).toMatch(/uncovered parts/i);
  });

  it("references the requested count in the saturation escape hatch", () => {
    const block = buildExistingQuestionsBlock(["Q1"], 12);
    expect(block).toContain("fewer than 12");
  });
});
