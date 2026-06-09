"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { uploadAndParseResume, fetchTailoringReadiness } from "@/lib/ingestion/actions";
import type { ImportSectionCounts } from "@/lib/ingestion/normalize-parsed-resume";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatSectionSummary(counts: ImportSectionCounts): string {
  const parts: string[] = [];
  if (counts.experiences) parts.push(`${counts.experiences} experience`);
  if (counts.leadership) parts.push(`${counts.leadership} leadership`);
  if (counts.education) parts.push(`${counts.education} education`);
  if (counts.courses) parts.push(`${counts.courses} courses`);
  if (counts.skills) parts.push(`${counts.skills} skills`);
  if (counts.projects) parts.push(`${counts.projects} projects`);
  return parts.length ? parts.join(", ") : "profile fields";
}

export function ResumeUpload() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [readinessNote, setReadinessNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4 rounded-md border border-dashed border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        setReadinessNote(null);
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await uploadAndParseResume(fd);
          if (result.error) {
            setError(result.error + (result.hint ? ` — ${result.hint}` : ""));
          } else if (result.awaitingConfirm) {
            router.refresh();
          } else {
            const summary = result.sectionCounts
              ? formatSectionSummary(result.sectionCounts)
              : "items";
            setMessage(
              `Imported ${summary}. ${result.inserted} new, ${result.merged} merged, ${result.conflicts} conflicts queued.`
            );
            const readinessResult = await fetchTailoringReadiness();
            if ("readiness" in readinessResult && readinessResult.readiness) {
              setReadinessNote(
                readinessResult.readiness.ready
                  ? "Profile now ready to tailor."
                  : `${readinessResult.readiness.blockers.length} blocker(s) remain — see banner above.`
              );
            }
            router.refresh();
          }
        });
      }}
    >
      <div className="flex items-center gap-2">
        <Upload className="h-5 w-5 text-primary" />
        <div>
          <p className="font-medium">Resume upload</p>
          <p className="text-sm text-muted-foreground">
            PDF or DOCX — parse first, then review changes before applying
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="resume">File</Label>
        <Input
          id="resume"
          name="resume"
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          required
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" name="apply_immediately" className="rounded border-border" />
        Apply immediately (skip preview)
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Parsing…" : "Upload & preview"}
      </Button>
      {message && <p className="text-sm text-green-500">{message}</p>}
      {readinessNote && <p className="text-sm text-muted-foreground">{readinessNote}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
