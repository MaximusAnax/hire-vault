"use client";

import { useTransition } from "react";
import { resolveDedupConflict } from "@/lib/ingestion/actions";
import type { DedupConflict } from "@hirevault/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DedupConflictsPanel({ conflicts }: { conflicts: DedupConflict[] }) {
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
            <pre className="text-xs bg-muted/30 p-2 rounded overflow-x-auto max-h-32">
              {JSON.stringify(c.incoming_data, null, 2)}
            </pre>
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
