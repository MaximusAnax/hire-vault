import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { ResumeContent } from "@hirevault/ai-core";

const execFileAsync = promisify(execFile);

const PREAMBLE_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../templates/resume-preamble.tex"
);

export interface LatexProfileHeader {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
}

export interface LatexEducationRow {
  institution: string;
  degree?: string | null;
  field_of_study?: string | null;
  location?: string | null;
  start_date?: string | null;
  expected_graduation?: string | null;
  relevant_courses?: string[];
}

export interface LatexExperienceRow {
  id?: string;
  title: string;
  company: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  bullet_points: string[];
}

export interface LatexLeadershipRow {
  organization: string;
  title: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  bullet_points: string[];
}

export interface LatexResumeInput {
  header: LatexProfileHeader;
  technical_skills_tex: string;
  education: LatexEducationRow[];
  experiences: LatexExperienceRow[];
  leadership: LatexLeadershipRow[];
  /** Optional tailored overrides keyed by experience id */
  tailored?: ResumeContent | null;
}

export function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[&%$#_{}]/g, (m) => `\\${m}`)
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function formatUrlForHeading(url: string): { href: string; label: string } {
  const trimmed = url.trim();
  const label = trimmed.replace(/^https?:\/\/(www\.)?/i, "");
  return { href: escapeLatex(trimmed), label: escapeLatex(label) };
}

function formatDateRange(
  start?: string | null,
  end?: string | null,
  isCurrent?: boolean
): string {
  const s = start?.trim() ?? "";
  const e = isCurrent ? "Present" : (end?.trim() ?? "");
  if (s && e) return `${escapeLatex(s)} -- ${escapeLatex(e)}`;
  if (s) return escapeLatex(s);
  if (e) return escapeLatex(e);
  return "";
}

function buildHeading(header: LatexProfileHeader): string {
  const name = escapeLatex(header.full_name.trim() || "Professional");
  const parts: string[] = [];
  if (header.phone?.trim()) parts.push(escapeLatex(header.phone.trim()));
  if (header.email?.trim()) {
    const e = escapeLatex(header.email.trim());
    parts.push(`\\href{mailto:${e}}{\\underline{${e}}}`);
  }
  if (header.linkedin_url?.trim()) {
    const { href, label } = formatUrlForHeading(header.linkedin_url);
    parts.push(`\\href{${href}}{\\underline{${label}}}`);
  }
  if (header.github_url?.trim()) {
    const { href, label } = formatUrlForHeading(header.github_url);
    parts.push(`\\href{${href}}{\\underline{${label}}}`);
  }
  const line = parts.join(" $|$ ");
  return `\\begin{center}\n    \\textbf{\\Huge \\scshape ${name}} \\\\ \\vspace{1pt}\n    \\small ${line}\n\\end{center}\n\n`;
}

function buildEducation(education: LatexEducationRow[]): string {
  if (!education.length) return "";
  const blocks = education.map((edu) => {
    const degreeLine = [edu.degree, edu.field_of_study].filter(Boolean).join(" in ");
    const dateLine = edu.expected_graduation
      ? `Expected Graduation: ${edu.expected_graduation}`
      : formatDateRange(edu.start_date, null, false);
    const extras: string[] = [];
    if (edu.relevant_courses?.length) {
      extras.push(
        `Relevant Coursework: ${edu.relevant_courses.map(escapeLatex).join(", ")}`
      );
    }
    const item = extras.length
      ? `\n      \\resumeItem{${escapeLatex(extras.join(". "))}}`
      : "";
    return `    \\resumeSubheading
      {${escapeLatex(edu.institution)}}{${escapeLatex(edu.location ?? "")}}
      {${escapeLatex(degreeLine)}}{${escapeLatex(dateLine)}}${item}`;
  });
  return `%-----------EDUCATION-----------\n\\section{Education}\n  \\resumeSubHeadingListStart\n${blocks.join("\n")}\n  \\resumeSubHeadingListEnd\n\n`;
}

function bulletsBlock(bullets: string[]): string {
  if (!bullets.length) return "";
  const items = bullets
    .map((b) => `        \\resumeItem{${escapeLatex(b)}}`)
    .join("\n");
  return `\n      \\resumeItemListStart\n${items}\n      \\resumeItemListEnd`;
}

function buildExperiences(
  experiences: LatexExperienceRow[],
  tailored?: ResumeContent | null
): string {
  if (!experiences.length) return "";
  const overrideMap = new Map(
    (tailored?.experiences ?? []).map((e) => [e.id, e.bullet_points])
  );
  const blocks = experiences.map((exp) => {
    const bullets =
      exp.id && overrideMap.has(exp.id) ? overrideMap.get(exp.id)! : exp.bullet_points;
    const dates = formatDateRange(exp.start_date, exp.end_date, exp.is_current);
    return `    \\resumeSubheading
      {${escapeLatex(exp.title)}}{${dates}}
      {${escapeLatex(exp.company)}}{${escapeLatex(exp.location ?? "")}}${bulletsBlock(bullets)}`;
  });
  return `%-----------EXPERIENCE-----------\n\\section{Experience}\n  \\resumeSubHeadingListStart\n${blocks.join("\n\n")}\n  \\resumeSubHeadingListEnd\n\n`;
}

function buildTechnicalSkills(tex: string): string {
  const body = tex.trim();
  if (!body) return "";
  return `%-----------SKILLS-----------\n\\section{Technical Skills}\n \\begin{itemize}[leftmargin=0.15in, label={}]\n    \\small{\\item{\n${body}\n    }}\n \\end{itemize}\n\n`;
}

function buildLeadership(leadership: LatexLeadershipRow[]): string {
  if (!leadership.length) return "";
  const blocks = leadership.map((row) => {
    const dates = formatDateRange(row.start_date, row.end_date, row.is_current);
    return `    \\resumeSubheading
      {${escapeLatex(row.organization)}}{${dates}}
      {${escapeLatex(row.title)}}{${escapeLatex(row.location ?? "")}}${bulletsBlock(row.bullet_points)}`;
  });
  return `%-----------LEADERSHIP-----------\n\\section{Leadership}\n  \\resumeSubHeadingListStart\n${blocks.join("\n\n")}\n  \\resumeSubHeadingListEnd\n\n`;
}

export function buildResumeDocument(input: LatexResumeInput): string {
  const preamble = readFileSync(PREAMBLE_PATH, "utf8");
  const body = [
    buildHeading(input.header),
    buildEducation(input.education),
    buildExperiences(input.experiences, input.tailored),
    buildTechnicalSkills(input.technical_skills_tex),
    buildLeadership(input.leadership),
    "\\end{document}\n",
  ].join("");
  return preamble + body;
}

export async function compileLatexToPdf(texSource: string): Promise<Buffer> {
  const dir = await mkdtemp(join(process.cwd(), "hirevault-resume-"));
  const texPath = join(dir, "resume.tex");
  const { writeFile } = await import("node:fs/promises");
  await writeFile(texPath, texSource, "utf8");

  const cmd = process.env.LATEX_COMPILER ?? "pdflatex";
  try {
    for (let i = 0; i < 2; i++) {
      await execFileAsync(cmd, ["-interaction=nonstopmode", "-output-directory", dir, texPath], {
        timeout: 60_000,
        maxBuffer: 10 * 1024 * 1024,
      });
    }
    const pdf = await readFile(join(dir, "resume.pdf"));
    return pdf;
  } catch (e) {
    const hint =
      e instanceof Error && "code" in e && (e as NodeJS.ErrnoException).code === "ENOENT"
        ? `${cmd} not found. Install MacTeX/BasicTeX or set LATEX_COMPILER / PATH.`
        : e instanceof Error
          ? e.message
          : "LaTeX compile failed";
    throw new Error(hint);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function renderResumePdf(input: LatexResumeInput): Promise<Buffer> {
  const tex = buildResumeDocument(input);
  return compileLatexToPdf(tex);
}
