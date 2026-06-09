"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { OverviewAction } from "@hirevault/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  actionCtaLabel,
  actionSeverity,
  SEVERITY_LABELS,
  SEVERITY_STYLES,
} from "./action-severity";

function actionKey(action: OverviewAction, index: number): string {
  const appId = action.metadata?.applicationId as string | undefined;
  return `${action.kind}-${action.href}-${appId ?? index}`;
}

function expandedContext(action: OverviewAction): string[] {
  const lines: string[] = [action.subtitle];

  if (action.kind === "keyword_gaps") {
    const gaps = action.metadata?.gaps as string[] | undefined;
    if (gaps?.length) {
      lines.push(`Missing: ${gaps.slice(0, 3).join(", ")}${gaps.length > 3 ? "…" : ""}`);
    }
  }

  if (action.kind === "skill_nudge") {
    const count = action.metadata?.jdCount as number | undefined;
    if (count && count > 1) {
      lines.push(`Shows up in ${count} job descriptions you're tracking.`);
    }
  }

  if (action.kind === "practice_interview") {
    const count = action.metadata?.unpracticed as number | undefined;
    if (count) {
      lines.push(`${count} question${count === 1 ? "" : "s"} not practiced yet.`);
    }
  }

  return lines.filter(Boolean);
}

export function ActionQueue({ actions }: { actions: OverviewAction[] }) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">What to do next</CardTitle>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You&apos;re caught up —{" "}
            <Link href="/applications" className="text-primary hover:underline">
              capture a new role
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-border -mx-1">
            {actions.map((action, index) => {
              const key = actionKey(action, index);
              const expanded = expandedKey === key;
              const severity = actionSeverity(action);
              const contextLines = expandedContext(action);

              return (
                <li key={key}>
                  <div
                    className={cn(
                      "rounded-md px-2 py-3 transition-colors",
                      expanded && "bg-muted/20"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                        aria-expanded={expanded}
                        onClick={() => setExpandedKey(expanded ? null : key)}
                      >
                        <ChevronDown
                          className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
                        />
                      </button>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                              SEVERITY_STYLES[severity]
                            )}
                          >
                            {SEVERITY_LABELS[severity]}
                          </span>
                          <p className="text-sm font-medium">{action.title}</p>
                        </div>

                        {!expanded ? (
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-muted-foreground truncate">{action.subtitle}</p>
                            <Button variant="link" size="sm" className="h-auto p-0 shrink-0 text-xs" asChild>
                              <Link href={action.href}>{actionCtaLabel(action.kind)}</Link>
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2 pt-1">
                            {contextLines.map((line) => (
                              <p key={line} className="text-sm text-muted-foreground">
                                {line}
                              </p>
                            ))}
                            <Button size="sm" asChild>
                              <Link href={action.href}>{actionCtaLabel(action.kind)}</Link>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
