"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ResumeContent } from "@hirevault/ai-core";
import {
  tailorResumeForJob,
  exportResumePdf,
  deleteTailoredResume,
  getResumePdfDownloadUrl,
} from "@/lib/resumes/actions";
import type { ResumeSummary } from "@/lib/resumes/resume-summary";
import { resumeBuilderUrl } from "@/lib/resumes/urls";
import { ResumeApplicationPicker } from "@/components/resumes/resume-application-picker";
import { ResumeSummaryBadge } from "@/components/resumes/resume-summary-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface ApplicationRow {
  id: string;
  job_id: string;
  job: { title: string; company: string } | null;
}

export interface ResumeRow {
  id: string;
  application_id: string;
  job_id: string | null;
  label: string | null;
  ats_score: number | null;
  version: number;
  pdf_storage_path: string | null;
  keyword_gaps: string[];
  generated_at: string;
  content: ResumeContent;
  jobs?: { title: string; company: string } | null;
}

const KEYWORD_MATCH_TITLE =
  "Keyword overlap with the job description — an estimate, not a real ATS vendor score.";

function formatVersionDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ResumeWorkspace({
  applications,
  resumes,
  resumeSummaries,
  selectedApplicationId,
  selectedVersionId,
}: {
  applications: ApplicationRow[];
  resumes: ResumeRow[];
  resumeSummaries: Record<string, ResumeSummary>;
  selectedApplicationId?: string;
  selectedVersionId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const inBuilderMode = Boolean(
    selectedApplicationId && applications.some((a) => a.id === selectedApplicationId)
  );
  const effectiveApplicationId = inBuilderMode ? selectedApplicationId : undefined;
  const selectedApplication = applications.find((a) => a.id === effectiveApplicationId);

  const appVersions = useMemo(
    () =>
      effectiveApplicationId
        ? resumes.filter((r) => r.application_id === effectiveApplicationId)
        : [],
    [resumes, effectiveApplicationId]
  );

  const effectiveVersionId = useMemo(() => {
    if (!inBuilderMode || appVersions.length === 0) return undefined;
    if (selectedVersionId && appVersions.some((r) => r.id === selectedVersionId)) {
      return selectedVersionId;
    }
    return appVersions[0]?.id;
  }, [appVersions, selectedVersionId, inBuilderMode]);

  const selectedResume = appVersions.find((r) => r.id === effectiveVersionId);

  useEffect(() => {
    if (!effectiveApplicationId || selectedVersionId || appVersions.length === 0) return;
    router.replace(resumeBuilderUrl(effectiveApplicationId, appVersions[0].id));
  }, [effectiveApplicationId, selectedVersionId, appVersions, router]);

  function selectVersion(versionId: string) {
    if (!effectiveApplicationId) return;
    setStatus(null);
    router.push(resumeBuilderUrl(effectiveApplicationId, versionId));
  }

  function handleTailor() {
    if (!selectedApplication?.job_id || !effectiveApplicationId) return;
    setStatus(null);
    startTransition(async () => {
      const res = await tailorResumeForJob(
        selectedApplication.job_id,
        selectedApplication.id
      );
      if (res.error) {
        setStatus(res.error);
        return;
      }
      if (res.resumeId) {
        router.push(resumeBuilderUrl(effectiveApplicationId, res.resumeId));
        router.refresh();
        setStatus(
          res.atsScore != null
            ? `Version saved · keyword match ${res.atsScore}`
            : "Version saved"
        );
      }
    });
  }

  function handleExportPdf() {
    if (!selectedResume) return;
    setStatus(null);
    startTransition(async () => {
      const res = await exportResumePdf(selectedResume.id);
      if (res.error) setStatus(res.error);
      else {
        setStatus("PDF exported");
        router.refresh();
      }
    });
  }

  function handleDownloadPdf() {
    if (!selectedResume) return;
    setStatus(null);
    startTransition(async () => {
      const res = await getResumePdfDownloadUrl(selectedResume.id);
      if (res.error) setStatus(res.error);
      else if (res.url) window.open(res.url, "_blank", "noopener,noreferrer");
    });
  }

  function handleDelete() {
    if (!selectedResume || !effectiveApplicationId) return;
    setStatus(null);
    startTransition(async () => {
      const res = await deleteTailoredResume(selectedResume.id);
      setDeleteOpen(false);
      if (res.error) {
        setStatus(res.error);
        return;
      }
      router.push(resumeBuilderUrl(effectiveApplicationId));
      router.refresh();
      setStatus("Version deleted");
    });
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">No applications yet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Add a role in your pipeline before tailoring a resume.</p>
          <Button size="sm" asChild>
            <Link href="/applications">Go to Applications</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!inBuilderMode) {
    return (
      <ResumeApplicationPicker
        applications={applications}
        resumeSummaries={resumeSummaries}
      />
    );
  }

  const roleTitle = selectedApplication?.job?.title ?? "Role";
  const roleCompany = selectedApplication?.job?.company ?? "";
  const hasPdf = Boolean(selectedResume?.pdf_storage_path);
  const appSummary = effectiveApplicationId
    ? resumeSummaries[effectiveApplicationId]
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/10 px-4 py-3">
        <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
          <Link href="/resumes">← All roles</Link>
        </Button>
        <span className="text-sm font-medium">
          {roleCompany ? `${roleCompany} · ${roleTitle}` : roleTitle}
        </span>
        <ResumeSummaryBadge summary={appSummary} />
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Versions</CardTitle>
          <div className="flex flex-wrap gap-2">
            {appVersions.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                disabled={pending || !selectedApplication?.job_id}
                onClick={handleTailor}
              >
                New version
              </Button>
            )}
            {appVersions.length === 0 && (
              <Button
                size="sm"
                disabled={pending || !selectedApplication?.job_id}
                onClick={handleTailor}
              >
                {pending ? "Tailoring…" : "Tailor resume"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {appVersions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tailored versions for this role yet. Tailoring rewrites top-matched experience
              bullets for the job description.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {appVersions.map((r) => (
                <Button
                  key={r.id}
                  size="sm"
                  variant={effectiveVersionId === r.id ? "default" : "outline"}
                  onClick={() => selectVersion(r.id)}
                >
                  v{r.version}
                  {r.ats_score != null ? ` · ${r.ats_score}` : ""} · {formatVersionDate(r.generated_at)}
                </Button>
              ))}
            </div>
          )}
          {appVersions.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Complete your{" "}
              <Link href="/profile" className="text-primary hover:underline">
                profile
              </Link>{" "}
              (name, contact, technical skills) before exporting.
            </p>
          )}
        </CardContent>
      </Card>

      {selectedResume && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {roleCompany ? `${roleCompany} · ${roleTitle}` : roleTitle}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Version {selectedResume.version}
              {selectedResume.ats_score != null && (
                <>
                  {" "}
                  ·{" "}
                  <span title={KEYWORD_MATCH_TITLE}>
                    Keyword match: {selectedResume.ats_score}
                  </span>
                </>
              )}{" "}
              · {formatVersionDate(selectedResume.generated_at)}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={pending}
                onClick={handleExportPdf}
                title="Requires pdflatex locally — see README"
              >
                {pending ? "Working…" : "Export PDF"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending || !hasPdf}
                onClick={handleDownloadPdf}
              >
                Download PDF
              </Button>
              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-muted-foreground">
                    Delete version
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete this version?</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    This removes v{selectedResume.version} for {roleTitle}. Export files in storage
                    are not removed automatically.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={pending}
                      onClick={handleDelete}
                    >
                      Delete
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {status && (
              <p className="text-xs text-muted-foreground">
                {status}
                {status.toLowerCase().includes("profile") && (
                  <>
                    {" "}
                    —{" "}
                    <Link href="/profile" className="text-primary hover:underline">
                      Open profile
                    </Link>
                  </>
                )}
              </p>
            )}

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-2">Tailored experience</h3>
              {selectedResume.content.experiences?.length ? (
                <ScrollArea className="h-[min(420px,50vh)] pr-4">
                  <ul className="space-y-4 text-sm">
                    {selectedResume.content.experiences.map((exp, i) => (
                      <li key={exp.id ?? i}>
                        <p className="font-medium">
                          {exp.title} · {exp.company}
                        </p>
                        <ul className="mt-1 list-disc pl-5 text-muted-foreground space-y-1">
                          {exp.bullet_points.map((b, j) => (
                            <li key={j}>{b}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">No tailored bullets in this version.</p>
              )}
            </div>

            {selectedResume.keyword_gaps.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-1">Keyword gaps</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Terms from the job description not reflected in tailored bullets.
                </p>
                <ul className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                  {selectedResume.keyword_gaps.map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
