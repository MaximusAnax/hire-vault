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

const COLORS = ["#8b5cf6", "#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444"];

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
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="status" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
            <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #27272a" }}
            />
            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0,  0]} />
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
              label
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #27272a" }}
            />
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
