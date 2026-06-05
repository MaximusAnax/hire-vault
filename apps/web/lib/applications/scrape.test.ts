import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJobFromUrl, isLikelyUrl } from "./scrape";

/**
 * Stub the global fetch so the scraper sees deterministic HTML/status without
 * touching the network. Each test installs its own response.
 */

type FetchStub = (req: string, init?: RequestInit) => Promise<Response>;

function stubFetch(stub: FetchStub) {
  vi.stubGlobal("fetch", vi.fn(stub));
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isLikelyUrl", () => {
  it("accepts http and https URLs", () => {
    expect(isLikelyUrl("https://boards.greenhouse.io/acme/jobs/123")).toBe(true);
    expect(isLikelyUrl("http://example.com/jobs/abc")).toBe(true);
  });

  it("trims surrounding whitespace before matching", () => {
    expect(isLikelyUrl("  https://example.com  ")).toBe(true);
  });

  it("rejects pasted JD text and non-URL strings", () => {
    expect(isLikelyUrl("We are looking for a Software Engineer to join…")).toBe(false);
    expect(isLikelyUrl("greenhouse.io/acme/jobs/123")).toBe(false);
    expect(isLikelyUrl("ftp://example.com/job")).toBe(false);
    expect(isLikelyUrl("")).toBe(false);
    expect(isLikelyUrl("not a url at all")).toBe(false);
  });
});

describe("fetchJobFromUrl — Greenhouse selectors", () => {
  it("extracts title / company / location / body from a Greenhouse-shaped DOM", async () => {
    const body = "Responsibilities ".repeat(40) +
      "We're hiring a Senior Software Engineer to build platform infrastructure. " +
      "You will own the data ingestion pipeline and mentor early-career engineers. ".repeat(4);
    const html = `
      <!doctype html>
      <html><head><title>Senior Software Engineer · Acme</title></head>
      <body>
        <div class="app-title">Senior Software Engineer</div>
        <div class="company-name">at Acme Corp</div>
        <div class="location">Remote · United States</div>
        <div id="content">${body}</div>
      </body></html>
    `;
    stubFetch(async () => htmlResponse(html));

    const result = await fetchJobFromUrl("https://boards.greenhouse.io/acme/jobs/123");
    expect("blocked" in result && result.blocked).toBeFalsy();
    if ("blocked" in result && result.blocked) return;

    expect(result.source).toBe("greenhouse");
    expect(result.title).toBe("Senior Software Engineer");
    expect(result.company).toBe("Acme Corp");
    expect(result.location).toBe("Remote · United States");
    expect(result.text.length).toBeGreaterThan(200);
    expect(result.text).toMatch(/Senior Software Engineer/);
  });

  it("returns blocked with a fallback hint when the body is empty / whitespace-only", async () => {
    const html = `
      <!doctype html>
      <html><head><title>Empty</title></head>
      <body>
        <main>     </main>
      </body></html>
    `.padEnd(400, " "); // make sure response body length > 200 so we hit the parser
    stubFetch(async () => htmlResponse(html));

    const result = await fetchJobFromUrl("https://example.com/job/empty");
    expect("blocked" in result && result.blocked).toBe(true);
    if ("blocked" in result && result.blocked) {
      expect(result.fallbackHint.length).toBeGreaterThan(0);
    }
  });

  it("returns blocked with status when fetch responds non-200", async () => {
    stubFetch(async () => htmlResponse("Forbidden", 403));

    const result = await fetchJobFromUrl("https://www.linkedin.com/jobs/view/123");
    expect("blocked" in result && result.blocked).toBe(true);
    if ("blocked" in result && result.blocked) {
      expect(result.status).toBe(403);
      // LinkedIn-specific hint should mention pasting the JD instead.
      expect(result.fallbackHint).toMatch(/paste/i);
    }
  });

  it("returns blocked with a hint when the URL is malformed", async () => {
    stubFetch(async () => htmlResponse("ok"));
    const result = await fetchJobFromUrl("not-a-url");
    expect("blocked" in result && result.blocked).toBe(true);
  });
});
