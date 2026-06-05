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
  confidence: "high" | "medium" | "low";
  locations?: string[];
}

export interface CapturePayload {
  job: ScrapedJob;
  createApplication?: boolean;
}

export interface LastSyncMeta {
  jobId?: string;
  applicationId?: string;
  at: number;
}
