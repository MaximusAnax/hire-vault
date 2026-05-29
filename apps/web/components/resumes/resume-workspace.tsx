"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  tailorResumeForJob,
  updateTailoredResumeContent,
  exportResumeHtml,
  exportResumePdf,
  deleteTailoredResume,
} from "@/lib/resumes/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RESUME_TEMPLATES } from "@hirevault/resume-templates";
import type { ResumeContent } from "@hirevault/ai-core";

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
  template_used: string | null;
  content: ResumeContent;
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
  const [content, setContent] = useState<ResumeContent | null>(
    selected?.content ?? null
  );
  const [template, setTemplate] = useState(selected?.template_used ?? "ats");

  function handleTailor(jobId: string) {
    startTransition(async () => {
      const res = await tailorResumeForJob(jobId);
      if (res.error) setMessage(res.error);
      else setMessage(`Tailored resume created (ATS ${res.atsScore ?? "—"})`);
    });
  }

  function handleSave() {
    if (!selected || !content) return;
    startTransition(async () => {
      const res = await updateTailoredResumeContent(selected.id, content, template);
      setMessage(res.error ?? "Saved");
    });
  }

  function handleExport() {
    if (!selected) return;
    startTransition(async () => {
      const res = await exportResumeHtml(selected.id, template);
      if (res.html) {
        const w = window.open("", "_blank");
        w?.document.write(res.html);
        w?.document.close();
      }
    });
  }

  function handleExportPdf() {
    if (!selected) return;
    startTransition(async () => {
      const res = await exportResumePdf(selected.id, template);
      if (res.error) setMessage(res.error);
      else if (res.pdf_storage_path) setMessage(`PDF saved to storage (${res.pdf_storage_path})`);
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
                <p>No jobs saved yet — add one from the Applications page.</p>
                <Link
                  href="/applications"
                  className="inline-block text-xs font-medium text-primary hover:underline"
                >
                  Go to Applications →
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
              Pick a job on the left to generate your first tailored resume. We&apos;ll match your
              profile against the JD, draft an ATS-friendly version, and let you tweak it.
            </p>
            {!hasJobs ? (
              <p className="text-xs">
                Don&apos;t have any jobs yet?{" "}
                <Link href="/applications" className="text-primary hover:underline">
                  Add one from Applications
                </Link>
                .
              </p>
            ) : (
              <p className="text-xs">Click any job on the left to start.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {selected && content && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">
              {selected.jobs?.title ?? "Resume"} editor
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              {RESUME_TEMPLATES.map((t) => (
                <Button
                  key={t.id}
                  size="sm"
                  variant={template === t.id ? "default" : "outline"}
                  onClick={() => setTemplate(t.id)}
                >
                  {t.name}
                </Button>
              ))}
              <Button size="sm" variant="outline" onClick={handleSave} disabled={pending}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleExport} disabled={pending}>
                Preview HTML
              </Button>
              <Button size="sm" onClick={handleExportPdf} disabled={pending}>
                Export PDF
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  startTransition(async () => {
                    await deleteTailoredResume(selected.id);
                  })
                }
              >
                Delete
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {message && <p className="text-xs text-muted-foreground">{message}</p>}
            <label className="text-xs text-muted-foreground">Summary</label>
            <Textarea
              value={content.summary ?? ""}
              onChange={(e) => setContent({ ...content, summary: e.target.value })}
              rows={3}
            />
            {content.experiences?.map((exp, i) => (
              <div key={exp.id ?? i} className="border rounded-md p-3 space-y-2">
                <p className="font-medium text-sm">
                  {exp.title} — {exp.company}
                </p>
                <Textarea
                  value={exp.bullet_points.join("\n")}
                  onChange={(e) => {
                    const exps = [...(content.experiences ?? [])];
                    exps[i] = {
                      ...exp,
                      bullet_points: e.target.value.split("\n").filter(Boolean),
                    };
                    setContent({ ...content, experiences: exps });
                  }}
                  rows={4}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
