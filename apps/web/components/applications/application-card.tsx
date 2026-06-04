"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, GripVertical, Trash2 } from "lucide-react";
import type { ApplicationWithJob, JobType, RoleSeason } from "@hirevault/types";
import { ROLE_SEASONS } from "@hirevault/types";
import { APPLICATION_STATUSES } from "@hirevault/types";
import {
  updateApplicationStatus,
  updateApplicationPriority,
  addApplicationNote,
  removeApplicationAndJob,
  updateJobBasics,
} from "@/lib/applications/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/ui/star-rating";
import { ChipEditor } from "@/components/applications/chip-editor";
import { JobMetaBadges } from "@/components/applications/job-meta-badges";
import {
  COHORT_YEAR_OPTIONS,
  ROLE_SEASON_LABELS,
  resolveRoleTiming,
} from "@/lib/applications/role-timing";
import { cn } from "@/lib/utils";

const SAVE_DEBOUNCE_MS = 450;

const STATUS_LABELS: Record<string, string> = {
  saved: "Saved",
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

interface JobDraft {
  title: string;
  company: string;
  url: string;
  locations: string[];
  job_type: JobType | "";
  role_season: RoleSeason | "";
  role_year: string;
}

function jobToDraft(job: ApplicationWithJob["job"]): JobDraft {
  const locations =
    (job?.locations?.length ?? 0) > 0
      ? job!.locations
      : job?.location
        ? [job.location]
        : [];
  return {
    title: job?.title ?? "",
    company: job?.company ?? "",
    url: job?.url ?? "",
    locations,
    job_type: job?.job_type ?? "",
    role_season: job?.role_season ?? "",
    role_year: job?.role_year != null ? String(job.role_year) : "",
  };
}

function draftToPayload(draft: JobDraft) {
  return {
    title: draft.title,
    company: draft.company,
    url: draft.url || null,
    locations: draft.locations,
    job_type: draft.job_type || null,
    role_season: draft.role_season || null,
    role_year: draft.role_year || null,
  };
}

export function ApplicationCard({
  application,
  onDragStart,
}: {
  application: ApplicationWithJob;
  onDragStart?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<JobDraft>(() => jobToDraft(application.job));
  const [saveError, setSaveError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  const job = application.job;

  draftRef.current = draft;

  const persistDraft = useCallback(
    (next: JobDraft) => {
      if (!job?.id) return;
      setSaveError(null);
      startTransition(async () => {
        const res = await updateJobBasics(job.id, draftToPayload(next));
        if (res && "error" in res && res.error) {
          setSaveError(res.error);
        }
      });
    },
    [job?.id]
  );

  const applyDraft = useCallback(
    (next: JobDraft, options?: { debounce?: boolean }) => {
      setDraft(next);
      if (!job?.id) return;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (options?.debounce) {
        debounceRef.current = setTimeout(() => {
          debounceRef.current = null;
          persistDraft(next);
        }, SAVE_DEBOUNCE_MS);
      } else {
        persistDraft(next);
      }
    },
    [job?.id, persistDraft]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (expanded) setDraft(jobToDraft(job));
  }, [application.id, expanded]);

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Remove this job from your pipeline? This deletes the job and application.")) {
      return;
    }
    startTransition(() => void removeApplicationAndJob(application.id));
  }

  function toggleExpanded() {
    if (expanded) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        persistDraft(draftRef.current);
      }
      setExpanded(false);
      setSaveError(null);
      return;
    }
    setDraft(jobToDraft(job));
    setSaveError(null);
    setExpanded(true);
  }

  const locationPills =
    (job?.locations?.length ?? 0) > 0
      ? job!.locations
      : job?.location
        ? [job.location]
        : [];

  const badgeSource = expanded ? draft : jobToDraft(job);
  const badgeTiming = resolveRoleTiming({
    title: badgeSource.title,
    role_season: badgeSource.role_season || null,
    role_year: badgeSource.role_year || null,
  });

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card shadow-sm space-y-2 transition-shadow",
        expanded ? "ring-2 ring-primary/25 p-3" : "p-3"
      )}
    >
      <div className="flex items-start gap-1">
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("application/id", application.id);
            onDragStart?.();
          }}
          className="shrink-0 rounded p-0.5 text-muted-foreground touch-none cursor-grab active:cursor-grabbing hover:text-foreground"
          aria-label="Drag to another column"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="font-medium text-sm leading-tight">{job?.title ?? "Untitled"}</p>
          <p className="text-xs text-muted-foreground truncate">{job?.company ?? "—"}</p>
        </button>

        <button
          type="button"
          onClick={toggleExpanded}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label={expanded ? "Collapse" : "Expand to edit"}
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
          />
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          className="shrink-0 rounded p-1 text-muted-foreground transition-all hover:bg-red-500/15 hover:text-red-500 hover:shadow-[0_0_10px_rgba(239,68,68,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
          aria-label="Remove job from pipeline"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <JobMetaBadges
        job_type={(badgeSource.job_type || null) as JobType | null}
        role_season={badgeTiming.role_season}
        role_year={badgeTiming.role_year}
      />

      {!expanded && locationPills.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {locationPills.map((loc) => (
            <span
              key={loc}
              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {loc}
            </span>
          ))}
        </div>
      ) : null}

      {expanded ? (
        <div
          className="space-y-3 border-t border-border pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-1.5">
            <Label htmlFor={`title-${application.id}`} className="text-xs">
              Job title
            </Label>
            <Input
              id={`title-${application.id}`}
              value={draft.title}
              onChange={(e) => applyDraft({ ...draft, title: e.target.value }, { debounce: true })}
              className="h-8 text-xs"
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`company-${application.id}`} className="text-xs">
              Company
            </Label>
            <Input
              id={`company-${application.id}`}
              value={draft.company}
              onChange={(e) => applyDraft({ ...draft, company: e.target.value }, { debounce: true })}
              className="h-8 text-xs"
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`url-${application.id}`} className="text-xs">
              Job URL
            </Label>
            <Input
              id={`url-${application.id}`}
              value={draft.url}
              onChange={(e) => applyDraft({ ...draft, url: e.target.value }, { debounce: true })}
              placeholder="https://…"
              className="h-8 text-xs"
              disabled={pending}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor={`job-type-${application.id}`} className="text-xs">
                Role type
              </Label>
              <select
                id={`job-type-${application.id}`}
                className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
                value={draft.job_type}
                onChange={(e) =>
                  applyDraft({
                    ...draft,
                    job_type: e.target.value as JobDraft["job_type"],
                  })
                }
                disabled={pending}
              >
                <option value="">—</option>
                <option value="full_time">Full-time</option>
                <option value="internship">Internship</option>
                <option value="contract">Contract</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`role-season-${application.id}`} className="text-xs">
                Cohort season
              </Label>
              <select
                id={`role-season-${application.id}`}
                className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
                value={draft.role_season}
                onChange={(e) =>
                  applyDraft({
                    ...draft,
                    role_season: e.target.value as JobDraft["role_season"],
                  })
                }
                disabled={pending}
              >
                <option value="">—</option>
                {ROLE_SEASONS.map((s) => (
                  <option key={s} value={s}>
                    {ROLE_SEASON_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`role-year-${application.id}`} className="text-xs">
              Cohort year
            </Label>
            <select
              id={`role-year-${application.id}`}
              className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs"
              value={draft.role_year}
              onChange={(e) => applyDraft({ ...draft, role_year: e.target.value })}
              disabled={pending}
            >
              <option value="">—</option>
              {COHORT_YEAR_OPTIONS.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <ChipEditor
            label="Locations"
            values={draft.locations}
            onChange={(next) => applyDraft({ ...draft, locations: next })}
            placeholder="Add location"
          />
          {saveError ? <p className="text-xs text-destructive">{saveError}</p> : null}
          {pending ? (
            <p className="text-[10px] text-muted-foreground">Saving…</p>
          ) : null}
        </div>
      ) : null}

      <div onClick={(e) => e.stopPropagation()}>
        {!expanded && (
          <StarRating
            value={application.priority}
            size={14}
            hideLabel
            disabled={pending}
            ariaLabel="Priority"
            onChange={(next) =>
              startTransition(() => void updateApplicationPriority(application.id, next))
            }
          />
        )}

        {expanded && (
          <div className="space-y-2 pt-1">
            <div className="space-y-1">
              <Label className="text-xs">Priority</Label>
              <StarRating
                value={application.priority}
                size={14}
                hideLabel
                disabled={pending}
                ariaLabel="Priority"
                onChange={(next) =>
                  startTransition(() => void updateApplicationPriority(application.id, next))
                }
              />
            </div>
          </div>
        )}

        {application.applied_date && (
          <p className="text-xs text-muted-foreground mt-1">Applied {application.applied_date}</p>
        )}

        <select
          className="w-full text-xs rounded border border-border bg-background px-2 py-1 mt-2"
          value={application.status}
          disabled={pending}
          onChange={(e) =>
            startTransition(() => {
              void updateApplicationStatus(
                application.id,
                e.target.value as (typeof APPLICATION_STATUSES)[number]
              );
            })
          }
          aria-label="Change application status"
        >
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <form
          className="flex gap-1 mt-2"
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem("note") as HTMLInputElement;
            if (!input.value.trim()) return;
            startTransition(async () => {
              await addApplicationNote(application.id, input.value);
              input.value = "";
            });
          }}
        >
          <Input name="note" placeholder="Add note…" className="h-7 text-xs" />
          <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={pending}>
            +
          </Button>
        </form>

        {application.notes?.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
            {application.notes.slice(-2).map((n, i) => (
              <li key={i} className="truncate">
                · {n}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
