import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { initWorkspace, readConfig } from "../src/core/config.js";
import { acceptMemoryDelta, proposeMemoryDelta, rejectMemoryDelta } from "../src/core/memory.js";
import { workspacePaths } from "../src/core/paths.js";
import { completeQuest, createQuest } from "../src/core/quest.js";

const ORANGE_BIN = new URL("../bin/orange.js", import.meta.url);

function tempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "orange-identity-graph-test-"));
}

test("identity build embeds read-only Knowledge Graph dashboard state", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd, { projectName: "identity-graph-demo" });
  const config = readConfig(cwd);
  const firstAccepted = createAcceptedMemory(cwd, "document accepted dashboard decision", "decision", "identity graph checked");
  const secondAccepted = createAcceptedMemory(cwd, "document accepted dashboard tradeoff", "decision", "identity graph checked");
  const pending = createPendingMemory(cwd, "pending dashboard note", "risk");
  const rejected = createRejectedMemory(cwd, "rejected dashboard note", "verification");

  const payload = assertJsonCommand(runOrange(["identity", "build", "--json"], cwd), "identity.build");
  const preview = payload.data.summary.graphPreview;
  const graph = payload.data.summary.graphPreview;

  assert.equal(preview.schemaVersion, "1.1.0-alpha.0");
  assert.equal(preview.readOnly, true);
  assert.equal(preview.editingSupported, false);
  assert.equal(preview.acceptedMemoryNodes, 2);
  assert.deepEqual(preview.nodeTypeDistribution, { decision: 2 });
  assert.equal(preview.nodes.length, 2);
  assert.ok(preview.edges.length >= 1);
  assert.equal(preview.nodeTypeColors.decision, "#ffb454");

  const acceptedNodeIds = new Set([firstAccepted.node.data.id, secondAccepted.node.data.id]);
  assert.deepEqual(new Set(preview.nodes.map((node) => node.id)), acceptedNodeIds);
  for (const node of preview.nodes) {
    assert.equal(node.project_id, config.project_id);
    assert.equal(node.type, "decision");
    assert.equal(node.node_type, "decision");
    assert.equal(typeof node.label, "string");
    assert.equal(typeof node.source_quest, "string");
    assert.equal(typeof node.source_proposal, "string");
    assert.equal(typeof node.candidate_memory_summary, "string");
    assert.equal(typeof node.degree, "number");
    assert.equal(node.readOnly, true);
  }
  for (const edge of graph.edges) {
    assert.ok(acceptedNodeIds.has(edge.from));
    assert.ok(acceptedNodeIds.has(edge.to));
    assert.equal(edge.readOnly, true);
  }

  const stateText = fs.readFileSync(paths.identityHtml, "utf8");
  const state = extractJsonScript(stateText, "orange-knowledge-graph-state");
  assert.equal(state.readOnly, true);
  assert.equal(state.nodes.length, 2);
  assert.equal(state.edges.length, preview.edges.length);
  assert.deepEqual(new Set(state.nodes.map((node) => node.id)), acceptedNodeIds);
  assert.doesNotMatch(JSON.stringify(state), new RegExp(escapeRegExp(pending.data.id)));
  assert.doesNotMatch(JSON.stringify(state), new RegExp(escapeRegExp(rejected.data.id)));
});

test("identity HTML contains vanilla SVG graph view, filters, read-only warning, and table fallback", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd, { projectName: "identity-html-graph-demo" });
  createAcceptedMemory(cwd, "accepted graph html decision", "decision", "identity html checked");

  assertJsonCommand(runOrange(["identity", "build", "--json"], cwd), "identity.build");
  const html = fs.readFileSync(paths.identityHtml, "utf8");

  assert.match(html, /Knowledge Graph Dashboard/);
  assert.match(html, /id="knowledge-graph-svg"/);
  assert.match(html, /class="knowledge-graph-svg"/);
  assert.match(html, /setAttribute\("class", "graph-edge"\)/);
  assert.match(html, /setAttribute\("class", "graph-node"\)/);
  assert.match(html, /id="graph-search"/);
  assert.match(html, /id="graph-type-filter"/);
  assert.match(html, /aria-label="Node type colors"/);
  assert.match(html, /#ffb454/);
  assert.match(html, /This is a read-only Knowledge Graph\./);
  assert.match(html, /It is built from accepted memory nodes\./);
  assert.match(html, /It is not a code dependency graph\./);
  assert.match(html, /Pending\/rejected proposals are not included\./);
  assert.match(html, /Graph editing is not supported\./);
  assert.match(html, /<noscript>/);
  assert.match(html, /id="knowledge-graph-table"/);
  for (const script of extractRuntimeScripts(html)) {
    assert.doesNotThrow(() => new Function(script));
  }
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.doesNotMatch(html, /\b(?:d3|cytoscape|sigma)\b/i);
  assert.doesNotMatch(html, /data-graph-edit|graph-editor|<button[^>]*>\s*(?:Edit|Delete|Create|Save)/i);
});

test("identity Knowledge Graph handles empty accepted memory without breaking fallback layout", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd, { projectName: "empty-identity-graph-demo" });

  const payload = assertJsonCommand(runOrange(["identity", "build", "--json"], cwd), "identity.build");
  const preview = payload.data.summary.graphPreview;
  assert.equal(preview.acceptedMemoryNodes, 0);
  assert.deepEqual(preview.nodes, []);
  assert.deepEqual(preview.edges, []);

  const html = fs.readFileSync(paths.identityHtml, "utf8");
  assert.match(html, /No accepted memory nodes yet/);
  assert.match(html, /No accepted memory nodes/);
  assert.match(html, /id="knowledge-graph-svg"/);
  assert.match(html, /id="knowledge-graph-table"/);
  assert.match(html, /JavaScript is disabled, so the read-only graph table below is the fallback view\./);
});

function createAcceptedMemory(cwd, title, nodeType, evidence) {
  const quest = createCompletedQuest(cwd, title, evidence);
  const proposal = proposeMemoryDelta(cwd, quest.id, {
    nodeType,
    clock: nextClock()
  });
  return acceptMemoryDelta(cwd, proposal.data.id, {
    clock: nextClock()
  });
}

function createPendingMemory(cwd, title, nodeType) {
  const quest = createCompletedQuest(cwd, title, "pending memory reviewed");
  return proposeMemoryDelta(cwd, quest.id, {
    nodeType,
    clock: nextClock()
  });
}

function createRejectedMemory(cwd, title, nodeType) {
  const proposal = createPendingMemory(cwd, title, nodeType);
  return rejectMemoryDelta(cwd, proposal.data.id, {
    clock: nextClock()
  });
}

function createCompletedQuest(cwd, title, evidence) {
  const quest = createQuest(cwd, title, {
    layer: "L2",
    expectedVerification: [evidence],
    clock: nextClock()
  });
  completeQuest(cwd, quest.id, {
    clock: nextClock(),
    evidence: [evidence]
  });
  return quest;
}

let clockCounter = 0;

function nextClock() {
  const value = new Date(Date.UTC(2026, 5, 18, 0, clockCounter, 0));
  clockCounter += 1;
  return value;
}

function runOrange(args, cwd) {
  return spawnSync(process.execPath, [ORANGE_BIN.pathname, ...args], {
    cwd,
    encoding: "utf8"
  });
}

function assertJsonCommand(result, command) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.command, command);
  return payload;
}

function extractJsonScript(html, id) {
  const match = html.match(new RegExp(`<script id="${escapeRegExp(id)}" type="application/json">\\s*([\\s\\S]*?)\\s*</script>`));
  assert.ok(match, `missing JSON script ${id}`);
  return JSON.parse(match[1]);
}

function extractRuntimeScripts(html) {
  return Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/g), (match) => match[1]);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
