"use client";

import { useState, useTransition } from "react";
import { Linkedin } from "lucide-react";
import { importLinkedInJson } from "@/lib/ingestion/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SAMPLE_JSON = `{
  "headline": "Software Engineer",
  "summary": "Building products at scale.",
  "location": "San Francisco, CA",
  "linkedin_url": "https://linkedin.com/in/you",
  "experiences": [
    {
      "company": "Acme Corp",
      "title": "Senior Engineer",
      "start_date": "2022-01-01",
      "is_current": true,
      "bullet_points": ["Led team of 4", "Reduced latency 40%"]
    }
  ],
  "education": [],
  "skills": [{ "name": "TypeScript", "category": "language" }]
}`;

export function LinkedInImport() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4 rounded-md border border-border p-4">
      <div className="flex items-center gap-2">
        <Linkedin className="h-5 w-5 text-primary" />
        <div>
          <p className="font-medium">LinkedIn import (MVP)</p>
          <p className="text-sm text-muted-foreground">
            Paste structured JSON export. Full LinkedIn OAuth requires API credentials not bundled in this repo.
          </p>
        </div>
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage(null);
          setError(null);
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const result = await importLinkedInJson(fd);
            if (result.error) setError(result.error);
            else
              setMessage(
                `Imported ${result.inserted} new, merged ${result.merged}, ${result.conflicts} conflicts.`
              );
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="linkedin_url">Profile URL (optional)</Label>
          <Input id="linkedin_url" name="linkedin_url" placeholder="https://linkedin.com/in/..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="linkedin_json">JSON data</Label>
          <Textarea
            id="linkedin_json"
            name="linkedin_json"
            rows={8}
            placeholder={SAMPLE_JSON}
            className="font-mono text-xs"
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Importing…" : "Import from JSON"}
        </Button>
      </form>
      {message && <p className="text-sm text-green-500">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
