"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Course } from "@hirevault/types";
import type { DeleteAction } from "@/lib/profile/actions";
import { updateCourse } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CourseRow({
  course,
  onDelete,
}: {
  course: Course;
  onDelete: DeleteAction;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{course.name}</p>
          {course.institution && (
            <p className="text-sm text-muted-foreground">{course.institution}</p>
          )}
          {course.completion_date && (
            <p className="text-xs text-muted-foreground mt-1">{course.completion_date}</p>
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
            onClick={() => startTransition(() => void onDelete(course.id))}
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
              await updateCourse(course.id, fd);
              setOpen(false);
            });
          }}
        >
          <div className="space-y-1 sm:col-span-2">
            <Label>Course name</Label>
            <Input name="name" defaultValue={course.name} required />
          </div>
          <div className="space-y-1">
            <Label>Institution</Label>
            <Input name="institution" defaultValue={course.institution ?? ""} />
          </div>
          <div className="space-y-1">
            <Label>Completion date</Label>
            <Input
              name="completion_date"
              type="date"
              defaultValue={course.completion_date ?? ""}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Credential URL</Label>
            <Input
              name="credential_url"
              type="url"
              defaultValue={course.credential_url ?? ""}
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
