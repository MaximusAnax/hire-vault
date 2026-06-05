"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { ApplicationWithJob } from "@hirevault/types";
import { APPLICATION_STATUSES } from "@hirevault/types";
import { updateApplicationStatus, updateApplicationPriority } from "@/lib/applications/actions";
import type { ResumeSummary } from "@/lib/resumes/resume-summary";
import { resumeCtaLabel } from "@/lib/resumes/resume-summary";
import { resumeBuilderUrl } from "@/lib/resumes/urls";
import { ApplicationCard } from "@/components/applications/application-card";
import { ResumeSummaryBadge } from "@/components/resumes/resume-summary-badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  saved: "Saved",
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export function ApplicationListView({
  applications,
  resumeSummaries,
}: {
  applications: ApplicationWithJob[];
  resumeSummaries: Record<string, ResumeSummary>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (applications.length === 0) {
    return (
      <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-6 text-center">
        No applications match your filters.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="hidden sm:grid sm:grid-cols-[1fr_100px_90px_100px_auto] gap-3 px-4 py-2 bg-muted/30 text-xs font-medium text-muted-foreground border-b border-border">
        <span>Role</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Resume</span>
        <span className="text-right">Actions</span>
      </div>
      <ul className="divide-y divide-border">
        {applications.map((app) => {
          const summary = resumeSummaries[app.id];
          const expanded = expandedId === app.id;
          const job = app.job;

          return (
            <li key={app.id}>
              <div
                className={cn(
                  "grid gap-3 px-4 py-3 sm:grid-cols-[1fr_100px_90px_100px_auto] sm:items-center",
                  expanded && "bg-muted/10"
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{job?.title ?? "Untitled"}</p>
                  <p className="text-xs text-muted-foreground truncate">{job?.company ?? "—"}</p>
                </div>

                <div className="flex sm:block items-center gap-2">
                  <span className="text-xs text-muted-foreground sm:hidden">Status</span>
                  <select
                    className="w-full text-xs rounded border border-border bg-background px-2 py-1"
                    value={app.status}
                    disabled={pending}
                    onChange={(e) =>
                      startTransition(() => {
                        void updateApplicationStatus(
                          app.id,
                          e.target.value as (typeof APPLICATION_STATUSES)[number]
                        );
                      })
                    }
                    aria-label="Change status"
                  >
                    {APPLICATION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex sm:block items-center gap-2">
                  <span className="text-xs text-muted-foreground sm:hidden">Priority</span>
                  <StarRating
                    value={app.priority}
                    size={14}
                    hideLabel
                    disabled={pending}
                    ariaLabel="Priority"
                    onChange={(next) =>
                      startTransition(() => void updateApplicationPriority(app.id, next))
                    }
                  />
                </div>

                <div className="flex sm:block items-center gap-2">
                  <span className="text-xs text-muted-foreground sm:hidden">Resume</span>
                  <ResumeSummaryBadge summary={summary} />
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                    <Link href={resumeBuilderUrl(app.id)}>{resumeCtaLabel(summary)}</Link>
                  </Button>
                  {app.job_id ? (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                      <Link href={`/interviews?job=${app.job_id}`}>Interview</Link>
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setExpandedId(expanded ? null : app.id)}
                  >
                    {expanded ? "Close" : "Edit"}
                  </Button>
                </div>
              </div>

              {expanded ? (
                <div className="px-4 pb-4 border-t border-border bg-card">
                  <ApplicationCard application={app} resumeSummary={summary} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
