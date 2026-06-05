import { scrapeJobPage } from "./scrapers";
import type { ScrapedJob } from "../shared/types";

const STORAGE_KEY = "hirevault_last_scrape";
const SCRAPE_DEBOUNCE_MS = 2000;
const INIT_KEY = "__hirevaultCSInit";

const g = globalThis as typeof globalThis & { [key: string]: boolean | undefined };

if (g[INIT_KEY]) {
  // Re-injection via scripting API — listeners already registered.
} else {
  g[INIT_KEY] = true;

  async function persist(job: ScrapedJob) {
    await chrome.storage.local.set({ [STORAGE_KEY]: { job, at: Date.now() } });
  }

  function runScrape(forcePageDump?: boolean) {
    const job = scrapeJobPage(forcePageDump ? { forcePageDump: true } : undefined);
    if (job) void persist(job);
    return job;
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleScrape() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      runScrape();
    }, SCRAPE_DEBOUNCE_MS);
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "SCRAPE_JOB") {
      const job = runScrape(false);
      sendResponse({ ok: true, job });
      return true;
    }
    if (msg?.type === "DUMP_PAGE") {
      const job = runScrape(true);
      sendResponse({ ok: true, job });
      return true;
    }
    if (msg?.type === "GET_LAST_SCRAPE") {
      chrome.storage.local.get(STORAGE_KEY).then((data) => {
        sendResponse({ job: data[STORAGE_KEY]?.job ?? null });
      });
      return true;
    }
    return false;
  });

  const initial = scrapeJobPage();
  if (initial) void persist(initial);

  window.addEventListener("popstate", scheduleScrape);

  const originalPushState = history.pushState.bind(history);
  history.pushState = (...args) => {
    originalPushState(...args);
    scheduleScrape();
  };

  const originalReplaceState = history.replaceState.bind(history);
  history.replaceState = (...args) => {
    originalReplaceState(...args);
    scheduleScrape();
  };

  let lastTitle = document.title;
  const titleEl = document.querySelector("title");
  if (titleEl) {
    new MutationObserver(() => {
      if (document.title !== lastTitle) {
        lastTitle = document.title;
        scheduleScrape();
      }
    }).observe(titleEl, { childList: true, characterData: true, subtree: true });
  }
}
