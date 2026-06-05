export interface ResumeSummary {
  count: number;
  latestVersion: number | null;
  latestAts: number | null;
  latestGeneratedAt: string | null;
  hasPdf: boolean;
}

export function formatResumeSummaryLabel(summary: ResumeSummary | undefined): string {
  if (!summary || summary.count === 0) return "No resume";
  const parts = [`v${summary.latestVersion}`];
  if (summary.latestAts != null) parts.push(String(summary.latestAts));
  return parts.join(" · ");
}

export function resumeCtaLabel(summary: ResumeSummary | undefined): string {
  if (!summary || summary.count === 0) return "Tailor resume";
  return `Open v${summary.latestVersion}`;
}
