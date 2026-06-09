import type { CaptureDraft, PreviewJobResult, ScrapedJob, SyncJobResult } from "../shared/types";
import { mergePopupMinorEdits, type PopupMinorFields } from "../shared/capture-labels";

const STORAGE_KEY = "hirevault_last_scrape";
const CONTENT_SCRIPT = "content/job-detector.js";

export function isRestrictedTabUrl(url?: string): boolean {
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

export async function scrapeActiveTab(): Promise<{ job: ScrapedJob | null; tabUrl?: string }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabUrl = tab?.url;
  if (!tab?.id || isRestrictedTabUrl(tab.url)) {
    return { job: null, tabUrl };
  }

  let res = await messageTab(tab.id, "SCRAPE_JOB");
  if (res?.job) {
    return { job: { ...res.job, url: res.job.url || tab.url || "" }, tabUrl };
  }

  res = await messageTab(tab.id, "DUMP_PAGE");
  if (res?.job) {
    return { job: { ...res.job, url: res.job.url || tab.url || "" }, tabUrl };
  }

  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const cached = stored[STORAGE_KEY]?.job as ScrapedJob | undefined;
  if (cached) {
    return { job: { ...cached, url: cached.url || tab.url || "" }, tabUrl };
  }

  return { job: null, tabUrl };
}

export async function previewScrapedJob(
  job: ScrapedJob,
  apiBase: string,
  token: string
): Promise<PreviewJobResult> {
  return chrome.runtime.sendMessage({
    type: "PREVIEW_JOB",
    apiBase,
    token,
    job,
  }) as Promise<PreviewJobResult>;
}

export function draftFromMinorEdits(base: CaptureDraft, minor: PopupMinorFields): CaptureDraft {
  return mergePopupMinorEdits(base, minor);
}

export async function saveCaptureDraft(
  draft: CaptureDraft,
  apiBase: string,
  token: string,
  needsReview: boolean
): Promise<SyncJobResult> {
  return chrome.runtime.sendMessage({
    type: "SYNC_JOB",
    apiBase,
    token,
    payload: {
      draft,
      skip_ai_parse: true,
      createApplication: true,
      needs_review: needsReview,
    },
  }) as Promise<SyncJobResult>;
}

export function applicationsUrl(
  apiBase: string,
  opts: { applicationId?: string; addUrl?: string; needsReview?: boolean }
): string {
  const base = apiBase.replace(/\/$/, "");
  if (opts.addUrl) {
    return `${base}/applications?addUrl=${encodeURIComponent(opts.addUrl)}#add`;
  }
  if (opts.applicationId) {
    return `${base}/applications?application=${opts.applicationId}`;
  }
  if (opts.needsReview) {
    return `${base}/applications?needsReview=1`;
  }
  return `${base}/applications`;
}

export function openWebTab(url: string): void {
  void chrome.tabs.create({ url });
}
