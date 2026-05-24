"use client";

import { useTransition } from "react";
import type { Profile } from "@hirevault/types";
import { updateProfile } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ProfileHeaderForm({ profile }: { profile: Profile }) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile details</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={(fd) => startTransition(() => void updateProfile(fd))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              name="headline"
              defaultValue={profile.headline ?? ""}
              placeholder="Senior Software Engineer"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              name="summary"
              defaultValue={profile.summary ?? ""}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              defaultValue={profile.location ?? ""}
            />
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
          <Button type="submit" disabled={pending} className="sm:col-span-2 w-fit">
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
