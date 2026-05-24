import { ResumeWorkspace } from "@/components/resumes/resume-workspace";
import { getJobsForTailoring, getTailoredResumes } from "@/lib/resumes/queries";

export default async function ResumesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  const [jobs, resumes] = await Promise.all([getJobsForTailoring(), getTailoredResumes()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resumes</h1>
        <p className="text-muted-foreground">
          AI tailoring, ATS scoring, templates, and version history per application.
        </p>
      </div>
      <ResumeWorkspace
        jobs={jobs}
        resumes={resumes.map((r) => ({
          id: r.id,
          label: r.label,
          ats_score: r.ats_score,
          version: r.version,
          template_used: r.template_used,
          content: r.content as import("@hirevault/ai-core").ResumeContent,
          jobs: r.jobs as { title: string; company: string } | null,
        }))}
        selectedId={params.id}
      />
    </div>
  );
}
