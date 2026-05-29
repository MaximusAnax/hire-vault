import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Agent, CursorAgentError } from "@cursor/sdk";
import { runQualityGates } from "./gates.js";
import { buildBuilderPrompt, buildTesterPrompt, loadMilestoneSpec, loadPrompt } from "./prompts.js";
import { isCertifiedPass, readVerdict, type Verdict } from "./verdict.js";

export interface OrchestrationConfig {
  runtime: "local" | "cloud";
  cwd: string;
  maxIterations: number;
  requireHumanApproval: boolean;
  models: { builder: string; tester: string };
}

export async function loadConfig(repoRoot: string): Promise<OrchestrationConfig> {
  const raw = await readFile(path.join(repoRoot, "orchestration", "config.json"), "utf8");
  return JSON.parse(raw) as OrchestrationConfig;
}

async function appendLog(repoRoot: string, entry: Record<string, unknown>) {
  const logPath = path.join(repoRoot, "orchestration", "log.jsonl");
  await appendFile(logPath, `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`);
}

export async function runMilestoneLoop(repoRoot: string, milestone: string): Promise<Verdict | null> {
  const config = await loadConfig(repoRoot);
  const absCwd = path.resolve(repoRoot, config.cwd);
  await mkdir(path.join(repoRoot, "orchestration", "verdicts"), { recursive: true });

  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("CURSOR_API_KEY is required to run the SDK loop. Set it in the environment.");
  }

  const builderBase = await loadPrompt(repoRoot, "builder");
  const testerBase = await loadPrompt(repoRoot, "tester");
  const milestoneSpec = await loadMilestoneSpec(repoRoot, milestone);

  let lastVerdictJson: string | null = null;

  for (let iteration = 1; iteration <= config.maxIterations; iteration++) {
    const builderPrompt = buildBuilderPrompt(builderBase, milestoneSpec, lastVerdictJson);

    let builderAgentId: string | undefined;
    try {
      await using builder = await Agent.create({
        apiKey,
        model: { id: config.models.builder },
        local: { cwd: absCwd },
      });
      builderAgentId = builder.agentId;
      const buildRun = await builder.send(builderPrompt);
      await buildRun.wait();
      await appendLog(repoRoot, {
        role: "builder",
        milestone,
        iteration,
        agentId: builder.agentId,
        runId: buildRun.id,
        status: buildRun.status,
      });
      if (buildRun.status === "error") {
        console.error("Builder run failed:", buildRun.result);
      }
    } catch (e) {
      if (e instanceof CursorAgentError) throw e;
      throw e;
    }

    const gates = await runQualityGates(repoRoot);
    const verdictPath = path.join(repoRoot, "orchestration", "verdicts", `${milestone}-iter${iteration}.json`);

    const testerPrompt = buildTesterPrompt(
      testerBase,
      milestoneSpec,
      `orchestration/verdicts/${milestone}-iter${iteration}.json`
    );

    try {
      await using tester = await Agent.create({
        apiKey,
        model: { id: config.models.tester },
        local: { cwd: absCwd },
      });
      const testRun = await tester.send(
        `${testerPrompt}\n\nQuality gates from driver (verify independently): ${JSON.stringify(gates)}`
      );
      await testRun.wait();
      await appendLog(repoRoot, {
        role: "tester",
        milestone,
        iteration,
        agentId: tester.agentId,
        runId: testRun.id,
        status: testRun.status,
      });
    } catch (e) {
      if (e instanceof CursorAgentError) throw e;
      throw e;
    }

    let verdict: Verdict;
    try {
      verdict = await readVerdict(verdictPath);
    } catch {
      verdict = {
        verdict: "FAIL",
        milestone,
        iteration,
        gates,
        acceptanceChecks: [{ id: "verdict-missing", status: "fail", severity: "blocker" }],
        findings: [
          {
            severity: "blocker",
            summary: `Tester did not write ${verdictPath}`,
            suggestedFix: "Ensure tester.md instructs writing verdict.json to the path above.",
          },
        ],
      };
      await writeFile(verdictPath, JSON.stringify(verdict, null, 2));
    }

    verdict.gates = gates;
    lastVerdictJson = JSON.stringify(verdict, null, 2);

    if (isCertifiedPass(verdict)) {
      if (config.requireHumanApproval) {
        console.info(
          `[orchestrator] ${milestone} certified PASS at iteration ${iteration}. Human approval required before advancing (requireHumanApproval=true).`
        );
      }
      return verdict;
    }

    console.info(`[orchestrator] ${milestone} FAIL iteration ${iteration}; resuming builder with findings.`);
  }

  console.error(`[orchestrator] ${milestone} exceeded maxIterations=${config.maxIterations}. Escalate to human.`);
  return null;
}
