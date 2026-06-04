import type { ScrapedJob } from "../src/shared/types";
import { scrapeModeLabel } from "../src/content/scrapers-logic";

const STORAGE_KEY = "hirevault_last_scrape";
const LAST_SYNC_KEY = "hirevault_last_sync";
const CONTENT_SCRIPT = "content/job-detector.js";

const els = {
  status: document.getElementById("status")!,
  title: document.getElementById("job-title")!,
  company: document.getElementById("job-company")!,
  apiBase: document.getElementById("api-base") as HTMLInputElement,
  token: document.getElementById("api-token") as HTMLInputElement,
  capture: document.getElementById("btn-capture")!,
  sync: document.getElementById("btn-sync")!,
  openApp: document.getElementById("open-app") as HTMLAnchorElement,
  pasteDetails: document.getElementById("paste-details") as HTMLDetailsElement,
  pasteTitle: document.getElementById("paste-title") as HTMLInputElement,
  pasteCompany: document.getElementById("paste-company") as HTMLInputElement,
  pasteDesc: document.getElementById("paste-desc") as HTMLTextAreaElement,
  pasteSave: document.getElementById("btn-paste-save")!,
};

let currentJob: ScrapedJob | null = null;
let activeTabUrl: string | undefined;

function isRestrictedTabUrl(url?: string): boolean {
  if (!url) return true;
  const u = url.toLowerCase();
  return (
    u.startsWith("chrome://") ||
    u.startsWith("chrome-extension://") ||
    u.startsWith("edge://") ||
    u.startsWith("about:") ||
    u.endsWith(".pdf") ||
    u.includes("chrome.google.com/webstore")
  );
}

async function loadSettings() {
  const { apiBase, token } = await chrome.storage.sync.get(["apiBase", "token"]);
  els.apiBase.value = ((apiBase as string) || "http://localhost:3000").trim();
  els.token.value = cleanTokenInput((token as string) || "");
}

function cleanTokenInput(value: string): string {
  return value.trim().replace(/^\s*bearer\s+/i, "").replace(/[\u200B-\u200D\uFEFF]/g, "");
}

async function saveSettings() {
  await chrome.storage.sync.set({
    apiBase: els.apiBase.value.trim(),
    token: cleanTokenInput(els.token.value),
  });
}

function showJob(job: ScrapedJob | null) {
  currentJob = job;
  if (!job) {
    els.title.textContent = "No job captured yet";
    els.company.textContent = "";
    return;
  }
  els.title.textContent = job.title;
  els.company.textContent = `${job.company} · ${scrapeModeLabel(job)}`;
}

function setOpenAppLink(jobId?: string) {
  const base = els.apiBase.value.replace(/\/$/, "");
  els.openApp.href = jobId
    ? `${base}/applications?captured=1&job=${jobId}`
    : `${base}/applications?captured=1`;
  els.openApp.classList.remove("hidden");
}

async function injectContentScript(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [CONTENT_SCRIPT],
  });
}

async function messageTab<T extends { job?: ScrapedJob }>(
  tabId: number,
  type: "SCRAPE_JOB" | "DUMP_PAGE"
): Promise<T | null> {
  try {
    return (await chrome.tabs.sendMessage(tabId, { type })) as T;
  } catch {
    try {
      await injectContentScript(tabId);
      return (await chrome.tabs.sendMessage(tabId, { type })) as T;
    } catch {
      return null;
    }
  }
}

function prefillPaste(job: ScrapedJob) {
  els.pasteTitle.value = job.title === "Untitled role" ? "" : job.title;
  els.pasteCompany.value =
    job.company === "Unknown company" ? "" : job.company;
  els.pasteDesc.value = job.description;
}

function openPastePanel() {
  els.pasteDetails.open = true;
}

async function captureFromPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabUrl = tab?.url;
  els.pasteDetails.open = false;

  if (!tab?.id) {
    showJob(null);
    els.status.textContent = "No active tab.";
    return;
  }

  if (isRestrictedTabUrl(tab.url)) {
    showJob(null);
    els.status.textContent = "Open a normal browser tab with a job posting first.";
    openPastePanel();
    return;
  }

  els.status.textContent = "Reading this page…";

  let res = await messageTab(tab.id, "SCRAPE_JOB");
  if (res?.job) {
    showJob(res.job);
    els.status.textContent = "Captured — click Save when ready.";
    return;
  }

  res = await messageTab(tab.id, "DUMP_PAGE");
  if (res?.job) {
    showJob(res.job);
    els.status.textContent = "Captured page text — click Save when ready.";
    return;
  }

  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const cached = stored[STORAGE_KEY]?.job as ScrapedJob | undefined;
  if (cached) {
    showJob(cached);
    els.status.textContent =
      "Using last capture on this browser — reload the job tab, then Capture again.";
    return;
  }

  showJob(null);
  els.status.textContent =
    "Could not read this tab. Reload the job page, then Capture again — or paste manually below.";
  openPastePanel();
}

async function syncJob() {
  await saveSettings();
  if (!currentJob) {
    els.status.textContent = "Capture or paste a job first.";
    return;
  }
  els.status.textContent = "Saving…";
  els.openApp.classList.add("hidden");

  const res = await chrome.runtime.sendMessage({
    type: "SYNC_JOB",
    apiBase: els.apiBase.value.trim(),
    token: cleanTokenInput(els.token.value),
    payload: {
      job: {
        ...currentJob,
        url: currentJob.url || activeTabUrl || "",
        locations: currentJob.location ? [currentJob.location] : [],
      },
      createApplication: true,
    },
  });

  if (res?.error) {
    els.status.textContent = res.error;
    return;
  }

  els.status.textContent = res.deduped ? "Updated existing job." : "Saved.";
  if (res.jobId) {
    await chrome.storage.local.set({
      [LAST_SYNC_KEY]: { jobId: res.jobId, applicationId: res.applicationId, at: Date.now() },
    });
    setOpenAppLink(res.jobId);
  }
}

els.capture.addEventListener("click", () => void captureFromPage());
els.sync.addEventListener("click", () => void syncJob());
els.apiBase.addEventListener("change", () => void saveSettings());
els.token.addEventListener("change", () => void saveSettings());

els.pasteSave.addEventListener("click", () => {
  const job: ScrapedJob = {
    title: els.pasteTitle.value.trim() || "Untitled role",
    company: els.pasteCompany.value.trim() || "Unknown company",
    url: activeTabUrl ?? "",
    description: els.pasteDesc.value.trim(),
    source: "manual_paste",
    confidence: "low",
  };
  showJob(job);
  els.status.textContent = "Pasted job ready — click Save.";
  els.pasteDetails.open = false;
});

void loadSettings().then(() => void captureFromPage());
