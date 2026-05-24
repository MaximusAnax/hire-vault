"use client";

import { useTransition } from "react";
import { createEducation } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddEducationForm() {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => void createEducation(fd))}
      className="grid gap-3 sm:grid-cols-2 rounded-md border border-dashed border-border p-4"
    >
      <div className="space-y-2 sm:col-span-2">
        <Label>Institution</Label>
        <Input name="institution" required />
      </div>
      <div className="space-y-2">
        <Label>Degree</Label>
        <Input name="degree" />
      </div>
      <div className="space-y-2">
        <Label>Field of study</Label>
        <Input name="field_of_study" />
      </div>
      <div className="space-y-2">
        <Label>Start date</Label>
        <Input name="start_date" type="date" />
      </div>
      <div className="space-y-2">
        <Label>Expected graduation</Label>
        <Input name="expected_graduation" type="date" />
      </div>
      <div className="space-y-2">
        <Label>GPA</Label>
        <Input name="gpa" type="number" step="0.01" min="0" max="4.5" />
      </div>
      <Button type="submit" disabled={pending} className="sm:col-span-2 w-fit">
        Add education
      </Button>
    </form>
  );
}
