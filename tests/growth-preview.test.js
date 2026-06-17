import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { JSON_CONTRACT_VERSION, main } from "../src/cli/index.js";
import { initWorkspace, readConfig } from "../src/core/config.js";
import { acceptMemoryDelta, proposeMemoryDelta } from "../src/core/memory.js";
import { workspacePaths } from "../src/core/paths.js";
import { completeQuest, createQuest } from "../src/core/quest.js";

const ORANGE_BIN = new URL("../bin/orange.js", import.meta.url);

function tempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "orange-growth-test-"));
}

test("growth status supports human and JSON output", async () => {
  const cwd = tempWorkspace();
  const fixture = createGrowthFixture(cwd);

  const { output, io } = captureIo();
  await main(["growth", "status"], { cwd, io });
  const human = output.join("");
  assert.match(human, /Orange growth status/);
  assert.match(human, /Read-only: yes/);
  assert.match(human, /Auto unlock: no/);
  assert.match(human, /Growth level: branch \(preview only\)/);
  assert.match(human, /Accepted memory nodes: 3/);
  assert.match(human, /Dominant accepted node type: decision \(2\)/);
  assert.match(human, /No roles, MCPs, hooks, graph nodes, workflows, config, or project memory were changed/);

  const payload = assertJsonCommand(runOrange(["growth", "status", "--json"], cwd), "growth.status");
  assert.equal(payload.data.readOnly, true);
  assert.equal(payload.data.deterministic, true);
  assert.equal(payload.data.autoUnlock, false);
  assert.equal(payload.data.autoMutation, false);
  assert.equal(payload.data.projectMemoryMutation, false);
  assert.equal(payload.data.configMutation, false);
  assert.equal(payload.data.project_id, fixture.config.project_id);
  assert.equal(payload.data.project_name, "growth-preview-demo");
  assert.equal(payload.data.acceptedMemoryNodes, 3);
  assert.deepEqual(payload.data.nodeTypeDistribution, { decision: 2, verification: 1 });
  assert.deepEqual(payload.data.dominantAcceptedNodeType, { nodeType: "decision", count: 2 });
  assert.equal(payload.data.questLayerDistribution.L2, 5);
  assert.equal(payload.data.routeLayerDistribution.L3, 1);
  assert.equal(payload.data.questVerification.completed, 5);
  assert.equal(payload.data.questVerification.verified, 4);
  assert.equal(payload.data.questVerification.unverified, 1);
  assert.equal(payload.data.questVerification.verifiedRatio, 0.8);
  assert.equal(payload.data.questVerification.unverifiedRatio, 0.2);
  assert.equal(payload.data.pendingMemoryProposals, 1);
  assert.equal(payload.data.doctorOk, true);
  assert.equal(payload.data.projectBoundaryActive, true);
  assert.equal(payload.data.nodeTypeDiversity, 2);
  assert.ok(payload.data.repeatedEvidenceCount >= 6);
  assert.equal(payload.data.growthLevel, "branch");
  assert.match(payload.data.growthLevelReason, /Branch requires/);
  assert.equal(payload.data.growthLevelUnlocks, false);
  assert.equal(payload.data.boundaries.auto_role_creation, false);
  assert.equal(payload.data.boundaries.mcp_auto_install, false);
  assert.equal(payload.data.boundaries.hook_policy_auto_change, false);
  assert.equal(payload.data.boundaries.project_memory_auto_mutation, false);
  assert.equal(payload.data.hookWarningSummary.hookRun, false);
  assert.equal(payload.data.mcpAdvisorSignals.mcpCall, false);
});

test("growth level does not rise from accepted node count alone", () => {
  const cwd = tempWorkspace();
  createSameTypeAcceptedNodeFixture(cwd);

  const payload = assertJsonCommand(runOrange(["growth", "status", "--json"], cwd), "growth.status");
  assert.equal(payload.data.acceptedMemoryNodes, 8);
  assert.equal(payload.data.nodeTypeDiversity, 1);
  assert.equal(payload.data.doctorOk, true);
  assert.equal(payload.data.projectBoundaryActive, true);
  assert.equal(payload.data.growthLevel, "sprout");
  assert.match(payload.data.growthLevelReason, /branch\/canopy require stronger node diversity/);
});

test("growth suggest supports human and JSON output with advisory candidates only", async () => {
  const cwd = tempWorkspace();
  createGrowthFixture(cwd);

  const { output, io } = captureIo();
  await main(["growth", "suggest"], { cwd, io });
  const human = output.join("");
  assert.match(human, /Orange growth suggest/);
  assert.match(human, /verification-discipline/);
  assert.match(human, /memory-hygiene/);
  assert.match(human, /Auto unlock: false/);
  assert.match(human, /Requires user approval: true/);

  const payload = assertJsonCommand(runOrange(["growth", "suggest", "--json"], cwd), "growth.suggest");
  assert.equal(payload.data.readOnly, true);
  assert.equal(payload.data.deterministic, true);
  assert.equal(payload.data.llmCall, false);
  assert.equal(payload.data.networkCall, false);
  assert.equal(payload.data.mcpCall, false);
  assert.equal(payload.data.autoUnlock, false);
  assert.equal(payload.data.projectMemoryMutation, false);
  assert.equal(payload.data.configMutation, false);
  assert.equal(payload.data.no_candidate_reason, null);
  const ids = payload.data.candidates.map((candidate) => candidate.id);
  assert.ok(ids.includes("verification-discipline"));
  assert.ok(ids.includes("memory-hygiene"));
  assert.ok(ids.includes("backend-api-focus"));
  assert.ok(ids.includes("documentation-focus"));
  assert.ok(ids.includes("mcp-documentation-advisor-readiness"));
  for (const candidate of payload.data.candidates) {
    assertGrowthCandidate(candidate);
    assert.equal(candidate.auto_unlock, false);
    assert.equal(candidate.requires_user_approval, true);
  }
});

test("generic API route-contract text does not create backend/API false positive", () => {
  const cwd = tempWorkspace();
  createGenericRouteContractFixture(cwd);

  const payload = assertJsonCommand(runOrange(["growth", "suggest", "--json"], cwd), "growth.suggest");
  const ids = payload.data.candidates.map((candidate) => candidate.id);
  assert.ok(!ids.includes("backend-api-focus"));
});

test("candidate thresholds suppress one-off weak matches", () => {
  const cwd = tempWorkspace();
  createWeakCandidateFixture(cwd);

  const payload = assertJsonCommand(runOrange(["growth", "suggest", "--json"], cwd), "growth.suggest");
  assert.deepEqual(payload.data.candidates, []);
  assert.match(payload.data.no_candidate_reason, /No repeated growth evidence/);
});

test("growth candidate ranking is deterministic by score and id", () => {
  const cwd = tempWorkspace();
  createGrowthFixture(cwd);

  const first = assertJsonCommand(runOrange(["growth", "suggest", "--json"], cwd), "growth.suggest");
  const second = assertJsonCommand(runOrange(["growth", "suggest", "--json"], cwd), "growth.suggest");
  assert.deepEqual(
    first.data.candidates.map((candidate) => candidate.id),
    second.data.candidates.map((candidate) => candidate.id)
  );
  for (let index = 1; index < first.data.candidates.length; index += 1) {
    const previous = first.data.candidates[index - 1];
    const current = first.data.candidates[index];
    assert.ok(
      previous.score > current.score ||
      (previous.score === current.score && previous.id.localeCompare(current.id) <= 0)
    );
  }
});

test("growth explain supports human and JSON output with deterministic evidence", async () => {
  const cwd = tempWorkspace();
  createGrowthFixture(cwd);

  const { output, io } = captureIo();
  await main(["growth", "explain"], { cwd, io });
  const human = output.join("");
  assert.match(human, /Orange growth explain/);
  assert.match(human, /LLM call: no/);
  assert.match(human, /Network call: no/);
  assert.match(human, /MCP call: no/);
  assert.match(human, /Rule: growth\./);

  const payload = assertJsonCommand(runOrange(["growth", "explain", "--json"], cwd), "growth.explain");
  assert.equal(payload.data.readOnly, true);
  assert.equal(payload.data.deterministic, true);
  assert.equal(payload.data.llmCall, false);
  assert.equal(payload.data.networkCall, false);
  assert.equal(payload.data.mcpCall, false);
  assert.equal(payload.data.autoUnlock, false);
  assert.ok(payload.data.explanations.length > 0);
  assert.ok(payload.data.rules.some((rule) => rule.id === "growth.verification-discipline"));
  for (const explanation of payload.data.explanations) {
    assert.equal(explanation.auto_unlock, false);
    assert.equal(explanation.requires_user_approval, true);
    assert.match(explanation.rule_id, /^growth\./);
    assert.equal(typeof explanation.score, "number");
    assert.equal(typeof explanation.evidence_count, "number");
    assert.ok(Array.isArray(explanation.matched_signals));
    assert.ok(explanation.matched_signals.length >= 2);
    assert.ok(Array.isArray(explanation.evidence));
    assert.ok(explanation.evidence.length >= 2);
    for (const item of explanation.evidence) {
      assertGrowthEvidenceItem(item);
    }
  }
});

test("growth commands do not modify project memory or config", () => {
  const cwd = tempWorkspace();
  createGrowthFixture(cwd);
  const before = snapshotOrangeFiles(cwd);

  assertJsonCommand(runOrange(["growth", "status", "--json"], cwd), "growth.status");
  assertJsonCommand(runOrange(["growth", "suggest", "--json"], cwd), "growth.suggest");
  assertJsonCommand(runOrange(["growth", "explain", "--json"], cwd), "growth.explain");

  assert.deepEqual(snapshotOrangeFiles(cwd), before);
});

test("identity summary includes Growth Signal Preview summary", () => {
  const cwd = tempWorkspace();
  createGrowthFixture(cwd);

  const payload = assertJsonCommand(runOrange(["identity", "build", "--json"], cwd), "identity.build");
  assert.equal(payload.data.summary.growthPreview.readOnly, true);
  assert.equal(payload.data.summary.growthPreview.autoUnlock, false);
  assert.equal(payload.data.summary.growthPreview.growthLevel, "branch");
  assert.match(payload.data.summary.growthPreview.growthLevelReason, /Branch requires/);
  assert.equal(payload.data.summary.growthPreview.acceptedMemoryNodes, 3);
  assert.equal(payload.data.summary.growthPreview.nodeTypeDiversity, 2);
  assert.deepEqual(payload.data.summary.growthPreview.nodeTypeDistribution, { decision: 2, verification: 1 });
  assert.deepEqual(payload.data.summary.growthPreview.dominantAcceptedNodeType, { nodeType: "decision", count: 2 });
  assert.equal(payload.data.summary.growthPreview.questVerification.verifiedRatio, 0.8);
  assert.equal(payload.data.summary.growthPreview.pendingMemoryProposals, 1);
  assert.ok(payload.data.summary.growthPreview.candidateCount >= 3);
  assert.ok(payload.data.summary.growthPreview.topCandidates.length > 0);
  assert.match(payload.data.summary.growthPreview.growthConfidenceSummary, /high|medium|low/);
  assert.equal(payload.data.summary.growthPreview.noAutomaticUnlocks, "No automatic unlocks");
  assert.equal(payload.data.summary.growthPreview.suggestedCommand, "orange growth suggest --json");
  assert.equal(payload.data.summary.growthPreview.boundaries.graph_node_auto_creation, false);

  const html = fs.readFileSync(workspacePaths(cwd).identityHtml, "utf8");
  assert.match(html, /Growth Signal Preview/);
  assert.match(html, /Growth Level/);
  assert.match(html, /Growth Level Reason/);
  assert.match(html, /Top Candidates/);
  assert.match(html, /No automatic unlocks/);
  assert.match(html, /preview only/);
});

function createGrowthFixture(cwd) {
  acceptedCounter = 0;
  const paths = initWorkspace(cwd, { projectName: "growth-preview-demo" });
  const config = readConfig(cwd);

  createAcceptedMemory(cwd, "document backend API adapter contract readiness", "decision", "npm test passed");
  createAcceptedMemory(cwd, "document backend API release notes for docs freshness", "decision", "npm test passed");
  createAcceptedMemory(cwd, "verification coverage for README docs and API examples", "verification", "npm test passed");

  const pendingQuest = createQuest(cwd, "document pending MCP docs advisor review", {
    layer: "L2",
    expectedVerification: ["check README docs"],
    clock: new Date("2026-06-17T00:20:00.000Z")
  });
  completeQuest(cwd, pendingQuest.id, {
    clock: new Date("2026-06-17T00:21:00.000Z"),
    evidence: ["README docs checked"]
  });
  proposeMemoryDelta(cwd, pendingQuest.id, {
    nodeType: "decision",
    clock: new Date("2026-06-17T00:22:00.000Z")
  });

  const unverifiedQuest = createQuest(cwd, "backend API smoke remains unverified", {
    layer: "L2",
    expectedVerification: ["manual API smoke"],
    clock: new Date("2026-06-17T00:30:00.000Z")
  });
  completeQuest(cwd, unverifiedQuest.id, {
    clock: new Date("2026-06-17T00:31:00.000Z"),
    unverifiedReason: "Manual API smoke was not available"
  });

  const routeResult = spawnSync(process.execPath, [
    ORANGE_BIN.pathname,
    "route",
    "plan backend API documentation freshness",
    "--layer",
    "L3",
    "--json"
  ], { cwd, encoding: "utf8" });
  assert.equal(routeResult.status, 0);

  return { paths, config };
}

function createSameTypeAcceptedNodeFixture(cwd) {
  acceptedCounter = 0;
  initWorkspace(cwd, { projectName: "accepted-count-only-demo" });
  for (let index = 0; index < 8; index += 1) {
    createAcceptedMemory(cwd, `stable project memory pattern ${index}`, "decision", "confirmed");
  }
}

function createGenericRouteContractFixture(cwd) {
  acceptedCounter = 0;
  initWorkspace(cwd, { projectName: "generic-route-contract-demo" });
  for (let index = 0; index < 3; index += 1) {
    createAcceptedMemory(cwd, `Adapter JSON API route contract note ${index}`, "decision", "confirmed");
  }
}

function createWeakCandidateFixture(cwd) {
  acceptedCounter = 0;
  initWorkspace(cwd, { projectName: "weak-growth-demo" });
  const quest = createQuest(cwd, "one-off backend API route contract spike", {
    layer: "L2",
    clock: nextClock()
  });
  completeQuest(cwd, quest.id, {
    clock: nextClock(),
    evidence: ["manual check"]
  });
}

function createAcceptedMemory(cwd, title, nodeType, evidence) {
  const quest = createQuest(cwd, title, {
    layer: "L2",
    expectedVerification: [evidence],
    clock: nextClock()
  });
  completeQuest(cwd, quest.id, {
    clock: nextClock(),
    evidence: [evidence]
  });
  const proposal = proposeMemoryDelta(cwd, quest.id, {
    nodeType,
    clock: nextClock()
  });
  acceptMemoryDelta(cwd, proposal.data.id, {
    clock: nextClock()
  });
}

let acceptedCounter = 0;

function nextClock() {
  const value = new Date(Date.UTC(2026, 5, 17, 0, acceptedCounter, 0));
  acceptedCounter += 1;
  return value;
}

function assertGrowthCandidate(candidate) {
  assert.equal(typeof candidate.id, "string");
  assert.equal(typeof candidate.title, "string");
  assert.equal(typeof candidate.reason, "string");
  assert.equal(typeof candidate.score, "number");
  assert.ok(candidate.score > 0);
  assert.equal(typeof candidate.evidence_count, "number");
  assert.ok(Array.isArray(candidate.matched_signals));
  assert.ok(candidate.matched_signals.length >= 2);
  assert.ok(Array.isArray(candidate.evidence));
  assert.ok(candidate.evidence.length >= 2);
  assert.equal(candidate.evidence_count, candidate.evidence.length);
  for (const item of candidate.evidence) {
    assertGrowthEvidenceItem(item);
  }
  assert.match(candidate.confidence, /^(low|medium|high)$/);
  assert.equal(typeof candidate.suggested_next_step, "string");
  assert.equal(candidate.auto_unlock, false);
  assert.equal(candidate.requires_user_approval, true);
}

function assertGrowthEvidenceItem(item) {
  assert.equal(typeof item.id, "string");
  assert.equal(typeof item.label, "string");
  assert.ok(item.source);
  assert.ok(Object.hasOwn(item.source, "quest_id"));
  assert.ok(Object.hasOwn(item.source, "node_id"));
  assert.ok(Object.hasOwn(item.source, "node_type"));
  assert.ok(Object.hasOwn(item.source, "route_layer"));
  assert.ok(Object.hasOwn(item.source, "hook_warning_code"));
  assert.ok(Object.hasOwn(item.source, "mcp_signal_id"));
  assert.ok(
    item.source.quest_id ||
    item.source.node_id ||
    item.source.route_layer ||
    item.source.hook_warning_code ||
    item.source.mcp_signal_id
  );
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
