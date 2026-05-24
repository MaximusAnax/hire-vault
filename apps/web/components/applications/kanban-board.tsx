"use client";

import { useTransition } from "react";
import type { ApplicationWithJob, ApplicationStatus } from "@hirevault/types";
import { PIPELINE_COLUMNS } from "@hirevault/types";
import { updateApplicationStatus } from "@/lib/applications/actions";
import { ApplicationCard } from "./application-card";

const COLUMN_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export function KanbanBoard({ applications }: { applications: ApplicationWithJob[] }) {
  const [pending, startTransition] = useTransition();

  const byStatus = (status: ApplicationStatus) =>
    applications.filter((a) => a.status === status);

  const onDrop = (status: ApplicationStatus, applicationId: string) => {
    startTransition(() => {
      void updateApplicationStatus(applicationId, status);
    });
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[420px]">
      {PIPELINE_COLUMNS.map((status) => (
        <div
          key={status}
          className="flex-shrink-0 w-64 rounded-lg border border-border bg-muted/20 p-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData("application/id");
            if (id) onDrop(status, id);
          }}
        >
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-sm font-semibold">{COLUMN_LABELS[status]}</h3>
            <span className="text-xs text-muted-foreground">{byStatus(status).length}</span>
          </div>
          <div className={`space-y-2 min-h-[80px] ${pending ? "opacity-70" : ""}`}>
            {byStatus(status).map((app) => (
              <ApplicationCard key={app.id} application={app} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
