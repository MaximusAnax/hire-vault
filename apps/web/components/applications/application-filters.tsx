"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ApplicationFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    router.push(`/applications?${next.toString()}`);
  };

  return (
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
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Priority</Label>
        <select
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
          value={params.get("priority") ?? "all"}
          onChange={(e) => set("priority", e.target.value)}
        >
          <option value="all">Any</option>
          {[1, 2, 3, 4, 5].map((p) => (
            <option key={p} value={String(p)}>
              P{p}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Job type</Label>
        <select
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
          value={params.get("jobType") ?? "all"}
          onChange={(e) => set("jobType", e.target.value)}
        >
          <option value="all">All</option>
          <option value="full_time">Full-time</option>
          <option value="internship">Internship</option>
          <option value="contract">Contract</option>
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
          <option value="applied">Applied date</option>
          <option value="priority">Priority</option>
          <option value="company">Company</option>
        </select>
      </div>
    </div>
  );
}
