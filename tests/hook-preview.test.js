import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { JSON_CONTRACT_VERSION, main } from "../src/cli/index.js";
import { generateCapsule } from "../src/core/capsule.js";
import { initWorkspace, readConfig } from "../src/core/config.js";
import { stringifyFrontmatter } from "../src/core/frontmatter.js";
import { buildIdentityPlaceholder } from "../src/core/identity.js";
import { acceptMemoryDelta, proposeMemoryDelta } from "../src/core/memory.js";
import { workspacePaths } from "../src/core/paths.js";
import { completeQuest, createQuest } from "../src/core/quest.js";

const ORANGE_BIN = new URL("../bin/orange.js", import.meta.url);

function tempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "orange-hook-test-"));
}

test("hook preview supports human and JSON output", async () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd, { projectName: "hook-preview-demo" });
  const config = readConfig(cwd);

  const { output, io } = captureIo();
  await main(["hook", "preview"], { cwd, io });
  const human = output.join("");
  assert.match(human, /Orange hook preview/);
  assert.match(human, /Read-only: yes/);
  assert.match(human, /Auto mutation: no/);
  assert.match(human, /doctor quick check/);
  assert.match(human, /capsule freshness check/);
  assert.match(human, /identity summary check/);
  assert.match(human, /graph\/index check/);

  const payload = assertJsonCommand(runOrange(["hook", "preview", "--json"], cwd), "hook.preview");
  assert.equal(payload.data.previewAvailable, true);
  assert.equal(payload.data.installed, false);
  assert.equal(payload.data.readOnly, true);
  assert.equal(payload.data.autoMutation, false);
  assert.equal(payload.data.project.project_id, config.project_id);
  assert.deepEqual(
    payload.data.checks.map((check) => check.id),
    ["project_id", "doctor.quick", "capsule.freshness", "identity.summary", "graph.index"]
  );
  assert.equal(payload.data.localReport.written, false);
  assert.equal(fs.existsSync(paths.hookReports), false);
});

test("hook status supports human and JSON output", async () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);

  const { output, io } = captureIo();
  await main(["hook", "status"], { cwd, io });
  const human = output.join("");
  assert.match(human, /Orange hook status/);
  assert.match(human, /Preview available: yes/);
  assert.match(human, /Installed: no/);
  assert.match(human, /Supported events: session-start, stop/);
  assert.match(human, /Unsupported future events: .*post-tool-use/);

  const payload = assertJsonCommand(runOrange(["hook", "status", "--json"], cwd), "hook.status");
  assert.equal(payload.data.previewAvailable, true);
  assert.equal(payload.data.installed, false);
  assert.equal(payload.data.readOnly, true);
  assert.equal(payload.data.autoMutation, false);
  assert.deepEqual(payload.data.supportedEvents, ["session-start", "stop"]);
  assert.ok(payload.data.unsupportedEvents.includes("user-prompt-submit"));
  assert.ok(payload.data.unsupportedEvents.includes("post-tool-use"));
});

test("hook run session-start observes current state without mutation", () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);

  const payload = assertJsonCommand(runOrange(["hook", "run", "session-start", "--json"], cwd), "hook.runSessionStart");
  assert.equal(payload.data.event, "session-start");
  assert.equal(payload.data.readOnly, true);
  assert.equal(payload.data.autoMutation, false);
  assert.equal(payload.data.observations.orangeRootExists, true);
  assert.equal(payload.data.observations.configExists, true);
  assert.equal(payload.data.observations.projectIdExists, true);
  assert.equal(payload.data.observations.projectBoundaryActive, true);
  assert.equal(payload.data.observations.acceptedMemoryNodeCount, 0);
  assert.equal(payload.data.observations.doctorQuickStatus.ok, true);
});

test("hook run stop observes end-state warnings and pending proposal count", () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const quest = createQuest(cwd, "remember hook stop pending proposal", {
    layer: "L2",
    clock: new Date("2026-06-17T00:00:00.000Z")
  });
  completeQuest(cwd, quest.id, {
    clock: new Date("2026-06-17T00:01:00.000Z"),
    evidence: ["npm test passed"]
  });
  proposeMemoryDelta(cwd, quest.id, {
    clock: new Date("2026-06-17T00:02:00.000Z")
  });

  const payload = assertJsonCommand(runOrange(["hook", "run", "stop", "--json"], cwd), "hook.runStop");
  assert.equal(payload.data.event, "stop");
  assert.equal(payload.data.readOnly, true);
  assert.equal(payload.data.autoMutation, false);
  assert.equal(payload.data.observations.doctorQuickStatus.ok, true);
  assert.equal(payload.data.observations.pendingMemoryProposalCount, 1);
  assert.ok(payload.data.warnings.some((item) => item.code === "HOOK_PENDING_PROPOSALS"));
  assert.deepEqual(payload.data.observations.completedQuestVerificationAnomalies, []);
  assert.equal(payload.data.observations.projectBoundaryActive, true);
  assertHookWarnings(payload.data.warnings);
});

test("hook commands do not modify project memory without --write-report", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd);
  const proposal = createMemoryProposal(cwd, "remember hook read-only smoke");
  acceptMemoryDelta(cwd, proposal.data.id);
  const before = snapshotOrangeMemory(cwd);

  assertJsonCommand(runOrange(["hook", "preview", "--json"], cwd), "hook.preview");
  assertJsonCommand(runOrange(["hook", "status", "--json"], cwd), "hook.status");
  assertJsonCommand(runOrange(["hook", "run", "session-start", "--json"], cwd), "hook.runSessionStart");
  assertJsonCommand(runOrange(["hook", "run", "stop", "--json"], cwd), "hook.runStop");

  assert.deepEqual(snapshotOrangeMemory(cwd), before);
  assert.equal(fs.existsSync(paths.hookReports), false);
});

test("hook run returns warning and hint for missing project_id without repair", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd);
  const config = readConfig(cwd);
  delete config.project_id;
  delete config.project.id;
  fs.writeFileSync(paths.config, `${JSON.stringify(config, null, 2)}\n`);

  const payload = assertJsonCommand(runOrange(["hook", "run", "session-start", "--json"], cwd), "hook.runSessionStart");
  assert.equal(payload.ok, true);
  assert.equal(payload.data.observations.projectIdExists, false);
  assert.equal(payload.data.observations.projectBoundaryActive, false);
  assert.ok(payload.data.warnings.some((item) => item.code === "HOOK_PROJECT_ID_MISSING"));
  assert.ok(payload.data.hints.some((hint) => /repair-project-id/.test(hint)));
  assertHookWarnings(payload.data.warnings);

  const after = JSON.parse(fs.readFileSync(paths.config, "utf8"));
  assert.equal(after.project_id, undefined);
  assert.equal(after.project.id, undefined);
});

test("hook run does not execute doctor repair for legacy quest identity", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd);
  const quest = createQuest(cwd, "legacy quest remains unrepaired by hook", {
    clock: new Date("2026-06-17T00:00:00.000Z")
  });
  const source = fs.readFileSync(quest.filePath, "utf8");
  const legacy = {
    ...quest.data
  };
  delete legacy.project_id;
  delete legacy.project_name;
  fs.writeFileSync(quest.filePath, stringifyFrontmatter(legacy, quest.body));
  const legacySource = fs.readFileSync(quest.filePath, "utf8");

  const payload = assertJsonCommand(runOrange(["hook", "run", "session-start", "--json"], cwd), "hook.runSessionStart");
  assert.equal(payload.data.observations.doctorQuickStatus.repairCount, 0);
  assert.match(payload.data.warnings.map((item) => item.message).join("\n"), /missing project_id/);
  assertHookWarnings(payload.data.warnings);
  assert.notEqual(legacySource, source);
  assert.equal(fs.readFileSync(quest.filePath, "utf8"), legacySource);
  assert.equal(legacySource.includes("project_id:"), false);
  assert.equal(fs.existsSync(paths.hookReports), false);
});

test("hook run warns when capsule and identity summaries are stale", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd);
  const quest = createQuest(cwd, "make hook freshness explicit", {
    layer: "L2",
    clock: new Date("2026-06-17T00:00:00.000Z")
  });
  generateCapsule(cwd, quest.id, {
    clock: new Date("2026-06-17T00:01:00.000Z")
  });
  buildIdentityPlaceholder(cwd, {
    clock: new Date("2026-06-17T00:01:00.000Z")
  });

  const old = new Date("2026-06-17T00:01:00.000Z");
  const fresh = new Date("2026-06-17T00:10:00.000Z");
  fs.utimesSync(paths.currentCapsule, old, old);
  fs.utimesSync(paths.identitySummaryJson, old, old);
  fs.utimesSync(quest.filePath, fresh, fresh);

  const payload = assertJsonCommand(runOrange(["hook", "run", "stop", "--json"], cwd), "hook.runStop");
  assert.ok(payload.data.warnings.some((item) => item.code === "HOOK_CAPSULE_STALE"));
  assert.ok(payload.data.warnings.some((item) => item.code === "HOOK_IDENTITY_SUMMARY_STALE"));
  assert.equal(payload.data.observations.capsule.stale, true);
  assert.equal(payload.data.observations.identity.stale, true);
  assert.equal(typeof payload.data.observations.capsule.latestSourcePath, "string");
  assertHookWarnings(payload.data.warnings);
});

test("hook run returns doctor-not-ok warning without doctor repair", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd);
  fs.unlinkSync(paths.graphIndex);
  const before = snapshotOrangeMemory(cwd);

  const payload = assertJsonCommand(runOrange(["hook", "run", "stop", "--json"], cwd), "hook.runStop");
  assert.equal(payload.data.observations.doctorQuickStatus.ok, false);
  assert.ok(payload.data.warnings.some((item) => item.code === "HOOK_DOCTOR_NOT_OK"));
  assertHookWarnings(payload.data.warnings);
  assert.deepEqual(snapshotOrangeMemory(cwd), before);
  assert.equal(fs.existsSync(paths.graphIndex), false);
});

test("--write-report creates only a local hook report under hooks/reports", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd);
  const before = snapshotAllOrangeFiles(cwd);

  const payload = assertJsonCommand(runOrange(["hook", "run", "stop", "--write-report", "--json"], cwd), "hook.runStop");
  assert.equal(payload.data.report.written, true);
  assert.match(payload.data.report.file, /^\.orange-hyper\/hooks\/reports\/hook-run-stop-/);
  const reportPath = path.join(cwd, payload.data.report.file);
  assert.equal(fs.existsSync(reportPath), true);
  assert.equal(path.dirname(reportPath), paths.hookReports);
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert.equal(report.schema_version, 1);
  assert.match(report.generated_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(report.project_id, readConfig(cwd).project_id);
  assert.equal(report.project_name, readConfig(cwd).project_name);
  assert.equal(report.event, "stop");
  assert.equal(report.readOnly, true);
  assert.equal(report.autoMutation, false);
  assert.deepEqual(Object.keys(report.summaries).sort(), ["capsule", "doctor", "graph", "identity"]);
  assert.equal(report.summaries.doctor.ok, true);
  assert.equal(report.summaries.graph.acceptedMemoryNodeCount, 0);
  assert.equal(report.summaries.capsule.exists, true);
  assert.equal(report.summaries.identity.exists, false);
  assert.ok(Array.isArray(report.warnings));
  assert.ok(Array.isArray(report.recommended_commands));
  assertHookWarnings(report.warnings);

  const after = snapshotAllOrangeFiles(cwd);
  const changed = changedFiles(before, after);
  assert.deepEqual(changed, [payload.data.report.file]);
});

test("hook report options reject path traversal and unsupported report paths", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd);

  const valued = runOrange(["hook", "run", "stop", "--write-report=../evil.json", "--json"], cwd);
  assert.equal(valued.status, 1);
  const valuedPayload = parseJsonOnly(valued.stdout);
  assertJsonEnvelope(valuedPayload, false, "hook.runStop");
  assert.match(valuedPayload.error.message, /does not accept a path or value/);

  const unsupported = runOrange(["hook", "run", "stop", "--report-path", "../evil.json", "--json"], cwd);
  assert.equal(unsupported.status, 1);
  const unsupportedPayload = parseJsonOnly(unsupported.stdout);
  assertJsonEnvelope(unsupportedPayload, false, "hook.runStop");
  assert.match(unsupportedPayload.error.message, /Unsupported hook flag: --report-path/);

  assert.equal(fs.existsSync(paths.hookReports), false);
  assert.equal(fs.existsSync(path.join(cwd, "..", "evil.json")), false);
});

function createMemoryProposal(cwd, title) {
  const quest = createQuest(cwd, title, {
    layer: "L2",
    clock: new Date("2026-06-17T00:00:00.000Z")
  });
  completeQuest(cwd, quest.id, {
    clock: new Date("2026-06-17T00:01:00.000Z"),
    evidence: ["npm test passed"]
  });
  return proposeMemoryDelta(cwd, quest.id, {
    clock: new Date("2026-06-17T00:02:00.000Z")
  });
}

function snapshotOrangeMemory(cwd) {
  const root = workspacePaths(cwd).root;
  const entries = {};
  for (const filePath of filesUnder(root)) {
    const relative = path.relative(cwd, filePath).split(path.sep).join("/");
    if (relative.startsWith(".orange-hyper/hooks/reports/")) {
      continue;
    }
    entries[relative] = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  }
  return entries;
}

function snapshotAllOrangeFiles(cwd) {
  const root = workspacePaths(cwd).root;
  const entries = {};
  for (const filePath of filesUnder(root)) {
    const relative = path.relative(cwd, filePath).split(path.sep).join("/");
    entries[relative] = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  }
  return entries;
}

function changedFiles(before, after) {
  return Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    .filter((file) => before[file] !== after[file])
    .sort();
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

function captureIo() {
  const output = [];
  return {
    output,
    io: {
      stdout: { write: (chunk) => output.push(chunk) },
      stderr: { write: () => {} }
    }
  };
}

function parseJsonOnly(raw) {
  assert.equal(raw.trimStart().startsWith("{"), true);
  assert.equal(raw.trimEnd().endsWith("}"), true);
  return JSON.parse(raw);
}

function assertJsonCommand(result, command) {
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  const payload = parseJsonOnly(result.stdout);
  assertJsonEnvelope(payload, true, command);
  return payload;
}

function assertJsonEnvelope(payload, ok, command) {
  assert.equal(payload.ok, ok);
  assert.equal(payload.contract_version, JSON_CONTRACT_VERSION);
  assert.equal(payload.command, command);
  assert.match(payload.command, /^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)+$/);
}

function assertHookWarnings(warnings) {
  for (const item of warnings) {
    assert.deepEqual(Object.keys(item).sort(), ["code", "hint", "message"]);
    assert.match(item.code, /^HOOK_[A-Z0-9_]+$/);
    assert.equal(typeof item.message, "string");
    assert.equal(typeof item.hint, "string");
  }
}

function runOrange(args, cwd) {
  return spawnSync(process.execPath, [ORANGE_BIN.pathname, ...args], {
    cwd,
    encoding: "utf8"
  });
}
