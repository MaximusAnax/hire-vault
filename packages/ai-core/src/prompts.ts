export const RESUME_PARSE_SYSTEM = `You are a resume parsing assistant. Extract structured career data from resume text.
Return valid JSON matching the schema exactly. Use ISO date strings (YYYY-MM-DD) when dates are known; use YYYY-MM when only month/year is known.
Omit fields you cannot infer. Do not invent employers or degrees not present in the text.`;

export const RESUME_PARSE_USER = (text: string) =>
  `Parse this resume into structured JSON with keys: full_name, email, headline, summary, location, phone, linkedin_url, github_url, portfolio_url, experiences[], education[], leadership[], projects[], skills[], courses[].

Heading / contact:
- full_name: person's name from the resume header (not a job title).
- email: email address if present.

Experience section:
- Each experience: company, title, location, start_date, end_date, is_current, bullet_points[], technologies[].
- Some resumes list title + dates on the first line and company + location on the second — preserve correct company vs title; do NOT swap them.

Education section:
- Each education: institution, degree, field_of_study, start_date, expected_graduation, gpa, relevant_courses[].
- Split "Relevant Coursework:" comma-separated lists into relevant_courses[] (one course per entry, include course codes if present).

Leadership section (clubs, councils, org roles — NOT paid jobs):
- Each leadership entry: organization, title, location, start_date, end_date, is_current, bullet_points[].
- Map organization name and role title correctly (e.g. org "Inter fraternity Council", title "President").

Technical Skills section:
- Emit one skill object per technology/tool/language listed.
- Set category from group heading: language|framework|tool|soft_skill.
  - "Machine Learning", "Languages", "Languages, Libraries, & Frameworks" → framework or language as appropriate.
  - "Data Infrastructure", tools, cloud, databases → tool.

Projects: name, description, technologies[], url, github_url, bullet_points[].
Courses (standalone certs): name, institution, completion_date, credential_url.

Resume text:
---
${text.slice(0, 28000)}
---`;

export const JD_PARSE_SYSTEM = `Extract structured job posting data. Return JSON only.`;

export const JD_PARSE_USER = (text: string) =>
  `Parse this job description. Return JSON with keys: title, company, location, locations, required_qualifications[], preferred_qualifications[], tech_stack[], salary_range, job_type (full_time|internship|contract), role_season (spring|summer|fall|winter), role_year (e.g. 2026 for Fall 2026 cohorts).

Rules for locations:
- "locations" MUST be an array of strings. Include every distinct location mentioned (cities, regions, "Remote", "Hybrid – San Francisco", etc.).
- If multiple are listed (e.g. "San Francisco, New York, or Remote"), output each as a separate array entry. Do NOT merge them with commas.
- "location" should be the first/primary location string (kept for backward compatibility). Leave null if none is mentioned.
- Use the literal strings as they appear; do not invent locations.

Job description:
---
${text.slice(0, 12000)}
---`;

export const VALIDATION_SYSTEM = `You review career profiles for completeness and quality. Return JSON with completeness_score (0-100) and suggestions array.`;

export const VALIDATION_USER = (profileJson: string) =>
  `Review this profile JSON and suggest improvements. Each suggestion: field, severity (info|warning|error), message, optional suggestion.

Profile:
${profileJson.slice(0, 12000)}`;
