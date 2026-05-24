import * as esbuild from "esbuild";
import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

mkdirSync(join(dist, "content"), { recursive: true });
mkdirSync(join(dist, "background"), { recursive: true });
mkdirSync(join(dist, "popup"), { recursive: true });

const shared = { bundle: true, format: "iife", target: "chrome120", logLevel: "info" };

await esbuild.build({
  ...shared,
  entryPoints: [join(root, "src/content/job-detector.ts")],
  outfile: join(dist, "content/job-detector.js"),
});

await esbuild.build({
  ...shared,
  entryPoints: [join(root, "src/background/service-worker.ts")],
  outfile: join(dist, "background/service-worker.js"),
  format: "esm",
});

await esbuild.build({
  ...shared,
  entryPoints: [join(root, "popup/popup.ts")],
  outfile: join(dist, "popup/popup.js"),
});

const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
manifest.background.service_worker = "background/service-worker.js";
manifest.content_scripts[0].js = ["content/job-detector.js"];
manifest.action.default_popup = "popup/index.html";
writeFileSync(join(dist, "manifest.json"), JSON.stringify(manifest, null, 2));
copyFileSync(join(root, "popup/index.html"), join(dist, "popup/index.html"));

console.log("Extension built → dist/");
