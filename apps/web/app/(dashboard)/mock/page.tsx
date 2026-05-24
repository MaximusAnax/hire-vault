import { MockInterview } from "@/components/mock/mock-interview";
import { getMockJobs, getMockSessions } from "@/lib/mock/queries";

export default async function MockPage() {
  const [jobs, sessions] = await Promise.all([getMockJobs(), getMockSessions()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mock interviews</h1>
        <p className="text-muted-foreground">
          AI-driven practice with STAR scoring, specificity feedback, and session history.
        </p>
      </div>
      <MockInterview
        jobs={jobs}
        sessions={sessions.map((s) => ({
          id: s.id,
          session_type: s.session_type,
          role_title: s.role_title,
          score: s.score,
          feedback: s.feedback,
          conducted_at: s.conducted_at,
          jobs: s.jobs as { title: string; company: string } | null,
        }))}
      />
    </div>
  );
}
