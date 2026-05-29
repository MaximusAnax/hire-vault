import { parse, type HTMLElement } from "node-html-parser";

const DESKTOP_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 12_000;
const MIN_BODY_CHARS = 240;

export interface ScrapeSuccess {
  blocked?: false;
  url: string;
  title: string | null;
  company: string | null;
  location: string | null;
  text: string;
  source: "greenhouse" | "lever" | "ashby" | "workday" | "generic";
}

export interface ScrapeBlocked {
  blocked: true;
  url: string;
  status?: number;
  fallbackHint: string;
}

export type ScrapeResult = ScrapeSuccess | ScrapeBlocked;

/**
 * URL detection — accept http/https only. Anchored so trailing whitespace fails fast,
 * but we trim before calling. Matches both bare hosts and full paths.
 */
const URL_REGEX = /^https?:\/\/[^\s]+$/i;

export function isLikelyUrl(input: string): boolean {
  return URL_REGEX.test(input.trim());
}

interface DomainHandler {
  readonly id: ScrapeSuccess["source"];
  matches(host: string): boolean;
  extract(root: HTMLElement, url: string): Partial<ScrapeSuccess> & { text: string };
}

function textOf(el: HTMLElement | null | undefined): string {
  if (!el) return "";
  return cleanText(el.text);
}

function cleanText(raw: string): string {
  return raw
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripNoise(root: HTMLElement): void {
  for (const tag of ["script", "style", "noscript", "svg", "iframe", "form", "header", "footer", "nav"]) {
    root.querySelectorAll(tag).forEach((el) => el.remove());
  }
}

const greenhouse: DomainHandler = {
  id: "greenhouse",
  matches: (host) => host.endsWith("greenhouse.io"),
  extract(root) {
    const title = textOf(root.querySelector(".app-title")) || textOf(root.querySelector("h1"));
    const company = textOf(root.querySelector(".company-name")) || textOf(root.querySelector(".main-header__company"));
    const location = textOf(root.querySelector(".location"));
    const body = root.querySelector("#content") ?? root.querySelector(".content") ?? root.querySelector("#main_fields");
    return {
      title: title || null,
      company: company.replace(/^at\s+/i, "") || null,
      location: location || null,
      text: textOf(body),
    };
  },
};

const lever: DomainHandler = {
  id: "lever",
  matches: (host) => host.endsWith("lever.co"),
  extract(root) {
    const title = textOf(root.querySelector(".posting-headline h2")) || textOf(root.querySelector("h2"));
    const categories = root.querySelectorAll(".posting-categories .posting-category");
    const location = categories[0] ? textOf(categories[0] as HTMLElement) : null;
    const body =
      root.querySelector(".posting-page") ??
      root.querySelector(".content") ??
      root.querySelector(".posting");
    const company = textOf(root.querySelector(".main-header-logo img"))
      || root.querySelector(".main-header-logo img")?.getAttribute("alt")
      || null;
    return {
      title: title || null,
      company: company || null,
      location,
      text: textOf(body),
    };
  },
};

const ashby: DomainHandler = {
  id: "ashby",
  matches: (host) => host.endsWith("ashbyhq.com"),
  extract(root) {
    const title = textOf(root.querySelector("h1"));
    const headingArea = root.querySelector('[class*="_descriptionText"]')
      ?? root.querySelector('[class*="jobDescriptionBody"]')
      ?? root.querySelector("main");
    const subheading = textOf(root.querySelector('[class*="_jobPostingDetailsMetadata"]'))
      || textOf(root.querySelector('[class*="metadata"]'));
    return {
      title: title || null,
      company: null,
      location: subheading || null,
      text: textOf(headingArea),
    };
  },
};

const workday: DomainHandler = {
  id: "workday",
  matches: (host) => host.endsWith("myworkdayjobs.com"),
  extract(root) {
    const title = textOf(root.querySelector('[data-automation-id="jobPostingHeader"]'))
      || textOf(root.querySelector("h2"));
    const location = textOf(root.querySelector('[data-automation-id="locations"]'))
      || textOf(root.querySelector('[data-automation-id="jobPostingLocation"]'));
    const body = root.querySelector('[data-automation-id="jobPostingDescription"]')
      ?? root.querySelector("main");
    return {
      title: title || null,
      company: null,
      location: location || null,
      text: textOf(body),
    };
  },
};

const HANDLERS: readonly DomainHandler[] = [greenhouse, lever, ashby, workday];

function pickHandler(host: string): DomainHandler | null {
  return HANDLERS.find((h) => h.matches(host)) ?? null;
}

/**
 * Readability-ish fallback: prefer <main>/<article>, otherwise the largest <div> by text length.
 */
function genericExtract(root: HTMLElement): { title: string | null; text: string } {
  const title = textOf(root.querySelector("h1")) || null;
  const mainEl = root.querySelector("main") ?? root.querySelector("article");
  if (mainEl) {
    const t = textOf(mainEl);
    if (t.length >= MIN_BODY_CHARS) return { title, text: t };
  }
  let best: { el: HTMLElement; len: number } | null = null;
  for (const div of root.querySelectorAll("div")) {
    const len = (div.text ?? "").length;
    if (!best || len > best.len) best = { el: div as HTMLElement, len };
  }
  return { title, text: best ? textOf(best.el) : textOf(root) };
}

async function fetchHtml(url: string): Promise<{ ok: true; html: string } | { ok: false; status?: number; reason: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": DESKTOP_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) {
      return { ok: false, status: res.status, reason: `HTTP ${res.status}` };
    }
    const html = await res.text();
    if (!html || html.length < 200) {
      return { ok: false, status: res.status, reason: "Empty response body" };
    }
    return { ok: true, html };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "fetch failed";
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }
}

function hostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function fallbackHintFor(host: string | null): string {
  if (host?.includes("linkedin.com")) {
    return "LinkedIn blocks bot traffic. Open the posting and paste the JD text into the box instead.";
  }
  if (host?.includes("indeed.com")) {
    return "Indeed often blocks automated fetches. Copy the JD text and paste it in instead.";
  }
  return "We couldn’t reach this URL. Copy the job description text and paste it in instead.";
}

export async function fetchJobFromUrl(url: string): Promise<ScrapeResult> {
  const host = hostFromUrl(url);
  if (!host) {
    return { blocked: true, url, fallbackHint: "That doesn’t look like a valid URL." };
  }

  const fetched = await fetchHtml(url);
  if (!fetched.ok) {
    return {
      blocked: true,
      url,
      status: fetched.status,
      fallbackHint: fallbackHintFor(host),
    };
  }

  let root: HTMLElement;
  try {
    root = parse(fetched.html, { lowerCaseTagName: true, comment: false });
  } catch {
    return { blocked: true, url, fallbackHint: fallbackHintFor(host) };
  }
  stripNoise(root);

  const handler = pickHandler(host);
  if (handler) {
    const extracted = handler.extract(root, url);
    const text = cleanText(extracted.text);
    if (text.length >= MIN_BODY_CHARS) {
      return {
        url,
        source: handler.id,
        title: extracted.title ?? null,
        company: extracted.company ?? null,
        location: extracted.location ?? null,
        text,
      };
    }
  }

  const generic = genericExtract(root);
  const text = cleanText(generic.text);
  if (text.length < MIN_BODY_CHARS) {
    return { blocked: true, url, fallbackHint: fallbackHintFor(host) };
  }

  return {
    url,
    source: "generic",
    title: generic.title,
    company: null,
    location: null,
    text,
  };
}
