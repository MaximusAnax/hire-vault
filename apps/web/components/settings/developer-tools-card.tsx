"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  clearAllUserData,
  clearImportHistory,
  clearInterviewPrepData,
  clearPipelineData,
  clearProfileData,
} from "@/lib/dev/actions";
import type { DevDataSummary } from "@/lib/dev/reset-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ResetAction = () => Promise<{ success?: boolean; error?: string; summary?: string }>;

function CountCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ResetButton({
  label,
  description,
  confirmMessage,
  action,
  disabled,
  onResult,
}: {
  label: string;
  description: string;
  confirmMessage: string;
  action: ResetAction;
  disabled: boolean;
  onResult: (message: string, isError: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    startTransition(async () => {
      const res = await action();
      if (res.error) {
        onResult(res.error, true);
        return;
      }
      onResult(res.summary ?? `${label} completed.`, false);
    });
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-start border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        disabled={disabled || pending}
        onClick={handleClick}
      >
        {pending ? "Working…" : label}
      </Button>
      <p className="text-[11px] text-muted-foreground leading-snug">{description}</p>
    </div>
  );
}

export function DeveloperToolsCard({ summary }: { summary: DevDataSummary }) {
  const router = useRouter();
  const [globalPending, startGlobalTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function handleResult(text: string, error: boolean) {
    setMessage(text);
    setIsError(error);
    if (!error) router.refresh();
  }

  function handleClearAll() {
    const ok = window.confirm(
      "Delete ALL your HireVault data for this account?\n\n" +
        "• Pipeline: jobs, applications, tailored resumes, company research\n" +
        "• Profile: all sections, uploaded resume files, profile fields\n" +
        "• Import history and merge conflicts\n" +
        "• Interview question bank\n" +
        "• Extension tokens\n\n" +
        "Your login is kept. This cannot be undone."
    );
    if (!ok) return;

    setMessage(null);
    startGlobalTransition(async () => {
      const res = await clearAllUserData();
      if (res.error) {
        handleResult(res.error, true);
        return;
      }
      handleResult(res.summary ?? "All user data cleared.", false);
    });
  }

  const profileTotal =
    summary.profile.experiences +
    summary.profile.education +
    summary.profile.leadership +
    summary.profile.skills +
    summary.profile.courses +
    summary.profile.projects;

  const pipelineTotal =
    summary.pipeline.jobs +
    summary.pipeline.applications +
    summary.pipeline.tailored_resumes +
    summary.pipeline.company_research;

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base text-destructive">Developer tools</CardTitle>
        <CardDescription>
          Scoped resets for local testing. Only available outside production (or when{" "}
          <code className="text-xs">ALLOW_DEV_DATA_RESET=1</code>).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Data summary
          </p>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Profile ({profileTotal} section rows)
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                <CountCell label="Experiences" value={summary.profile.experiences} />
                <CountCell label="Education" value={summary.profile.education} />
                <CountCell label="Leadership" value={summary.profile.leadership} />
                <CountCell label="Skills" value={summary.profile.skills} />
                <CountCell label="Courses" value={summary.profile.courses} />
                <CountCell label="Projects" value={summary.profile.projects} />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Pipeline ({pipelineTotal} rows)
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <CountCell label="Jobs" value={summary.pipeline.jobs} />
                <CountCell label="Applications" value={summary.pipeline.applications} />
                <CountCell label="Tailored resumes" value={summary.pipeline.tailored_resumes} />
                <CountCell label="Company research" value={summary.pipeline.company_research} />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Import & other</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <CountCell label="Import runs" value={summary.import.ingestion_runs} />
                <CountCell label="Conflicts" value={summary.import.dedup_conflicts} />
                <CountCell label="Pending conflicts" value={summary.import.dedup_conflicts_pending} />
                <CountCell label="Interview questions" value={summary.other.interview_questions} />
                <CountCell label="Storage files" value={summary.other.resume_storage_files} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Scoped resets
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <ResetButton
              label="Clear pipeline"
              description="Jobs, applications, tailored resumes, company research."
              confirmMessage={
                "Clear pipeline data?\n\n" +
                "• Applications (notes, interviews, linked resumes)\n" +
                "• Jobs (interview questions)\n" +
                "• Tailored resumes\n" +
                "• Company research\n\n" +
                "Profile and import history are kept."
              }
              action={clearPipelineData}
              disabled={globalPending}
              onResult={handleResult}
            />
            <ResetButton
              label="Clear profile"
              description="Profile sections, scalars, and resume storage files."
              confirmMessage={
                "Clear profile data?\n\n" +
                "• Experiences, education, leadership, skills, courses, projects\n" +
                "• Profile name, contact, target roles, skills\n" +
                "• Uploaded resume files in storage\n\n" +
                "Jobs and applications are kept."
              }
              action={clearProfileData}
              disabled={globalPending}
              onResult={handleResult}
            />
            <ResetButton
              label="Clear import history"
              description="Ingestion runs and dedup conflicts only."
              confirmMessage={
                "Clear import history?\n\n" +
                "• Ingestion runs\n" +
                "• Merge / dedup conflicts\n\n" +
                "Profile content and pipeline are kept."
              }
              action={clearImportHistory}
              disabled={globalPending}
              onResult={handleResult}
            />
            <ResetButton
              label="Clear interview prep"
              description="Generated interview questions and practice state."
              confirmMessage={
                "Clear interview prep data?\n\n" +
                "• Interview questions for your jobs\n\n" +
                "Profile and pipeline are kept."
              }
              action={clearInterviewPrepData}
              disabled={globalPending}
              onResult={handleResult}
            />
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            disabled={globalPending}
            onClick={handleClearAll}
          >
            {globalPending ? "Clearing all…" : "Clear all data"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Full wipe: everything above plus extension tokens and a fresh empty profile.
          </p>
        </div>

        {message && (
          <p className={`text-xs ${isError ? "text-destructive" : "text-muted-foreground"}`}>
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
