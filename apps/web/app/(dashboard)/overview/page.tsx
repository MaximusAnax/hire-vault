import Link from "next/link";
import { getApplicationStats } from "@/lib/applications/queries";
import { getOverviewDashboard } from "@/lib/overview/queries";
import { resumeBuilderUrl } from "@/lib/resumes/urls";
import { ActionQueue } from "@/components/overview/action-queue";
import { ImportHealthBadge } from "@/components/overview/import-health-badge";
import { WeeklyVelocity } from "@/components/overview/weekly-velocity";
import { ProfileReadinessBanner } from "@/components/profile/profile-readiness-banner";
import { PipelineAnalytics } from "@/components/applications/pipeline-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function OverviewPage() {
  const [dashboard, stats] = await Promise.all([getOverviewDashboard(), getApplicationStats()]);

  if (!dashboard) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm">Sign in to see your command center.</p>
      </div>
    );
  }

  const recentFive = dashboard.apps.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">
            Prioritized next steps across your pipeline, profile, and prep.
          </p>
        </div>
        <ImportHealthBadge count={dashboard.pendingConflictsCount} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <WeeklyVelocity
          appliedThisWeek={dashboard.appliedThisWeek}
          goal={dashboard.weeklyApplicationGoal}
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Applied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.applied}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Response rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.responseRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.byStatus.offer ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <PipelineAnalytics
        pipeline={stats.pipeline}
        responseRate={stats.responseRate}
        offerRate={stats.offerRate}
        velocity30d={stats.velocity30d}
      />

      {!dashboard.readinessReady ? (
        <ProfileReadinessBanner
          ready={dashboard.readinessReady}
          blockers={dashboard.readinessBlockers}
        />
      ) : null}

      <ActionQueue queue={dashboard.queue} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent applications</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/applications">View pipeline</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentFive.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No applications yet.{" "}
              <Link href="/applications" className="text-primary hover:underline">
                Capture your first role
              </Link>
            </p>
          ) : (
            <ul className="text-sm space-y-2">
              {recentFive.map((a) => (
                <li key={a.id} className="flex justify-between items-center gap-3">
                  <span>
                    {a.job?.title} @ {a.job?.company}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    {a.job_id ? (
                      <Link
                        href={resumeBuilderUrl(a.id)}
                        className="text-xs text-primary hover:underline"
                      >
                        Resume
                      </Link>
                    ) : null}
                    <span className="text-muted-foreground capitalize text-xs">{a.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
