"use client";

import { useState, useTransition } from "react";
import { createJobAndApplicationFromPreview } from "@/lib/applications/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CaptureDraftFieldsEditor } from "@/components/applications/capture-draft-fields";
import {
  fieldsToCreateJobFormData,
  parsePreviewToFields,
  type CaptureDraftFields,
} from "@/lib/applications/capture-draft-mappers";
import type { ParseAndPreviewJobResult } from "@/lib/applications/actions";

interface JobPreviewCardProps {
  preview: ParseAndPreviewJobResult;
  onCancel: () => void;
  onSaved?: () => void;
}

export function JobPreviewCard({ preview, onCancel, onSaved }: JobPreviewCardProps) {
  const [draft, setDraft] = useState<CaptureDraftFields>(() => parsePreviewToFields(preview));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const fd = fieldsToCreateJobFormData(draft);
      const res = await createJobAndApplicationFromPreview(fd);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      onSaved?.();
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">Preview & save</CardTitle>
          <p className="text-xs text-muted-foreground">
            {preview.source === "url"
              ? `Fetched from ${preview.url} (${preview.scrapeSource ?? "generic"})`
              : "Parsed from pasted text"}
            {preview.degraded ? " · AI unavailable, edit fields manually" : ""}
            {preview.warning ? ` · ${preview.warning}` : ""}
          </p>
          {preview.fit_hint ? (
            <p className="mt-1 text-xs text-primary/90">{preview.fit_hint}</p>
          ) : null}
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <CaptureDraftFieldsEditor draft={draft} onChange={setDraft} />

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={pending}>
            {pending ? "Saving…" : "Save application"}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={pending}>
            Discard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
