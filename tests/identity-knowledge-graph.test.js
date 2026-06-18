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
  const thirdAccepted = createAcceptedMemory(cwd, "source visual concept clustering verification", "verification", "identity graph checked");
  const pending = createPendingMemory(cwd, "pending dashboard note", "risk");
  const rejected = createRejectedMemory(cwd, "rejected dashboard note", "verification");

  const payload = assertJsonCommand(runOrange(["identity", "build", "--json"], cwd), "identity.build");
  const summary = payload.data.summary;
  const preview = summary.graphPreview;
  const sourceGraph = summary.sourceGraph;
  const visualGraph = summary.visualGraph;

  assert.equal(preview.schemaVersion, "1.1.0-alpha.3");
  assert.equal(preview.readOnly, true);
  assert.equal(preview.editingSupported, false);
  assert.equal(preview.acceptedMemoryNodes, 3);
  assert.deepEqual(preview.nodeTypeDistribution, { decision: 2, verification: 1 });
  assert.equal(preview.nodes.length, 3);
  assert.ok(preview.edges.length >= 1);
  assert.equal(preview.nodeTypeColors.decision, "#ffb454");

  const acceptedNodeIds = new Set([firstAccepted.node.data.id, secondAccepted.node.data.id, thirdAccepted.node.data.id]);
  assert.deepEqual(new Set(preview.nodes.map((node) => node.id)), acceptedNodeIds);
  for (const node of preview.nodes) {
    assert.equal(node.project_id, config.project_id);
    assert.ok(["decision", "verification"].includes(node.type));
    assert.ok(["decision", "verification"].includes(node.node_type));
    assert.equal(typeof node.label, "string");
    assert.equal(typeof node.source_quest, "string");
    assert.equal(typeof node.source_proposal, "string");
    assert.equal(typeof node.candidate_memory_summary, "string");
    assert.equal(typeof node.degree, "number");
    assert.equal(node.readOnly, true);
  }
  for (const edge of preview.edges) {
    assert.ok(acceptedNodeIds.has(edge.from));
    assert.ok(acceptedNodeIds.has(edge.to));
    assert.equal(edge.readOnly, true);
  }

  assert.equal(sourceGraph.schemaVersion, "1.1.0-alpha.3");
  assert.equal(sourceGraph.readOnly, true);
  assert.equal(sourceGraph.editingSupported, false);
  assert.equal(sourceGraph.source, ".orange-hyper/graph");
  assert.equal(sourceGraph.nodeBoundary, "accepted-memory-nodes-only");
  assert.equal(sourceGraph.edgeBoundary, "persisted-accepted-memory-edges-only");
  assert.equal(sourceGraph.acceptedMemoryNodes, 3);
  assert.deepEqual(new Set(sourceGraph.nodes.map((node) => node.id)), acceptedNodeIds);
  for (const node of sourceGraph.nodes) {
    assert.equal(node.project_id, config.project_id);
    assert.equal(node.graphKind, "memory");
    assert.equal(node.sourceOfTruth, true);
    assert.equal(node.displayOnly, false);
    assert.equal(node.derived, false);
    assert.equal(node.readOnly, true);
  }
  for (const edge of sourceGraph.edges) {
    assert.ok(acceptedNodeIds.has(edge.from));
    assert.ok(acceptedNodeIds.has(edge.to));
    assert.equal(edge.sourceOfTruth, true);
    assert.equal(edge.displayOnly, false);
    assert.equal(edge.derived, false);
    assert.equal(edge.readOnly, true);
  }

  assert.equal(visualGraph.schemaVersion, "1.1.0-alpha.3");
  assert.equal(visualGraph.readOnly, true);
  assert.equal(visualGraph.editingSupported, false);
  assert.equal(visualGraph.displayOnly, true);
  assert.equal(visualGraph.source, "identity-html-visual-only");
  assert.equal(visualGraph.layout, "deterministic-seeded-force");
  assert.ok(visualGraph.nodes.length > sourceGraph.nodes.length);
  assert.ok(visualGraph.nodes.length >= 20, `expected dense visual graph, got ${visualGraph.nodes.length}`);
  assert.ok(visualGraph.edges.length > preview.edges.length);
  assert.equal(visualGraph.nodes.some((node) => node.type === "concept"), true);
  assert.equal(visualGraph.nodes.some((node) => node.type === "sourceQuest"), true);
  assert.equal(visualGraph.nodes.some((node) => node.type === "sourceProposal"), true);
  assert.equal(visualGraph.nodes.some((node) => node.type === "category"), true);
  const memoryVisualNodes = visualGraph.nodes.filter((node) => node.type === "memory");
  assert.deepEqual(new Set(memoryVisualNodes.map((node) => node.id)), acceptedNodeIds);
  for (const node of visualGraph.nodes.filter((node) => node.derived)) {
    assert.equal(node.displayOnly, true);
    assert.equal(node.derived, true);
    assert.equal(node.readOnly, true);
  }

  const stateText = fs.readFileSync(paths.identityHtml, "utf8");
  const state = extractJsonScript(stateText, "orange-knowledge-graph-state");
  assert.equal(state.readOnly, true);
  assert.equal(state.sourceGraph.nodes.length, 3);
  assert.equal(state.visualGraph.nodes.length, visualGraph.nodes.length);
  assert.deepEqual(new Set(state.sourceGraph.nodes.map((node) => node.id)), acceptedNodeIds);
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
  assert.match(html, /class="identity-shell"/);
  assert.match(html, /\.identity-shell \{[^}]*width: 100vw;[^}]*height: 100vh/s);
  assert.match(html, /\.graph-stage \{[^}]*width: 100vw;[^}]*height: 100vh/s);
  assert.match(html, /\.knowledge-graph-svg \{[^}]*width: 100vw;[^}]*height: 100vh/s);
  assert.doesNotMatch(html, /main\s*\{[^}]*max-width/i);
  assert.match(html, /id="knowledge-graph-svg"/);
  assert.match(html, /class="knowledge-graph-svg"/);
  assert.match(html, /setAttribute\("class", "graph-edge"\)/);
  assert.match(html, /setAttribute\("class", "graph-node"\)/);
  assert.match(html, /id="sidebar-toggle"/);
  assert.match(html, /class="hamburger-lines"/);
  assert.match(html, /id="identity-sidebar" class="side-drawer" data-open="false"/);
  assert.match(html, /id="node-detail-drawer"/);
  assert.match(html, /id="filter-drawer"/);
  assert.match(html, /id="graph-search"/);
  assert.match(html, /id="graph-type-filter"/);
  assert.match(html, /id="toggle-derived"/);
  assert.match(html, /id="toggle-labels"/);
  assert.match(html, /id="reset-view"/);
  assert.match(html, /id="fit-view"/);
  assert.match(html, /aria-label="Visual legend"/);
  assert.match(html, /#ffb454/);
  assert.match(html, /Read-only Knowledge Graph/);
  assert.match(html, /Built from accepted project memory/);
  assert.match(html, /Derived concept\/source nodes are visual-only/);
  assert.match(html, /Not a code dependency graph/);
  assert.match(html, /Pending\/rejected proposals excluded/);
  assert.match(html, /Graph editing is not supported\./);
  assert.match(html, /<noscript>/);
  assert.match(html, /id="knowledge-graph-table"/);
  assert.ok(html.indexOf("id=\"knowledge-graph-table\"") > html.indexOf("id=\"identity-sidebar\""));
  for (const script of extractRuntimeScripts(html)) {
    assert.doesNotThrow(() => new Function(script));
  }
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.doesNotMatch(html, /\bfetch\s*\(/i);
  assert.doesNotMatch(html, /\b(?:d3|cytoscape|sigma)\b/i);
  assert.doesNotMatch(html, /contenteditable|data-graph-edit|graph-editor|<button[^>]*>\s*(?:Edit|Delete|Create|Save)/i);
});

test("identity Knowledge Graph handles empty accepted memory without breaking fallback layout", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd, { projectName: "empty-identity-graph-demo" });

  const payload = assertJsonCommand(runOrange(["identity", "build", "--json"], cwd), "identity.build");
  const preview = payload.data.summary.graphPreview;
  const sourceGraph = payload.data.summary.sourceGraph;
  const visualGraph = payload.data.summary.visualGraph;
  assert.equal(preview.acceptedMemoryNodes, 0);
  assert.deepEqual(preview.nodes, []);
  assert.deepEqual(preview.edges, []);
  assert.deepEqual(sourceGraph.nodes, []);
  assert.deepEqual(sourceGraph.edges, []);
  assert.deepEqual(visualGraph.nodes, []);
  assert.deepEqual(visualGraph.edges, []);

  const html = fs.readFileSync(paths.identityHtml, "utf8");
  assert.match(html, /No accepted memory nodes yet/);
  assert.match(html, /No accepted memory nodes/);
  assert.match(html, /id="knowledge-graph-svg"/);
  assert.match(html, /id="knowledge-graph-table"/);
  assert.match(html, /JavaScript is disabled, so this read-only accepted memory table is shown instead of the SVG graph\./);
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
