"use client";

import type { ComponentType } from "react";
import type { ProfileSection, SectionUpsertPlan } from "@hirevault/types";
import {
  bulletsToText,
  formatPlanRow,
  getEditableRow,
  setEditableRow,
  textToBullets,
} from "@/lib/ingestion/plan-review";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  plan: SectionUpsertPlan;
  onChange: (plan: SectionUpsertPlan) => void;
};

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="text-sm"
        />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="text-sm" />
      )}
    </div>
  );
}

function updateRow(
  plan: SectionUpsertPlan,
  onChange: (plan: SectionUpsertPlan) => void,
  patch: Record<string, unknown>
) {
  onChange(setEditableRow(plan, { ...getEditableRow(plan), ...patch }));
}

function ExperienceFields({ plan, onChange }: Props) {
  const row = getEditableRow(plan);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field
        label="Title"
        value={String(row.title ?? "")}
        onChange={(title) => updateRow(plan, onChange, { title })}
      />
      <Field
        label="Company"
        value={String(row.company ?? "")}
        onChange={(company) => updateRow(plan, onChange, { company })}
      />
      <Field
        label="Location"
        value={String(row.location ?? "")}
        onChange={(location) => updateRow(plan, onChange, { location: location || null })}
      />
      <Field
        label="Dates"
        value={[row.start_date, row.end_date].filter(Boolean).join(" – ")}
        onChange={(value) => {
          const [start, end] = value.split("–").map((part) => part.trim());
          updateRow(plan, onChange, {
            start_date: start || null,
            end_date: end || null,
          });
        }}
      />
      <div className="sm:col-span-2">
        <Field
          label="Bullets (one per line)"
          value={bulletsToText(row.bullet_points)}
          onChange={(value) => updateRow(plan, onChange, { bullet_points: textToBullets(value) })}
          multiline
        />
      </div>
    </div>
  );
}

function LeadershipFields({ plan, onChange }: Props) {
  const row = getEditableRow(plan);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field
        label="Title"
        value={String(row.title ?? "")}
        onChange={(title) => updateRow(plan, onChange, { title })}
      />
      <Field
        label="Organization"
        value={String(row.organization ?? "")}
        onChange={(organization) => updateRow(plan, onChange, { organization })}
      />
      <div className="sm:col-span-2">
        <Field
          label="Bullets (one per line)"
          value={bulletsToText(row.bullet_points)}
          onChange={(value) => updateRow(plan, onChange, { bullet_points: textToBullets(value) })}
          multiline
        />
      </div>
    </div>
  );
}

function EducationFields({ plan, onChange }: Props) {
  const row = getEditableRow(plan);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field
        label="Institution"
        value={String(row.institution ?? "")}
        onChange={(institution) => updateRow(plan, onChange, { institution })}
      />
      <Field
        label="Degree"
        value={String(row.degree ?? "")}
        onChange={(degree) => updateRow(plan, onChange, { degree: degree || null })}
      />
      <Field
        label="Field of study"
        value={String(row.field_of_study ?? "")}
        onChange={(field_of_study) =>
          updateRow(plan, onChange, { field_of_study: field_of_study || null })
        }
      />
      <Field
        label="Expected graduation"
        value={String(row.expected_graduation ?? "")}
        onChange={(expected_graduation) =>
          updateRow(plan, onChange, { expected_graduation: expected_graduation || null })
        }
      />
    </div>
  );
}

function ProjectFields({ plan, onChange }: Props) {
  const row = getEditableRow(plan);
  return (
    <div className="grid gap-2">
      <Field
        label="Name"
        value={String(row.name ?? "")}
        onChange={(name) => updateRow(plan, onChange, { name })}
      />
      <Field
        label="Description"
        value={String(row.description ?? "")}
        onChange={(description) => updateRow(plan, onChange, { description: description || null })}
        multiline
      />
      <Field
        label="Bullets (one per line)"
        value={bulletsToText(row.bullet_points)}
        onChange={(value) => updateRow(plan, onChange, { bullet_points: textToBullets(value) })}
        multiline
      />
    </div>
  );
}

function SkillFields({ plan, onChange }: Props) {
  const row = getEditableRow(plan);
  return (
    <Field
      label="Skill name"
      value={String(row.name ?? "")}
      onChange={(name) => updateRow(plan, onChange, { name })}
    />
  );
}

function CourseFields({ plan, onChange }: Props) {
  const row = getEditableRow(plan);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field
        label="Course"
        value={String(row.name ?? "")}
        onChange={(name) => updateRow(plan, onChange, { name })}
      />
      <Field
        label="Institution"
        value={String(row.institution ?? "")}
        onChange={(institution) => updateRow(plan, onChange, { institution: institution || null })}
      />
    </div>
  );
}

const SECTION_EDITORS: Record<ProfileSection, ComponentType<Props> | null> = {
  experiences: ExperienceFields,
  leadership: LeadershipFields,
  education: EducationFields,
  projects: ProjectFields,
  skills: SkillFields,
  courses: CourseFields,
};

export function ImportPlanEditor({ plan, onChange }: Props) {
  const Editor = SECTION_EDITORS[plan.section];
  if (!Editor) {
    return (
      <Textarea
        className="font-mono text-xs"
        rows={6}
        value={JSON.stringify(getEditableRow(plan), null, 2)}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value) as Record<string, unknown>;
            onChange(setEditableRow(plan, parsed));
          } catch {
            // ignore invalid JSON while typing
          }
        }}
      />
    );
  }

  return <Editor plan={plan} onChange={onChange} />;
}

export function ImportPlanReadOnly({
  section,
  row,
}: {
  section: ProfileSection;
  row: Record<string, unknown> | undefined;
}) {
  if (!row) return <p className="text-xs text-muted-foreground">—</p>;

  return (
    <pre className="text-xs whitespace-pre-wrap">{formatPlanRow(section, row)}</pre>
  );
}

