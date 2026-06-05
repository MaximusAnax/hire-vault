import { ResumeWorkspace } from "@/components/resumes/resume-workspace";
import {
  getApplicationsForResumeWorkspace,
  getResumeSummariesByApplication,
  getTailoredResumes,
} from "@/lib/resumes/queries";
import type { ResumeContent } from "@hirevault/ai-core";

export default async function ResumesPage({
  searchParams,
}: {
  searchParams: Promise<{ application?: string; version?: string }>;
}) {
  const params = await searchParams;
  const [applications, resumes, resumeSummaries] = await Promise.all([
    getApplicationsForResumeWorkspace(),
    getTailoredResumes(),
    getResumeSummariesByApplication(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resumes</h1>
        <p className="text-muted-foreground">
          Pick a tracked role, tailor bullets, and export a PDF.
        </p>
      </div>
      <ResumeWorkspace
        resumeSummaries={resumeSummaries}
        applications={applications
          .filter((a): a is (typeof applications)[number] & { job_id: string } =>
            Boolean(a.job_id)
          )
          .map((a) => ({
            id: a.id,
            job_id: a.job_id,
            job: a.job
              ? { title: a.job.title, company: a.job.company }
              : null,
          }))}
        resumes={resumes.map((r) => {
          const jobJoin = r.jobs as
            | { title: string; company: string }
            | { title: string; company: string }[]
            | null;
          const jobMeta = Array.isArray(jobJoin) ? jobJoin[0] ?? null : jobJoin;
          return {
            id: r.id,
            application_id: r.application_id,
            job_id: r.job_id,
            label: r.label,
            ats_score: r.ats_score,
            version: r.version,
            pdf_storage_path: r.pdf_storage_path,
            keyword_gaps: r.keyword_gaps ?? [],
            generated_at: r.generated_at,
            content: r.content as ResumeContent,
            jobs: jobMeta,
          };
        })}
        selectedApplicationId={params.application}
        selectedVersionId={params.version}
      />
    </div>
  );
}
