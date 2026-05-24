"use client";

import { useTransition } from "react";
import { createProject } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AddProjectForm() {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => void createProject(fd))}
      className="grid gap-3 sm:grid-cols-2 rounded-md border border-dashed border-border p-4"
    >
      <div className="space-y-2 sm:col-span-2">
        <Label>Name</Label>
        <Input name="name" required />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Description</Label>
        <Textarea name="description" rows={2} />
      </div>
      <div className="space-y-2">
        <Label>URL</Label>
        <Input name="url" type="url" />
      </div>
      <div className="space-y-2">
        <Label>GitHub</Label>
        <Input name="github_url" type="url" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Technologies (comma-separated)</Label>
        <Input name="technologies" placeholder="TypeScript, React, PostgreSQL" />
      </div>
      <Button type="submit" disabled={pending} className="sm:col-span-2 w-fit">
        Add project
      </Button>
    </form>
  );
}
