#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const REQUIRED_ASSETS = [
  "install.sh",
  "install.ps1",
  "checksums.txt",
  "release-manifest.json",
  "orange-macos-arm64",
  "orange-macos-x64",
  "orange-linux-x64",
  "orange-windows-x64.exe"
];

const REQUIRED_BINARIES = new Map([
  ["orange-macos-arm64", { platform: "macos", arch: "arm64" }],
  ["orange-macos-x64", { platform: "macos", arch: "x64" }],
  ["orange-linux-x64", { platform: "linux", arch: "x64" }],
  ["orange-windows-x64.exe", { platform: "windows", arch: "x64" }]
]);
const args = parseArgs(process.argv.slice(2));
const assetNames = readAssetNames(args);

const missing = REQUIRED_ASSETS.filter((name) => !assetNames.has(name));
if (missing.length) {
  throw new Error(`Missing required release assets: ${missing.join(", ")}`);
}

if (args.manifest) {
  checkManifest(path.resolve(args.manifest), {
    releaseUrl: args["release-url"],
    version: args.version
  });
}

console.log(`Release asset gate OK: ${REQUIRED_ASSETS.join(", ")}`);

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

function readAssetNames(parsed) {
  if (parsed.dir && parsed["asset-list"]) {
    throw new Error("Use only one of --dir or --asset-list.");
  }
  if (parsed.dir) {
    return new Set(fs.readdirSync(path.resolve(parsed.dir)));
  }
  if (parsed["asset-list"]) {
    const content = fs.readFileSync(path.resolve(parsed["asset-list"]), "utf8");
    return new Set(content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  }
  throw new Error("Either --dir or --asset-list is required.");
}

function checkManifest(manifestPath, { releaseUrl, version }) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (version && manifest.version !== version) {
    throw new Error(`release-manifest.json version must be ${version}, got ${manifest.version}`);
  }
  if (!Array.isArray(manifest.assets)) {
    throw new Error("release-manifest.json must contain an assets array.");
  }

  const manifestAssets = new Map();
  for (const asset of manifest.assets) {
    if (!asset || typeof asset.filename !== "string") {
      throw new Error("release-manifest.json asset entries must include filename.");
    }
    if (manifestAssets.has(asset.filename)) {
      throw new Error(`release-manifest.json contains duplicate asset entry: ${asset.filename}`);
    }
    manifestAssets.set(asset.filename, asset);
  }

  const missingBinaries = [...REQUIRED_BINARIES.keys()].filter((filename) => !manifestAssets.has(filename));
  if (missingBinaries.length) {
    throw new Error(`release-manifest.json is missing binaries: ${missingBinaries.join(", ")}`);
  }

  const unexpectedBinaries = [...manifestAssets.keys()].filter((filename) => filename.startsWith("orange-") && !REQUIRED_BINARIES.has(filename));
  if (unexpectedBinaries.length) {
    throw new Error(`release-manifest.json contains unexpected binary assets: ${unexpectedBinaries.join(", ")}`);
  }

  for (const [filename, expected] of REQUIRED_BINARIES) {
    const asset = manifestAssets.get(filename);
    if (version && asset.version !== version) {
      throw new Error(`release-manifest.json entry ${filename} version must be ${version}, got ${asset.version}`);
    }
    if (asset.platform !== expected.platform) {
      throw new Error(`release-manifest.json entry ${filename} platform must be ${expected.platform}, got ${asset.platform}`);
    }
    if (asset.arch !== expected.arch) {
      throw new Error(`release-manifest.json entry ${filename} arch must be ${expected.arch}, got ${asset.arch}`);
    }
    if (typeof asset.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(asset.sha256)) {
      throw new Error(`release-manifest.json entry ${filename} must include a sha256 hex digest.`);
    }
  }

  if (releaseUrl) {
    const normalizedReleaseUrl = releaseUrl.replace(/\/$/, "");
    for (const filename of REQUIRED_BINARIES.keys()) {
      const asset = manifestAssets.get(filename);
      const expectedUrl = `${normalizedReleaseUrl}/${filename}`;
      if (asset.download_url !== expectedUrl) {
        throw new Error(`release-manifest.json download_url for ${filename} must be ${expectedUrl}, got ${asset.download_url}`);
      }
    }
  }
}
