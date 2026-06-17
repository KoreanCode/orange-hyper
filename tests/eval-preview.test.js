import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { JSON_CONTRACT_VERSION, main } from "../src/cli/index.js";
import { buildIdentityPlaceholder } from "../src/core/identity.js";
import { initWorkspace, readConfig } from "../src/core/config.js";
import { acceptMemoryDelta, proposeMemoryDelta, rejectMemoryDelta } from "../src/core/memory.js";
import { workspacePaths } from "../src/core/paths.js";
import { completeQuest, createQuest } from "../src/core/quest.js";

const ORANGE_BIN = new URL("../bin/orange.js", import.meta.url);

function tempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "orange-eval-test-"));
}

test("eval snapshot supports human and JSON output", async () => {
  const cwd = tempWorkspace();
  const fixture = createEvalFixture(cwd);

  const { output, io } = captureIo();
  await main(["eval", "snapshot"], { cwd, io });
  const human = output.join("");
  assert.match(human, /Orange eval snapshot/);
  assert.match(human, /Local-only: yes/);
  assert.match(human, /Telemetry: no/);
  assert.match(human, /LLM judge: no/);
  assert.match(human, /Hook auto-run: no/);
  assert.match(human, /Unavailable metrics: token\.savings, success_rate\.improvement/);

  const payload = assertJsonCommand(runOrange(["eval", "snapshot", "--json"], cwd), "eval.snapshot");
  assert.equal(payload.data.readOnly, true);
  assert.equal(payload.data.localOnly, true);
  assert.equal(payload.data.telemetry, false);
  assert.equal(payload.data.networkCall, false);
  assert.equal(payload.data.llmJudge, false);
  assert.equal(payload.data.mcpCall, false);
  assert.equal(payload.data.hookRun, false);
  assert.equal(payload.data.projectMemoryMutation, false);
  assert.equal(payload.data.configMutation, false);
  assert.equal(payload.data.project_id, fixture.config.project_id);
  assert.equal(payload.data.project_name, "eval-preview-demo");
  assert.equal(payload.data.quests.total, 3);
  assert.equal(payload.data.quests.completed, 3);
  assert.equal(payload.data.quests.verified, 2);
  assert.equal(payload.data.quests.unverified, 1);
  assert.equal(payload.data.memoryProposals.total, 3);
  assert.equal(payload.data.memoryProposals.accepted, 1);
  assert.equal(payload.data.memoryProposals.rejected, 1);
  assert.equal(payload.data.memoryProposals.pending, 1);
  assert.equal(payload.data.graph.acceptedNodeCount, 1);
  assert.equal(payload.data.doctor.errorCount, 0);
  assert.equal(payload.data.adapter.recipeCount, 5);
  assert.equal(payload.data.identity.summaryExists, true);
  assert.equal(payload.data.reportPolicy.written, false);
  assert.deepEqual(payload.data.boundaries, {
    local_only: true,
    external_telemetry: false,
    network_upload: false,
    api_call: false,
    llm_judge_call: false,
    mcp_call: false,
    hook_auto_run: false,
    subagent_run: false,
    auto_planner_loop: false,
    project_memory_auto_mutation: false,
    config_auto_mutation: false,
    quest_auto_creation: false,
    proposal_auto_creation: false,
    graph_auto_creation: false,
    token_savings_estimation: false,
    success_rate_improvement_claim: false
  });
  assert.equal(fs.existsSync(fixture.paths.evalReports), false);
});

test("eval report supports human and JSON output without writing by default", async () => {
  const cwd = tempWorkspace();
  const fixture = createEvalFixture(cwd);

  const { output, io } = captureIo();
  await main(["eval", "report"], { cwd, io });
  const human = output.join("");
  assert.match(human, /^# Orange Eval Report/);
  assert.match(human, /## Summary/);
  assert.match(human, /Report mode: local-only/);
  assert.match(human, /Total sections: 11/);
  assert.match(human, /Needs attention: \d+/);
  assert.match(human, /Insufficient data: \d+/);
  assert.match(human, /No telemetry: yes; no network: yes; no LLM judge: yes/);
  assert.match(human, /## Project Summary/);
  assert.match(human, /## Quest Completion/);
  assert.match(human, /## Verification Honesty/);
  assert.match(human, /## Memory Proposal Flow/);
  assert.match(human, /## Graph Memory Health/);
  assert.match(human, /## Doctor Diagnostics/);
  assert.match(human, /## Hook Warning Usefulness/);
  assert.match(human, /## MCP Advisor Signals/);
  assert.match(human, /## Growth Signal Preview/);
  assert.match(human, /## Adapter Invocation Readiness/);
  assert.match(human, /## Known Gaps/);
  assert.match(human, /Status: (good|needs-attention|insufficient-data)/);
  assert.match(human, /Reason: /);
  assert.match(human, /Evidence count: \d+/);
  assert.match(human, /stdout only/);
  assert.doesNotMatch(human, /90%|success rate improved|tokens saved/i);

  const payload = assertJsonCommand(runOrange(["eval", "report", "--json"], cwd), "eval.report");
  assert.match(payload.data.report_id, /^eval-report-/);
  assert.equal(payload.data.schema_version, 2);
  assert.equal(payload.data.format, "markdown");
  assert.equal(payload.data.localOnly, true);
  assert.equal(payload.data.local_only, true);
  assert.equal(payload.data.localReport.written, false);
  assert.equal(payload.data.telemetry, false);
  assert.equal(payload.data.network_upload, false);
  assert.equal(payload.data.llm_judge, false);
  assert.equal(payload.data.project_id, fixture.config.project_id);
  assert.equal(payload.data.project_name, "eval-preview-demo");
  assert.equal(payload.data.summary.project_id, fixture.config.project_id);
  assert.equal(payload.data.summary.project_name, "eval-preview-demo");
  assert.equal(payload.data.summary.report_mode, "local-only");
  assert.equal(payload.data.summary.total_sections, 11);
  assert.equal(payload.data.summary.no_telemetry, true);
  assert.equal(payload.data.summary.no_network, true);
  assert.equal(payload.data.summary.no_llm_judge, true);
  assert.equal(payload.data.boundaries.local_only, true);
  assert.equal(payload.data.boundaries.external_telemetry, false);
  assert.equal(payload.data.boundaries.network_upload, false);
  assert.equal(payload.data.boundaries.api_call, false);
  assert.equal(payload.data.boundaries.llm_judge_call, false);
  assert.equal(payload.data.boundaries.mcp_call, false);
  assert.equal(payload.data.boundaries.hook_auto_run, false);
  assert.equal(payload.data.boundaries.subagent_run, false);
  assert.equal(payload.data.boundaries.auto_planner_loop, false);
  assert.equal(payload.data.boundaries.project_memory_auto_mutation, false);
  assert.equal(payload.data.boundaries.config_auto_mutation, false);
  assert.equal(payload.data.boundaries.quest_auto_creation, false);
  assert.equal(payload.data.boundaries.proposal_auto_creation, false);
  assert.equal(payload.data.boundaries.graph_auto_creation, false);
  assert.equal(payload.data.boundaries.token_savings_estimation, false);
  assert.equal(payload.data.boundaries.success_rate_improvement_claim, false);
  assert.equal(payload.data.sections.length, 11);
  assert.deepEqual(payload.data.sections.map((section) => section.title), [
    "Project Summary",
    "Quest Completion",
    "Verification Honesty",
    "Memory Proposal Flow",
    "Graph Memory Health",
    "Doctor Diagnostics",
    "Hook Warning Usefulness",
    "MCP Advisor Signals",
    "Growth Signal Preview",
    "Adapter Invocation Readiness",
    "Known Gaps"
  ]);
  for (const section of payload.data.sections) {
    assert.ok(["good", "needs-attention", "insufficient-data"].includes(section.status));
    assert.equal(typeof section.reason, "string");
    assert.ok(section.reason.length > 0);
    assert.equal(typeof section.evidence_count, "number");
    assert.ok(section.evidence_count >= 0);
    assert.equal(Object.hasOwn(section, "score"), false);
    assert.equal(Object.hasOwn(section, "grade"), false);
  }
  assert.equal(payload.data.known_gaps.length, 3);
  assert.deepEqual(
    payload.data.unavailable_metrics.map((metric) => [metric.id, metric.value, metric.unavailable]),
    [
      ["token.savings", null, true],
      ["success_rate.improvement", null, true]
    ]
  );
  assert.match(payload.data.unavailable_metrics[0].limitation, /No token usage collection/);
  assert.match(payload.data.markdown, /Token savings are unavailable/);
  assert.doesNotMatch(JSON.stringify(payload.data), /tokens saved|success rate improved/i);
  assert.equal(fs.existsSync(fixture.paths.evalReports), false);
});

test("eval explain supports human and JSON output with metric sources", async () => {
  const cwd = tempWorkspace();
  createEvalFixture(cwd);

  const { output, io } = captureIo();
  await main(["eval", "explain"], { cwd, io });
  const human = output.join("");
  assert.match(human, /Orange eval explain/);
  assert.match(human, /quest\.count/);
  assert.match(human, /source=\.orange-hyper\/quests\//);
  assert.match(human, /hook\.warnings/);
  assert.match(human, /hook\.warning\.usefulness/);
  assert.match(human, /memory\.acceptance_rate/);
  assert.match(human, /token\.savings/);
  assert.match(human, /limitation=/);

  const payload = assertJsonCommand(runOrange(["eval", "explain", "--json"], cwd), "eval.explain");
  assert.equal(payload.data.localOnly, true);
  assert.equal(payload.data.telemetry, false);
  assert.equal(payload.data.hookRun, false);
  assert.equal(payload.data.boundaries.local_only, true);
  assert.equal(payload.data.boundaries.external_telemetry, false);
  assert.equal(payload.data.boundaries.network_upload, false);
  assert.equal(payload.data.boundaries.api_call, false);
  assert.equal(payload.data.boundaries.llm_judge_call, false);
  assert.equal(payload.data.boundaries.mcp_call, false);
  assert.equal(payload.data.boundaries.hook_auto_run, false);
  assert.equal(payload.data.boundaries.subagent_run, false);
  assert.equal(payload.data.boundaries.auto_planner_loop, false);
  assert.equal(payload.data.boundaries.project_memory_auto_mutation, false);
  assert.equal(payload.data.boundaries.config_auto_mutation, false);
  assert.equal(payload.data.boundaries.quest_auto_creation, false);
  assert.equal(payload.data.boundaries.proposal_auto_creation, false);
  assert.equal(payload.data.boundaries.graph_auto_creation, false);
  assert.equal(payload.data.boundaries.token_savings_estimation, false);
  assert.equal(payload.data.boundaries.success_rate_improvement_claim, false);
  const metrics = new Map(payload.data.metrics.map((metric) => [metric.id, metric]));
  assert.equal(metrics.get("quest.count").source, ".orange-hyper/quests/");
  assert.match(metrics.get("quest.count").limitation, /does not judge task quality/);
  assert.match(metrics.get("memory.proposals").source, /proposals\/memory-delta/);
  assert.match(metrics.get("memory.acceptance_rate").limitation, /not a success-rate improvement claim/);
  assert.match(metrics.get("hook.warnings").explanation, /does not run hook events automatically/);
  assert.match(metrics.get("hook.warning.usefulness").limitation, /without a local hook report/);
  assert.equal(metrics.get("token.savings").value, null);
  assert.equal(metrics.get("token.savings").status, "insufficient-data");
  assert.equal(metrics.get("token.savings").unavailable, true);
  assert.match(metrics.get("token.savings").limitation, /No token usage collection/);
  assert.match(metrics.get("success_rate.improvement").unavailable_reason, /task-pack outcomes/);
  assert.match(metrics.get("success_rate.improvement").limitation, /No comparison group/);
});

test("eval commands do not modify project memory or config without --write-report", () => {
  const cwd = tempWorkspace();
  const paths = createEvalFixture(cwd).paths;
  const beforeConfig = fs.readFileSync(paths.config, "utf8");
  const before = snapshotOrangeFiles(cwd);

  assertJsonCommand(runOrange(["eval", "snapshot", "--json"], cwd), "eval.snapshot");
  assertJsonCommand(runOrange(["eval", "report", "--json"], cwd), "eval.report");
  assertJsonCommand(runOrange(["eval", "explain", "--json"], cwd), "eval.explain");

  assert.equal(fs.readFileSync(paths.config, "utf8"), beforeConfig);
  assert.deepEqual(snapshotOrangeFiles(cwd), before);
  assert.equal(fs.existsSync(paths.evalReports), false);
});

test("--write-report creates only a local eval report under evals/reports", () => {
  const cwd = tempWorkspace();
  const paths = createEvalFixture(cwd).paths;
  const before = snapshotOrangeFiles(cwd);

  const payload = assertJsonCommand(runOrange(["eval", "report", "--write-report", "--json"], cwd), "eval.report");
  assert.equal(payload.data.localReport.written, true);
  assert.equal(payload.data.localReport.format, "markdown");
  assert.match(payload.data.localReport.file, /^\.orange-hyper\/evals\/reports\/eval-report-/);
  assert.equal(payload.data.localReport.file, `.orange-hyper/evals/reports/${payload.data.report_id}.md`);
  assert.equal(payload.data.local_only, true);
  assert.equal(payload.data.network_upload, false);
  assert.equal(payload.data.llm_judge, false);
  const reportPath = path.join(cwd, payload.data.localReport.file);
  assert.equal(fs.existsSync(reportPath), true);
  assert.equal(path.dirname(reportPath), paths.evalReports);
  const report = fs.readFileSync(reportPath, "utf8");
  assert.match(report, /^# Orange Eval Report/);
  assert.match(report, /Report file: \.orange-hyper\/evals\/reports\/eval-report-/);
  assert.match(report, /## Known Gaps/);
  assert.match(report, /Token savings are unavailable/);

  const after = snapshotOrangeFiles(cwd);
  assert.deepEqual(changedFiles(before, after), [payload.data.localReport.file]);
});

test("eval report options reject path traversal and unsupported report paths", () => {
  const cwd = tempWorkspace();
  const paths = createEvalFixture(cwd).paths;

  const valued = runOrange(["eval", "report", "--write-report=../evil.md", "--json"], cwd);
  assert.equal(valued.status, 1);
  const valuedPayload = parseJsonOnly(valued.stdout);
  assertJsonEnvelope(valuedPayload, false, "eval.report");
  assert.match(valuedPayload.error.message, /does not accept a path or value/);

  const unsupported = runOrange(["eval", "report", "--report-path", "../evil.md", "--json"], cwd);
  assert.equal(unsupported.status, 1);
  const unsupportedPayload = parseJsonOnly(unsupported.stdout);
  assertJsonEnvelope(unsupportedPayload, false, "eval.report");
  assert.match(unsupportedPayload.error.message, /Unsupported eval flag: --report-path/);

  assert.equal(fs.existsSync(paths.evalReports), false);
  assert.equal(fs.existsSync(path.join(cwd, "..", "evil.md")), false);
});

test("identity build does not auto-generate or embed eval reports", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd, { projectName: "identity-eval-boundary-demo" });

  const payload = assertJsonCommand(runOrange(["identity", "build", "--json"], cwd), "identity.build");
  assert.equal(fs.existsSync(paths.evalReports), false);
  assert.doesNotMatch(JSON.stringify(payload.data), /eval-report|Eval Report|eval summary/i);
});

function createEvalFixture(cwd) {
  const paths = initWorkspace(cwd, { projectName: "eval-preview-demo" });
  const config = readConfig(cwd);
  createAcceptedMemory(cwd, "document eval local report verification", "verification", "npm test passed");

  const pendingQuest = createQuest(cwd, "document pending eval report review", {
    layer: "L2",
    expectedVerification: ["check eval report"],
    clock: new Date("2026-06-17T00:20:00.000Z")
  });
  completeQuest(cwd, pendingQuest.id, {
    clock: new Date("2026-06-17T00:21:00.000Z"),
    evidence: ["eval report checked"]
  });
  proposeMemoryDelta(cwd, pendingQuest.id, {
    nodeType: "decision",
    clock: new Date("2026-06-17T00:22:00.000Z")
  });

  const rejectedQuest = createQuest(cwd, "eval usage metric remains unavailable", {
    layer: "L2",
    expectedVerification: ["state unavailable usage metric"],
    clock: new Date("2026-06-17T00:30:00.000Z")
  });
  completeQuest(cwd, rejectedQuest.id, {
    clock: new Date("2026-06-17T00:31:00.000Z"),
    unverifiedReason: "Usage counts are not collected"
  });
  const rejectedProposal = proposeMemoryDelta(cwd, rejectedQuest.id, {
    nodeType: "risk",
    clock: new Date("2026-06-17T00:32:00.000Z")
  });
  rejectMemoryDelta(cwd, rejectedProposal.data.id, {
    clock: new Date("2026-06-17T00:33:00.000Z")
  });

  buildIdentityPlaceholder(cwd, {
    clock: new Date("2026-06-17T00:40:00.000Z")
  });
  const hook = assertJsonCommand(runOrange(["hook", "run", "stop", "--write-report", "--json"], cwd), "hook.runStop");
  assert.equal(hook.data.report.written, true);
  return { paths, config };
}

function createAcceptedMemory(cwd, title, nodeType, evidence) {
  const quest = createQuest(cwd, title, {
    layer: "L2",
    expectedVerification: [evidence],
    clock: new Date("2026-06-17T00:00:00.000Z")
  });
  completeQuest(cwd, quest.id, {
    clock: new Date("2026-06-17T00:01:00.000Z"),
    evidence: [evidence]
  });
  const proposal = proposeMemoryDelta(cwd, quest.id, {
    nodeType,
    clock: new Date("2026-06-17T00:02:00.000Z")
  });
  acceptMemoryDelta(cwd, proposal.data.id, {
    clock: new Date("2026-06-17T00:03:00.000Z")
  });
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

function runOrange(args, cwd) {
  return spawnSync(process.execPath, [ORANGE_BIN.pathname, ...args], {
    cwd,
    encoding: "utf8"
  });
}
