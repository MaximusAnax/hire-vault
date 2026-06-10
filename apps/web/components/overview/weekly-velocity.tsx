import Link from "next/link";

export function WeeklyVelocity({
  appliedThisWeek,
  goal,
}: {
  appliedThisWeek: number;
  goal: number;
}) {
  const pct = goal > 0 ? Math.min(100, Math.round((appliedThisWeek / goal) * 100)) : 0;
  const metGoal = appliedThisWeek >= goal;

  return (
    <div className="rounded-md border border-border p-4 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">Weekly velocity</p>
        <Link href="/settings" className="text-xs text-muted-foreground hover:text-primary hover:underline">
          Goal: {goal}/wk
        </Link>
      </div>
      <p className="text-2xl font-bold text-primary">
        {appliedThisWeek}
        <span className="text-base font-normal text-muted-foreground"> / {goal} applied</span>
      </p>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={metGoal ? "h-full bg-green-500" : "h-full bg-primary"}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {metGoal
          ? "Goal met this week — keep the momentum."
          : `${goal - appliedThisWeek} more to hit your weekly goal.`}
      </p>
    </div>
  );
}
