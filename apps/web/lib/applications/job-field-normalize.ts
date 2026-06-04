/** Normalize title/company from ATS page titles and noisy scrapes (e.g. Greenhouse). */

const JOB_APPLICATION_PATTERN = /job\s+application\s+for\s+(.+?)\s+at\s+(.+)/i;

export function parseJobApplicationPhrase(text: string): { title: string; company: string } | null {
  const t = text.trim();
  const m = t.match(JOB_APPLICATION_PATTERN);
  if (!m) return null;
  return { title: m[1].trim(), company: m[2].trim() };
}

function looksLikeJobApplicationPhrase(text: string): boolean {
  return JOB_APPLICATION_PATTERN.test(text.trim());
}

export function normalizeJobTitleCompany(
  title: string,
  company: string,
  parsed?: { title?: string | null; company?: string | null } | null
): { title: string; company: string } {
  let t = title.trim();
  let c = company.trim();

  for (const candidate of [c, t]) {
    const parsedPhrase = parseJobApplicationPhrase(candidate);
    if (parsedPhrase) {
      t = parsedPhrase.title;
      c = parsedPhrase.company;
      break;
    }
  }

  const parsedTitle = (parsed?.title ?? "").trim();
  const parsedCompany = (parsed?.company ?? "").trim();

  if (looksLikeJobApplicationPhrase(c) || c.length > 80) {
    if (parsedCompany && !looksLikeJobApplicationPhrase(parsedCompany)) {
      c = parsedCompany;
    } else if (parsedPhraseFromEither(parsedTitle, parsedCompany)) {
      const p = parseJobApplicationPhrase(parsedTitle) ?? parseJobApplicationPhrase(parsedCompany);
      if (p) {
        t = p.title;
        c = p.company;
      }
    }
  }

  if (looksLikeJobApplicationPhrase(t)) {
    const p = parseJobApplicationPhrase(t);
    if (p) {
      t = p.title;
      c = p.company;
    }
  }

  if (!t || t.length < 3) t = parsedTitle || t || "Untitled role";
  if (!c || looksLikeJobApplicationPhrase(c) || c.length > 80) {
    c = parsedCompany && !looksLikeJobApplicationPhrase(parsedCompany) ? parsedCompany : c;
  }

  return { title: t, company: c || "Unknown company" };
}

function parsedPhraseFromEither(a: string, b: string): boolean {
  return looksLikeJobApplicationPhrase(a) || looksLikeJobApplicationPhrase(b);
}
