"use client";

import { useTransition } from "react";
import type { ApplicationWithJob } from "@hirevault/types";
import { APPLICATION_STATUSES } from "@hirevault/types";
import { updateApplicationStatus, addApplicationNote } from "@/lib/applications/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StarRating } from "@/components/ui/star-rating";

const STATUS_LABELS: Record<string, string> = {
  saved: "Saved",
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export function ApplicationCard({
  application,
  onDragStart,
}: {
  application: ApplicationWithJob;
  onDragStart?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const job = application.job;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/id", application.id);
        onDragStart?.();
      }}
      className="rounded-md border border-border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing space-y-2"
    >
      <div>
        <p className="font-medium text-sm leading-tight">
          {job?.title ?? "Untitled"}
        </p>
        <p className="text-xs text-muted-foreground">{job?.company ?? "—"}</p>
      </div>
      {(job?.locations?.length ?? 0) > 0 ? (
        <div className="flex flex-wrap gap-1">
          {job!.locations.map((loc) => (
            <span
              key={loc}
              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {loc}
            </span>
          ))}
        </div>
      ) : job?.location ? (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
          {job.location}
        </span>
      ) : null}
      {application.priority ? (
        <StarRating value={application.priority} disabled size={14} hideLabel />
      ) : null}
      {application.applied_date && (
        <p className="text-xs text-muted-foreground">Applied {application.applied_date}</p>
      )}
      <select
        className="w-full text-xs rounded border border-border bg-background px-2 py-1"
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
        className="flex gap-1"
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
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {application.notes.slice(-2).map((n, i) => (
            <li key={i} className="truncate">· {n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
