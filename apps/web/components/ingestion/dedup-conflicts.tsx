"use client";

import { useTransition } from "react";
import { resolveDedupConflict } from "@/lib/ingestion/actions";
import type { DedupConflict, ProfileSection } from "@hirevault/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type DedupConflictWithExisting = DedupConflict & {
  existing_data: Record<string, unknown> | null;
};

function formatSectionRow(section: ProfileSection, row: Record<string, unknown> | null): string {
  if (!row) return "Record not found";

  if (section === "experiences") {
    const lines = [
      `${row.title ?? "—"} at ${row.company ?? "—"}`,
      [row.start_date, row.end_date ?? (row.is_current ? "Present" : null)]
        .filter(Boolean)
        .join(" – "),
      ...((row.bullet_points as string[] | undefined) ?? []).map((b) => `• ${b}`),
    ].filter(Boolean);
    return lines.join("\n");
  }

  if (section === "leadership") {
    const lines = [
      `${row.title ?? "—"} · ${row.organization ?? "—"}`,
      [row.start_date, row.end_date ?? (row.is_current ? "Present" : null)]
        .filter(Boolean)
        .join(" – "),
      ...((row.bullet_points as string[] | undefined) ?? []).map((b) => `• ${b}`),
    ].filter(Boolean);
    return lines.join("\n");
  }

  return JSON.stringify(row, null, 2);
}

export function DedupConflictsPanel({ conflicts }: { conflicts: DedupConflictWithExisting[] }) {
  const [pending, startTransition] = useTransition();
  const pendingConflicts = conflicts.filter((c) => c.resolution === "pending");

  if (pendingConflicts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No pending merge conflicts.</p>
    );
  }

  return (
    <div className="space-y-3">
      {pendingConflicts.map((c) => (
        <Card key={c.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base capitalize">{c.section} conflict</CardTitle>
            <CardDescription>Source: {c.source}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Existing</p>
                <pre className="text-xs bg-muted/30 p-2 rounded overflow-x-auto max-h-40 whitespace-pre-wrap">
                  {formatSectionRow(c.section, c.existing_data)}
                </pre>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Incoming</p>
                <pre className="text-xs bg-muted/30 p-2 rounded overflow-x-auto max-h-40 whitespace-pre-wrap">
                  {formatSectionRow(c.section, c.incoming_data)}
                </pre>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(() => {
                    void resolveDedupConflict(c.id, "keep_existing");
                  })
                }
              >
                Keep existing
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(() => {
                    void resolveDedupConflict(c.id, "use_incoming");
                  })
                }
              >
                Use incoming
              </Button>
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(() => {
                    void resolveDedupConflict(c.id, "merged");
                  })
                }
              >
                Merge bullets
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
