"use client";

import { useEffect, useState } from "react";
import { getProfileValidation } from "@/lib/ingestion/actions";
import type { ProfileValidation } from "@hirevault/ai-core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ValidationPanel() {
  const [validation, setValidation] = useState<ProfileValidation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfileValidation().then((r) => {
      if (r.validation) setValidation(r.validation);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading validation…</p>;
  }

  if (!validation) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile quality</CardTitle>
        <CardDescription>
          Completeness score: {validation.completeness_score}/100
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${validation.completeness_score}%` }}
          />
        </div>
        <ul className="space-y-2">
          {validation.suggestions.map((s, i) => (
            <li key={i} className="text-sm border-l-2 border-border pl-3">
              <span
                className={
                  s.severity === "error"
                    ? "text-red-400"
                    : s.severity === "warning"
                      ? "text-yellow-400"
                      : "text-muted-foreground"
                }
              >
                [{s.severity}]
              </span>{" "}
              {s.message}
              {s.suggestion && (
                <p className="text-xs text-muted-foreground mt-0.5">{s.suggestion}</p>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
