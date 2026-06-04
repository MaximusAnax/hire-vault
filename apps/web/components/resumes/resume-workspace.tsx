"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { tailorResumeForJob, exportResumePdf, deleteTailoredResume } from "@/lib/resumes/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface JobRow {
  id: string;
  title: string;
  company: string;
}

interface ResumeRow {
  id: string;
  label: string | null;
  ats_score: number | null;
  version: number;
  pdf_storage_path?: string | null;
  jobs?: { title: string; company: string } | null;
}

export function ResumeWorkspace({
  jobs,
  resumes,
  selectedId,
}: {
  jobs: JobRow[];
  resumes: ResumeRow[];
  selectedId?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const selected = resumes.find((r) => r.id === selectedId) ?? resumes[0];

  function handleTailor(jobId: string) {
    startTransition(async () => {
      const res = await tailorResumeForJob(jobId);
      if (res.error) setMessage(res.error);
      else setMessage(`Tailored resume v${res.atsScore != null ? ` · ATS ${res.atsScore}` : ""}`);
    });
  }

  function handleExportPdf() {
    if (!selected) return;
    startTransition(async () => {
      const res = await exportResumePdf(selected.id);
      if (res.error) setMessage(res.error);
      else setMessage("PDF generated (LaTeX). Requires pdflatex on the server.");
    });
  }

  const hasJobs = jobs.length > 0;
  const hasResumes = resumes.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-auto">
            {hasJobs ? (
              jobs.map((j) => (
                <Button
                  key={j.id}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  disabled={pending}
                  onClick={() => handleTailor(j.id)}
                >
                  {j.title} @ {j.company}
                </Button>
              ))
            ) : (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>No jobs yet.</p>
                <Link href="/applications" className="text-xs font-medium text-primary hover:underline">
                  Add from Applications →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
        {hasResumes ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Versions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {resumes.map((r) => (
                <Link
                  key={r.id}
                  href={`/resumes?id=${r.id}`}
                  className="block rounded px-2 py-1 hover:bg-muted"
                >
                  {r.label ?? `v${r.version}`} · ATS {r.ats_score ?? "—"}
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {!selected && !hasResumes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tailor your first resume</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Pick a job to tailor experience bullets for the JD, then export a PDF using your
              LaTeX template (same layout as resume_ref.tex).
            </p>
            <p className="text-xs">
              Set your name, contact, and Technical skills (LaTeX) on the Profile page first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">
              {selected?.jobs?.title ?? "Resume"} — {selected?.label ?? ""}
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={handleExportPdf} disabled={pending || !selected}>
                {pending ? "Working…" : "Export PDF (LaTeX)"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={pending || !selected}
                onClick={() =>
                  startTransition(async () => {
                    if (selected) await deleteTailoredResume(selected.id);
                  })
                }
              >
                Delete
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {message && <p className="text-xs">{message}</p>}
            <p>
              ATS score: <strong>{selected?.ats_score ?? "—"}</strong>. Export compiles your profile
              (education, experience, skills, leadership) with tailored bullets for matched roles.
            </p>
            <p className="text-xs">
              Requires <code className="text-[11px]">pdflatex</code> locally — see README.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
