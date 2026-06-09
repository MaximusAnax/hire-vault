"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/ui/star-rating";
import { ChipEditor } from "@/components/applications/chip-editor";
import { JobMetaBadges } from "@/components/applications/job-meta-badges";
import {
  COHORT_YEAR_OPTIONS,
  ROLE_SEASON_LABELS,
} from "@/lib/applications/role-timing";
import type { JobType } from "@hirevault/types";
import { ROLE_SEASONS } from "@hirevault/types";
import type { CaptureDraftFields } from "@/lib/applications/capture-draft-mappers";

export type { CaptureDraftFields };

export interface CaptureDraftFieldsEditorProps {
  draft: CaptureDraftFields;
  onChange: (draft: CaptureDraftFields) => void;
  showStatus?: boolean;
  showDescription?: boolean;
}

export function CaptureDraftFieldsEditor({
  draft,
  onChange,
  showStatus = true,
  showDescription = true,
}: CaptureDraftFieldsEditorProps) {
  const patch = (partial: Partial<CaptureDraftFields>) => onChange({ ...draft, ...partial });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Job title</Label>
          <Input
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Software Engineer"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Company</Label>
          <Input
            value={draft.company}
            onChange={(e) => patch({ company: e.target.value })}
            placeholder="Acme Inc"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Job URL</Label>
          <Input
            value={draft.url}
            onChange={(e) => patch({ url: e.target.value })}
            placeholder="https://..."
          />
        </div>
        {showStatus ? (
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <select
              className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
              value={draft.status}
              onChange={(e) => patch({ status: e.target.value })}
            >
              <option value="saved">Saved</option>
              <option value="applied">Applied</option>
            </select>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label className="text-xs">Role type</Label>
          <select
            className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
            value={draft.job_type}
            onChange={(e) =>
              patch({ job_type: e.target.value as CaptureDraftFields["job_type"] })
            }
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
              patch({ role_season: e.target.value as CaptureDraftFields["role_season"] })
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
            onChange={(e) => patch({ role_year: e.target.value })}
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
            onChange={(n) => patch({ priority: n })}
            ariaLabel="Application priority"
          />
          <p className="text-[11px] text-muted-foreground">More stars = higher priority</p>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Compensation</Label>
          <Input
            value={draft.salary_range}
            onChange={(e) => patch({ salary_range: e.target.value })}
            placeholder="$45–55/hr or $120k–$150k"
          />
        </div>
      </div>

      <ChipEditor
        label="Locations"
        values={draft.locations}
        onChange={(next) => patch({ locations: next })}
        placeholder="Add location"
      />
      <ChipEditor
        label="Tech stack"
        values={draft.tech_stack}
        onChange={(next) => patch({ tech_stack: next })}
        placeholder="Add tech"
      />
      <ChipEditor
        label="Required qualifications"
        values={draft.required_qualifications}
        onChange={(next) => patch({ required_qualifications: next })}
        placeholder="Add requirement"
      />
      <ChipEditor
        label="Preferred qualifications"
        values={draft.preferred_qualifications}
        onChange={(next) => patch({ preferred_qualifications: next })}
        placeholder="Add preferred"
      />

      {showDescription ? (
        <div className="space-y-1.5">
          <Label className="text-xs">Description (stored verbatim)</Label>
          <Textarea
            value={draft.description_raw}
            onChange={(e) => patch({ description_raw: e.target.value })}
            rows={6}
          />
        </div>
      ) : null}
    </div>
  );
}
