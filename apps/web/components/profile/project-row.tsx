"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Project } from "@hirevault/types";
import type { DeleteAction } from "@/lib/profile/actions";
import { updateProject } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProjectRow({
  project,
  onDelete,
}: {
  project: Project;
  onDelete: DeleteAction;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{project.name}</p>
          {project.technologies?.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {project.technologies.join(", ")}
            </p>
          )}
          {project.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {project.description}
            </p>
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
            onClick={() => startTransition(() => void onDelete(project.id))}
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
              await updateProject(project.id, fd);
              setOpen(false);
            });
          }}
        >
          <div className="space-y-1 sm:col-span-2">
            <Label>Name</Label>
            <Input name="name" defaultValue={project.name} required />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Description</Label>
            <Textarea name="description" rows={2} defaultValue={project.description ?? ""} />
          </div>
          <div className="space-y-1">
            <Label>URL</Label>
            <Input name="url" type="url" defaultValue={project.url ?? ""} />
          </div>
          <div className="space-y-1">
            <Label>GitHub</Label>
            <Input name="github_url" type="url" defaultValue={project.github_url ?? ""} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Technologies (comma-separated)</Label>
            <Input name="technologies" defaultValue={project.technologies?.join(", ") ?? ""} />
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
