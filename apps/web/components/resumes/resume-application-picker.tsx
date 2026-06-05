"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ResumeSummary } from "@/lib/resumes/resume-summary";
import { resumeBuilderUrl } from "@/lib/resumes/urls";
import { ResumeSummaryBadge } from "@/components/resumes/resume-summary-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ApplicationRow } from "@/components/resumes/resume-workspace";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ResumeApplicationPicker({
  applications,
  resumeSummaries,
}: {
  applications: ApplicationRow[];
  resumeSummaries: Record<string, ResumeSummary>;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((app) => {
      const title = app.job?.title?.toLowerCase() ?? "";
      const company = app.job?.company?.toLowerCase() ?? "";
      return title.includes(q) || company.includes(q);
    });
  }, [applications, query]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tracked roles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Search company or title…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9"
        />

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No roles match your search.</p>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_80px_80px_auto] gap-3 px-3 py-2 bg-muted/30 text-xs font-medium text-muted-foreground border-b border-border">
              <span>Company</span>
              <span>Title</span>
              <span>Versions</span>
              <span>Updated</span>
              <span />
            </div>
            <ul className="divide-y divide-border">
              {filtered.map((app) => {
                const summary = resumeSummaries[app.id];
                return (
                  <li
                    key={app.id}
                    className="grid gap-2 px-3 py-3 sm:grid-cols-[1fr_1fr_80px_80px_auto] sm:items-center"
                  >
                    <span className="text-sm truncate">{app.job?.company ?? "—"}</span>
                    <span className="text-sm truncate">{app.job?.title ?? "Untitled"}</span>
                    <ResumeSummaryBadge summary={summary} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(summary?.latestGeneratedAt ?? null)}
                    </span>
                    <Button size="sm" variant="outline" className="h-7 text-xs w-full sm:w-auto" asChild>
                      <Link href={resumeBuilderUrl(app.id)}>Open</Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
