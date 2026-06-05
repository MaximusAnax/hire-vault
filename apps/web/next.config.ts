import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import type { NextConfig } from "next";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
loadDotenv({ path: path.join(repoRoot, ".env") });

const nextConfig: NextConfig = {
  transpilePackages: ["@hirevault/types", "@hirevault/ai-core"],
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
