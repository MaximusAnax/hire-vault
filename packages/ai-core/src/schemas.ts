import { z } from "zod";

export const parsedExperienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  is_current: z.boolean().optional(),
  bullet_points: z.array(z.string()).optional(),
  technologies: z.array(z.string()).optional(),
});

export const parsedEducationSchema = z.object({
  institution: z.string(),
  degree: z.string().nullable().optional(),
  field_of_study: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  expected_graduation: z.string().nullable().optional(),
  gpa: z.number().nullable().optional(),
  relevant_courses: z.array(z.string()).optional(),
});

export const parsedProjectSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  technologies: z.array(z.string()).optional(),
  url: z.string().nullable().optional(),
  github_url: z.string().nullable().optional(),
  bullet_points: z.array(z.string()).optional(),
});

export const parsedSkillSchema = z.object({
  name: z.string(),
  category: z
    .enum(["language", "framework", "tool", "soft_skill"])
    .optional(),
  proficiency_level: z.number().min(1).max(5).nullable().optional(),
});

export const parsedCourseSchema = z.object({
  name: z.string(),
  institution: z.string().nullable().optional(),
  completion_date: z.string().nullable().optional(),
  credential_url: z.string().nullable().optional(),
});

export const parsedResumeSchema = z.object({
  headline: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  linkedin_url: z.string().nullable().optional(),
  github_url: z.string().nullable().optional(),
  portfolio_url: z.string().nullable().optional(),
  experiences: z.array(parsedExperienceSchema).optional(),
  education: z.array(parsedEducationSchema).optional(),
  projects: z.array(parsedProjectSchema).optional(),
  skills: z.array(parsedSkillSchema).optional(),
  courses: z.array(parsedCourseSchema).optional(),
});

export const linkedInImportSchema = z.object({
  headline: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  linkedin_url: z.string().nullable().optional(),
  experiences: z.array(parsedExperienceSchema).optional(),
  education: z.array(parsedEducationSchema).optional(),
  projects: z.array(parsedProjectSchema).optional(),
  skills: z.array(parsedSkillSchema).optional(),
});

export const validationSuggestionSchema = z.object({
  field: z.string(),
  severity: z.enum(["info", "warning", "error"]),
  message: z.string(),
  suggestion: z.string().optional(),
});

export const profileValidationSchema = z.object({
  completeness_score: z.number().min(0).max(100),
  suggestions: z.array(validationSuggestionSchema),
});

export type ParsedResume = z.infer<typeof parsedResumeSchema>;
export type LinkedInImport = z.infer<typeof linkedInImportSchema>;
export type ProfileValidation = z.infer<typeof profileValidationSchema>;
export type ValidationSuggestion = z.infer<typeof validationSuggestionSchema>;

export const parsedJobDescriptionSchema = z.object({
  title: z.string().optional(),
  company: z.string().optional(),
  // Legacy single-string location, kept for backward compatibility with older parses.
  location: z.string().nullable().optional(),
  // Preferred multi-location field — chip array. Empty array when nothing is found.
  locations: z.array(z.string()).optional(),
  required_qualifications: z.array(z.string()).optional(),
  preferred_qualifications: z.array(z.string()).optional(),
  tech_stack: z.array(z.string()).optional(),
  salary_range: z.string().nullable().optional(),
  job_type: z.enum(["full_time", "internship", "contract"]).nullable().optional(),
});

export type ParsedJobDescription = z.infer<typeof parsedJobDescriptionSchema>;

export const questionCategorySchema = z.enum([
  "behavioral",
  "technical",
  "situational",
  "role_specific",
]);
export type QuestionCategory = z.infer<typeof questionCategorySchema>;

export const resumeContentSchema = z.object({
  headline: z.string().optional(),
  summary: z.string().optional(),
  experiences: z.array(
    z.object({
      id: z.string().optional(),
      company: z.string(),
      title: z.string(),
      location: z.string().nullable().optional(),
      start_date: z.string().nullable().optional(),
      end_date: z.string().nullable().optional(),
      is_current: z.boolean().optional(),
      bullet_points: z.array(z.string()),
      technologies: z.array(z.string()).optional(),
    })
  ),
  education: z.array(z.record(z.unknown())).optional(),
  skills: z.array(z.string()).optional(),
});

export type ResumeContent = z.infer<typeof resumeContentSchema>;
