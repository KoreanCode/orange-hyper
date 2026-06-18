import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { JSON_CONTRACT_VERSION } from "../src/cli/index.js";
import { initWorkspace, ORANGE_GITIGNORE } from "../src/core/config.js";
import { acceptMemoryDelta, proposeMemoryDelta } from "../src/core/memory.js";
import { workspacePaths } from "../src/core/paths.js";
import { completeQuest, createQuest } from "../src/core/quest.js";

const ORANGE_BIN = new URL("../bin/orange.js", import.meta.url);
const README_FILES = ["README.md", "README.en.md", "README.zh-CN.md", "README.ja.md"];
const EXPECTED_README_VERSION = "1.1-doc.1";
const EXPECTED_PACKAGE_VERSION = "1.1.0-alpha.1";
const COMMAND_SURFACE = [
  "init",
  "quest",
  "route",
  "capsule",
  "remember",
  "graph",
  "hook",
  "mcp",
  "growth",
  "adapter",
  "eval",
  "doctor",
  "identity"
];

function tempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "orange-v1-boundary-test-"));
}

test("all supported JSON success commands keep contract_version 0.1", () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd, { projectName: "v1-json-contract" });

  const quest = assertJsonCommand(
    runOrange(["quest", "new", "v1 JSON contract audit", "--title", "v1 JSON contract audit", "--layer", "L2", "--verify", "npm test", "--json"], cwd),
    "quest.new"
  );
  const questId = quest.data.quest.id;

  assertJsonCommand(runOrange(["route", "--quest", questId, "--json"], cwd), "route.show");
  assertJsonCommand(runOrange(["capsule", "--quest", questId, "--json"], cwd), "capsule.build");
  assertJsonCommand(runOrange(["quest", "done", questId, "--evidence", "npm test passed", "--json"], cwd), "quest.done");

  const proposal = assertJsonCommand(runOrange(["remember", "propose", "--quest", questId, "--json"], cwd), "remember.propose");
  const proposalId = proposal.data.proposal.id;
  assertJsonCommand(runOrange(["remember", "list", "--json"], cwd), "remember.list");
  assertJsonCommand(runOrange(["remember", "show", proposalId, "--json"], cwd), "remember.show");
  assertJsonCommand(runOrange(["remember", "validate", proposalId, "--json"], cwd), "remember.validate");
  assertJsonCommand(
    runOrange([
      "remember",
      "revise",
      proposalId,
      "--candidate",
      "v1 JSON contract success envelopes stay at contract_version 0.1.",
      "--why",
      "The v1 stable release changes package metadata but not the adapter JSON envelope.",
      "--confidence",
      "high",
      "--json"
    ], cwd),
    "remember.revise"
  );
  const accepted = assertJsonCommand(runOrange(["remember", "accept", proposalId, "--json"], cwd), "remember.accept");
  const nodeId = accepted.data.node.id;

  const rejectedQuest = assertJsonCommand(
    runOrange(["quest", "new", "v1 rejected proposal audit", "--layer", "L2", "--verify", "npm test", "--json"], cwd),
    "quest.new"
  );
  const rejectedQuestId = rejectedQuest.data.quest.id;
  assertJsonCommand(runOrange(["quest", "done", rejectedQuestId, "--evidence", "npm test passed", "--json"], cwd), "quest.done");
  const rejectedProposal = assertJsonCommand(runOrange(["remember", "propose", "--quest", rejectedQuestId, "--json"], cwd), "remember.propose");
  assertJsonCommand(runOrange(["remember", "reject", rejectedProposal.data.proposal.id, "--json"], cwd), "remember.reject");

  const cases = [
    ["adapter.list", ["adapter", "list", "--json"]],
    ["adapter.show", ["adapter", "show", "project-status", "--json"]],
    ["adapter.dryRun", ["adapter", "dry-run", "project-status", "--json"]],
    ["eval.snapshot", ["eval", "snapshot", "--json"]],
    ["eval.report", ["eval", "report", "--json"]],
    ["eval.explain", ["eval", "explain", "--json"]],
    ["graph.list", ["graph", "list", "--json"]],
    ["graph.show", ["graph", "show", nodeId, "--json"]],
    ["graph.search", ["graph", "search", "contract_version", "--json"]],
    ["graph.rebuildIndex", ["graph", "rebuild-index", "--json"]],
    ["growth.status", ["growth", "status", "--json"]],
    ["growth.suggest", ["growth", "suggest", "--json"]],
    ["growth.explain", ["growth", "explain", "--json"]],
    ["hook.preview", ["hook", "preview", "--json"]],
    ["hook.status", ["hook", "status", "--json"]],
    ["hook.runSessionStart", ["hook", "run", "session-start", "--json"]],
    ["hook.runStop", ["hook", "run", "stop", "--json"]],
    ["identity.build", ["identity", "build", "--json"]],
    ["mcp.list", ["mcp", "list", "--json"]],
    ["mcp.show", ["mcp", "show", "context7", "--json"]],
    ["mcp.suggest", ["mcp", "suggest", "--query", "Spring Security 최신 문서 확인이 필요해", "--json"]],
    ["doctor.run", ["doctor", "--json"]]
  ];

  for (const [command, args] of cases) {
    assertJsonCommand(runOrange(args, cwd), command);
  }
});

test("JSON failure envelopes keep contract_version 0.1", () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd, { projectName: "v1-json-failure-contract" });

  const doctorFailureCwd = tempWorkspace();
  const brokenPaths = initWorkspace(doctorFailureCwd);
  fs.unlinkSync(brokenPaths.graphIndex);

  /** @type {{ command: string, result: import("node:child_process").SpawnSyncReturns<string> }[]} */
  const cases = [
    { command: "unknown.unknown", result: runOrange(["unknown", "--json"], cwd) },
    { command: "quest.done", result: runOrange(["quest", "done", "missing-quest", "--json"], cwd) },
    { command: "adapter.show", result: runOrange(["adapter", "show", "unknown-recipe", "--json"], cwd) },
    { command: "mcp.show", result: runOrange(["mcp", "show", "unknown-mcp", "--json"], cwd) },
    { command: "hook.run", result: runOrange(["hook", "run", "bad-event", "--json"], cwd) },
    { command: "eval.report", result: runOrange(["eval", "report", "--write-report=../evil.md", "--json"], cwd) },
    { command: "doctor.run", result: runOrange(["doctor", "--json"], doctorFailureCwd) }
  ];

  for (const { command, result } of cases) {
    assert.notEqual(result.status, 0, command);
    assert.equal(result.stderr, "", command);
    const payload = parseJsonOnly(result.stdout);
    assertJsonEnvelope(payload, false, command);
    assert.ok(payload.error);
    assert.equal(typeof payload.error.code, "string");
    assert.equal(typeof payload.error.message, "string");
    assert.equal(typeof payload.error.hint, "string");
  }
});

test("README and readiness command surface stay consistent with CLI help", () => {
  const help = runOrange(["--help"], process.cwd());
  assert.equal(help.status, 0);
  assert.deepEqual(sortUnique(parseHelpCommands(help.stdout)), sortUnique(COMMAND_SURFACE));

  for (const file of [...README_FILES, "docs/22_V1_STABILIZATION.md"]) {
    assert.deepEqual(commandSurfaceFromMarkdown(file), COMMAND_SURFACE, file);
  }
});

test("README version metadata stays synchronized at 1.1-doc.1", () => {
  for (const file of README_FILES) {
    const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    const match = source.match(/README version:\s*`([^`]+)`/);
    assert.ok(match, `${file} should expose README version metadata`);
    assert.equal(match[1], EXPECTED_README_VERSION, file);
  }
});

test("shared and local state policy remains explicit", () => {
  const readiness = fs.readFileSync(path.join(process.cwd(), "docs/22_V1_STABILIZATION.md"), "utf8");
  for (const sharedPath of [
    ".orange-hyper/config.json",
    ".orange-hyper/quests/completed/*.md",
    ".orange-hyper/proposals/memory-delta/accepted/*.md",
    ".orange-hyper/graph/**"
  ]) {
    assert.match(readiness, new RegExp(escapeRegExp(sharedPath)), sharedPath);
  }
  for (const ignored of ORANGE_GITIGNORE.split(/\n/).filter(Boolean)) {
    assert.match(readiness, new RegExp(escapeRegExp(`.orange-hyper/${ignored}`)), ignored);
  }
  assert.equal(ORANGE_GITIGNORE.includes("proposals/memory-delta/accepted/"), false);
});

test("read-only and advisory boundary commands do not mutate .orange-hyper", () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd, { projectName: "v1-read-only-boundary" });
  createAcceptedMemory(cwd);

  const before = snapshotOrangeFiles(cwd);
  const readOnlyCases = [
    ["doctor.run", ["doctor", "--json"]],
    ["graph.list", ["graph", "list", "--json"]],
    ["graph.search", ["graph", "search", "read-only", "--json"]],
    ["hook.preview", ["hook", "preview", "--json"]],
    ["hook.status", ["hook", "status", "--json"]],
    ["hook.runSessionStart", ["hook", "run", "session-start", "--json"]],
    ["hook.runStop", ["hook", "run", "stop", "--json"]],
    ["mcp.list", ["mcp", "list", "--json"]],
    ["mcp.show", ["mcp", "show", "context7", "--json"]],
    ["mcp.suggest", ["mcp", "suggest", "--query", "Need latest React API documentation before migration", "--json"]],
    ["growth.status", ["growth", "status", "--json"]],
    ["growth.suggest", ["growth", "suggest", "--json"]],
    ["growth.explain", ["growth", "explain", "--json"]],
    ["adapter.list", ["adapter", "list", "--json"]],
    ["adapter.show", ["adapter", "show", "project-status", "--json"]],
    ["adapter.dryRun", ["adapter", "dry-run", "project-status", "--json"]],
    ["eval.snapshot", ["eval", "snapshot", "--json"]],
    ["eval.report", ["eval", "report", "--json"]],
    ["eval.explain", ["eval", "explain", "--json"]]
  ];

  for (const [command, args] of readOnlyCases) {
    assertJsonCommand(runOrange(args, cwd), command);
  }

  assert.deepEqual(snapshotOrangeFiles(cwd), before);
});

test("npm package surface includes release files and excludes tests/local artifacts", () => {
  const cache = fs.mkdtempSync(path.join(os.tmpdir(), "orange-pack-cache-"));
  const result = spawnSync("npm", ["pack", "--dry-run", "--json", "--cache", cache], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  const [pack] = JSON.parse(result.stdout);
  assert.equal(pack.name, "orange-hyper");
  assert.equal(pack.version, EXPECTED_PACKAGE_VERSION);
  const files = pack.files.map((item) => item.path).sort();

  for (const required of [
    "bin/orange.js",
    "package.json",
    "README.md",
    "README.en.md",
    "README.zh-CN.md",
    "README.ja.md",
    "readme-hero.png",
    "assets/readme/core-flow.png",
    "assets/readme/memory-lifecycle.png",
    "RELEASE_NOTES.md",
    "LICENSE",
    "PROVENANCE.md",
    "SECURITY.md",
    "CITATION.cff",
    "scripts/check-readme-sync.js",
    "docs/22_V1_STABILIZATION.md"
  ]) {
    assert.ok(files.includes(required), `package should include ${required}`);
  }
  for (const requiredPrefix of ["src/", "docs/"]) {
    assert.ok(files.some((file) => file.startsWith(requiredPrefix)), `package should include ${requiredPrefix}`);
  }
  for (const forbiddenPrefix of ["tests/", ".orange-hyper/", "node_modules/", "coverage/", "tmp/"]) {
    assert.equal(files.some((file) => file.startsWith(forbiddenPrefix)), false, `package should exclude ${forbiddenPrefix}`);
  }
});

function createAcceptedMemory(cwd) {
  const quest = createQuest(cwd, "v1 read-only advisory boundary memory", {
    layer: "L2",
    expectedVerification: ["npm test"],
    clock: new Date("2026-06-18T00:00:00.000Z")
  });
  completeQuest(cwd, quest.id, {
    evidence: ["npm test passed"],
    clock: new Date("2026-06-18T00:01:00.000Z")
  });
  const proposal = proposeMemoryDelta(cwd, quest.id, {
    nodeType: "decision",
    clock: new Date("2026-06-18T00:02:00.000Z")
  });
  acceptMemoryDelta(cwd, proposal.data.id, {
    clock: new Date("2026-06-18T00:03:00.000Z")
  });
}

function commandSurfaceFromMarkdown(file) {
  const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
  const match = source.match(/<!-- orange-command-surface:start -->([\s\S]*?)<!-- orange-command-surface:end -->/);
  assert.ok(match, `${file} is missing command surface markers`);
  return match[1]
    .split(/\r?\n/)
    .map((line) => line.match(/-\s+`([^`]+)`/))
    .filter(Boolean)
    .map((match) => match[1]);
}

function parseHelpCommands(stdout) {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.match(/^  ([a-z][a-z-]*)\b/))
    .filter(Boolean)
    .map((match) => match[1]);
}

function snapshotOrangeFiles(cwd) {
  const root = workspacePaths(cwd).root;
  const entries = {};
  for (const filePath of filesUnder(root)) {
    const relative = path.relative(cwd, filePath).split(path.sep).join("/");
    entries[relative] = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  }
  return entries;
}

function filesUnder(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return filesUnder(filePath);
    }
    return entry.isFile() ? [filePath] : [];
  }).sort();
}

function assertJsonCommand(result, command) {
  assert.equal(result.status, 0, `${command}: ${result.stderr || result.stdout}`);
  assert.equal(result.stderr, "", command);
  const payload = parseJsonOnly(result.stdout);
  assertJsonEnvelope(payload, true, command);
  return payload;
}

function assertJsonEnvelope(payload, ok, command) {
  assert.equal(payload.ok, ok, command);
  assert.equal(payload.contract_version, JSON_CONTRACT_VERSION, command);
  assert.equal(payload.command, command);
  assert.match(payload.command, /^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)+$/);
}

function parseJsonOnly(raw) {
  assert.equal(raw.trimStart().startsWith("{"), true);
  assert.equal(raw.trimEnd().endsWith("}"), true);
  return JSON.parse(raw);
}

function runOrange(args, cwd) {
  return spawnSync(process.execPath, [ORANGE_BIN.pathname, ...args], {
    cwd,
    encoding: "utf8"
  });
}

function sortUnique(values) {
  return Array.from(new Set(values)).sort();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
