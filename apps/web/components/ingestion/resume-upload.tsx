"use client";

import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { uploadAndParseResume } from "@/lib/ingestion/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResumeUpload() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4 rounded-md border border-dashed border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await uploadAndParseResume(fd);
          if (result.error) {
            setError(result.error + (result.hint ? ` — ${result.hint}` : ""));
          } else {
            setMessage(
              `Imported ${result.inserted} new, merged ${result.merged}, ${result.conflicts} conflicts queued.`
            );
          }
        });
      }}
    >
      <div className="flex items-center gap-2">
        <Upload className="h-5 w-5 text-primary" />
        <div>
          <p className="font-medium">Resume upload</p>
          <p className="text-sm text-muted-foreground">PDF or DOCX — parsed with GPT-4o when configured</p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="resume">File</Label>
        <Input id="resume" name="resume" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Parsing…" : "Upload & parse"}
      </Button>
      {message && <p className="text-sm text-green-500">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
