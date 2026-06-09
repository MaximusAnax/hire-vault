"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { cancelIngestionRun, confirmIngestionRun } from "@/lib/ingestion/actions";
import {
  computePreviewTotals,
  formatPlanRow,
  isPlanEditable,
} from "@/lib/ingestion/plan-review";
import type { PreviewSummary, ProfileSection, ProfileSource, SectionUpsertPlan } from "@hirevault/types";
import { ImportPlanEditor, ImportPlanReadOnly } from "@/components/ingestion/import-plan-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  runId: string;
  preview: PreviewSummary;
  source: ProfileSource;
  onComplete?: (result: { inserted: number; merged: number; conflicts: number }) => void;
  onCancel?: () => void;
};

const ACTION_LABELS: Record<string, string> = {
  insert: "New",
  update: "Update",
  skip: "Unchanged",
  conflict: "Conflict",
};

function planSummaryLine(section: ProfileSection, plan: SectionUpsertPlan): string {
  const row =
    plan.action === "update"
      ? (plan.merged ?? plan.incoming)
      : plan.action === "skip"
        ? plan.existing
        : plan.incoming;
  const firstLine = formatPlanRow(section, row).split("\n")[0];
  return firstLine ?? plan.section;
}

function BucketBadge({ label, count, tone }: { label: string; count: number; tone: string }) {
  if (count === 0) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {count} {label}
    </span>
  );
}

export function ImportPreview({ runId, preview, source, onComplete, onCancel }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<SectionUpsertPlan[]>(() => [...preview.plans]);

  const totals = useMemo(() => computePreviewTotals(plans), [plans]);

  function updatePlan(index: number, next: SectionUpsertPlan) {
    setPlans((current) => current.map((plan, i) => (i === index ? next : plan)));
  }

  function removePlan(index: number) {
    setPlans((current) => current.filter((_, i) => i !== index));
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-base">Import preview</CardTitle>
        <CardDescription>
          Review, edit, or remove items from {source === "linkedin" ? "LinkedIn" : "resume upload"}{" "}
          before applying.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <BucketBadge label="new" count={totals.insert} tone="bg-green-500/15 text-green-700 dark:text-green-400" />
          <BucketBadge label="updates" count={totals.update} tone="bg-blue-500/15 text-blue-700 dark:text-blue-400" />
          <BucketBadge label="unchanged" count={totals.skip} tone="bg-muted text-muted-foreground" />
          <BucketBadge label="conflicts" count={totals.conflict} tone="bg-amber-500/15 text-amber-700 dark:text-amber-400" />
        </div>

        {preview.profileHeader && preview.profileHeader.changedFields.length > 0 && (
          <div className="rounded-md border border-border p-3 text-sm">
            <p className="font-medium mb-1">Profile header</p>
            <p className="text-muted-foreground">
              {preview.profileHeader.changedFields.join(", ")} will be updated.
            </p>
          </div>
        )}

        {plans.length > 0 && (
          <div className="space-y-2">
            {plans.map((plan, index) => {
              const editable = isPlanEditable(plan);
              return (
                <details
                  key={`${plan.section}-${plan.action}-${index}`}
                  className="rounded-md border border-border"
                  open={editable}
                >
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
                    <ChevronDown className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate capitalize">
                      {plan.section} · {ACTION_LABELS[plan.action] ?? plan.action} ·{" "}
                      {planSummaryLine(plan.section, plan)}
                    </span>
                    {editable && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        title="Remove from import"
                        disabled={pending}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removePlan(index);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </summary>
                  <div className="border-t border-border p-3 space-y-3">
                    {plan.action === "conflict" || plan.action === "update" ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Existing</p>
                          <div className="rounded-md bg-muted/30 p-2">
                            <ImportPlanReadOnly section={plan.section} row={plan.existing} />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            {editable ? "Incoming (editable)" : "Incoming"}
                          </p>
                          {editable ? (
                            <ImportPlanEditor
                              plan={plan}
                              onChange={(next) => updatePlan(index, next)}
                            />
                          ) : (
                            <div className="rounded-md bg-muted/30 p-2">
                              <ImportPlanReadOnly section={plan.section} row={plan.incoming} />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : editable ? (
                      <ImportPlanEditor plan={plan} onChange={(next) => updatePlan(index, next)} />
                    ) : (
                      <div className="rounded-md bg-muted/30 p-2">
                        <ImportPlanReadOnly section={plan.section} row={plan.incoming} />
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}

        {plans.length === 0 && !preview.profileHeader && (
          <p className="text-sm text-muted-foreground">No section changes detected.</p>
        )}

        {plans.length === 0 && preview.profileHeader && (
          <p className="text-sm text-muted-foreground">
            All section items were removed. Applying will update only the profile header.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await confirmIngestionRun(runId, { reviewedPlans: plans });
                if ("error" in result && result.error) {
                  setError(result.error);
                  return;
                }
                if ("success" in result && result.success) {
                  onComplete?.({
                    inserted: result.inserted,
                    merged: result.merged,
                    conflicts: result.conflicts,
                  });
                }
              });
            }}
          >
            {pending ? "Applying…" : "Apply import"}
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await cancelIngestionRun(runId);
                if ("error" in result && result.error) {
                  setError(result.error);
                  return;
                }
                onCancel?.();
              });
            }}
          >
            Cancel
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
