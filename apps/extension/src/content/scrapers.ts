import type { ScrapedJob } from "../shared/types";

function text(el: Element | null): string {
  return el?.textContent?.trim() ?? "";
}

function meta(prop: string): string {
  return document.querySelector(`meta[property="${prop}"]`)?.getAttribute("content") ?? "";
}

export function detectSource(): string {
  const host = location.hostname;
  if (host.includes("linkedin.com")) return "linkedin";
  if (host.includes("greenhouse.io") || host.includes("boards.greenhouse")) return "greenhouse";
  if (host.includes("lever.co")) return "lever";
  if (host.includes("myworkdayjobs.com") || host.includes("workday")) return "workday";
  if (host.includes("jobs.ashbyhq.com")) return "ashby";
  if (host.includes("smartrecruiters.com")) return "smartrecruiters";
  return "generic";
}

export function scrapeJobPage(): ScrapedJob | null {
  const source = detectSource();
  const scrapers: Record<string, () => ScrapedJob | null> = {
    linkedin: scrapeLinkedIn,
    greenhouse: scrapeGreenhouse,
    lever: scrapeLever,
    workday: scrapeWorkday,
    ashby: scrapeAshby,
    generic: scrapeGeneric,
  };
  const fn = scrapers[source] ?? scrapers.generic;
  const result = fn();
  if (result) return result;
  return scrapeGeneric();
}

function scrapeLinkedIn(): ScrapedJob | null {
  const title =
    text(document.querySelector(".job-details-jobs-unified-top-card__job-title")) ||
    text(document.querySelector("h1")) ||
    meta("og:title");
  const company =
    text(document.querySelector(".job-details-jobs-unified-top-card__company-name a")) ||
    text(document.querySelector(".job-details-jobs-unified-top-card__primary-description-container a"));
  const desc =
    text(document.querySelector(".jobs-description__content")) ||
    text(document.querySelector("#job-details")) ||
    text(document.querySelector("[class*='description']"));
  if (!title) return null;
  return build(title, company || "Unknown", desc, "linkedin", desc.length > 200 ? "high" : "medium");
}

function scrapeGreenhouse(): ScrapedJob | null {
  const title = text(document.querySelector("#app h1")) || text(document.querySelector("h1"));
  const company =
    text(document.querySelector(".company-name")) ||
    document.title.split("|")[0]?.trim() ||
    "Unknown";
  const desc = text(document.querySelector("#content")) || text(document.querySelector(".content"));
  if (!title) return null;
  return build(title, company, desc, "greenhouse", "high");
}

function scrapeLever(): ScrapedJob | null {
  const title = text(document.querySelector("h2.posting-headline")) || text(document.querySelector("h1"));
  const company = text(document.querySelector(".main-header-text a")) || location.hostname.split(".")[0];
  const desc = text(document.querySelector(".section.page-centered")) || text(document.querySelector(".posting-page"));
  if (!title) return null;
  return build(title, company, desc, "lever", "high");
}

function scrapeWorkday(): ScrapedJob | null {
  const title = text(document.querySelector("[data-automation-id='jobPostingHeader'] h2")) || text(document.querySelector("h1"));
  const company = text(document.querySelector("[data-automation-id='company']")) || "Company";
  const desc =
    text(document.querySelector("[data-automation-id='jobPostingDescription']")) ||
    text(document.querySelector("[data-automation-id='jobPostingRequirements']"));
  if (!title) return null;
  return build(title, company, desc, "workday", "medium");
}

function scrapeAshby(): ScrapedJob | null {
  const title = text(document.querySelector("h1"));
  const desc = text(document.querySelector("[class*='JobDescription']")) || text(document.querySelector("main"));
  if (!title) return null;
  return build(title, "Company", desc, "ashby", "medium");
}

function scrapeGeneric(): ScrapedJob | null {
  const title =
    meta("og:title") ||
    text(document.querySelector("h1")) ||
    document.title.split("|")[0]?.trim();
  const desc =
    meta("og:description") ||
    text(document.querySelector("[class*='description']")) ||
    text(document.querySelector("article")) ||
    text(document.querySelector("main"));
  const company =
    text(document.querySelector("[class*='company']")) ||
    text(document.querySelector("[data-company]")) ||
    "Unknown company";
  if (!title || title.length < 3) return null;
  return build(title, company, desc, "generic", desc.length > 100 ? "medium" : "low");
}

function build(
  title: string,
  company: string,
  description: string,
  source: string,
  confidence: ScrapedJob["confidence"]
): ScrapedJob {
  return {
    title: title.slice(0, 300),
    company: company.slice(0, 200) || "Unknown company",
    location: text(document.querySelector("[class*='location']")) || undefined,
    url: location.href,
    description: description.slice(0, 50000),
    source,
    confidence,
  };
}
