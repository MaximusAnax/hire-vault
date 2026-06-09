import type { CaptureDraft, ScrapedJob } from "../src/shared/types";
import {
  COHORT_YEAR_OPTIONS,
  formatTermBadge,
  jobTypeLabel,
  locationsSummary,
  type PopupMinorFields,
} from "../src/shared/capture-labels";
import {
  applicationsUrl,
  draftFromMinorEdits,
  openWebTab,
  previewScrapedJob,
  saveCaptureDraft,
  scrapeActiveTab,
} from "../src/popup/capture-flow";

const LAST_SYNC_KEY = "hirevault_last_sync";

type PopupState = "idle" | "capturing" | "previewing" | "saving";

const els = {
  status: document.getElementById("status")!,
  apiBase: document.getElementById("api-base") as HTMLInputElement,
  apiToken: document.getElementById("api-token") as HTMLInputElement,
  stateIdle: document.getElementById("state-idle")!,
  stateBusy: document.getElementById("state-busy")!,
  statePreview: document.getElementById("state-preview")!,
  busyLabel: document.getElementById("busy-label")!,
  metaBadges: document.getElementById("meta-badges")!,
  priorityStars: document.getElementById("priority-stars")!,
  fieldTitle: document.getElementById("field-title") as HTMLInputElement,
  fieldCompany: document.getElementById("field-company") as HTMLInputElement,
  fieldJobType: document.getElementById("field-job-type") as HTMLSelectElement,
  fieldRoleSeason: document.getElementById("field-role-season") as HTMLSelectElement,
  fieldRoleYear: document.getElementById("field-role-year") as HTMLSelectElement,
  btnCapture: document.getElementById("btn-capture")!,
  btnSave: document.getElementById("btn-save")!,
  btnSaveReview: document.getElementById("btn-save-review")!,
  btnEditWeb: document.getElementById("btn-edit-web")!,
  btnDiscard: document.getElementById("btn-discard")!,
  openApp: document.getElementById("open-app") as HTMLAnchorElement,
  pasteDetails: document.getElementById("paste-details") as HTMLDetailsElement,
  pasteTitle: document.getElementById("paste-title") as HTMLInputElement,
  pasteCompany: document.getElementById("paste-company") as HTMLInputElement,
  pasteDesc: document.getElementById("paste-desc") as HTMLTextAreaElement,
  btnPastePreview: document.getElementById("btn-paste-preview")!,
};

let popupState: PopupState = "idle";
let currentDraft: CaptureDraft | null = null;
let activeTabUrl: string | undefined;
let priorityValue = 3;

function cleanTokenInput(value: string): string {
  return value.trim().replace(/^\s*bearer\s+/i, "").replace(/[\u200B-\u200D\uFEFF]/g, "");
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get(["apiBase", "token"]);
  els.apiBase.value = ((stored.apiBase as string) || "http://localhost:3000").trim();
  els.apiToken.value = cleanTokenInput((stored.token as string) || "");
}

async function saveSettings() {
  await chrome.storage.sync.set({
    apiBase: els.apiBase.value.trim(),
    token: cleanTokenInput(els.apiToken.value),
  });
}

function apiBase(): string {
  return els.apiBase.value.trim() || "http://localhost:3000";
}

function token(): string {
  return cleanTokenInput(els.apiToken.value);
}

function setPopupState(next: PopupState, message?: string) {
  popupState = next;
  els.stateIdle.classList.toggle("hidden", next !== "idle");
  els.stateBusy.classList.toggle("hidden", next !== "capturing" && next !== "saving");
  els.statePreview.classList.toggle("hidden", next !== "previewing");
  if (message) els.status.textContent = message;
  if (next === "capturing") els.busyLabel.textContent = "Reading this page…";
  if (next === "saving") els.busyLabel.textContent = "Saving to HireVault…";
}

function populateYearOptions(selected?: number | null) {
  els.fieldRoleYear.innerHTML = '<option value="">—</option>';
  for (const year of COHORT_YEAR_OPTIONS) {
    const opt = document.createElement("option");
    opt.value = String(year);
    opt.textContent = String(year);
    if (selected === year) opt.selected = true;
    els.fieldRoleYear.appendChild(opt);
  }
}

function renderPriorityStars() {
  els.priorityStars.innerHTML = "";
  for (let n = 1; n <= 5; n++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `star${n <= priorityValue ? " active" : ""}`;
    btn.textContent = "★";
    btn.title = `Priority ${n}`;
    btn.addEventListener("click", () => {
      priorityValue = n;
      renderPriorityStars();
      updateMetaBadges();
    });
    els.priorityStars.appendChild(btn);
  }
}

function readMinorFields(): PopupMinorFields {
  return {
    title: els.fieldTitle.value,
    company: els.fieldCompany.value,
    job_type: els.fieldJobType.value,
    role_season: els.fieldRoleSeason.value,
    role_year: els.fieldRoleYear.value,
    priority: priorityValue,
  };
}

function updateMetaBadges() {
  const minor = readMinorFields();
  const year = minor.role_year ? Number(minor.role_year) : null;
  const term = formatTermBadge(
    (minor.role_season as CaptureDraft["role_season"]) || null,
    year
  );
  const locs = currentDraft?.locations ?? [];
  const jobType = jobTypeLabel((minor.job_type as CaptureDraft["job_type"]) || null);

  els.metaBadges.innerHTML = "";
  const items: { text: string; className?: string }[] = [];
  if (term) items.push({ text: term, className: "term" });
  items.push({ text: jobType });
  items.push({ text: locationsSummary(locs) });
  items.push({ text: `Priority ${minor.priority}` });
  if (currentDraft?.degraded) items.push({ text: "AI degraded", className: "warn" });
  if (currentDraft?.warning) items.push({ text: "Check on web", className: "warn" });

  for (const item of items) {
    const span = document.createElement("span");
    span.className = `badge${item.className ? ` ${item.className}` : ""}`;
    span.textContent = item.text;
    els.metaBadges.appendChild(span);
  }
}

function fillPreviewFromDraft(draft: CaptureDraft) {
  currentDraft = draft;
  priorityValue = draft.priority ?? 3;
  els.fieldTitle.value = draft.title;
  els.fieldCompany.value = draft.company;
  els.fieldJobType.value = draft.job_type ?? "";
  els.fieldRoleSeason.value = draft.role_season ?? "";
  populateYearOptions(draft.role_year);
  renderPriorityStars();
  updateMetaBadges();
}

function readDraftForSave(): CaptureDraft | null {
  if (!currentDraft) return null;
  return draftFromMinorEdits(currentDraft, readMinorFields());
}

function setOpenAppLink(applicationId?: string) {
  els.openApp.href = applicationsUrl(apiBase(), { applicationId });
  els.openApp.classList.remove("hidden");
}

async function runPreviewFromScraped(scraped: ScrapedJob) {
  await saveSettings();
  setPopupState("capturing", "Building preview…");
  els.openApp.classList.add("hidden");

  const preview = await previewScrapedJob(scraped, apiBase(), token());
  if (preview?.error && !preview.draft) {
    setPopupState("idle", preview.error);
    return;
  }

  const draft = preview.draft as CaptureDraft;
  let status = "Quick edits here — full review on web if needed.";
  if (preview.usedFixture) status = preview.warning ?? "Using local fixture — edit before saving.";
  else if (preview.warning) status = preview.warning;
  else if (preview.degraded) status = "AI parse degraded — use Edit on web for full fields.";

  fillPreviewFromDraft(draft);
  setPopupState("previewing", status);
}

async function runCapture() {
  await saveSettings();
  setPopupState("capturing", "Reading this page…");
  els.openApp.classList.add("hidden");
  els.pasteDetails.open = false;

  const { job, tabUrl } = await scrapeActiveTab();
  activeTabUrl = tabUrl;
  if (!job) {
    setPopupState("idle", "Open a job posting tab, or paste manually below.");
    els.pasteDetails.open = true;
    return;
  }

  await runPreviewFromScraped(job);
}

async function runSave(needsReview: boolean) {
  const draft = readDraftForSave();
  if (!draft) {
    setPopupState("idle", "Capture a job first.");
    return;
  }

  await saveSettings();
  setPopupState("saving");
  els.openApp.classList.add("hidden");

  const res = await saveCaptureDraft(draft, apiBase(), token(), needsReview);
  if (res?.error) {
    setPopupState("previewing", res.error);
    return;
  }

  if (res.applicationId || res.jobId) {
    await chrome.storage.local.set({
      [LAST_SYNC_KEY]: {
        jobId: res.jobId,
        applicationId: res.applicationId,
        at: Date.now(),
      },
    });
  }

  if (needsReview) {
    const url = applicationsUrl(apiBase(), {
      applicationId: res.applicationId,
      needsReview: !res.applicationId,
    });
    openWebTab(url);
    setPopupState("idle", res.deduped ? "Updated — opened web review." : "Saved — finish on web.");
  } else {
    const msg = res.deduped ? "Updated existing job." : "Saved to HireVault.";
    if (res.applicationId) setOpenAppLink(res.applicationId);
    setPopupState("idle", msg);
  }

  currentDraft = null;
}

function runEditOnWeb() {
  const draft = readDraftForSave();
  const url = draft?.url || activeTabUrl;
  if (!url) {
    setPopupState("previewing", "No job URL — save or paste a link first.");
    return;
  }
  openWebTab(applicationsUrl(apiBase(), { addUrl: url }));
  setPopupState("previewing", "Opened HireVault — full edit there (not saved yet).");
}

function discardPreview() {
  currentDraft = null;
  els.openApp.classList.add("hidden");
  setPopupState("idle", "Capture a job from the active tab.");
}

function bindMetaRefresh() {
  for (const el of [
    els.fieldTitle,
    els.fieldCompany,
    els.fieldJobType,
    els.fieldRoleSeason,
    els.fieldRoleYear,
  ]) {
    el.addEventListener("input", () => updateMetaBadges());
    el.addEventListener("change", () => updateMetaBadges());
  }
}

populateYearOptions();
renderPriorityStars();
bindMetaRefresh();

els.btnCapture.addEventListener("click", () => void runCapture());
els.btnSave.addEventListener("click", () => void runSave(false));
els.btnSaveReview.addEventListener("click", () => void runSave(true));
els.btnEditWeb.addEventListener("click", () => runEditOnWeb());
els.btnDiscard.addEventListener("click", () => discardPreview());
els.apiBase.addEventListener("change", () => void saveSettings());
els.apiToken.addEventListener("change", () => void saveSettings());

els.btnPastePreview.addEventListener("click", () => {
  const job: ScrapedJob = {
    title: els.pasteTitle.value.trim() || "Untitled role",
    company: els.pasteCompany.value.trim() || "Unknown company",
    url: activeTabUrl ?? "",
    description: els.pasteDesc.value.trim(),
    source: "manual_paste",
    confidence: "low",
  };
  if (job.description.length < 60) {
    els.status.textContent = "Paste a longer job description (60+ chars).";
    return;
  }
  els.pasteDetails.open = false;
  void runPreviewFromScraped(job);
});

void loadSettings();
