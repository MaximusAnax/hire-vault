"use server";

import { revalidatePath } from "next/cache";
import { parseJobDescription, type ParsedJobDescription } from "@hirevault/ai-core";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus, JobType } from "@hirevault/types";
import { fetchJobFromUrl, isLikelyUrl } from "./scrape";
import { normalizeLocations } from "./locations";
import { resolveRoleTiming } from "./role-timing";

function revalidateApps() {
  revalidatePath("/applications");
  revalidatePath("/jobs");
  revalidatePath("/overview");
}

export async function createJob(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const description = (formData.get("description_raw") as string) || "";
  let parsed = null;
  let tech_stack: string[] = [];
  let required_qualifications: string[] = [];
  let preferred_qualifications: string[] = [];

  const skipAi = formData.get("skip_ai_parse") === "1";
  if (skipAi) {
    tech_stack = formData.getAll("tech_stack").map((v) => String(v).trim()).filter(Boolean);
    required_qualifications = formData
      .getAll("required_qualifications")
      .map((v) => String(v).trim())
      .filter(Boolean);
    preferred_qualifications = formData
      .getAll("preferred_qualifications")
      .map((v) => String(v).trim())
      .filter(Boolean);
  } else if (description.length > 50) {
    const result = await parseJobDescription(description);
    if (result.data) {
      parsed = result.data;
      tech_stack = result.data.tech_stack ?? [];
      required_qualifications = result.data.required_qualifications ?? [];
      preferred_qualifications = result.data.preferred_qualifications ?? [];
    }
  }

  // locations: prefer explicit form field (locations[] or comma-joined `locations`),
  // then AI-parsed locations[], then legacy single `location`, then parsed.location.
  const formLocations = formData.getAll("locations");
  const formLocationsList = formLocations.length
    ? normalizeLocations(formLocations as string[])
    : normalizeLocations(formData.get("locations"));
  const aiLocations = normalizeLocations(parsed?.locations);
  const singleLegacy = ((formData.get("location") as string) || "").trim();
  const parsedSingle = (parsed?.location ?? "").toString().trim();
  const locations = formLocationsList.length
    ? formLocationsList
    : aiLocations.length
      ? aiLocations
      : singleLegacy
        ? [singleLegacy]
        : parsedSingle
          ? [parsedSingle]
          : [];
  // First chip mirrors into legacy `location` for backward compatibility.
  const primaryLocation = locations[0] ?? null;

  const rawTitle = (formData.get("title") as string) || parsed?.title || "Untitled role";
  const timing = resolveRoleTiming({
    title: rawTitle,
    role_season:
      (formData.get("role_season") as string) ||
      (parsed?.role_season as string | undefined) ||
      null,
    role_year:
      formData.get("role_year") != null && formData.get("role_year") !== ""
        ? (formData.get("role_year") as string)
        : (parsed?.role_year ?? null),
  });
  const jobType =
    (formData.get("job_type") as JobType) ||
    parsed?.job_type ||
    (/\bintern(ship)?\b/i.test(timing.title) ? "internship" : null);

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      user_id: user.id,
      title: timing.title,
      company: (formData.get("company") as string) || parsed?.company || "Unknown company",
      location: primaryLocation,
      locations,
      url: (formData.get("url") as string) || null,
      description_raw: description || null,
      description_parsed: parsed,
      tech_stack,
      required_qualifications,
      preferred_qualifications,
      salary_range: parsed?.salary_range ?? null,
      job_type: jobType,
      role_season: timing.role_season,
      role_year: timing.role_year,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidateApps();
  return { success: true, jobId: job?.id };
}

export interface ParseAndPreviewJobResult {
  /** Free-text JD or scraped page text — surfaced so the form can post it back on save. */
  description_raw: string;
  /** Source the text was obtained from. */
  source: "url" | "text";
  /** Original URL if input was a link. */
  url?: string;
  /** Per-domain handler that succeeded, if any. */
  scrapeSource?: "greenhouse" | "lever" | "ashby" | "workday" | "generic";
  /** AI-parsed structured fields (empty object if AI is unavailable). */
  parsed: ParsedJobDescription;
  /** Normalized location chips merged from scrape + AI. */
  locations: string[];
  /** True when AI is unavailable / returned no data; the user can still edit and save. */
  degraded?: boolean;
  /** AI parse error, if any. */
  warning?: string;
}

export interface ParseAndPreviewJobBlocked {
  blocked: true;
  url: string;
  fallbackHint: string;
  status?: number;
}

export interface ParseAndPreviewJobError {
  error: string;
}

/**
 * Smart-capture entry point. Accepts either a URL or pasted JD text, runs the scraper
 * when needed, then pipes the result through {@link parseJobDescription}. Always
 * returns a structured preview that the client can edit and POST back via {@link createJob}.
 */
export async function parseAndPreviewJob(
  input: string
): Promise<ParseAndPreviewJobResult | ParseAndPreviewJobBlocked | ParseAndPreviewJobError> {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return { error: "Paste a job URL or job description first." };

  let descriptionText = "";
  let source: "url" | "text" = "text";
  let url: string | undefined;
  let scrapeSource: ParseAndPreviewJobResult["scrapeSource"];
  let scrapedTitle: string | null = null;
  let scrapedCompany: string | null = null;
  let scrapedLocation: string | null = null;

  if (isLikelyUrl(trimmed)) {
    source = "url";
    url = trimmed;
    const scraped = await fetchJobFromUrl(trimmed);
    if ("blocked" in scraped && scraped.blocked) {
      return {
        blocked: true,
        url: scraped.url,
        fallbackHint: scraped.fallbackHint,
        status: scraped.status,
      };
    }
    descriptionText = scraped.text;
    scrapeSource = scraped.source;
    scrapedTitle = scraped.title;
    scrapedCompany = scraped.company;
    scrapedLocation = scraped.location;
  } else {
    descriptionText = trimmed;
  }

  if (descriptionText.length < 60) {
    return { error: "That looks too short to parse — paste the full JD or a longer link." };
  }

  const ai = await parseJobDescription(descriptionText);
  const parsed: ParsedJobDescription = ai.data ?? {};

  // Backfill from scraped DOM where AI missed.
  if (!parsed.title && scrapedTitle) parsed.title = scrapedTitle;
  if (!parsed.company && scrapedCompany) parsed.company = scrapedCompany;
  if (!parsed.location && scrapedLocation) parsed.location = scrapedLocation;

  const aiLocations = normalizeLocations(parsed.locations);
  const scrapedLocations = normalizeLocations(scrapedLocation);
  const legacyLocations = normalizeLocations(parsed.location);
  // Prefer AI-parsed multi-location, then scraped, then legacy single-string.
  const locations = aiLocations.length
    ? aiLocations
    : scrapedLocations.length
      ? scrapedLocations
      : legacyLocations;

  return {
    description_raw: descriptionText,
    source,
    url,
    scrapeSource,
    parsed,
    locations,
    degraded: ai.degraded,
    warning: ai.error,
  };
}

/**
 * Fast save from smart-capture preview — no second AI parse. Client posts edited fields only.
 */
export async function createJobAndApplicationFromPreview(formData: FormData) {
  formData.set("skip_ai_parse", "1");
  const jobResult = await createJob(formData);
  if (jobResult.error) return jobResult;
  const jobId = jobResult.jobId;
  if (!jobId) return { error: "Job insert failed" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const status = (formData.get("status") as ApplicationStatus) || "saved";
  const { error } = await supabase.from("applications").insert({
    user_id: user.id,
    job_id: jobId,
    status,
    priority: formData.get("priority") ? Number(formData.get("priority")) : null,
    notes: [],
  });
  if (error) return { error: error.message };
  revalidateApps();
  return { success: true, jobId };
}

export async function createApplication(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  let jobId = (formData.get("job_id") as string) || null;

  if (!jobId) {
    const jobResult = await createJob(formData);
    if (jobResult.error) return jobResult;
    jobId = jobResult.jobId ?? null;
  }

  const status = (formData.get("status") as ApplicationStatus) || "saved";
  const { error } = await supabase.from("applications").insert({
    user_id: user.id,
    job_id: jobId,
    status,
    applied_date: formData.get("applied_date")
      ? (formData.get("applied_date") as string)
      : status === "applied"
        ? new Date().toISOString().slice(0, 10)
        : null,
    priority: formData.get("priority") ? Number(formData.get("priority")) : null,
    referral_contact: (formData.get("referral_contact") as string) || null,
    notes: formData.get("notes")
      ? [(formData.get("notes") as string)]
      : [],
  });

  if (error) return { error: error.message };
  revalidateApps();
  return { success: true };
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
) {
  const supabase = await createClient();
  const updates: Record<string, unknown> = {
    status,
    last_updated: new Date().toISOString(),
  };
  if (status === "applied") {
    updates.applied_date = new Date().toISOString().slice(0, 10);
  }

  const { error } = await supabase
    .from("applications")
    .update(updates)
    .eq("id", applicationId);

  if (error) return { error: error.message };
  revalidateApps();
  return { success: true };
}

export async function updateJobBasics(
  jobId: string,
  fields: {
    title: string;
    company: string;
    url?: string | null;
    locations: string[];
    job_type?: JobType | null;
    role_season?: string | null;
    role_year?: number | string | null;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const locations = normalizeLocations(fields.locations);
  const timing = resolveRoleTiming({
    title: fields.title.trim() || "Untitled role",
    role_season: fields.role_season ?? null,
    role_year: fields.role_year ?? null,
  });
  const company = fields.company.trim() || "Unknown company";
  const url = (fields.url ?? "").trim() || null;

  const { error } = await supabase
    .from("jobs")
    .update({
      title: timing.title,
      company,
      url,
      locations,
      location: locations[0] ?? null,
      job_type: fields.job_type ?? null,
      role_season: timing.role_season,
      role_year: timing.role_year,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidateApps();
  return { success: true };
}

export async function updateApplicationPriority(
  applicationId: string,
  priority: number | null
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({
      priority,
      last_updated: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) return { error: error.message };
  revalidateApps();
  return { success: true };
}

export async function removeApplicationAndJob(applicationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: app } = await supabase
    .from("applications")
    .select("job_id")
    .eq("id", applicationId)
    .eq("user_id", user.id)
    .single();

  if (!app) return { error: "Application not found" };

  const { error: appError } = await supabase
    .from("applications")
    .delete()
    .eq("id", applicationId);
  if (appError) return { error: appError.message };

  if (app.job_id) {
    const { error: jobError } = await supabase
      .from("jobs")
      .delete()
      .eq("id", app.job_id)
      .eq("user_id", user.id);
    if (jobError) return { error: jobError.message };
  }

  revalidateApps();
  return { success: true };
}

export async function updateApplication(
  applicationId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({
      status: (formData.get("status") as ApplicationStatus) || undefined,
      applied_date: (formData.get("applied_date") as string) || null,
      priority: formData.get("priority") ? Number(formData.get("priority")) : null,
      referral_contact: (formData.get("referral_contact") as string) || null,
      last_updated: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) return { error: error.message };
  revalidateApps();
  return { success: true };
}

export async function addApplicationNote(applicationId: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!content.trim()) return { error: "Note cannot be empty" };

  const { error } = await supabase.from("application_notes").insert({
    application_id: applicationId,
    user_id: user.id,
    content: content.trim(),
  });

  if (error) return { error: error.message };

  const { data: notes } = await supabase
    .from("application_notes")
    .select("content")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });

  await supabase
    .from("applications")
    .update({
      notes: (notes ?? []).map((n) => n.content),
      last_updated: new Date().toISOString(),
    })
    .eq("id", applicationId);

  revalidateApps();
  return { success: true };
}

export async function deleteApplication(applicationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("applications").delete().eq("id", applicationId);
  if (error) return { error: error.message };
  revalidateApps();
  return { success: true };
}

export async function deleteJob(jobId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").delete().eq("id", jobId);
  if (error) return { error: error.message };
  revalidateApps();
  return { success: true };
}
