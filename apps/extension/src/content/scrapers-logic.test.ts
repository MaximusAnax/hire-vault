import { describe, expect, it } from "vitest";
import {
  applyPageDumpFallback,
  mergeWithPageDump,
  needsPageDumpFallback,
  stripDocumentTitle,
} from "./scrapers-logic";
import type { ScrapedJob } from "../shared/types";

const dump: ScrapedJob = {
  title: "Engineer",
  company: "Acme",
  url: "https://example.com/jobs/1",
  description: "x".repeat(500),
  source: "page_dump",
  confidence: "low",
};

describe("needsPageDumpFallback", () => {
  it("returns true when job is null", () => {
    expect(needsPageDumpFallback(null)).toBe(true);
  });

  it("returns true for thin low-confidence scrape", () => {
    const thin: ScrapedJob = {
      ...dump,
      description: "short",
      source: "generic",
      confidence: "low",
    };
    expect(needsPageDumpFallback(thin)).toBe(true);
  });

  it("returns false for rich scrape", () => {
    const rich: ScrapedJob = {
      ...dump,
      source: "greenhouse",
      confidence: "high",
    };
    expect(needsPageDumpFallback(rich)).toBe(false);
  });
});

describe("mergeWithPageDump", () => {
  it("keeps structured title and prefers longer page description", () => {
    const structured: ScrapedJob = {
      title: "Senior Engineer",
      company: "Unknown company",
      url: "https://example.com/jobs/1",
      description: "tiny",
      source: "generic",
      confidence: "low",
    };
    const merged = mergeWithPageDump(structured, dump);
    expect(merged.title).toBe("Senior Engineer");
    expect(merged.company).toBe("Acme");
    expect(merged.description.length).toBe(500);
    expect(merged.source).toBe("page_dump");
  });
});

describe("applyPageDumpFallback", () => {
  it("returns dump when structured is null", () => {
    expect(applyPageDumpFallback(null, dump)).toEqual(dump);
  });

  it("returns structured when no fallback needed", () => {
    const rich: ScrapedJob = { ...dump, source: "lever", confidence: "high" };
    expect(applyPageDumpFallback(rich, dump)).toBe(rich);
  });
});

describe("stripDocumentTitle", () => {
  it("strips site suffix from document title", () => {
    expect(stripDocumentTitle("Engineer | Acme Careers")).toBe("Engineer");
  });
});
