"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, RefreshCw, Sparkles, X } from "lucide-react";
import type { Profile } from "@hirevault/types";
import {
  regenerateProfileSummary,
  updateProfile,
} from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROLE_SUGGESTIONS = [
  "AI Engineer",
  "SWE",
  "Quant Dev",
  "PM",
  "Tech Consulting",
] as const;

export function ProfileHeaderForm({ profile }: { profile: Profile }) {
  const [pending, startTransition] = useTransition();
  const [regenPending, startRegen] = useTransition();
  const [regenError, setRegenError] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>(() => profile.target_roles ?? []);
  const [roleDraft, setRoleDraft] = useState("");

  const suggestions = useMemo(
    () => ROLE_SUGGESTIONS.filter((s) => !roles.includes(s)),
    [roles]
  );

  function addRole(value: string) {
    const cleaned = value.trim();
    if (!cleaned) return;
    if (roles.some((r) => r.toLowerCase() === cleaned.toLowerCase())) return;
    setRoles((prev) => [...prev, cleaned]);
    setRoleDraft("");
  }

  function removeRole(value: string) {
    setRoles((prev) => prev.filter((r) => r !== value));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <SummaryPanel
          profile={profile}
          pending={regenPending}
          error={regenError}
          onRegenerate={() => {
            setRegenError(null);
            startRegen(async () => {
              const result = await regenerateProfileSummary();
              if (result?.error) setRegenError(result.error);
            });
          }}
        />

        <form
          action={(fd) => {
            fd.set("target_roles", roles.join(","));
            startTransition(() => void updateProfile(fd));
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="space-y-2 sm:col-span-2">
            <Label>Target roles</Label>
            <p className="text-xs text-muted-foreground">
              Pick the roles you&apos;re targeting. These feed every downstream
              tailoring and interview prompt.
            </p>
            <div className="flex flex-wrap gap-2 rounded-md border border-input bg-transparent p-2 min-h-9">
              {roles.length === 0 && (
                <span className="text-sm text-muted-foreground">No roles selected yet.</span>
              )}
              {roles.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs"
                >
                  {r}
                  <button
                    type="button"
                    onClick={() => removeRole(r)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${r}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={roleDraft}
                onChange={(e) => setRoleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRole(roleDraft);
                  }
                }}
                placeholder="Add a role (Enter to add)"
                className="max-w-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => addRole(roleDraft)}
                disabled={!roleDraft.trim()}
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground self-center">
                  Suggestions:
                </span>
                {suggestions.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => addRole(s)}
                    className="rounded-full border border-input px-2 py-0.5 text-xs hover:bg-accent"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pitch">Personal pitch</Label>
            <Input
              id="pitch"
              name="pitch"
              defaultValue={profile.pitch ?? ""}
              placeholder="One sentence that captures your professional thesis"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" defaultValue={profile.location ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn</Label>
            <Input
              id="linkedin_url"
              name="linkedin_url"
              defaultValue={profile.linkedin_url ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="github_url">GitHub</Label>
            <Input
              id="github_url"
              name="github_url"
              defaultValue={profile.github_url ?? ""}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="portfolio_url">Portfolio</Label>
            <Input
              id="portfolio_url"
              name="portfolio_url"
              defaultValue={profile.portfolio_url ?? ""}
            />
          </div>

          {/* hidden field carries the chip array as comma-joined text so we
              can stay compatible with the existing FormData server action. */}
          <input type="hidden" name="target_roles" value={roles.join(",")} />

          <Button type="submit" disabled={pending} className="sm:col-span-2 w-fit">
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SummaryPanel({
  profile,
  pending,
  error,
  onRegenerate,
}: {
  profile: Profile;
  pending: boolean;
  error: string | null;
  onRegenerate: () => void;
}) {
  const assembledLabel = profile.summary_assembled_at
    ? new Date(profile.summary_assembled_at).toLocaleString()
    : null;

  return (
    <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="font-medium text-sm">Profile summary</p>
          {profile.summary_stale && (
            <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              Profile changed since last assembly
            </span>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRegenerate}
          disabled={pending}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${pending ? "animate-spin" : ""}`} />
          {pending ? "Regenerating…" : "Regenerate summary"}
        </Button>
      </div>
      <div className="text-sm text-muted-foreground">
        {profile.summary?.trim() ? (
          <p className="text-foreground/90 leading-relaxed">{profile.summary}</p>
        ) : (
          <p className="italic">
            No summary yet. Add experiences, projects, or courses and click
            Regenerate to assemble one.
          </p>
        )}
      </div>
      {assembledLabel && (
        <p className="text-[11px] text-muted-foreground">
          Last assembled {assembledLabel}
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
