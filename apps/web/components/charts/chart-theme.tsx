"use client";

import type { TooltipProps } from "recharts";

/** Pale-sky primary slice, original secondary hues for additional series. */
export const CHART_SLICE_COLORS = [
  "#bfdbf7",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ef4444",
] as const;

export const CHART_BAR_FILL = "#bfdbf7";

export const chartAxisTickStyle = { fill: "#a1a1aa", fontSize: 11 };

export const chartGridStroke = "#27272a";

export function ChartTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm">
      {label ? (
        <p className="mb-1 font-medium capitalize text-foreground">{label}</p>
      ) : null}
      <ul className="space-y-0.5">
        {payload.map((entry, i) => (
          <li key={i} className="flex items-center gap-2 text-foreground">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color ?? CHART_SLICE_COLORS[0] }}
            />
            <span className="capitalize text-muted-foreground">{entry.name}:</span>
            <span className="font-medium tabular-nums">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function pieLabelStyle() {
  return { fill: "#fafafa", fontSize: 12, fontWeight: 500 };
}
