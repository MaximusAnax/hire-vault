import { describe, expect, it } from "vitest";
import { JD_PARSE_USER } from "./prompts";
import { parsedJobDescriptionSchema } from "./schemas";

describe("JD_PARSE_USER", () => {
  it("includes title disambiguation rules (not page chrome)", () => {
    const prompt = JD_PARSE_USER("sample jd");
    expect(prompt).toContain("job role name only");
    expect(prompt).toContain("Job Application for");
    expect(prompt).toContain("page chrome");
  });

  it("includes cohort extraction guidance for internships", () => {
    const prompt = JD_PARSE_USER("sample jd");
    expect(prompt).toContain("role_season");
    expect(prompt).toContain("role_year");
    expect(prompt).toContain("Summer 2027 cohort");
    expect(prompt).toContain("not only when they appear in the title");
  });

  it("includes few-shot examples for intern, new-grad, and multi-location", () => {
    const prompt = JD_PARSE_USER("sample jd");
    expect(prompt).toContain("Example 1");
    expect(prompt).toContain("Software Engineering Intern");
    expect(prompt).toContain("Example 2");
    expect(prompt).toContain("New Grad Software Engineer");
    expect(prompt).toContain("Example 3");
    expect(prompt).toContain("Fall 2026");
    expect(prompt).toContain("Remote (US)");
  });

  it("truncates very long job descriptions", () => {
    const longText = "x".repeat(15_000);
    const prompt = JD_PARSE_USER(longText);
    expect(prompt).not.toContain("x".repeat(15_000));
    expect(prompt).toContain("x".repeat(12_000));
  });
});

describe("parsedJobDescriptionSchema — JD parse targets", () => {
  it("accepts intern Fall 2026 with multi-location (few-shot example 3 shape)", () => {
    const result = parsedJobDescriptionSchema.safeParse({
      title: "Data Science Intern",
      job_type: "internship",
      role_season: "fall",
      role_year: 2026,
      locations: ["New York", "Austin", "Remote (US)"],
      location: "New York",
    });
    expect(result.success).toBe(true);
  });

  it("accepts intern Summer 2027 cohort from body (few-shot example 1 shape)", () => {
    const result = parsedJobDescriptionSchema.safeParse({
      title: "Software Engineering Intern",
      company: "Stripe",
      job_type: "internship",
      role_season: "summer",
      role_year: 2027,
      locations: ["San Francisco", "Remote"],
      location: "San Francisco",
    });
    expect(result.success).toBe(true);
  });

  it("accepts new-grad full-time without cohort timing (few-shot example 2 shape)", () => {
    const result = parsedJobDescriptionSchema.safeParse({
      title: "New Grad Software Engineer, Backend",
      job_type: "full_time",
      role_season: null,
      role_year: null,
      locations: ["Seattle, WA"],
      location: "Seattle, WA",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid role_year", () => {
    const result = parsedJobDescriptionSchema.safeParse({
      title: "Intern",
      role_year: 1999,
    });
    expect(result.success).toBe(false);
  });
});
