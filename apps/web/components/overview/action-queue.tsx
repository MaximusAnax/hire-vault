"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { OverviewAction, OverviewActionGroup, OverviewQueueItem } from "@hirevault/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { groupSupportsInlineExpand } from "@/lib/overview/aggregate-overview-actions";
import {
  actionCtaLabel,
  actionSeverity,
  SEVERITY_LABELS,
  SEVERITY_STYLES,
  type ActionSeverity,
} from "./action-severity";

function globalActionKey(action: OverviewAction, index: number): string {
  const appId = action.metadata?.applicationId as string | undefined;
  return `global-${action.kind}-${action.href}-${appId ?? index}`;
}

function groupKey(group: OverviewActionGroup): string {
  return `group-${group.kind}-${group.count}`;
}

function groupSeverity(group: OverviewActionGroup): ActionSeverity {
  let severity: ActionSeverity = "optional";
  for (const item of group.items) {
    const itemSeverity = actionSeverity(item);
    if (itemSeverity === "blocking") return "blocking";
    if (itemSeverity === "soon") severity = "soon";
  }
  return severity;
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

function SeverityBadge({ severity }: { severity: ActionSeverity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide shrink-0",
        SEVERITY_STYLES[severity]
      )}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

function GlobalActionRow({
  action,
  index,
  expandedKey,
  onToggle,
}: {
  action: OverviewAction;
  index: number;
  expandedKey: string | null;
  onToggle: (key: string | null) => void;
}) {
  const key = globalActionKey(action, index);
  const expanded = expandedKey === key;
  const severity = actionSeverity(action);
  const contextLines = expandedContext(action);
  const canExpand = contextLines.length > 1 || action.kind === "keyword_gaps";

  return (
    <li>
      <div className={cn("rounded-md px-2 py-3 transition-colors", expanded && "bg-muted/20")}>
        <div className="flex items-start gap-3">
          {canExpand ? (
            <button
              type="button"
              className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
              aria-expanded={expanded}
              onClick={() => onToggle(expanded ? null : key)}
            >
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
              />
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={severity} />
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
}

function GroupActionRow({
  group,
  expandedKey,
  onToggle,
}: {
  group: OverviewActionGroup;
  expandedKey: string | null;
  onToggle: (key: string | null) => void;
}) {
  const key = groupKey(group);
  const expanded = expandedKey === key;
  const severity = groupSeverity(group);
  const inline = groupSupportsInlineExpand(group);
  const previewItems = inline ? group.items : group.items.slice(0, 3);

  return (
    <li>
      <div className={cn("rounded-md px-2 py-3 transition-colors", expanded && "bg-muted/20")}>
        <div className="flex items-start gap-3">
          {inline ? (
            <button
              type="button"
              className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
              aria-expanded={expanded}
              onClick={() => onToggle(expanded ? null : key)}
            >
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
              />
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={severity} />
              <p className="text-sm font-medium">{group.title}</p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground truncate">{group.subtitle}</p>
              {inline ? (
                !expanded ? (
                  <button
                    type="button"
                    className="shrink-0 text-xs text-primary hover:underline"
                    onClick={() => onToggle(key)}
                  >
                    Expand
                  </button>
                ) : null
              ) : (
                <Button variant="link" size="sm" className="h-auto p-0 shrink-0 text-xs" asChild>
                  <Link href={group.href}>
                    View {group.count} role{group.count === 1 ? "" : "s"} →
                  </Link>
                </Button>
              )}
            </div>

            {expanded && inline ? (
              <ul className="mt-2 space-y-1 border-t border-border pt-2">
                {previewItems.map((item, index) => (
                  <li
                    key={globalActionKey(item, index)}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-muted-foreground truncate">{item.subtitle}</span>
                    <Button variant="link" size="sm" className="h-auto p-0 shrink-0 text-xs" asChild>
                      <Link href={item.href}>{actionCtaLabel(item.kind)}</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}

            {!inline && !expanded ? (
              <ul className="mt-1 space-y-0.5">
                {previewItems.map((item, index) => (
                  <li key={globalActionKey(item, index)} className="text-xs text-muted-foreground truncate">
                    {item.subtitle}
                  </li>
                ))}
                {group.count > 3 ? (
                  <li className="text-xs text-muted-foreground">
                    +{group.count - 3} more —{" "}
                    <Link href={group.href} className="text-primary hover:underline">
                      view all
                    </Link>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

export function ActionQueue({ queue }: { queue: OverviewQueueItem[] }) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">What to do next</CardTitle>
      </CardHeader>
      <CardContent>
        {queue.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You&apos;re caught up —{" "}
            <Link href="/applications" className="text-primary hover:underline">
              capture a new role
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-border -mx-1">
            {queue.map((item, index) =>
              item.type === "global" ? (
                <GlobalActionRow
                  key={globalActionKey(item.action, index)}
                  action={item.action}
                  index={index}
                  expandedKey={expandedKey}
                  onToggle={setExpandedKey}
                />
              ) : (
                <GroupActionRow
                  key={groupKey(item.group)}
                  group={item.group}
                  expandedKey={expandedKey}
                  onToggle={setExpandedKey}
                />
              )
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
