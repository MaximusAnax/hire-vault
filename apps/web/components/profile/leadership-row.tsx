"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Leadership } from "@hirevault/types";
import type { DeleteAction } from "@/lib/profile/actions";
import { updateLeadership } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function LeadershipRow({
  leadership,
  onDelete,
}: {
  leadership: Leadership;
  onDelete: DeleteAction;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">
            {leadership.title} — {leadership.organization}
          </p>
          {leadership.location && (
            <p className="text-sm text-muted-foreground">{leadership.location}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {leadership.is_current
              ? "Current"
              : [leadership.start_date, leadership.end_date].filter(Boolean).join(" – ")}
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            onClick={() => startTransition(() => void onDelete(leadership.id))}
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
              await updateLeadership(leadership.id, fd);
              setOpen(false);
            });
          }}
        >
          <div className="space-y-1">
            <Label>Organization</Label>
            <Input name="organization" defaultValue={leadership.organization} required />
          </div>
          <div className="space-y-1">
            <Label>Title</Label>
            <Input name="title" defaultValue={leadership.title} required />
          </div>
          <div className="space-y-1">
            <Label>Location</Label>
            <Input name="location" defaultValue={leadership.location ?? ""} />
          </div>
          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <input type="checkbox" name="is_current" defaultChecked={leadership.is_current} />
              Current role
            </Label>
          </div>
          <div className="space-y-1">
            <Label>Start</Label>
            <Input name="start_date" defaultValue={leadership.start_date ?? ""} placeholder="May 2020" />
          </div>
          <div className="space-y-1">
            <Label>End</Label>
            <Input name="end_date" defaultValue={leadership.end_date ?? ""} placeholder="Aug 2022" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Bullets</Label>
            <Textarea
              name="bullet_points"
              rows={3}
              defaultValue={leadership.bullet_points?.join("\n")}
            />
          </div>
          <Button type="submit" size="sm" disabled={pending} className="sm:col-span-2 w-fit">
            Save
          </Button>
        </form>
      )}
    </div>
  );
}
