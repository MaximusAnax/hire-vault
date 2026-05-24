import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hirevault/types", "@hirevault/ai-core"],
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
