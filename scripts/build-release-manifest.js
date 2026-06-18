#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
const root = process.cwd();
const assetsDir = path.resolve(args["assets-dir"] || path.join(root, "dist", "release"));
const version = args.version || readPackageVersion();
const releaseUrl = args["release-url"] || `https://github.com/KoreanCode/orange-hyper/releases/download/v${version}`;
const checksumsPath = path.join(assetsDir, "checksums.txt");
const manifestPath = path.join(assetsDir, "release-manifest.json");

const assets = fs.readdirSync(assetsDir)
  .filter((name) => /^orange-(windows|macos|linux)-(x64|arm64)(?:\.exe)?$/.test(name))
  .sort()
  .map((filename) => {
    const match = filename.match(/^orange-(windows|macos|linux)-(x64|arm64)(?:\.exe)?$/);
    const platform = match[1];
    const arch = match[2];
    const sha256 = hashFile(path.join(assetsDir, filename));
    return {
      version,
      platform,
      arch,
      filename,
      sha256,
      download_url: `${releaseUrl.replace(/\/$/, "")}/${filename}`,
      signed: false,
      experimental: platform === "macos" && arch === "x64"
    };
  });

if (!assets.length) {
  throw new Error(`No orange binary assets found in ${assetsDir}`);
}

const checksumLines = assets
  .map((asset) => `${asset.sha256}  ${asset.filename}`)
  .concat(["install.sh", "install.ps1"].filter((name) => fs.existsSync(path.join(assetsDir, name))).map((name) => `${hashFile(path.join(assetsDir, name))}  ${name}`))
  .sort();

fs.writeFileSync(checksumsPath, `${checksumLines.join("\n")}\n`);
fs.writeFileSync(manifestPath, `${JSON.stringify({ version, assets }, null, 2)}\n`);

console.log(`Wrote ${path.relative(root, checksumsPath)}`);
console.log(`Wrote ${path.relative(root, manifestPath)}`);

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

function readPackageVersion() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  return packageJson.version;
}

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
