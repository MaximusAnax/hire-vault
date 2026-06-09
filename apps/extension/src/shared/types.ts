import type { CaptureDraft, CaptureScrapeConfidence, JobType, RoleSeason } from "@hirevault/types";

export type { CaptureDraft, CaptureScrapeConfidence, JobType, RoleSeason };

export type ScrapeSource =
  | "linkedin"
  | "greenhouse"
  | "lever"
  | "workday"
  | "ashby"
  | "smartrecruiters"
  | "generic"
  | "page_dump"
  | "manual_paste";

export interface ScrapedJob {
  title: string;
  company: string;
  location?: string;
  url: string;
  description: string;
  source: ScrapeSource | string;
  confidence: CaptureScrapeConfidence;
  locations?: string[];
}

export interface CapturePayload {
  job: ScrapedJob;
  createApplication?: boolean;
}

export interface SyncJobPayload {
  draft: CaptureDraft;
  skip_ai_parse: true;
  createApplication?: boolean;
  needs_review?: boolean;
}

export interface PreviewJobResult {
  draft?: CaptureDraft;
  degraded?: boolean;
  warning?: string | null;
  usedFixture?: boolean;
  error?: string;
}

export interface SyncJobResult {
  ok?: boolean;
  error?: string;
  jobId?: string;
  applicationId?: string;
  deduped?: boolean;
}

export interface LastSyncMeta {
  jobId?: string;
  applicationId?: string;
  at: number;
}
