import { scrapeJobPage } from "./scrapers";
import type { ScrapedJob } from "../shared/types";

const STORAGE_KEY = "hirevault_last_scrape";

async function persist(job: ScrapedJob) {
  await chrome.storage.local.set({ [STORAGE_KEY]: { job, at: Date.now() } });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "SCRAPE_JOB") {
    const job = scrapeJobPage();
    if (job) void persist(job);
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
