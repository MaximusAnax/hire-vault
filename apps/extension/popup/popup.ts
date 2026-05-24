import type { ScrapedJob } from "../src/shared/types";

const els = {
  status: document.getElementById("status")!,
  title: document.getElementById("job-title")!,
  company: document.getElementById("job-company")!,
  source: document.getElementById("job-source")!,
  apiBase: document.getElementById("api-base") as HTMLInputElement,
  token: document.getElementById("api-token") as HTMLInputElement,
  scrape: document.getElementById("btn-scrape")!,
  sync: document.getElementById("btn-sync")!,
  paste: document.getElementById("paste-modal")!,
  pasteTitle: document.getElementById("paste-title") as HTMLInputElement,
  pasteCompany: document.getElementById("paste-company") as HTMLInputElement,
  pasteDesc: document.getElementById("paste-desc") as HTMLTextAreaElement,
  pasteSave: document.getElementById("btn-paste-save")!,
  pasteCancel: document.getElementById("btn-paste-cancel")!,
};

let currentJob: ScrapedJob | null = null;

async function loadSettings() {
  const { apiBase, token } = await chrome.storage.sync.get(["apiBase", "token"]);
  els.apiBase.value = (apiBase as string) || "http://localhost:3000";
  els.token.value = (token as string) || "";
}

async function saveSettings() {
  await chrome.storage.sync.set({ apiBase: els.apiBase.value, token: els.token.value });
}

function showJob(job: ScrapedJob | null) {
  currentJob = job;
  if (!job) {
    els.title.textContent = "—";
    els.company.textContent = "—";
    els.source.textContent = "—";
    els.status.textContent = "No job detected on this page.";
    return;
  }
  els.title.textContent = job.title;
  els.company.textContent = job.company;
  els.source.textContent = `${job.source} (${job.confidence})`;
  els.status.textContent = "Ready to sync";
}

async function scrapeActiveTab() {
  els.status.textContent = "Scraping…";
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    els.status.textContent = "No active tab";
    return;
  }
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_JOB" });
    if (res?.job) {
      showJob(res.job as ScrapedJob);
      return;
    }
  } catch {
    /* content script may not be injected */
  }
  const stored = await chrome.storage.local.get("hirevault_last_scrape");
  const job = stored.hirevault_last_scrape?.job as ScrapedJob | undefined;
  if (job) {
    showJob(job);
    els.status.textContent = "Using last detected job (reload page if stale)";
    return;
  }
  els.status.textContent = "Scrape failed — use manual paste.";
  els.paste.classList.remove("hidden");
}

async function syncJob() {
  await saveSettings();
  if (!currentJob) {
    els.status.textContent = "Scrape or paste a job first.";
    return;
  }
  els.status.textContent = "Syncing…";
  const res = await chrome.runtime.sendMessage({
    type: "SYNC_JOB",
    apiBase: els.apiBase.value,
    token: els.token.value,
    payload: { job: currentJob, createApplication: true },
  });
  if (res?.error) {
    els.status.textContent = res.error;
    return;
  }
  els.status.textContent = `Saved to HireVault${res.jobId ? ` (${res.jobId.slice(0, 8)}…)` : ""}`;
}

els.scrape.addEventListener("click", () => void scrapeActiveTab());
els.sync.addEventListener("click", () => void syncJob());
els.apiBase.addEventListener("change", () => void saveSettings());
els.token.addEventListener("change", () => void saveSettings());

els.pasteCancel.addEventListener("click", () => els.paste.classList.add("hidden"));
els.pasteSave.addEventListener("click", () => {
  const job: ScrapedJob = {
    title: els.pasteTitle.value || "Untitled role",
    company: els.pasteCompany.value || "Unknown company",
    url: "",
    description: els.pasteDesc.value,
    source: "manual_paste",
    confidence: "low",
  };
  els.paste.classList.add("hidden");
  showJob(job);
});

document.getElementById("btn-paste-open")?.addEventListener("click", () => {
  els.paste.classList.remove("hidden");
});

void loadSettings().then(() => void scrapeActiveTab());
