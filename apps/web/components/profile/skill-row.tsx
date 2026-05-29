"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Skill } from "@hirevault/types";
import type { DeleteAction } from "@/lib/profile/actions";
import { updateSkill } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SkillRow({
  skill,
  onDelete,
}: {
  skill: Skill;
  onDelete: DeleteAction;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{skill.name}</p>
          <p className="text-sm text-muted-foreground">{skill.category}</p>
          {skill.proficiency_level != null && (
            <p className="text-xs text-muted-foreground mt-1">
              Level {skill.proficiency_level}/5
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
            onClick={() => startTransition(() => void onDelete(skill.id))}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      {open && (
        <form
          className="grid gap-2 sm:grid-cols-3 border-t border-border pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              await updateSkill(skill.id, fd);
              setOpen(false);
            });
          }}
        >
          <div className="space-y-1">
            <Label>Name</Label>
            <Input name="name" defaultValue={skill.name} required />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <select
              name="category"
              defaultValue={skill.category}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="language">Language</option>
              <option value="framework">Framework</option>
              <option value="tool">Tool</option>
              <option value="soft_skill">Soft skill</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Proficiency (1-5)</Label>
            <Input
              name="proficiency_level"
              type="number"
              min={1}
              max={5}
              defaultValue={skill.proficiency_level ?? ""}
            />
          </div>
          <div className="flex gap-2 sm:col-span-3">
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
