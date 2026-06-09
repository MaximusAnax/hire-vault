import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileForUser } from "@/lib/profile/get-profile";
import { getTailoringReadiness } from "@/lib/profile/readiness";
import { getAwaitingConfirmRun } from "@/lib/ingestion/queries";
import { ResumeUpload } from "@/components/ingestion/resume-upload";
import { LinkedInImport } from "@/components/ingestion/linkedin-import";
import { ImportPreviewPanel } from "@/components/ingestion/import-preview-panel";
import { DedupConflictsPanel, type DedupConflictWithExisting } from "@/components/ingestion/dedup-conflicts";
import { ProfileReadinessBanner } from "@/components/profile/profile-readiness-banner";
import { isLinkedInOAuthConfigured } from "@/lib/linkedin/config";
import { getLinkedInConnection } from "@/lib/linkedin/queries";
import type { DedupConflict, IngestionRun } from "@hirevault/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfileImportPage() {
  const profile = await getProfileForUser();
  if (!profile) {
    return <p className="text-muted-foreground">Profile not found.</p>;
  }

  const supabase = await createClient();
  const oauthConfigured = isLinkedInOAuthConfigured();
  const linkedInConnection = oauthConfigured
    ? await getLinkedInConnection(profile.id)
    : null;

  const [runsRes, conflictsRes, readiness, awaitingRun] = await Promise.all([
    supabase
      .from("ingestion_runs")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("dedup_conflicts")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false }),
    getTailoringReadiness(profile.id),
    getAwaitingConfirmRun(profile.id),
  ]);

  const runs = (runsRes.data ?? []) as IngestionRun[];
  const conflicts = (conflictsRes.data ?? []) as DedupConflict[];

  const conflictsWithExisting: DedupConflictWithExisting[] = await Promise.all(
    conflicts.map(async (conflict) => {
      const { data } = await supabase
        .from(conflict.section)
        .select("*")
        .eq("id", conflict.existing_id)
        .maybeSingle();
      return {
        ...conflict,
        existing_data: (data as Record<string, unknown> | null) ?? null,
      };
    })
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Import data</h1>
          <p className="text-muted-foreground">
            Upload a resume, connect LinkedIn, or paste JSON export.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/profile">Back to profile</Link>
        </Button>
      </div>

      <ProfileReadinessBanner ready={readiness.ready} blockers={readiness.blockers} />

      {awaitingRun?.preview_summary && (
        <ImportPreviewPanel
          runId={awaitingRun.id}
          preview={awaitingRun.preview_summary}
          source={awaitingRun.source}
        />
      )}

      <ResumeUpload />
      <LinkedInImport
        oauthConfigured={oauthConfigured}
        linkedInConnected={Boolean(linkedInConnection)}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Merge conflicts</CardTitle>
          <CardDescription>
            When the same role appears with different bullets, choose how to merge.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DedupConflictsPanel conflicts={conflictsWithExisting} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent imports</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No imports yet.</p>
          ) : (
            <ul className="text-sm space-y-2">
              {runs.map((r) => (
                <li key={r.id} className="flex justify-between border-b border-border pb-2">
                  <span>
                    {r.source} · {r.file_name ?? "JSON"} ·{" "}
                    <span className="text-muted-foreground">{r.status}</span>
                  </span>
                  <span className="text-muted-foreground text-xs">
                    +{r.items_inserted} / ~{r.items_merged} merged
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
