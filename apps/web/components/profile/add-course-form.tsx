"use client";

import { useTransition } from "react";
import { createCourse } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddCourseForm() {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => void createCourse(fd))}
      className="grid gap-3 sm:grid-cols-2 rounded-md border border-dashed border-border p-4"
    >
      <div className="space-y-2 sm:col-span-2">
        <Label>Course name</Label>
        <Input name="name" required />
      </div>
      <div className="space-y-2">
        <Label>Institution</Label>
        <Input name="institution" />
      </div>
      <div className="space-y-2">
        <Label>Completion date</Label>
        <Input name="completion_date" type="date" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Credential URL</Label>
        <Input name="credential_url" type="url" />
      </div>
      <Button type="submit" disabled={pending} className="sm:col-span-2 w-fit">
        Add course
      </Button>
    </form>
  );
}
