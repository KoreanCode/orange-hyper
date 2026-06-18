#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outdir = path.join(root, "dist", "standalone");
const bundle = path.join(outdir, "orange.cjs");
const args = parseArgs(process.argv.slice(2));
const currentPlatform = releasePlatform(process.platform);
const currentArch = process.arch;
const targetPlatform = args.platform || currentPlatform;
const targetArch = args.arch || currentArch;
const filename = binaryFilename(targetPlatform, targetArch);
const binaryPath = path.join(outdir, filename);
const blobPath = path.join(outdir, `orange-${targetPlatform}-${targetArch}.blob`);
const seaConfigPath = path.join(outdir, `sea-config-${targetPlatform}-${targetArch}.json`);

if (targetPlatform !== currentPlatform || targetArch !== currentArch) {
  throw new Error(`SEA builds must run on the target runner. Current=${currentPlatform}-${currentArch}; target=${targetPlatform}-${targetArch}.`);
}

if (!fs.existsSync(bundle)) {
  run(process.execPath, [path.join(root, "scripts", "build-standalone.js")]);
}

fs.mkdirSync(outdir, { recursive: true });
fs.rmSync(binaryPath, { force: true });
fs.rmSync(blobPath, { force: true });

fs.writeFileSync(
  seaConfigPath,
  `${JSON.stringify({
    main: bundle,
    output: blobPath,
    disableExperimentalSEAWarning: true,
    useSnapshot: false,
    useCodeCache: false
  }, null, 2)}\n`
);

run(process.execPath, ["--experimental-sea-config", seaConfigPath]);
fs.copyFileSync(process.execPath, binaryPath);

if (process.platform !== "win32") {
  fs.chmodSync(binaryPath, 0o755);
}

if (process.platform === "darwin") {
  run("codesign", ["--remove-signature", binaryPath]);
}

const postjectCli = require.resolve("postject/dist/cli.js");
const postjectArgs = [
  postjectCli,
  binaryPath,
  "NODE_SEA_BLOB",
  blobPath,
  "--sentinel-fuse",
  "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2"
];
if (process.platform === "darwin") {
  postjectArgs.push("--macho-segment-name", "NODE_SEA");
}
run(process.execPath, postjectArgs);

if (process.platform === "darwin") {
  run("codesign", ["--sign", "-", binaryPath]);
}

console.log(`Built ${path.relative(root, binaryPath)}`);

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      throw new Error(`Unexpected argument: ${value}`);
    }
    const key = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`--${key} requires a value.`);
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function releasePlatform(platform) {
  if (platform === "win32") {
    return "windows";
  }
  if (platform === "darwin") {
    return "macos";
  }
  if (platform === "linux") {
    return "linux";
  }
  throw new Error(`Unsupported SEA platform: ${platform}`);
}

function binaryFilename(platform, arch) {
  if (platform === "windows" && arch === "x64") {
    return "orange-windows-x64.exe";
  }
  if (platform === "macos" && arch === "arm64") {
    return "orange-macos-arm64";
  }
  if (platform === "macos" && arch === "x64") {
    return "orange-macos-x64";
  }
  if (platform === "linux" && arch === "x64") {
    return "orange-linux-x64";
  }
  throw new Error(`Unsupported SEA target: ${platform}-${arch}`);
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit"
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${commandArgs.join(" ")}`);
  }
}
