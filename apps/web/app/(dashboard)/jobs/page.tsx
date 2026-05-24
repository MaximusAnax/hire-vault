import { createClient } from "@/lib/supabase/server";
import { AddApplicationForm } from "@/components/applications/add-application-form";
import { DeleteJobButton } from "@/components/jobs/delete-job-button";
import type { Job } from "@hirevault/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function JobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: jobs } = user
    ? await supabase.from("jobs").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
    : { data: [] };

  const jobList = (jobs ?? []) as Job[];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
        <p className="text-muted-foreground">
          Job library — add manually or paste a description for light parsing.
        </p>
      </div>

      <AddApplicationForm />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Saved jobs ({jobList.length})</h2>
        {jobList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No jobs yet. Add one above.</p>
        ) : (
          jobList.map((job) => (
            <Card key={job.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-base">{job.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {job.company}
                    {job.location ? ` · ${job.location}` : ""}
                    {job.job_type ? ` · ${job.job_type}` : ""}
                  </p>
                </div>
                <DeleteJobButton jobId={job.id} />
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {job.tech_stack?.length > 0 && (
                  <p className="text-muted-foreground">
                    Stack: {job.tech_stack.join(", ")}
                  </p>
                )}
                {job.url && (
                  <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs">
                    View posting
                  </a>
                )}
                {job.description_raw && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {job.description_raw.slice(0, 280)}…
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
