"use client";

import { useTransition } from "react";
import { createExperience } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AddExperienceForm() {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => void createExperience(fd))}
      className="grid gap-3 sm:grid-cols-2 rounded-md border border-dashed border-border p-4"
    >
      <div className="space-y-2">
        <Label>Company</Label>
        <Input name="company" required />
      </div>
      <div className="space-y-2">
        <Label>Title</Label>
        <Input name="title" required />
      </div>
      <div className="space-y-2">
        <Label>Location</Label>
        <Input name="location" />
      </div>
      <div className="space-y-2 flex items-end gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_current" className="rounded" />
          Current role
        </label>
      </div>
      <div className="space-y-2">
        <Label>Start date</Label>
        <Input name="start_date" type="date" />
      </div>
      <div className="space-y-2">
        <Label>End date</Label>
        <Input name="end_date" type="date" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Bullet points (one per line)</Label>
        <Textarea name="bullet_points" rows={3} />
      </div>
      <Button type="submit" disabled={pending} className="sm:col-span-2 w-fit">
        Add experience
      </Button>
    </form>
  );
}
