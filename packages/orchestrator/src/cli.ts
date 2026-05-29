#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runMilestoneLoop } from "./driver.js";

const repoRoot = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.."));

function parseArgs(argv: string[]): { milestone?: string } {
  const idx = argv.indexOf("--milestone");
  if (idx >= 0 && argv[idx + 1]) return { milestone: argv[idx + 1] };
  return {};
}

async function main() {
  const { milestone } = parseArgs(process.argv.slice(2));
  if (!milestone) {
    console.error("usage: pnpm --filter @hirevault/orchestrator loop -- --milestone m1");
    process.exit(1);
  }
  const verdict = await runMilestoneLoop(repoRoot, milestone);
  process.exit(verdict ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
