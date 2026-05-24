"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface InsightsPanelProps {
  profileOverall: number | null;
  sections: { name: string; score: number; note: string }[];
  strategies: { title: string; detail: string; priority: string }[];
  skillGaps: { skill: string; demandCount: number; hasSkill: boolean }[];
  practiceAvg: number | null;
  mockTrend: { label: string; score: number }[];
}

export function InsightsPanel({
  profileOverall,
  sections,
  strategies,
  skillGaps,
  practiceAvg,
  mockTrend,
}: InsightsPanelProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile strength</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{profileOverall ?? "—"}</p>
          <ul className="mt-3 text-sm space-y-1 text-muted-foreground">
            {sections.map((s) => (
              <li key={s.name}>
                {s.name}: {s.score}/100 — {s.note}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Application strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {strategies.map((s) => (
            <div key={s.title} className="border-b border-border pb-2">
              <span className="text-xs uppercase text-primary">{s.priority}</span>
              <p className="font-medium">{s.title}</p>
              <p className="text-muted-foreground">{s.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skill gaps (from saved jobs)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm max-h-48 overflow-auto">
          {skillGaps.length === 0 ? (
            <p className="text-muted-foreground">Save jobs with tech stacks to analyze gaps.</p>
          ) : (
            <ul className="space-y-1">
              {skillGaps.map((g) => (
                <li key={g.skill} className={g.hasSkill ? "text-muted-foreground" : "text-amber-400"}>
                  {g.skill} ({g.demandCount} jobs) {g.hasSkill ? "✓" : "· learn"}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interview performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Practice avg: {practiceAvg ?? "—"}/5 · Mock scores below
          </p>
          {mockTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={mockTrend}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Complete a mock session to see trends.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
