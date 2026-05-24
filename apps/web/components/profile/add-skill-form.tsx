"use client";

import { useTransition } from "react";
import { createSkill } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddSkillForm() {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => void createSkill(fd))}
      className="grid gap-3 sm:grid-cols-3 rounded-md border border-dashed border-border p-4"
    >
      <div className="space-y-2">
        <Label>Name</Label>
        <Input name="name" required />
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <select
          name="category"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          defaultValue="tool"
        >
          <option value="language">Language</option>
          <option value="framework">Framework</option>
          <option value="tool">Tool</option>
          <option value="soft_skill">Soft skill</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label>Proficiency (1-5)</Label>
        <Input name="proficiency_level" type="number" min={1} max={5} />
      </div>
      <Button type="submit" disabled={pending} className="sm:col-span-3 w-fit">
        Add skill
      </Button>
    </form>
  );
}
