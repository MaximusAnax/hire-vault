import { readFile } from "node:fs/promises";

export interface AcceptanceCheck {
  id: string;
  status: "pass" | "fail" | "skip";
  evidence?: string;
  severity?: "blocker" | "major" | "minor";
}

export interface Finding {
  severity: "blocker" | "major" | "minor";
  summary: string;
  repro?: string;
  suggestedFix?: string;
}

export interface Verdict {
  verdict: "PASS" | "FAIL";
  milestone: string;
  iteration: number;
  gates: {
    typecheck: boolean;
    lint: boolean;
    test: boolean;
    build: boolean;
  };
  acceptanceChecks: AcceptanceCheck[];
  findings: Finding[];
  agentId?: string;
  runId?: string;
}

export function isCertifiedPass(v: Verdict): boolean {
  if (v.verdict !== "PASS") return false;
  const gatesOk = v.gates.typecheck && v.gates.lint && v.gates.test && v.gates.build;
  if (!gatesOk) return false;
  if (v.acceptanceChecks.some((c) => c.status === "fail")) return false;
  if (v.findings.some((f) => f.severity === "blocker" || f.severity === "major")) return false;
  return true;
}

export async function readVerdict(path: string): Promise<Verdict> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as Verdict;
}
