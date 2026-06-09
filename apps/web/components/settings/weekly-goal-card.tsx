"use client";

import { useState, useTransition } from "react";
import { updateWeeklyApplicationGoal } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WeeklyGoalCard({ initialGoal }: { initialGoal: number }) {
  const [goal, setGoal] = useState(String(initialGoal));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Weekly application goal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Set how many roles you want to apply to each week. Your Overview page tracks progress against
          this target.
        </p>
        <div className="flex items-end gap-3 max-w-xs">
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="weekly-goal">Applications per week</Label>
            <Input
              id="weekly-goal"
              type="number"
              min={1}
              max={50}
              value={goal}
              onChange={(e) => {
                setGoal(e.target.value);
                setSaved(false);
              }}
            />
          </div>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                setSaved(false);
                const parsed = Number(goal);
                if (!Number.isFinite(parsed) || parsed < 1) {
                  setError("Enter a number between 1 and 50.");
                  return;
                }
                const res = await updateWeeklyApplicationGoal(parsed);
                if (res.error) {
                  setError(res.error);
                } else {
                  setSaved(true);
                }
              })
            }
          >
            Save
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {saved ? <p className="text-sm text-green-600 dark:text-green-400">Saved.</p> : null}
      </CardContent>
    </Card>
  );
}
