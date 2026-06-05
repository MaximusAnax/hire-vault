import type { ResumeSummary } from "@/lib/resumes/resume-summary";
import { formatResumeSummaryLabel } from "@/lib/resumes/resume-summary";
import { cn } from "@/lib/utils";

export function ResumeSummaryBadge({
  summary,
  className,
}: {
  summary?: ResumeSummary;
  className?: string;
}) {
  const hasResume = summary && summary.count > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        hasResume ? "bg-muted text-foreground" : "text-muted-foreground",
        className
      )}
    >
      {formatResumeSummaryLabel(summary)}
      {hasResume && summary.hasPdf ? (
        <span className="h-1.5 w-1.5 rounded-full bg-primary" title="PDF exported" />
      ) : null}
    </span>
  );
}
