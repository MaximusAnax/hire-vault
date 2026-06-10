"use client";

import type { TooltipProps } from "recharts";

/** Pale-sky primary, teal secondary — matches approved v3 preview. */
export const CHART_SLICE_COLORS = [
  "#bfdbf7",
  "rgba(31, 122, 140, 0.8)",
  "#a8c8eb",
  "rgba(31, 122, 140, 0.55)",
  "#bfdbf7",
  "rgba(31, 122, 140, 0.4)",
] as const;

export const CHART_BAR_FILL = "#bfdbf7";

export const chartAxisTickStyle = { fill: "#a8c5e8", fontSize: 11 };

export const chartGridStroke = "rgba(191, 219, 247, 0.15)";

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
          <li key={i} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color ?? CHART_SLICE_COLORS[0] }}
            />
            <span className="capitalize text-foreground">{entry.name}:</span>
            <span className="font-medium tabular-nums text-muted-foreground">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function pieLabelStyle() {
  return { fill: "#e1e5f2", fontSize: 12, fontWeight: 500 };
}
