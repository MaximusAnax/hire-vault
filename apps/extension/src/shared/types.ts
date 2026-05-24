export interface ScrapedJob {
  title: string;
  company: string;
  location?: string;
  url: string;
  description: string;
  source: string;
  confidence: "high" | "medium" | "low";
}

export interface CapturePayload {
  job: ScrapedJob;
  createApplication?: boolean;
}
