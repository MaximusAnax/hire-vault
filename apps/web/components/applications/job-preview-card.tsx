"use client";

import { useState, useTransition } from "react";
import { createJobAndApplicationFromPreview } from "@/lib/applications/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";
import type { ParseAndPreviewJobResult } from "@/lib/applications/actions";

interface JobPreviewCardProps {
  preview: ParseAndPreviewJobResult;
  onCancel: () => void;
  onSaved?: () => void;
}

interface DraftState {
  title: string;
  company: string;
  url: string;
  job_type: string;
  status: string;
  priority: number | null;
  locations: string[];
  tech_stack: string[];
  required_qualifications: string[];
  preferred_qualifications: string[];
  description_raw: string;
}

function fromPreview(p: ParseAndPreviewJobResult): DraftState {
  return {
    title: p.parsed.title ?? "",
    company: p.parsed.company ?? "",
    url: p.url ?? "",
    job_type: p.parsed.job_type ?? "",
    status: "saved",
    priority: null,
    locations: p.locations,
    tech_stack: p.parsed.tech_stack ?? [],
    required_qualifications: p.parsed.required_qualifications ?? [],
    preferred_qualifications: p.parsed.preferred_qualifications ?? [],
    description_raw: p.description_raw,
  };
}

function ChipEditor({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const commitDraft = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    // Allow paste-bulk: comma or newline separated.
    const parts = trimmed
      .split(/[,\n]/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !values.includes(s));
    if (parts.length) onChange([...values, ...parts]);
    setDraft("");
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
          >
            {v}
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commitDraft();
            } else if (e.key === "Backspace" && !draft && values.length > 0) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={commitDraft}
          placeholder={placeholder ?? "Add and press Enter"}
          className="h-7 w-44 text-xs"
        />
      </div>
    </div>
  );
}

export function JobPreviewCard({ preview, onCancel, onSaved }: JobPreviewCardProps) {
  const [draft, setDraft] = useState<DraftState>(() => fromPreview(preview));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", draft.title || "Untitled role");
      fd.set("company", draft.company || "Unknown company");
      for (const loc of draft.locations) fd.append("locations", loc);
      if (draft.url) fd.set("url", draft.url);
      if (draft.job_type) fd.set("job_type", draft.job_type);
      fd.set("status", draft.status);
      if (draft.priority != null) fd.set("priority", String(draft.priority));
      fd.set("description_raw", draft.description_raw);
      for (const t of draft.tech_stack) fd.append("tech_stack", t);
      for (const q of draft.required_qualifications) fd.append("required_qualifications", q);
      for (const q of draft.preferred_qualifications) fd.append("preferred_qualifications", q);
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
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Job title</Label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Software Engineer"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Company</Label>
            <Input
              value={draft.company}
              onChange={(e) => setDraft({ ...draft, company: e.target.value })}
              placeholder="Acme Inc"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Job URL</Label>
            <Input
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <select
              className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            >
              <option value="saved">Saved</option>
              <option value="applied">Applied</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Job type</Label>
            <select
              className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
              value={draft.job_type}
              onChange={(e) => setDraft({ ...draft, job_type: e.target.value })}
            >
              <option value="">—</option>
              <option value="full_time">Full-time</option>
              <option value="internship">Internship</option>
              <option value="contract">Contract</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Priority</Label>
            <StarRating
              value={draft.priority}
              onChange={(n) => setDraft({ ...draft, priority: n })}
              ariaLabel="Application priority"
            />
            <p className="text-[11px] text-muted-foreground">More stars = higher priority</p>
          </div>
        </div>

        <ChipEditor
          label="Locations"
          values={draft.locations}
          onChange={(next) => setDraft({ ...draft, locations: next })}
          placeholder="Add location"
        />
        <ChipEditor
          label="Tech stack"
          values={draft.tech_stack}
          onChange={(next) => setDraft({ ...draft, tech_stack: next })}
          placeholder="Add tech"
        />
        <ChipEditor
          label="Required qualifications"
          values={draft.required_qualifications}
          onChange={(next) => setDraft({ ...draft, required_qualifications: next })}
          placeholder="Add requirement"
        />
        <ChipEditor
          label="Preferred qualifications"
          values={draft.preferred_qualifications}
          onChange={(next) => setDraft({ ...draft, preferred_qualifications: next })}
          placeholder="Add preferred"
        />

        <div className="space-y-1.5">
          <Label className="text-xs">Description (will be stored verbatim)</Label>
          <Textarea
            value={draft.description_raw}
            onChange={(e) => setDraft({ ...draft, description_raw: e.target.value })}
            rows={6}
          />
        </div>

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
