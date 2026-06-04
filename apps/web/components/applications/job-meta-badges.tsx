import type { JobType, RoleSeason } from "@hirevault/types";
import { JOB_TYPE_LABELS } from "@hirevault/types";
import { formatRoleTimingLabel } from "@/lib/applications/role-timing";
import { cn } from "@/lib/utils";

export function JobMetaBadges({
  job_type,
  role_season,
  role_year,
  className,
}: {
  job_type?: JobType | null;
  role_season?: RoleSeason | null;
  role_year?: number | null;
  className?: string;
}) {
  const timing = formatRoleTimingLabel(role_season ?? null, role_year ?? null);
  if (!job_type && !timing) return null;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {job_type ? (
        <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {JOB_TYPE_LABELS[job_type]}
        </span>
      ) : null}
      {timing ? (
        <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200/90">
          {timing}
        </span>
      ) : null}
    </div>
  );
}
