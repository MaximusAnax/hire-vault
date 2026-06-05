"use client";

import { useState, useTransition } from "react";
import { createJobAndApplicationFromPreview } from "@/lib/applications/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";
import { ChipEditor } from "@/components/applications/chip-editor";
import { JobMetaBadges } from "@/components/applications/job-meta-badges";
import {
  COHORT_YEAR_OPTIONS,
  ROLE_SEASON_LABELS,
  resolveRoleTiming,
} from "@/lib/applications/role-timing";
import type { ParseAndPreviewJobResult } from "@/lib/applications/actions";
import type { JobType, RoleSeason } from "@hirevault/types";
import { ROLE_SEASONS } from "@hirevault/types";

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
  role_season: RoleSeason | "";
  role_year: string;
  status: string;
  priority: number | null;
  locations: string[];
  tech_stack: string[];
  required_qualifications: string[];
  preferred_qualifications: string[];
  description_raw: string;
}

function fromPreview(p: ParseAndPreviewJobResult): DraftState {
  const timing = resolveRoleTiming({
    title: p.parsed.title ?? "",
    role_season: (p.parsed.role_season as RoleSeason | undefined) ?? null,
    role_year: p.parsed.role_year ?? null,
  });
  return {
    title: timing.title,
    company: p.parsed.company ?? "",
    url: p.url ?? "",
    job_type: p.parsed.job_type ?? "",
    role_season: timing.role_season ?? "",
    role_year: timing.role_year != null ? String(timing.role_year) : "",
    status: "saved",
    priority: null,
    locations: p.locations,
    tech_stack: p.parsed.tech_stack ?? [],
    required_qualifications: p.parsed.required_qualifications ?? [],
    preferred_qualifications: p.parsed.preferred_qualifications ?? [],
    description_raw: p.description_raw,
  };
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
      if (draft.role_season) fd.set("role_season", draft.role_season);
      if (draft.role_year) fd.set("role_year", draft.role_year);
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
            <Label className="text-xs">Role type</Label>
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
          <div className="space-y-1.5">
            <Label className="text-xs">Cohort season</Label>
            <select
              className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
              value={draft.role_season}
              onChange={(e) =>
                setDraft({ ...draft, role_season: e.target.value as DraftState["role_season"] })
              }
            >
              <option value="">—</option>
              {ROLE_SEASONS.map((s) => (
                <option key={s} value={s}>
                  {ROLE_SEASON_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Cohort year</Label>
            <select
              className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
              value={draft.role_year}
              onChange={(e) => setDraft({ ...draft, role_year: e.target.value })}
            >
              <option value="">—</option>
              {COHORT_YEAR_OPTIONS.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <JobMetaBadges
              job_type={(draft.job_type as JobType) || null}
              role_season={draft.role_season || null}
              role_year={draft.role_year ? Number(draft.role_year) : null}
            />
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
