"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Experience } from "@hirevault/types";
import type { DeleteAction } from "@/lib/profile/types";
import { updateExperience } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ExperienceRow({
  experience,
  onDelete,
}: {
  experience: Experience;
  onDelete: DeleteAction;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">
            {experience.title} at {experience.company}
          </p>
          {experience.location && (
            <p className="text-sm text-muted-foreground">{experience.location}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {experience.is_current
              ? "Current"
              : [experience.start_date, experience.end_date].filter(Boolean).join(" – ")}
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            onClick={() => startTransition(() => void onDelete(experience.id))}
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
              await updateExperience(experience.id, fd);
              setOpen(false);
            });
          }}
        >
          <div className="space-y-1">
            <Label>Company</Label>
            <Input name="company" defaultValue={experience.company} required />
          </div>
          <div className="space-y-1">
            <Label>Title</Label>
            <Input name="title" defaultValue={experience.title} required />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Bullets</Label>
            <Textarea
              name="bullet_points"
              rows={3}
              defaultValue={experience.bullet_points?.join("\n")}
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
