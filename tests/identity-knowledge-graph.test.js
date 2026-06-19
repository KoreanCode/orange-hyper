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
  createSourceFixture(cwd);
  assertJsonCommand(runOrange(["sync", "apply", "--json"], cwd), "sync.apply");
  const config = readConfig(cwd);
  const firstAccepted = createAcceptedMemory(cwd, "document accepted dashboard decision", "decision", "identity graph checked", ["src/user/user-service.js"]);
  const secondAccepted = createAcceptedMemory(cwd, "document accepted dashboard tradeoff", "decision", "identity graph checked", ["docs/architecture.md"]);
  const thirdAccepted = createAcceptedMemory(cwd, "source visual concept clustering verification", "verification", "identity graph checked");
  const pending = createPendingMemory(cwd, "pending dashboard note", "risk");
  const rejected = createRejectedMemory(cwd, "rejected dashboard note", "verification");

  const payload = assertJsonCommand(runOrange(["identity", "build", "--json"], cwd), "identity.build");
  const summary = payload.data.summary;
  const preview = summary.graphPreview;
  const sourceGraph = summary.sourceGraph;
  const structureGraph = summary.structureGraph;
  const memoryGraph = summary.memoryGraph;
  const identityGraph = summary.identityGraph;
  const visualGraph = summary.visualGraph;

  assert.equal(preview.schemaVersion, "1.1.0-alpha.8");
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

  assert.equal(sourceGraph.schemaVersion, "1.1.0-alpha.8");
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

  assert.equal(structureGraph.nodes.some((node) => node.id === "project.root" && node.type === "project"), true);
  assert.equal(structureGraph.nodes.some((node) => node.id === "component.src-user-user-service" && node.role === "service"), true);
  assert.equal(structureGraph.nodes.some((node) => acceptedNodeIds.has(node.id)), false);
  assert.deepEqual(new Set(memoryGraph.nodes.map((node) => node.id)), acceptedNodeIds);
  assert.deepEqual(memoryGraph.nodes, sourceGraph.nodes);

  assert.equal(identityGraph.schemaVersion, "1.1.0-alpha.8");
  assert.equal(identityGraph.source, "structure-plus-accepted-memory");
  assert.equal(identityGraph.nodes.some((node) => node.id === "project.root" && node.layoutRole === "center"), true);
  assert.equal(identityGraph.nodes.some((node) => node.type === "memory"), true);
  assert.equal(identityGraph.nodes.some((node) => node.type === "component"), true);
  assert.equal(identityGraph.edges.some((edge) => edge.relation === "documents" && acceptedNodeIds.has(edge.from)), true);

  assert.equal(visualGraph.schemaVersion, "1.1.0-alpha.8");
  assert.equal(visualGraph.readOnly, true);
  assert.equal(visualGraph.editingSupported, false);
  assert.equal(visualGraph.displayOnly, true);
  assert.equal(visualGraph.source, "structure-plus-accepted-memory");
  assert.equal(visualGraph.layout, "deterministic-radial-cluster-v2");
  assert.ok(visualGraph.nodes.length > sourceGraph.nodes.length);
  assert.ok(visualGraph.nodes.length >= structureGraph.nodes.length + sourceGraph.nodes.length);
  assert.ok(visualGraph.edges.length > preview.edges.length);
  assert.equal(visualGraph.nodes.some((node) => node.type === "concept"), false);
  assert.equal(visualGraph.nodes.some((node) => node.type === "sourceQuest"), false);
  assert.equal(visualGraph.nodes.some((node) => node.type === "sourceProposal"), false);
  assert.equal(visualGraph.nodes.some((node) => node.label === "Before" || node.label === "Should" || node.label === "Work" || node.label === "v0.4.0-alpha.1"), false);
  const memoryVisualNodes = visualGraph.nodes.filter((node) => node.type === "memory");
  assert.deepEqual(new Set(memoryVisualNodes.map((node) => node.id)), acceptedNodeIds);
  const rootVisual = visualGraph.nodes.find((node) => node.id === "project.root");
  assert.equal(rootVisual.x, 0);
  assert.equal(rootVisual.y, 0);
  assert.equal(rootVisual.layoutRole, "center");
  assert.equal(rootVisual.layoutComputedAt, "build-time");
  assert.equal(visualGraph.nodes.filter((node) => node.type === "module" || node.type === "domain").every((node) => typeof node.x === "number" && typeof node.y === "number"), true);
  assert.equal(memoryVisualNodes.every((node) => typeof node.x === "number" && typeof node.y === "number"), true);
  for (const node of visualGraph.nodes.filter((node) => node.derived)) {
    assert.equal(node.displayOnly, true);
    assert.equal(node.derived, true);
    assert.equal(node.readOnly, true);
  }

  const stateText = fs.readFileSync(paths.identityHtml, "utf8");
  const state = extractJsonScript(stateText, "orange-knowledge-graph-state");
  assert.equal(state.readOnly, true);
  assert.equal(state.structureGraph.nodes.some((node) => node.id === "project.root"), true);
  assert.equal(state.memoryGraph.nodes.length, 3);
  assert.equal(state.identityGraph.nodes.some((node) => node.id === "project.root"), true);
  assert.equal(state.mappingSummary.mapped, 2);
  assert.equal(state.state_revision, summary.state_revision);
  assert.equal(state.identity_built_from_revision, summary.identity_built_from_revision);
  assert.equal(state.identity_status, "current");
  assert.equal(state.renderer.surface, "canvas");
  assert.equal(state.renderer.layoutComputedAt, "build-time");
  assert.equal(Object.hasOwn(state, "sourceGraph"), false);
  assert.equal(Object.hasOwn(state, "visualGraph"), false);
  assert.equal(Object.hasOwn(state, "graph"), false);
  assert.deepEqual(new Set(state.memoryGraph.nodes.map((node) => node.id)), acceptedNodeIds);
  assert.doesNotMatch(JSON.stringify(state), new RegExp(escapeRegExp(pending.data.id)));
  assert.doesNotMatch(JSON.stringify(state), new RegExp(escapeRegExp(rejected.data.id)));
});

test("identity HTML contains canvas graph view, modes, responsive drawers, and table fallback", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd, { projectName: "identity-html-graph-demo" });
  createAcceptedMemory(cwd, "accepted graph html decision", "decision", "identity html checked");

  assertJsonCommand(runOrange(["identity", "build", "--json"], cwd), "identity.build");
  const html = fs.readFileSync(paths.identityHtml, "utf8");

  assert.match(html, /Knowledge Graph Dashboard/);
  assert.match(html, /class="identity-shell"/);
  assert.match(html, /\.identity-shell \{[^}]*width: 100vw;[^}]*height: 100vh/s);
  assert.match(html, /\.graph-stage \{[^}]*width: 100vw;[^}]*height: 100vh/s);
  assert.match(html, /\.knowledge-graph-canvas \{[^}]*width: 100vw;[^}]*height: 100vh/s);
  assert.doesNotMatch(html, /main\s*\{[^}]*max-width/i);
  assert.match(html, /id="knowledge-graph-canvas"/);
  assert.match(html, /class="knowledge-graph-canvas"/);
  assert.match(html, /getContext\("2d"\)/);
  assert.doesNotMatch(html, /computeLayout\s*=/);
  assert.match(html, /id="sidebar-toggle"/);
  assert.match(html, /class="hamburger-lines"/);
  assert.match(html, /id="identity-sidebar" class="side-drawer" data-open="false"/);
  assert.match(html, /id="tab-overview"/);
  assert.match(html, /id="tab-structure"/);
  assert.match(html, /id="tab-memory"/);
  assert.match(html, /id="tab-diagnostics"/);
  assert.match(html, /id="node-detail-drawer"/);
  assert.match(html, /id="control-drawer"/);
  assert.match(html, /id="graph-search"/);
  assert.match(html, /id="graph-view-mode"/);
  assert.match(html, /<option value="combined" selected>Combined<\/option>/);
  assert.match(html, /<option value="structure">Structure<\/option>/);
  assert.match(html, /<option value="memory">Memory<\/option>/);
  assert.match(html, /id="reset-view"/);
  assert.match(html, /id="fit-view"/);
  assert.match(html, /\.side-drawer, \.control-drawer, \.node-detail-drawer \{[^}]*height: 100dvh;[^}]*max-height: 100dvh;[^}]*overflow: auto;[^}]*overflow-x: hidden/s);
  assert.match(html, /\.side-drawer \{[^}]*width: min\(460px, 100dvw\);[^}]*max-width: 100dvw/s);
  assert.match(html, /\.side-drawer, \.control-drawer, \.node-detail-drawer \{ width: 100dvw; max-width: 100dvw; height: 100dvh; max-height: 100dvh; \}/);
  assert.match(html, /overflow-wrap: anywhere/);
  assert.match(html, /word-break: break-word/);
  assert.match(html, /#ffb454/);
  assert.match(html, /Read-only Knowledge Graph/);
  assert.match(html, /Structure Graph and Memory Graph stay separate before composition/);
  assert.match(html, /Combined view shows mapping edges/);
  assert.match(html, /Pending\/rejected proposals excluded/);
  assert.match(html, /Graph editing is not supported\./);
  assert.match(html, /sourceStateUnmodified: true/);
  assert.match(html, /layoutMs: 0/);
  assert.match(html, /<noscript>/);
  assert.match(html, /id="knowledge-graph-table"/);
  assert.ok(html.indexOf("id=\"knowledge-graph-table\"") > html.indexOf("id=\"identity-sidebar\""));
  for (const script of extractRuntimeScripts(html)) {
    assert.doesNotThrow(() => new Function(script));
  }
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.doesNotMatch(html, /<link[^>]+href=["']https?:/i);
  assert.doesNotMatch(html, /\bfetch\s*\(/i);
  assert.doesNotMatch(html, /\bXMLHttpRequest\b|\bimport\s*\(/i);
  assert.doesNotMatch(html, /contenteditable|data-graph-edit|graph-editor|<button[^>]*>\s*(?:Edit|Delete|Create|Save)/i);
});

test("identity Knowledge Graph handles empty accepted memory without breaking fallback layout", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd, { projectName: "empty-identity-graph-demo" });

  const payload = assertJsonCommand(runOrange(["identity", "build", "--json"], cwd), "identity.build");
  const preview = payload.data.summary.graphPreview;
  const sourceGraph = payload.data.summary.sourceGraph;
  const structureGraph = payload.data.summary.structureGraph;
  const memoryGraph = payload.data.summary.memoryGraph;
  const identityGraph = payload.data.summary.identityGraph;
  const visualGraph = payload.data.summary.visualGraph;
  assert.equal(preview.acceptedMemoryNodes, 0);
  assert.deepEqual(preview.nodes, []);
  assert.deepEqual(preview.edges, []);
  assert.deepEqual(sourceGraph.nodes, []);
  assert.deepEqual(sourceGraph.edges, []);
  assert.deepEqual(memoryGraph.nodes, []);
  assert.equal(structureGraph.nodes.some((node) => node.id === "project.root"), true);
  assert.equal(identityGraph.nodes.some((node) => node.id === "project.root"), true);
  assert.equal(visualGraph.nodes.some((node) => node.id === "project.root"), true);

  const html = fs.readFileSync(paths.identityHtml, "utf8");
  assert.match(html, /No accepted memory nodes yet/);
  assert.match(html, /No accepted memory nodes/);
  assert.match(html, /id="knowledge-graph-canvas"/);
  assert.match(html, /id="knowledge-graph-table"/);
  assert.match(html, /JavaScript is disabled, so this read-only accepted memory table is shown instead of the canvas graph\./);
});

test("identity build handles a 500 node structure fixture with build-time layout", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd, { projectName: "large-identity-graph-demo" });
  createLargeStructureFixture(cwd);
  assertJsonCommand(runOrange(["sync", "apply", "--json"], cwd), "sync.apply");
  createAcceptedMemory(cwd, "remember service component 042", "decision", "large graph checked", ["src/domain-04/service-042.js"]);

  const payload = assertJsonCommand(runOrange(["identity", "build", "--json"], cwd), "identity.build");
  const summary = payload.data.summary;
  assert.ok(summary.structureGraph.nodes.length >= 500, `expected >=500 structure nodes, got ${summary.structureGraph.nodes.length}`);
  assert.ok(summary.identityGraph.nodes.length >= 500, `expected >=500 identity nodes, got ${summary.identityGraph.nodes.length}`);
  assert.equal(summary.identityGraph.nodes.find((node) => node.id === "project.root").x, 0);
  assert.equal(summary.identityGraph.nodes.find((node) => node.id === "project.root").y, 0);
  assert.equal(summary.identityGraph.nodes.every((node) => typeof node.x === "number" && typeof node.y === "number"), true);
  assert.equal(summary.identityGraph.nodes.some((node) => node.type === "concept"), false);
  const html = fs.readFileSync(paths.identityHtml, "utf8");
  const state = extractJsonScript(html, "orange-knowledge-graph-state");
  assert.equal(state.identityGraph.nodes.length, summary.identityGraph.nodes.length);
  assert.equal(state.renderer.surface, "canvas");
  assert.equal(state.renderer.runtimeFetch, false);
  assert.equal(state.renderer.graphEditing, false);
});

function createAcceptedMemory(cwd, title, nodeType, evidence, paths = []) {
  const quest = createCompletedQuest(cwd, title, evidence, paths);
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

function createCompletedQuest(cwd, title, evidence, paths = []) {
  const quest = createQuest(cwd, title, {
    layer: "L2",
    paths,
    expectedVerification: [evidence],
    clock: nextClock()
  });
  completeQuest(cwd, quest.id, {
    clock: nextClock(),
    evidence: [evidence]
  });
  return quest;
}

function createSourceFixture(cwd) {
  fs.mkdirSync(path.join(cwd, "src", "user"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "docs"), { recursive: true });
  fs.writeFileSync(path.join(cwd, "package.json"), JSON.stringify({ name: "identity-fixture" }, null, 2));
  fs.writeFileSync(path.join(cwd, "src", "user", "user-service.js"), "export function userService() { return true; }\n");
  fs.writeFileSync(path.join(cwd, "docs", "architecture.md"), "# Architecture\n");
}

function createLargeStructureFixture(cwd) {
  fs.mkdirSync(path.join(cwd, "src"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "tests"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "docs"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "config"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "db"), { recursive: true });
  fs.writeFileSync(path.join(cwd, "package.json"), JSON.stringify({ name: "large-identity-fixture", type: "module" }, null, 2));
  for (let index = 0; index < 160; index += 1) {
    const domain = `domain-${String(index % 12).padStart(2, "0")}`;
    fs.mkdirSync(path.join(cwd, "src", domain), { recursive: true });
    fs.writeFileSync(path.join(cwd, "src", domain, `service-${String(index).padStart(3, "0")}.js`), `export const service${index} = true;\n`);
  }
  for (let index = 0; index < 120; index += 1) {
    const domain = `domain-${String(index % 10).padStart(2, "0")}`;
    fs.mkdirSync(path.join(cwd, "tests", domain), { recursive: true });
    fs.writeFileSync(path.join(cwd, "tests", domain, `service-${String(index).padStart(3, "0")}.test.js`), `import '../../src/domain-00/service-000.js';\n`);
  }
  for (let index = 0; index < 120; index += 1) {
    fs.writeFileSync(path.join(cwd, "docs", `topic-${String(index).padStart(3, "0")}.md`), `# Topic ${index}\n`);
  }
  for (let index = 0; index < 120; index += 1) {
    fs.writeFileSync(path.join(cwd, "config", `config-${String(index).padStart(3, "0")}.yaml`), `name: config-${index}\n`);
  }
  for (let index = 0; index < 80; index += 1) {
    fs.writeFileSync(path.join(cwd, "db", `schema-${String(index).padStart(3, "0")}.sql`), `select ${index};\n`);
  }
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
    encoding: "utf8",
    maxBuffer: 24 * 1024 * 1024
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
