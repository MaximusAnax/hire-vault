"use client";

import { useTransition } from "react";
import { createLeadership } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AddLeadershipForm() {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add leadership</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-2 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              await createLeadership(new FormData(e.currentTarget));
              e.currentTarget.reset();
            });
          }}
        >
          <div className="space-y-1">
            <Label>Organization</Label>
            <Input name="organization" required />
          </div>
          <div className="space-y-1">
            <Label>Title</Label>
            <Input name="title" required />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Bullets (one per line)</Label>
            <Textarea name="bullet_points" rows={3} />
          </div>
          <Button type="submit" size="sm" disabled={pending}>
            Add
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
