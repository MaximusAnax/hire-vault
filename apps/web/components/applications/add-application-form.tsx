"use client";

import { useTransition } from "react";
import { createApplication } from "@/lib/applications/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AddApplicationForm() {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 sm:grid-cols-2 rounded-md border border-dashed border-border p-4"
      action={(fd) => startTransition(() => void createApplication(fd))}
    >
      <div className="space-y-2">
        <Label>Job title</Label>
        <Input name="title" required placeholder="Software Engineer" />
      </div>
      <div className="space-y-2">
        <Label>Company</Label>
        <Input name="company" required placeholder="Acme Inc" />
      </div>
      <div className="space-y-2">
        <Label>Location</Label>
        <Input name="location" />
      </div>
      <div className="space-y-2">
        <Label>Job URL</Label>
        <Input name="url" type="url" />
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <select name="status" className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm">
          <option value="saved">Saved</option>
          <option value="applied">Applied</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label>Priority (1–5)</Label>
        <Input name="priority" type="number" min={1} max={5} />
      </div>
      <div className="space-y-2">
        <Label>Job type</Label>
        <select name="job_type" className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm">
          <option value="">—</option>
          <option value="full_time">Full-time</option>
          <option value="internship">Internship</option>
          <option value="contract">Contract</option>
        </select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Paste job description (optional — light AI parse)</Label>
        <Textarea name="description_raw" rows={4} placeholder="Paste JD for auto-extract of tech stack…" />
      </div>
      <Button type="submit" disabled={pending} className="sm:col-span-2 w-fit">
        {pending ? "Adding…" : "Add application"}
      </Button>
    </form>
  );
}
