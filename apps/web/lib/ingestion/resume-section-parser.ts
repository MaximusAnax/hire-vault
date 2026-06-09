import type {
  ParsedEducation,
  ParsedExperience,
  ParsedLeadership,
  ParsedResume,
  ParsedSkill,
} from "@hirevault/ai-core";

export type SkillCategory = "language" | "framework" | "tool" | "soft_skill";

const SECTION_HEADERS =
  /^(EDUCATION|EXPERIENCE|TECHNICAL SKILLS|SKILLS|LEADERSHIP|PROJECTS)\s*$/im;

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").trim();
}

function splitSections(text: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = normalizeText(text).split("\n");
  let current: string | null = null;
  const buf: string[] = [];

  const flush = () => {
    if (current && buf.length) sections.set(current, buf.join("\n").trim());
    buf.length = 0;
  };

  for (const line of lines) {
    const headerMatch = line.trim().match(
      /^(Education|Experience|Technical Skills|Skills|Leadership|Projects)$/i
    );
    if (headerMatch) {
      flush();
      current = headerMatch[1].toLowerCase();
      if (current === "skills") current = "technical skills";
      continue;
    }
    if (current) buf.push(line);
  }
  flush();
  return sections;
}

/** Parse "May 2026 -- Present" or "May 2025 -- August 2025" */
export function parseDateRange(raw: string): {
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
} {
  const t = raw.trim();
  const present = /\bpresent\b/i.test(t);
  const parts = t.split(/\s*[-–—]{1,2}\s*/);
  const startRaw = parts[0]?.trim() ?? "";
  const endRaw = present ? "Present" : (parts[1]?.trim() ?? "");

  return {
    start_date: parseMonthYear(startRaw),
    end_date: present ? null : parseMonthYear(endRaw),
    is_current: present,
  };
}

function parseMonthYear(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const m = t.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (m) {
    const month = monthToNumber(m[1]);
    if (month) return `${m[2]}-${month.padStart(2, "0")}-01`;
  }
  const y = t.match(/^(\d{4})$/);
  if (y) return `${y[1]}-01-01`;
  return t;
}

function monthToNumber(name: string): string | null {
  const n = name.toLowerCase().slice(0, 3);
  const map: Record<string, string> = {
    jan: "1",
    feb: "2",
    mar: "3",
    apr: "4",
    may: "5",
    jun: "6",
    jul: "7",
    aug: "8",
    sep: "9",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  return map[n] ?? null;
}

const DATE_RANGE_RE =
  /([A-Za-z]+\s+\d{4})\s*[-–—]{1,2}\s*(Present|[A-Za-z]+\s+\d{4})/i;

function extractDateRange(line: string): { text: string; range: string | null } {
  const m = line.match(DATE_RANGE_RE);
  if (!m) return { text: line.trim(), range: null };
  const range = `${m[1]} -- ${m[2]}`;
  const text = line.replace(DATE_RANGE_RE, "").trim();
  return { text, range };
}

function splitLocation(line: string): { left: string; location: string | null } {
  const parts = line.split(/\s{2,}|\t+/);
  if (parts.length >= 2) {
    return {
      left: parts.slice(0, -1).join(" ").trim(),
      location: parts[parts.length - 1].trim(),
    };
  }
  const m = line.match(/^(.+?)\s{2,}(.+)$/);
  if (m) return { left: m[1].trim(), location: m[2].trim() };

  const stateSuffix = line.trim().match(/^(.*),\s*([A-Z]{2})$/);
  if (stateSuffix) {
    const beforeState = stateSuffix[1].trim();
    const spacedCity = beforeState.match(/^(.+?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)$/);
    if (spacedCity) {
      return { left: spacedCity[1].trim(), location: `${spacedCity[2]}, ${stateSuffix[2]}` };
    }
    const gluedCity = beforeState.match(/^(.+?)([A-Z][a-z]{3,})$/);
    if (gluedCity) {
      return { left: gluedCity[1].trim(), location: `${gluedCity[2]}, ${stateSuffix[2]}` };
    }
  }

  return { left: line.trim(), location: null };
}

function parseBullets(block: string): string[] {
  return block
    .split("\n")
    .map((l) => l.replace(/^[\s•\-\*]+/, "").trim())
    .filter((l) => l.length > 0 && !SECTION_HEADERS.test(l));
}

function parseHeader(text: string): Partial<ParsedResume> {
  const firstBlock = normalizeText(text).split(/\n(?=Education|Experience|EDUCATION|EXPERIENCE)/i)[0];
  const lines = firstBlock.split("\n").map((l) => l.trim()).filter(Boolean);
  const out: Partial<ParsedResume> = {};

  if (lines[0] && !lines[0].includes("@") && !lines[0].includes("|")) {
    out.full_name = lines[0];
    out.headline = lines[0];
  }

  const contactLine = lines.find((l) => l.includes("|") || l.includes("@"));
  if (contactLine) {
    const phone = contactLine.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
    if (phone) out.phone = phone[1];

    const email = contactLine.match(/[\w.+-]+@[\w.-]+\.\w+/);
    if (email) out.email = email[0];

    const linkedin = contactLine.match(/linkedin\.com\/[\w-]+/i);
    if (linkedin) out.linkedin_url = `https://www.${linkedin[0]}`;

    const github = contactLine.match(/github\.com\/[\w-]+/i);
    if (github) out.github_url = `https://${github[0]}`;
  }

  return out;
}

function parseEducationSection(block: string): ParsedEducation[] {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  const { left: institution } = splitLocation(lines[0]);
  let degree: string | null = null;
  let field_of_study: string | null = null;
  let expected_graduation: string | null = null;
  const relevant_courses: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^relevant coursework:/i.test(line)) {
      relevant_courses.push(...splitCourseList(line.replace(/^relevant coursework:\s*/i, "")));
    } else if (/^awards:/i.test(line)) {
      // skipped per product decision
    } else if (/expected graduation:/i.test(line)) {
      const grad = line.match(/Expected Graduation:\s*(.+)/i);
      if (grad) expected_graduation = parseMonthYear(grad[1].trim());
      const degPart = line.split(/Expected Graduation:/i)[0].trim();
      if (degPart) {
        parseDegreeLine(degPart, (d, f) => {
          degree = d;
          field_of_study = f;
        });
      }
    } else if (!degree) {
      parseDegreeLine(line, (d, f) => {
        degree = d;
        field_of_study = f;
      });
    }
  }

  return [
    {
      institution,
      degree,
      field_of_study,
      expected_graduation,
      relevant_courses: relevant_courses.length ? relevant_courses : undefined,
    },
  ];
}

function parseDegreeLine(
  line: string,
  set: (degree: string | null, field: string | null) => void
) {
  const cleaned = line.replace(/\s{2,}.*$/, "").trim();
  const inMatch = cleaned.match(/^(.+?)\s+in\s+(.+)$/i);
  if (inMatch) {
    set(inMatch[1].trim(), inMatch[2].trim());
  } else {
    set(cleaned || null, null);
  }
}

export function splitCourseList(raw: string): string[] {
  return raw
    .split(/,(?![^(]*\))/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

interface RoleBlock {
  line1: string;
  line2: string;
  bullets: string[];
}

function parseRoleBlocks<T>(
  block: string,
  mapEntry: (entry: RoleBlock) => T
): T[] {
  const lines = block.split("\n");
  const entries: RoleBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    const hasDate = DATE_RANGE_RE.test(line);
    if (!hasDate) {
      i++;
      continue;
    }

    const line1 = line;
    i++;

    let line2 = "";
    while (i < lines.length && !lines[i].trim()) i++;
    if (i < lines.length) {
      const next = lines[i].trim();
      if (!DATE_RANGE_RE.test(next) && !next.startsWith("•") && !next.startsWith("-")) {
        line2 = next;
        i++;
      }
    }

    const bulletLines: string[] = [];
    while (i < lines.length) {
      const bl = lines[i].trim();
      if (!bl) {
        i++;
        continue;
      }
      if (DATE_RANGE_RE.test(bl) && !bl.startsWith("•") && !bl.startsWith("-")) break;
      bulletLines.push(bl);
      i++;
    }

    entries.push({
      line1,
      line2,
      bullets: parseBullets(bulletLines.join("\n")),
    });
  }

  return entries.map(mapEntry);
}

function parseExperienceSection(block: string): ParsedExperience[] {
  return parseRoleBlocks(block, ({ line1, line2, bullets }) => {
    const { text: titlePart, range } = extractDateRange(line1);
    const dates = range
      ? parseDateRange(range)
      : { start_date: null, end_date: null, is_current: false };

    const { left: companyPart, location: loc2 } = splitLocation(line2);
    const title = (titlePart || line1.replace(DATE_RANGE_RE, "")).trim();
    const company = companyPart.trim() || "Unknown";

    return {
      company,
      title: title || "Role",
      location: loc2,
      start_date: dates.start_date,
      end_date: dates.end_date,
      is_current: dates.is_current,
      bullet_points: bullets,
    };
  });
}

function parseLeadershipSection(block: string): ParsedLeadership[] {
  return parseRoleBlocks(block, ({ line1, line2, bullets }) => {
    const { text: orgPart, range } = extractDateRange(line1);
    const dates = range
      ? parseDateRange(range)
      : { start_date: null, end_date: null, is_current: false };

    const organization = (orgPart || line1.replace(DATE_RANGE_RE, "")).trim();
    const { left: title, location } = splitLocation(line2);

    return {
      organization: organization || "Organization",
      title: title || "Member",
      location,
      start_date: dates.start_date,
      end_date: dates.end_date,
      is_current: dates.is_current,
      bullet_points: bullets,
    };
  });
}

const SKILL_CATEGORY_MAP: { pattern: RegExp; category: SkillCategory }[] = [
  { pattern: /machine learning|deep learning|reinforcement|neural/i, category: "framework" },
  { pattern: /language|library|framework|pytorch|tensorflow/i, category: "language" },
  { pattern: /infrastructure|aws|docker|database|postgresql|mongo|ci\/cd|data/i, category: "tool" },
];

function categoryFromHeading(heading: string): SkillCategory {
  for (const { pattern, category } of SKILL_CATEGORY_MAP) {
    if (pattern.test(heading)) return category;
  }
  return "tool";
}

function parseSkillsSection(block: string): ParsedSkill[] {
  const skills: ParsedSkill[] = [];
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const m = line.match(/^([^:]+):\s*(.+)\.?$/);
    if (!m) continue;
    const category = categoryFromHeading(m[1]);
    const items = m[2]
      .split(/,(?![^(]*\))/g)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const item of items) {
      const name = item.replace(/\([^)]*\)/g, "").trim() || item;
      if (name.length > 1) {
        skills.push({ name, category });
      }
    }
  }
  return skills;
}

/** Deterministic parse of common resume section layout (Jake Gutierrez / CMU style). */
export function parseResumeSections(text: string): Partial<ParsedResume> {
  const sections = splitSections(text);
  const header = parseHeader(text);

  const education = sections.has("education")
    ? parseEducationSection(sections.get("education")!)
    : [];
  const experiences = sections.has("experience")
    ? parseExperienceSection(sections.get("experience")!)
    : [];
  const leadership = sections.has("leadership")
    ? parseLeadershipSection(sections.get("leadership")!)
    : [];
  const skills = sections.has("technical skills")
    ? parseSkillsSection(sections.get("technical skills")!)
    : [];

  return {
    ...header,
    education: education.length ? education : undefined,
    experiences: experiences.length ? experiences : undefined,
    leadership: leadership.length ? leadership : undefined,
    skills: skills.length ? skills : undefined,
  };
}
