"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ROLE_SEASONS } from "@hirevault/types";
import { ROLE_SEASON_LABELS } from "@/lib/applications/role-timing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const COHORT_YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

interface ApplicationFiltersProps {
  needsReviewCount?: number;
}

export function ApplicationFilters({ needsReviewCount = 0 }: ApplicationFiltersProps) {
  const router = useRouter();
  const params = useSearchParams();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value && value !== "all" && value !== "0") next.set(key, value);
    else next.delete(key);
    router.push(`/applications?${next.toString()}`);
  };

  const toggle = (key: string) => {
    const next = new URLSearchParams(params.toString());
    if (next.get(key) === "1") next.delete(key);
    else next.set(key, "1");
    router.push(`/applications?${next.toString()}`);
  };

  const clearAll = () => router.push("/applications");

  const hasFilters =
    params.get("company") ||
    (params.get("status") && params.get("status") !== "all") ||
    params.get("priority") ||
    params.get("priorityMin") ||
    (params.get("jobType") && params.get("jobType") !== "all") ||
    (params.get("roleSeason") && params.get("roleSeason") !== "all") ||
    params.get("roleYear") ||
    params.get("location") ||
    params.get("active") === "1" ||
    params.get("remote") === "1" ||
    params.get("needsReview") === "1";

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Filter pipeline</p>
        {hasFilters ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Company</Label>
          <Input
            placeholder="Filter company…"
            className="h-8 w-40"
            defaultValue={params.get("company") ?? ""}
            onBlur={(e) => set("company", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Location</Label>
          <Input
            placeholder="City, remote…"
            className="h-8 w-36"
            defaultValue={params.get("location") ?? ""}
            onBlur={(e) => set("location", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            value={params.get("status") ?? "all"}
            onChange={(e) => set("status", e.target.value)}
          >
            <option value="all">All</option>
            <option value="saved">Saved</option>
            <option value="applied">Applied</option>
            <option value="screening">Screening</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Priority</Label>
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-sm min-w-[7rem]"
            value={
              params.get("priorityMin")
                ? `min-${params.get("priorityMin")}`
                : params.get("priority")
                  ? `eq-${params.get("priority")}`
                  : "all"
            }
            onChange={(e) => {
              const v = e.target.value;
              const next = new URLSearchParams(params.toString());
              next.delete("priority");
              next.delete("priorityMin");
              if (v === "all") {
                router.push(`/applications?${next.toString()}`);
                return;
              }
              if (v.startsWith("min-")) {
                next.set("priorityMin", v.slice(4));
              } else if (v.startsWith("eq-")) {
                next.set("priority", v.slice(3));
              }
              router.push(`/applications?${next.toString()}`);
            }}
          >
            <option value="all">Any</option>
            <option value="min-3">3+ stars</option>
            <option value="min-4">4+ stars</option>
            <option value="eq-5">5 stars only</option>
            {[1, 2, 3, 4, 5].map((p) => (
              <option key={p} value={`eq-${p}`}>
                Exactly {p}★
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Role type</Label>
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            value={params.get("jobType") ?? "all"}
            onChange={(e) => set("jobType", e.target.value)}
          >
            <option value="all">All</option>
            <option value="internship">Internship</option>
            <option value="full_time">Full-time</option>
            <option value="contract">Contract</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Cohort season</Label>
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            value={params.get("roleSeason") ?? "all"}
            onChange={(e) => set("roleSeason", e.target.value)}
          >
            <option value="all">Any season</option>
            {ROLE_SEASONS.map((s) => (
              <option key={s} value={s}>
                {ROLE_SEASON_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Cohort year</Label>
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            value={params.get("roleYear") ?? "all"}
            onChange={(e) => set("roleYear", e.target.value)}
          >
            <option value="all">Any year</option>
            {COHORT_YEARS.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Sort</Label>
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            value={params.get("sort") ?? "updated"}
            onChange={(e) => set("sort", e.target.value)}
          >
            <option value="updated">Last updated</option>
            <option value="role_timing">Cohort (soonest)</option>
            <option value="priority">Priority</option>
            <option value="applied">Applied date</option>
            <option value="company">Company</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center text-xs">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-border"
            checked={params.get("active") === "1"}
            onChange={() => toggle("active")}
          />
          Active pipeline only
          <span className="text-muted-foreground">(hide rejected / withdrawn)</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-border"
            checked={params.get("remote") === "1"}
            onChange={() => toggle("remote")}
          />
          Remote-friendly
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-border"
            checked={params.get("needsReview") === "1"}
            onChange={() => toggle("needsReview")}
          />
          Needs review
          {needsReviewCount > 0 ? (
            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300">
              {needsReviewCount}
            </span>
          ) : null}
        </label>
      </div>
    </div>
  );
}
