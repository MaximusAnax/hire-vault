import type { OverviewAction, OverviewActionKind } from "@hirevault/types";

export type ActionSeverity = "blocking" | "soon" | "optional";

const BLOCKING_KINDS = new Set<OverviewActionKind>(["profile_blocker", "import_conflicts"]);
const SOON_KINDS = new Set<OverviewActionKind>([
  "tailor_resume",
  "keyword_gaps",
  "generate_questions",
  "practice_interview",
  "apply_saved",
  "capture_review",
]);

export function actionSeverity(action: OverviewAction): ActionSeverity {
  if (BLOCKING_KINDS.has(action.kind)) return "blocking";
  if (SOON_KINDS.has(action.kind)) return "soon";
  return "optional";
}

export const SEVERITY_LABELS: Record<ActionSeverity, string> = {
  blocking: "Blocking",
  soon: "Soon",
  optional: "Optional",
};

export const SEVERITY_STYLES: Record<ActionSeverity, string> = {
  blocking: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  soon: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
  optional: "bg-muted text-muted-foreground border-border",
};

export function actionCtaLabel(kind: OverviewActionKind): string {
  switch (kind) {
    case "tailor_resume":
      return "Open builder";
    case "keyword_gaps":
      return "Fix gaps";
    case "export_pdf":
      return "Export PDF";
    case "generate_questions":
      return "Generate";
    case "practice_interview":
      return "Practice";
    case "profile_blocker":
      return "Fix profile";
    case "import_conflicts":
      return "Review";
    case "apply_saved":
      return "Mark applied";
    case "skill_nudge":
      return "Add skill";
    case "capture_review":
      return "Review";
    default:
      return "Open";
  }
}
