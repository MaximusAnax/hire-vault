"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import {
  markApplicationReviewed,
  updateApplicationPriority,
  updateJobBasics,
} from "@/lib/applications/actions";
import type { ApplicationWithJob } from "@hirevault/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CaptureDraftFieldsEditor } from "@/components/applications/capture-draft-fields";
import {
  applicationToFields,
  type CaptureDraftFields,
} from "@/lib/applications/capture-draft-mappers";
import type { JobType } from "@hirevault/types";
import { cn } from "@/lib/utils";

interface ReviewRowProps {
  app: ApplicationWithJob;
  onReviewed: () => void;
}

function ReviewRow({ app, onReviewed }: ReviewRowProps) {
  const [expanded, setExpanded] = useState(true);
  const [draft, setDraft] = useState<CaptureDraftFields>(() => applicationToFields(app));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleMarkReviewed = () => {
    setError(null);
    startTransition(async () => {
      if (app.job_id) {
        const jobResult = await updateJobBasics(app.job_id, {
          title: draft.title || "Untitled role",
          company: draft.company || "Unknown company",
          url: draft.url || null,
          locations: draft.locations,
          job_type: (draft.job_type as JobType) || null,
          role_season: draft.role_season || null,
          role_year: draft.role_year || null,
        });
        if (jobResult.error) {
          setError(jobResult.error);
          return;
        }
      }

      if (draft.priority !== app.priority) {
        const priorityResult = await updateApplicationPriority(app.id, draft.priority);
        if (priorityResult.error) {
          setError(priorityResult.error);
          return;
        }
      }

      const reviewResult = await markApplicationReviewed(app.id);
      if (reviewResult.error) {
        setError(reviewResult.error);
        return;
      }
      onReviewed();
    });
  };

  const sourceLabel =
    app.capture_source === "extension"
      ? "Extension capture"
      : app.capture_source === "web"
        ? "Web capture"
        : "Captured role";

  return (
    <div className="rounded-md border border-border bg-background">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{draft.title || "Untitled role"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {draft.company || "Unknown company"} · {sourceLabel}
          </p>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
        />
      </button>

      {expanded ? (
        <div className="space-y-3 border-t border-border px-3 py-3">
          <CaptureDraftFieldsEditor
            draft={draft}
            onChange={setDraft}
            showStatus={false}
            showDescription={false}
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleMarkReviewed} disabled={pending}>
              {pending ? "Saving…" : "Mark reviewed"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface CaptureReviewPanelProps {
  applications: ApplicationWithJob[];
}

export function CaptureReviewPanel({ applications }: CaptureReviewPanelProps) {
  const [rows, setRows] = useState(applications);

  if (rows.length === 0) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {rows.length === 1 ? "1 role needs review" : `${rows.length} roles need review`}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Quick extension captures land here — polish fields, then mark reviewed to clear the flag.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((app) => (
          <ReviewRow
            key={app.id}
            app={app}
            onReviewed={() => setRows((prev) => prev.filter((row) => row.id !== app.id))}
          />
        ))}
      </CardContent>
    </Card>
  );
}
