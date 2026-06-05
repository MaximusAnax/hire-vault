"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import type { Skill } from "@hirevault/types";
import { createSkill, deleteSkill } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileSkillsTags({ skills }: { skills: Skill[] }) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");

  const sorted = useMemo(
    () => [...skills].sort((a, b) => a.name.localeCompare(b.name)),
    [skills]
  );

  function addSkill(name: string) {
    const cleaned = name.trim();
    if (!cleaned) return;
    if (sorted.some((s) => s.name.toLowerCase() === cleaned.toLowerCase())) {
      setDraft("");
      return;
    }
    const fd = new FormData();
    fd.set("name", cleaned);
    fd.set("category", "tool");
    startTransition(() => void createSkill(fd));
    setDraft("");
  }

  function removeSkill(id: string) {
    startTransition(() => void deleteSkill(id));
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label>Technical skills</Label>
      <p className="text-xs text-muted-foreground">
        Populated when you import a resume or LinkedIn. Shown as tags here; formatted for PDF only
        when you export from Resumes.
      </p>
      <div className="flex flex-wrap gap-2 rounded-md border border-input bg-transparent p-2 min-h-9">
        {sorted.length === 0 && (
          <span className="text-sm text-muted-foreground">
            No skills yet — import your resume or add tags below.
          </span>
        )}
        {sorted.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs"
          >
            {s.name}
            <button
              type="button"
              disabled={pending}
              onClick={() => removeSkill(s.id)}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
              aria-label={`Remove ${s.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSkill(draft);
            }
          }}
          placeholder="Add a skill (Enter to add)"
          className="max-w-xs"
          disabled={pending}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => addSkill(draft)}
          disabled={!draft.trim() || pending}
        >
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
}
