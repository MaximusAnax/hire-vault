import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

/** Absolute path to the HireVault repository root. */
export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

/** Load variables from `<repo>/.env` into `process.env` (no-op if file missing). */
export function loadRootEnv(): void {
  config({ path: path.join(repoRoot, ".env") });
}
