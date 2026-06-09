import Link from "next/link";
import type { OverviewAction } from "@hirevault/types";
import { Button } from "@/components/ui/button";

export function ProfileReadinessBanner({
  ready,
  blockers,
}: {
  ready: boolean;
  blockers: OverviewAction[];
}) {
  if (ready) {
    return (
      <div className="rounded-md border border-green-500/40 bg-green-500/5 px-4 py-3 text-sm">
        <p className="font-medium text-green-700 dark:text-green-400">Ready to tailor resumes</p>
        <p className="text-muted-foreground mt-0.5">
          Your profile has enough content to start tailoring for applications.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-3 space-y-2">
      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
        {blockers.length} blocker{blockers.length === 1 ? "" : "s"} before tailoring
      </p>
      <ul className="space-y-1.5">
        {blockers.map((blocker) => (
          <li key={blocker.href + blocker.title} className="flex items-start justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{blocker.title}</span>
            <Button variant="link" size="sm" className="h-auto p-0 shrink-0" asChild>
              <Link href={blocker.href}>Fix</Link>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
