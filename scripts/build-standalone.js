#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import esbuild from "esbuild";

const root = process.cwd();
const outdir = path.join(root, "dist", "standalone");
const outfile = path.join(outdir, "orange.cjs");
const metafilePath = path.join(outdir, "orange.meta.json");

fs.mkdirSync(outdir, { recursive: true });

const result = await esbuild.build({
  entryPoints: [path.join(root, "bin", "orange.js")],
  outfile,
  bundle: true,
  platform: "node",
  format: "cjs",
  target: ["node24"],
  packages: "bundle",
  sourcemap: false,
  legalComments: "none",
  metafile: true,
  logLevel: "silent"
});

fs.chmodSync(outfile, 0o755);
fs.writeFileSync(metafilePath, `${JSON.stringify(result.metafile, null, 2)}\n`);

const externalPackages = Object.keys(result.metafile.inputs)
  .filter((input) => input.includes("node_modules/"))
  .sort();

if (externalPackages.length) {
  throw new Error(`Standalone bundle unexpectedly included package inputs: ${externalPackages.join(", ")}`);
}

console.log(`Built ${path.relative(root, outfile)}`);
