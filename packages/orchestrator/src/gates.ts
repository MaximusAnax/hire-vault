import { spawn } from "node:child_process";
import path from "node:path";

export interface GateResults {
  typecheck: boolean;
  lint: boolean;
  test: boolean;
  build: boolean;
}

function run(cmd: string, args: string[], cwd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit", shell: false });
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

export async function runQualityGates(repoRoot: string): Promise<GateResults> {
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const cwd = path.resolve(repoRoot);
  const typecheck = await run(pnpm, ["typecheck"], cwd);
  const lint = typecheck ? await run(pnpm, ["lint"], cwd) : false;
  const test = lint ? await run(pnpm, ["test"], cwd) : false;
  const build = test ? await run(pnpm, ["build"], cwd) : false;
  return { typecheck, lint, test, build };
}
