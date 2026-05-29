"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Education } from "@hirevault/types";
import type { DeleteAction } from "@/lib/profile/actions";
import { updateEducation } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EducationRow({
  education,
  onDelete,
}: {
  education: Education;
  onDelete: DeleteAction;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const subtitle = [education.degree, education.field_of_study]
    .filter(Boolean)
    .join(" · ");
  const dates = [education.start_date, education.expected_graduation]
    .filter(Boolean)
    .join(" – ");

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{education.institution}</p>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          {dates && <p className="text-xs text-muted-foreground mt-1">{dates}</p>}
          {education.gpa != null && (
            <p className="text-xs text-muted-foreground">GPA {education.gpa}</p>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            onClick={() => startTransition(() => void onDelete(education.id))}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      {open && (
        <form
          className="grid gap-2 sm:grid-cols-2 border-t border-border pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              await updateEducation(education.id, fd);
              setOpen(false);
            });
          }}
        >
          <div className="space-y-1 sm:col-span-2">
            <Label>Institution</Label>
            <Input name="institution" defaultValue={education.institution} required />
          </div>
          <div className="space-y-1">
            <Label>Degree</Label>
            <Input name="degree" defaultValue={education.degree ?? ""} />
          </div>
          <div className="space-y-1">
            <Label>Field of study</Label>
            <Input name="field_of_study" defaultValue={education.field_of_study ?? ""} />
          </div>
          <div className="space-y-1">
            <Label>Start date</Label>
            <Input name="start_date" type="date" defaultValue={education.start_date ?? ""} />
          </div>
          <div className="space-y-1">
            <Label>Expected graduation</Label>
            <Input
              name="expected_graduation"
              type="date"
              defaultValue={education.expected_graduation ?? ""}
            />
          </div>
          <div className="space-y-1">
            <Label>GPA</Label>
            <Input
              name="gpa"
              type="number"
              step="0.01"
              min="0"
              max="4.5"
              defaultValue={education.gpa ?? ""}
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={pending}>
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
