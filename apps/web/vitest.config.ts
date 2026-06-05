import { config as loadDotenv } from "dotenv";
import { defineConfig } from "vitest/config";
import { resolve } from "path";

loadDotenv({ path: resolve(__dirname, "../../.env") });

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
