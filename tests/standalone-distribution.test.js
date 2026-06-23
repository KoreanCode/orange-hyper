import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const ORANGE_BIN = new URL("../bin/orange.js", import.meta.url);
const BUNDLE = path.join(ROOT, "dist", "standalone", "orange.cjs");
const VERSION = "1.1.0-beta.2";

test("standalone CommonJS bundle preserves JSON contracts in a fresh non-Node project", () => {
  buildStandaloneBundle();
  const cwd = nonNodeProject();

  assert.equal(runBundle(["--version"], cwd).stdout.trim(), VERSION);
  assert.equal(runBundle(["--help"], cwd).status, 0);

  const env = assertJsonCommand(runBundle(["env", "--json"], cwd), "environment.show");
  assert.equal(env.data.version, VERSION);
  assert.match(env.data.distribution, /^(source|npm)$/);
  assert.equal(env.data.node_runtime_embedded, false);
  assert.equal(env.data.project_initialized, false);
  assertJsonCommand(runBundle(["binding", "status", "--host", "codex", "--json"], cwd), "binding.status");

  const commands = [
    ["binding", "status", "--host", "codex", "--json"],
    ["init", "--json"],
    ["sync", "plan", "--json"],
    ["sync", "apply", "--json"],
    ["sync", "status", "--json"],
    ["identity", "build", "--json"],
    ["doctor", "--json"]
  ];

  for (const args of commands) {
    assert.equal(runCli(args, cwd).status, 0, `npm CLI should run ${args.join(" ")}`);
    assert.equal(runBundle(args, cwd).status, 0, `bundle should run ${args.join(" ")}`);
  }

  assertJsonCommand(runBundle(["init", "--json"], cwd), "project.init");
  assertJsonCommand(runBundle(["sync", "status", "--json"], cwd), "sync.status");
  assertNoNodeProjectFiles(cwd);
});

test("release manifest records platform assets and checksums", () => {
  const assetsDir = fs.mkdtempSync(path.join(os.tmpdir(), "orange-release-assets-"));
  fs.writeFileSync(path.join(assetsDir, "orange-linux-x64"), "linux");
  fs.writeFileSync(path.join(assetsDir, "orange-macos-arm64"), "macos-arm");
  fs.writeFileSync(path.join(assetsDir, "orange-macos-x64"), "macos-x64");
  fs.writeFileSync(path.join(assetsDir, "orange-windows-x64.exe"), "windows");
  fs.writeFileSync(path.join(assetsDir, "install.sh"), "installer");
  fs.writeFileSync(path.join(assetsDir, "install.ps1"), "installer");

  const result = spawnSync(process.execPath, [
    path.join(ROOT, "scripts", "build-release-manifest.js"),
    "--assets-dir",
    assetsDir,
    "--version",
    VERSION,
    "--release-url",
    "https://example.test/releases/v1.1.0-beta.2"
  ], {
    cwd: ROOT,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const manifest = JSON.parse(fs.readFileSync(path.join(assetsDir, "release-manifest.json"), "utf8"));
  assert.equal(manifest.version, VERSION);
  assert.equal(manifest.assets.length, 4);
  for (const asset of manifest.assets) {
    assert.equal(asset.version, VERSION);
    assert.match(asset.platform, /^(linux|macos|windows)$/);
    assert.match(asset.arch, /^(x64|arm64)$/);
    assert.match(asset.filename, /^orange-/);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
    assert.match(asset.download_url, new RegExp(`^https://example\\.test/releases/${escapeRegExp(`v${VERSION}`)}/orange-`));
    assert.equal(typeof asset.signed, "boolean");
    assert.equal(typeof asset.experimental, "boolean");
  }
  assert.equal(manifest.assets.find((asset) => asset.filename === "orange-macos-x64").experimental, true);
  assert.match(fs.readFileSync(path.join(assetsDir, "checksums.txt"), "utf8"), /orange-linux-x64/);
});

test("release asset gate requires installers, metadata, and all supported binaries", () => {
  const assetsDir = fs.mkdtempSync(path.join(os.tmpdir(), "orange-release-gate-"));
  const manifestPath = path.join(assetsDir, "release-manifest.json");
  for (const filename of [
    "orange-linux-x64",
    "orange-macos-arm64",
    "orange-macos-x64",
    "orange-windows-x64.exe",
    "install.sh",
    "install.ps1",
    "checksums.txt"
  ]) {
    fs.writeFileSync(path.join(assetsDir, filename), filename);
  }

  /**
   * @param {(manifest: { version: string, assets: Array<{ version: string, platform: string, arch: string, filename: string, sha256: string, download_url: string, signed: boolean, experimental: boolean }> }) => void} [mutate]
   */
  const writeManifest = (mutate) => {
    const manifest = {
      version: VERSION,
      assets: [
        "orange-linux-x64",
        "orange-macos-arm64",
        "orange-macos-x64",
        "orange-windows-x64.exe"
      ].map((filename) => ({
        version: VERSION,
        platform: filename.includes("windows") ? "windows" : filename.includes("linux") ? "linux" : "macos",
        arch: filename.includes("arm64") ? "arm64" : "x64",
        filename,
        sha256: "0".repeat(64),
        download_url: `https://example.test/releases/v1.1.0-beta.2/${filename}`,
        signed: false,
        experimental: filename === "orange-macos-x64"
      }))
    };
    if (mutate) {
      mutate(manifest);
    }
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);
  };

  writeManifest();

  const ok = spawnSync(process.execPath, [
    path.join(ROOT, "scripts", "check-release-assets.js"),
    "--dir",
    assetsDir,
    "--manifest",
    manifestPath,
    "--release-url",
    "https://example.test/releases/v1.1.0-beta.2",
    "--version",
    VERSION
  ], {
    cwd: ROOT,
    encoding: "utf8"
  });
  assert.equal(ok.status, 0, ok.stderr || ok.stdout);

  writeManifest((manifest) => {
    manifest.version = "1.1.0-alpha.7";
  });
  const wrongVersion = spawnSync(process.execPath, [
    path.join(ROOT, "scripts", "check-release-assets.js"),
    "--dir",
    assetsDir,
    "--manifest",
    manifestPath,
    "--version",
    VERSION
  ], {
    cwd: ROOT,
    encoding: "utf8"
  });
  assert.notEqual(wrongVersion.status, 0);
  assert.match(wrongVersion.stderr, new RegExp(`release-manifest\\.json version must be ${escapeRegExp(VERSION)}`));

  writeManifest((manifest) => {
    manifest.assets[0].sha256 = "";
  });
  const missingSha = spawnSync(process.execPath, [
    path.join(ROOT, "scripts", "check-release-assets.js"),
    "--dir",
    assetsDir,
    "--manifest",
    manifestPath,
    "--version",
    VERSION
  ], {
    cwd: ROOT,
    encoding: "utf8"
  });
  assert.notEqual(missingSha.status, 0);
  assert.match(missingSha.stderr, /must include a sha256 hex digest/);

  writeManifest();
  fs.rmSync(path.join(assetsDir, "install.ps1"));
  const missing = spawnSync(process.execPath, [
    path.join(ROOT, "scripts", "check-release-assets.js"),
    "--dir",
    assetsDir
  ], {
    cwd: ROOT,
    encoding: "utf8"
  });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /Missing required release assets: install\.ps1/);
});

test("install.sh verifies checksums and is idempotent", { skip: process.platform === "win32" || !currentReleaseFilename() }, () => {
  const filename = currentReleaseFilename();
  const assetsDir = fs.mkdtempSync(path.join(os.tmpdir(), "orange-install-assets-"));
  const installDir = fs.mkdtempSync(path.join(os.tmpdir(), "orange-install-target-"));
  const binary = path.join(assetsDir, filename);
  fs.writeFileSync(binary, "fake orange binary\n");
  const checksum = sha256(binary);
  fs.writeFileSync(path.join(assetsDir, "checksums.txt"), `${checksum}  ${filename}\n`);

  for (let index = 0; index < 2; index += 1) {
    const result = spawnSync("sh", [path.join(ROOT, "install.sh")], {
      cwd: fs.mkdtempSync(path.join(os.tmpdir(), "orange-install-cwd-")),
      env: {
        ...process.env,
        ORANGE_HYPER_BASE_URL: `file://${assetsDir}`,
        ORANGE_HYPER_INSTALL_DIR: installDir
      },
      encoding: "utf8"
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(fs.readFileSync(path.join(installDir, "orange"), "utf8"), "fake orange binary\n");
  }
});

test("install.sh blocks checksum mismatch before installing", { skip: process.platform === "win32" || !currentReleaseFilename() }, () => {
  const filename = currentReleaseFilename();
  const assetsDir = fs.mkdtempSync(path.join(os.tmpdir(), "orange-install-bad-assets-"));
  const installDir = fs.mkdtempSync(path.join(os.tmpdir(), "orange-install-bad-target-"));
  fs.writeFileSync(path.join(assetsDir, filename), "tampered\n");
  fs.writeFileSync(path.join(assetsDir, "checksums.txt"), `${"0".repeat(64)}  ${filename}\n`);

  const result = spawnSync("sh", [path.join(ROOT, "install.sh")], {
    cwd: fs.mkdtempSync(path.join(os.tmpdir(), "orange-install-bad-cwd-")),
    env: {
      ...process.env,
      ORANGE_HYPER_BASE_URL: `file://${assetsDir}`,
      ORANGE_HYPER_INSTALL_DIR: installDir
    },
    encoding: "utf8"
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Checksum mismatch/);
  assert.equal(fs.existsSync(path.join(installDir, "orange")), false);
});

function buildStandaloneBundle() {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "build-standalone.js")], {
    cwd: ROOT,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(fs.existsSync(BUNDLE), true);
}

function nonNodeProject() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "orange-standalone-non-node-"));
  fs.mkdirSync(path.join(cwd, "src"), { recursive: true });
  fs.writeFileSync(path.join(cwd, "src", "service.py"), "def service():\n    return True\n");
  fs.writeFileSync(path.join(cwd, "README.md"), "# Non-Node fixture\n");
  return cwd;
}

function assertNoNodeProjectFiles(cwd) {
  assert.equal(fs.existsSync(path.join(cwd, ".orange-hyper")), true);
  for (const name of ["package.json", "package-lock.json", "node_modules"]) {
    assert.equal(fs.existsSync(path.join(cwd, name)), false, `${name} should not be created`);
  }
}

function runCli(args, cwd) {
  return spawnSync(process.execPath, [ORANGE_BIN.pathname, ...args], {
    cwd,
    encoding: "utf8"
  });
}

function runBundle(args, cwd) {
  return spawnSync(process.execPath, [BUNDLE, ...args], {
    cwd,
    encoding: "utf8"
  });
}

function assertJsonCommand(result, command) {
  assert.equal(result.status, 0, `${command}: ${result.stderr || result.stdout}`);
  assert.equal(result.stderr, "", command);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true, command);
  assert.equal(payload.contract_version, "0.1", command);
  assert.equal(payload.command, command);
  return payload;
}

function currentReleaseFilename() {
  if (process.platform === "darwin" && process.arch === "arm64") {
    return "orange-macos-arm64";
  }
  if (process.platform === "darwin" && process.arch === "x64") {
    return "orange-macos-x64";
  }
  if (process.platform === "linux" && process.arch === "x64") {
    return "orange-linux-x64";
  }
  return null;
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
