"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import type { Profile } from "@hirevault/types";
import { updateProfile } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROLE_SUGGESTIONS = [
  "AI Engineer",
  "SWE",
  "Quant Dev",
  "PM",
  "Tech Consulting",
] as const;

const DEFAULT_SKILLS_TEX = String.raw`     \textbf{Machine Learning}{: Deep Algorithmic Knowledge of Decision Trees, K-Mean, Neural Networks.}\\
     \textbf{Languages, Libraries, \& Frameworks}{: PyTorch, TensorFlow, Python, SQL, C++.}\\
     \textbf{Data Infrastructure}{: AWS, PostgreSQL, Docker, CI/CD Pipelines.}`;

export function ProfileHeaderForm({ profile }: { profile: Profile }) {
  const [pending, startTransition] = useTransition();
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
      <CardContent>
        <form
          action={(fd) => {
            fd.set("target_roles", roles.join(","));
            startTransition(() => void updateProfile(fd));
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="full_name">Full name (resume heading)</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={profile.full_name ?? ""}
              placeholder="Your name as it should appear on the PDF"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={profile.email ?? ""}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Target roles</Label>
            <p className="text-xs text-muted-foreground">
              Roles you&apos;re targeting — used for resume tailoring and interview prep.
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
                <span className="text-xs text-muted-foreground self-center">Suggestions:</span>
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
            <Label htmlFor="technical_skills_tex">Technical skills (LaTeX)</Label>
            <p className="text-xs text-muted-foreground">
              Lines inside the resume Technical Skills section. Use{" "}
              <code className="text-[11px]">\textbf{"{Category}"}</code> and{" "}
              <code className="text-[11px]">{"{skills}"}</code> format from your template.
            </p>
            <Textarea
              id="technical_skills_tex"
              name="technical_skills_tex"
              rows={5}
              className="font-mono text-xs"
              defaultValue={profile.technical_skills_tex?.trim() || DEFAULT_SKILLS_TEX}
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

          <input type="hidden" name="target_roles" value={roles.join(",")} />

          <Button type="submit" disabled={pending} className="sm:col-span-2 w-fit">
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
