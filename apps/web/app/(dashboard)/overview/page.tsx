import Link from "next/link";
import { getApplicationStats, getApplicationsWithJobs } from "@/lib/applications/queries";
import { PipelineAnalytics } from "@/components/applications/pipeline-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function OverviewPage() {
  const [stats, recent] = await Promise.all([
    getApplicationStats(),
    getApplicationsWithJobs({ sort: "updated" }),
  ]);

  const recentFive = recent.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">
          Pipeline health and quick links to capture jobs, tailor resumes, and prep interviews.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent applications</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/applications">View pipeline</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentFive.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            <ul className="text-sm space-y-2">
              {recentFive.map((a) => (
                <li key={a.id} className="flex justify-between">
                  <span>
                    {a.job?.title} @ {a.job?.company}
                  </span>
                  <span className="text-muted-foreground capitalize">{a.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <Button size="sm" asChild>
              <Link href="/applications">Capture & track jobs</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumes</CardTitle>
          </CardHeader>
          <CardContent>
            <Button size="sm" variant="outline" asChild>
              <Link href="/resumes">Tailor & export PDF</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Interview prep</CardTitle>
          </CardHeader>
          <CardContent>
            <Button size="sm" variant="outline" asChild>
              <Link href="/interviews">Practice questions</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <Button size="sm" variant="outline" asChild>
              <Link href="/profile">Edit master data</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
