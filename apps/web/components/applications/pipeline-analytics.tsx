"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  CHART_BAR_FILL,
  CHART_SLICE_COLORS,
  ChartTooltip,
  chartAxisTickStyle,
  chartGridStroke,
  pieLabelStyle,
} from "@/components/charts/chart-theme";

export function PipelineAnalytics({
  pipeline,
  responseRate,
  offerRate,
  velocity30d,
}: {
  pipeline: { status: string; count: number }[];
  responseRate: number;
  offerRate: number;
  velocity30d: number;
}) {
  const pieData = pipeline.filter((p) => p.count > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="h-64 rounded-md border border-border p-3">
        <p className="text-sm font-medium mb-2">Pipeline by status</p>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={pipeline}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
            <XAxis dataKey="status" tick={chartAxisTickStyle} />
            <YAxis tick={chartAxisTickStyle} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" fill={CHART_BAR_FILL} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="h-64 rounded-md border border-border p-3">
        <p className="text-sm font-medium mb-2">Distribution</p>
        <ResponsiveContainer width="100%" height="90%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={pieLabelStyle()}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={CHART_SLICE_COLORS[i % CHART_SLICE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="lg:col-span-2 grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded-md border border-border p-3">
          <p className="text-2xl font-bold text-primary">{responseRate}%</p>
          <p className="text-muted-foreground">Response rate</p>
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="text-2xl font-bold text-primary">{offerRate}%</p>
          <p className="text-muted-foreground">Offer rate (of applied)</p>
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="text-2xl font-bold text-primary">{velocity30d}</p>
          <p className="text-muted-foreground">Apps added (30d)</p>
        </div>
      </div>
    </div>
  );
}
