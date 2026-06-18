import fs from "node:fs";
import path from "node:path";
import { readProjectIdentity, requireInitialized } from "./config.js";
import { listGraphNodes } from "./graph.js";
import { buildGrowthSuggestionResult } from "./growth.js";
import { pendingProposalWarningCount, proposalCountsByStatus, topProposalNodeTypes } from "./memory.js";
import { originMetadata } from "./origin.js";
import { workspacePaths } from "./paths.js";
import { listQuests } from "./quest.js";
import { nowIso } from "./time.js";

const IDENTITY_STATUS_MESSAGES = [
  "Memory proposal review is active.",
  "This is a read-only Knowledge Graph.",
  "It is built from accepted memory nodes.",
  "It is not a code dependency graph.",
  "Pending/rejected proposals are not included.",
  "Graph editing is not supported.",
  "Accepted memory nodes are candidate project memory."
];

const GRAPH_DASHBOARD_SCHEMA_VERSION = "1.1.0-alpha.0";

const NODE_TYPE_COLORS = {
  decision: "#ffb454",
  constraint: "#67e8f9",
  component: "#a78bfa",
  risk: "#fb7185",
  verification: "#86efac"
};

const DEFAULT_NODE_COLOR = "#f8fafc";

/**
 * @returns {import("./types.d.ts").IdentityBuildResult}
 */
export function buildIdentityPlaceholder(cwd = process.cwd(), options = {}) {
  requireInitialized(cwd);
  const paths = workspacePaths(cwd);
  const project = readProjectIdentity(cwd);
  const quests = listQuests(cwd, "all");
  const active = quests.filter((quest) => quest.data.status === "active");
  const completed = quests.filter((quest) => quest.data.status === "completed");
  const verified = completed.filter((quest) => quest.data.verification_status === "verified");
  const unverified = completed.filter((quest) => quest.data.verification_status === "unverified");
  const routeDistribution = readRouteDistribution(paths.routeTrace);
  const memoryProposalCounts = proposalCountsByStatus(cwd);
  const pendingWarnings = pendingProposalWarningCount(cwd);
  const graph = listGraphNodes(cwd);
  const acceptedMemoryNodes = graph.nodes.length;
  const proposalNodeTypes = topProposalNodeTypes(cwd);
  const graphPreview = buildGraphPreview(graph.nodes);
  const growthSuggestion = buildGrowthSuggestionResult(cwd);
  const growthPreview = buildGrowthPreview(growthSuggestion.status, growthSuggestion);
  const generatedAt = nowIso(options.clock);
  const projectName = project.project_name || path.basename(cwd);
  const origin = originMetadata();

  fs.mkdirSync(paths.identity, { recursive: true });
  const summary = {
    ...origin,
    project_id: project.project_id,
    project_name: projectName,
    projectId: project.project_id,
    projectName,
    generatedAt,
    activeCount: active.length,
    completedCount: completed.length,
    verifiedCount: verified.length,
    unverifiedCount: unverified.length,
    routeDistribution,
    pendingMemoryProposals: memoryProposalCounts.pending,
    pendingMemoryProposalsWithWarnings: pendingWarnings,
    acceptedMemoryProposals: memoryProposalCounts.accepted,
    rejectedMemoryProposals: memoryProposalCounts.rejected,
    acceptedMemoryNodes,
    projectBoundaryActive: Boolean(project.project_id),
    topProposalNodeTypes: proposalNodeTypes,
    graphPreview,
    growthPreview,
    graphWarnings: graph.warnings,
    origin,
    statusMessages: IDENTITY_STATUS_MESSAGES
  };
  const html = renderIdentityHtml(summary);
  fs.writeFileSync(paths.identityHtml, html);
  fs.writeFileSync(paths.identitySummaryJson, `${JSON.stringify(summary, null, 2)}\n`);
  return {
    filePath: paths.identityHtml,
    summaryFilePath: paths.identitySummaryJson,
    html,
    summary
  };
}

/**
 * @returns {Record<string, number>}
 */
function readRouteDistribution(routeTracePath) {
  /** @type {Record<string, number>} */
  const distribution = {};
  if (!fs.existsSync(routeTracePath)) {
    return distribution;
  }
  const lines = fs.readFileSync(routeTracePath, "utf8").split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    try {
      const trace = JSON.parse(line);
      const layer = trace.contract?.layer || String(trace.contract?.route || "").split("/")[0] || "unknown";
      distribution[layer] = (distribution[layer] || 0) + 1;
    } catch {
      distribution.invalid = (distribution.invalid || 0) + 1;
    }
  }
  return distribution;
}

/**
 * @returns {import("./types.d.ts").IdentitySummary["graphPreview"]}
 */
function buildGraphPreview(nodes) {
  const nodeTypeDistribution = {};
  for (const node of nodes) {
    nodeTypeDistribution[node.node_type] = (nodeTypeDistribution[node.node_type] || 0) + 1;
  }
  const sourceLinks = nodes.map((node) => ({
    node_id: node.id,
    node_type: node.node_type,
    title: node.title,
    source_quest: node.source_quest,
    source_proposal: node.source_proposal,
    accepted_at: node.accepted_at
  }));
  const edges = buildGraphPreviewEdges(nodes);
  const degreeByNode = degreeByNodeId(nodes, edges);
  return /** @type {import("./types.d.ts").IdentitySummary["graphPreview"]} */ ({
    schemaVersion: GRAPH_DASHBOARD_SCHEMA_VERSION,
    readOnly: true,
    editingSupported: false,
    acceptedMemoryNodes: nodes.length,
    project_id: nodes[0]?.project_id || null,
    nodeTypeColors: NODE_TYPE_COLORS,
    nodeTypeDistribution,
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.node_type,
      label: node.title || node.id,
      project_id: node.project_id,
      project_name: node.project_name,
      generated_by: node.generated_by,
      generator_package: node.generator_package,
      generator_version: node.generator_version,
      source_repository: node.source_repository,
      official_package: node.official_package,
      node_type: node.node_type,
      title: node.title,
      source_quest: node.source_quest,
      source_proposal: node.source_proposal,
      accepted_at: node.accepted_at,
      candidate_memory: node.candidate_memory,
      candidate_memory_summary: node.candidate_memory || node.summary || node.title || node.id,
      summary: node.summary,
      degree: degreeByNode.get(node.id) || 0,
      readOnly: true,
      tags: node.tags,
      keywords: node.keywords
    })),
    edges,
    sourceLinks
  });
}

function buildGraphPreviewEdges(nodes) {
  const edgeKeys = new Set();
  const edges = [];
  const sorted = [...nodes].sort((left, right) => left.id.localeCompare(right.id));
  addSequentialGroupEdges(edges, edgeKeys, groupByField(sorted, "source_quest"), "derived_from_source_quest");
  addSequentialGroupEdges(edges, edgeKeys, groupByField(sorted, "node_type"), "same_node_type");
  return edges
    .map((edge, index) => ({ id: `edge-${String(index + 1).padStart(3, "0")}`, ...edge }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function addSequentialGroupEdges(edges, edgeKeys, groups, relation) {
  for (const [source, group] of groups) {
    if (!source || group.length < 2) {
      continue;
    }
    for (let index = 1; index < group.length; index += 1) {
      const from = group[index - 1].id;
      const to = group[index].id;
      const ordered = [from, to].sort();
      const key = `${ordered[0]}|${ordered[1]}|${relation}|${source}`;
      if (edgeKeys.has(key)) {
        continue;
      }
      edgeKeys.add(key);
      edges.push({
        from,
        to,
        relation,
        source,
        readOnly: true
      });
    }
  }
}

function groupByField(nodes, field) {
  const groups = new Map();
  for (const node of nodes) {
    const value = String(node[field] || "");
    const group = groups.get(value) || [];
    group.push(node);
    groups.set(value, group);
  }
  return groups;
}

function degreeByNodeId(nodes, edges) {
  const degrees = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    if (degrees.has(edge.from)) {
      degrees.set(edge.from, degrees.get(edge.from) + 1);
    }
    if (degrees.has(edge.to)) {
      degrees.set(edge.to, degrees.get(edge.to) + 1);
    }
  }
  return degrees;
}

/**
 * @param {import("./types.d.ts").GrowthStatus} status
 * @param {import("./types.d.ts").GrowthSuggestionResult} suggestion
 * @returns {import("./types.d.ts").IdentitySummary["growthPreview"]}
 */
function buildGrowthPreview(status, suggestion) {
  return {
    readOnly: true,
    autoUnlock: false,
    growthLevel: status.growthLevel,
    growthLevelReason: status.growthLevelReason,
    growthLevelDescription: status.growthLevelDescription,
    acceptedMemoryNodes: status.acceptedMemoryNodes,
    nodeTypeDistribution: status.nodeTypeDistribution,
    nodeTypeDiversity: status.nodeTypeDiversity,
    dominantAcceptedNodeType: status.dominantAcceptedNodeType,
    questVerification: status.questVerification,
    pendingMemoryProposals: status.pendingMemoryProposals,
    hookWarningCount: status.hookWarningSummary.warningCount,
    mcpAdvisorSignalCount: status.mcpAdvisorSignals.signalCount,
    candidateCount: suggestion.candidates.length,
    topCandidates: suggestion.candidates.slice(0, 3).map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      score: candidate.score,
      evidence_count: candidate.evidence_count,
      confidence: candidate.confidence,
      suggested_next_step: candidate.suggested_next_step,
      auto_unlock: false,
      requires_user_approval: true
    })),
    growthConfidenceSummary: growthConfidenceSummary(suggestion.candidates),
    noAutomaticUnlocks: "No automatic unlocks",
    suggestedCommand: "orange growth suggest --json",
    boundaries: status.boundaries
  };
}

function growthConfidenceSummary(candidates) {
  if (!candidates.length) {
    return "No candidates met the evidence threshold.";
  }
  const counts = candidates.reduce((acc, candidate) => {
    acc[candidate.confidence] = (acc[candidate.confidence] || 0) + 1;
    return acc;
  }, {});
  return ["high", "medium", "low"]
    .filter((key) => counts[key])
    .map((key) => `${counts[key]} ${key}`)
    .join(", ");
}

function renderIdentityHtml(model) {
  const routeRows = Object.entries(model.routeDistribution)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([layer, count]) => `<tr><td>${escapeHtml(layer)}</td><td>${count}</td></tr>`)
    .join("\n");
  const routes = routeRows || "<tr><td>none</td><td>0</td></tr>";
  const proposalRows = model.topProposalNodeTypes
    .map((item) => `<tr><td>${escapeHtml(item.nodeType)}</td><td>${item.count}</td></tr>`)
    .join("\n");
  const proposals = proposalRows || "<tr><td>none</td><td>0</td></tr>";
  const graphTypeRows = Object.entries(model.graphPreview.nodeTypeDistribution)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([nodeType, count]) => `<tr><td>${escapeHtml(nodeType)}</td><td>${count}</td></tr>`)
    .join("\n");
  const graphTypes = graphTypeRows || "<tr><td>none</td><td>0</td></tr>";
  const graphRows = model.graphPreview.nodes
    .map((node) => `<tr><td><a href="#${nodeAnchorId(node.id)}">${escapeHtml(node.id)}</a></td><td>${escapeHtml(node.node_type)}</td><td>${escapeHtml(node.title)}</td><td>${escapeHtml(node.source_quest)}</td><td>${escapeHtml(node.source_proposal)}</td><td>${node.degree}</td></tr>`)
    .join("\n");
  const graphNodes = graphRows || "<tr><td>none</td><td>none</td><td>No accepted memory nodes</td><td>none</td><td>none</td><td>0</td></tr>";
  const nodeDetails = renderNodeDetails(model.graphPreview.nodes);
  const growthTypeRows = Object.entries(model.growthPreview.nodeTypeDistribution)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([nodeType, count]) => `<tr><td>${escapeHtml(nodeType)}</td><td>${count}</td></tr>`)
    .join("\n");
  const growthTypes = growthTypeRows || "<tr><td>none</td><td>0</td></tr>";
  const growthCandidateRows = model.growthPreview.topCandidates
    .map((candidate) => `<tr><td>${escapeHtml(candidate.id)}</td><td>${candidate.score}</td><td>${candidate.evidence_count}</td><td>${escapeHtml(candidate.confidence)}</td></tr>`)
    .join("\n");
  const growthCandidates = growthCandidateRows || "<tr><td>none</td><td>0</td><td>0</td><td>none</td></tr>";
  const growthCandidateDetails = model.growthPreview.topCandidates.length
    ? `<ul>${model.growthPreview.topCandidates.map((candidate) => `<li><strong>${escapeHtml(candidate.title)}</strong>: ${escapeHtml(candidate.suggested_next_step)}</li>`).join("\n")}</ul>`
    : "<p class=\"subtle\">No growth candidates met the evidence threshold.</p>";
  const statusMessages = model.statusMessages
    .map((message) => `<li>${escapeHtml(message)}</li>`)
    .join("\n");
  const stateJson = escapeScriptJson(JSON.stringify({
    schemaVersion: GRAPH_DASHBOARD_SCHEMA_VERSION,
    project: {
      project_id: model.project_id || "",
      project_name: model.project_name || model.projectName || "",
      generatedAt: model.generatedAt
    },
    origin: model.origin || originMetadata(),
    acceptedMemoryNodes: model.acceptedMemoryNodes,
    projectBoundaryActive: model.projectBoundaryActive,
    nodeTypeDistribution: model.graphPreview.nodeTypeDistribution,
    graph: {
      readOnly: true,
      nodes: model.graphPreview.nodes,
      edges: model.graphPreview.edges,
      nodeTypeColors: model.graphPreview.nodeTypeColors,
      project_id: model.project_id || "",
      project_name: model.project_name || model.projectName || ""
    },
    graphPreview: model.graphPreview,
    growthPreview: model.growthPreview,
    readOnly: true,
    editingSupported: false
  }, null, 2));
  const graphDashboardState = escapeScriptJson(JSON.stringify({
    schemaVersion: GRAPH_DASHBOARD_SCHEMA_VERSION,
    project_id: model.project_id || "",
    project_name: model.project_name || model.projectName || "",
    readOnly: true,
    nodes: model.graphPreview.nodes,
    edges: model.graphPreview.edges,
    nodeTypeColors: model.graphPreview.nodeTypeColors
  }));
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="generator" content="${escapeHtml(model.generated_by || "Orange Hyper")} ${escapeHtml(model.generator_version || "")}">
  <meta name="source-repository" content="${escapeHtml(model.source_repository || "")}">
  <title>Orange Hyper Identity - ${escapeHtml(model.projectName)}</title>
  <style>
    :root { color-scheme: light; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f7f5f0; color: #25211b; }
    main { max-width: 920px; margin: 0 auto; padding: 40px 24px; }
    h1 { margin: 0 0 8px; font-size: 32px; letter-spacing: 0; }
    .subtle { color: #665f55; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 28px 0; }
    .card { border: 1px solid #ddd5c8; border-radius: 8px; background: #fffaf1; padding: 16px; }
    .label { color: #736a5d; font-size: 13px; }
    .value { font-size: 28px; font-weight: 700; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; background: #fffaf1; border: 1px solid #ddd5c8; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e9e0d2; }
    th { color: #5f574c; font-size: 13px; }
    .split { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(220px, .7fr); gap: 16px; align-items: start; }
    .graph-preview { margin-top: 28px; }
    .graph-svg { width: 100%; height: 180px; background: #fffaf1; border: 1px solid #ddd5c8; }
    .detail { border: 1px solid #ddd5c8; background: #fffaf1; padding: 16px; }
    .detail h3 { margin-top: 0; }
    .node-details { display: grid; gap: 10px; margin-top: 16px; }
    .node-detail { border: 1px solid #ddd5c8; background: #fffaf1; padding: 12px 14px; }
    .node-detail summary { cursor: pointer; font-weight: 700; }
    .knowledge-graph { margin-top: 28px; }
    .graph-boundary { margin: 12px 0 16px; padding: 14px 16px; border: 1px solid #c89443; background: #fff2d6; border-radius: 8px; }
    .graph-boundary ul { margin: 0; padding-left: 20px; }
    .graph-workbench { display: grid; grid-template-columns: minmax(0, 1fr) minmax(240px, 320px); gap: 16px; align-items: stretch; }
    .graph-controls { display: flex; flex-wrap: wrap; gap: 10px; margin: 0 0 12px; }
    .graph-controls label { display: grid; gap: 5px; color: #5f574c; font-size: 13px; }
    .graph-controls input, .graph-controls select { border: 1px solid #cdbfaa; background: #fffaf1; color: #25211b; border-radius: 6px; padding: 8px 10px; min-width: 180px; }
    .graph-canvas { position: relative; min-height: 430px; border: 1px solid #253449; border-radius: 8px; background: #08111f; overflow: hidden; }
    .knowledge-graph-svg { display: block; width: 100%; height: 430px; background: radial-gradient(circle at 18% 12%, #132238 0, #08111f 38%, #050914 100%); }
    .graph-empty-message { position: absolute; inset: 0; display: grid; place-items: center; padding: 24px; color: #cad7e7; text-align: center; }
    .graph-edge { stroke: #516172; stroke-width: 1.8; opacity: .7; }
    .graph-node { cursor: pointer; }
    .graph-node circle { stroke: #f8fafc; stroke-width: 1.8; }
    .graph-node text { fill: #edf5ff; font-size: 11px; paint-order: stroke; stroke: #08111f; stroke-width: 3px; stroke-linejoin: round; }
    .graph-node[aria-selected="true"] circle { stroke: #ffffff; stroke-width: 3; }
    .graph-detail-panel { min-height: 430px; border: 1px solid #ddd5c8; background: #fffaf1; padding: 16px; }
    .graph-detail-panel h3 { margin-top: 0; }
    .graph-meta { display: grid; gap: 8px; margin-top: 12px; }
    .graph-meta div { border-top: 1px solid #e9e0d2; padding-top: 8px; }
    .node-type-colors { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
    .swatch { display: inline-flex; align-items: center; gap: 6px; color: #5f574c; font-size: 12px; }
    .swatch::before { content: ""; width: 10px; height: 10px; border-radius: 999px; background: var(--node-color, #f8fafc); border: 1px solid rgba(0,0,0,.2); }
    a { color: #8b4a00; }
    .pill { display: inline-block; border: 1px solid #d6c6aa; border-radius: 999px; padding: 3px 8px; margin: 2px 4px 2px 0; font-size: 12px; color: #5f574c; }
    .notice { margin-top: 24px; padding: 16px; border-radius: 8px; background: #fff0d1; border: 1px solid #e4bf72; }
    @media (max-width: 760px) { .split, .graph-workbench { grid-template-columns: 1fr; } .graph-controls input, .graph-controls select { min-width: 0; width: 100%; } }
  </style>
</head>
<body>
  <main>
    <p class="subtle">Generated ${escapeHtml(model.generatedAt)}</p>
    <h1>${escapeHtml(model.projectName)}</h1>
    <p class="subtle">Project ID: ${escapeHtml(model.project_id || "")}</p>
    <p class="subtle">Level: Seed</p>
    <p class="subtle">This is a read-only Knowledge Graph. Graph editing is not supported.</p>
    <section class="grid" aria-label="Quest summary">
      <div class="card"><div class="label">Active Quests</div><div class="value">${model.activeCount}</div></div>
      <div class="card"><div class="label">Completed Quests</div><div class="value">${model.completedCount}</div></div>
      <div class="card"><div class="label">Verified</div><div class="value">${model.verifiedCount}</div></div>
      <div class="card"><div class="label">Unverified</div><div class="value">${model.unverifiedCount}</div></div>
      <div class="card"><div class="label">Pending Memory Proposals</div><div class="value">${model.pendingMemoryProposals}</div></div>
      <div class="card"><div class="label">Pending Review Warnings</div><div class="value">${model.pendingMemoryProposalsWithWarnings}</div></div>
      <div class="card"><div class="label">Accepted Memory Proposals</div><div class="value">${model.acceptedMemoryProposals}</div></div>
      <div class="card"><div class="label">Rejected Memory Proposals</div><div class="value">${model.rejectedMemoryProposals}</div></div>
      <div class="card"><div class="label">Accepted Memory Nodes</div><div class="value">${model.acceptedMemoryNodes}</div></div>
      <div class="card"><div class="label">Project Boundary Active</div><div class="value">${model.projectBoundaryActive ? "Yes" : "No"}</div></div>
    </section>
    <section aria-label="Route distribution">
      <h2>Route Distribution</h2>
      <table>
        <thead><tr><th>Route Layer</th><th>Count</th></tr></thead>
        <tbody>
${routes}
        </tbody>
      </table>
    </section>
    <section aria-label="Memory proposal node types">
      <h2>Memory Proposal Node Types</h2>
      <table>
        <thead><tr><th>Node Type</th><th>Count</th></tr></thead>
        <tbody>
${proposals}
        </tbody>
      </table>
    </section>
    <section class="graph-preview" aria-label="Growth Signal Preview">
      <h2>Growth Signal Preview</h2>
      <div class="split">
        <div>
          <table>
            <thead><tr><th>Signal</th><th>Value</th></tr></thead>
            <tbody>
              <tr><td>Growth Level</td><td>${escapeHtml(model.growthPreview.growthLevel)} (preview only)</td></tr>
              <tr><td>Growth Level Reason</td><td>${escapeHtml(model.growthPreview.growthLevelReason)}</td></tr>
              <tr><td>Accepted Memory Nodes</td><td>${model.growthPreview.acceptedMemoryNodes}</td></tr>
              <tr><td>Node Type Diversity</td><td>${model.growthPreview.nodeTypeDiversity}</td></tr>
              <tr><td>Pending Memory Proposals</td><td>${model.growthPreview.pendingMemoryProposals}</td></tr>
              <tr><td>Verified Quest Ratio</td><td>${formatRatio(model.growthPreview.questVerification.verifiedRatio)}</td></tr>
              <tr><td>Unverified Quest Ratio</td><td>${formatRatio(model.growthPreview.questVerification.unverifiedRatio)}</td></tr>
              <tr><td>Hook Warnings</td><td>${model.growthPreview.hookWarningCount}</td></tr>
              <tr><td>MCP Advisor Signals</td><td>${model.growthPreview.mcpAdvisorSignalCount}</td></tr>
              <tr><td>Candidate Count</td><td>${model.growthPreview.candidateCount}</td></tr>
              <tr><td>Growth Confidence</td><td>${escapeHtml(model.growthPreview.growthConfidenceSummary)}</td></tr>
              <tr><td>Automatic Unlocks</td><td>${escapeHtml(model.growthPreview.noAutomaticUnlocks)}</td></tr>
              <tr><td>Suggested Command</td><td><code>${escapeHtml(model.growthPreview.suggestedCommand)}</code></td></tr>
            </tbody>
          </table>
        </div>
        <aside class="detail">
          <h3>Preview Boundary</h3>
          <p>${escapeHtml(model.growthPreview.growthLevelDescription)}</p>
          <p>${escapeHtml(model.growthPreview.noAutomaticUnlocks)}</p>
          <p>Auto unlock: ${model.growthPreview.autoUnlock ? "yes" : "no"}</p>
          <p>Read-only: ${model.growthPreview.readOnly ? "yes" : "no"}</p>
          <h3>Top Candidates</h3>
          <table>
            <thead><tr><th>Candidate</th><th>Score</th><th>Evidence</th><th>Confidence</th></tr></thead>
            <tbody>
${growthCandidates}
            </tbody>
          </table>
          ${growthCandidateDetails}
          <h3>Growth Node Types</h3>
          <table>
            <thead><tr><th>Node Type</th><th>Count</th></tr></thead>
            <tbody>
${growthTypes}
            </tbody>
          </table>
        </aside>
      </div>
    </section>
    <section class="knowledge-graph" aria-label="Knowledge Graph Dashboard">
      <h2>Knowledge Graph Dashboard</h2>
      <p class="subtle">Memory Graph Preview</p>
      <div class="graph-boundary" role="note">
        <ul>
          <li>This is a read-only Knowledge Graph.</li>
          <li>It is built from accepted memory nodes.</li>
          <li>It is not a code dependency graph.</li>
          <li>Pending/rejected proposals are not included.</li>
          <li>Graph editing is not supported.</li>
        </ul>
      </div>
      <div class="graph-workbench" data-graph-dashboard>
        <div>
          <div class="graph-controls" aria-label="Knowledge Graph filters">
            <label>Search
              <input id="graph-search" type="search" autocomplete="off" placeholder="Search accepted memory">
            </label>
            <label>Type
              <select id="graph-type-filter">
                <option value="">All types</option>
${renderNodeTypeOptions(model.graphPreview.nodeTypeDistribution)}
              </select>
            </label>
          </div>
          <div class="graph-canvas">
            <svg id="knowledge-graph-svg" class="knowledge-graph-svg" role="img" aria-label="Read-only accepted memory Knowledge Graph" viewBox="0 0 920 430"></svg>
            <div id="graph-empty-message" class="graph-empty-message" hidden>No accepted memory nodes yet. The Knowledge Graph will appear after memory proposals are accepted.</div>
          </div>
          <noscript>
            <p class="subtle">JavaScript is disabled, so the read-only graph table below is the fallback view.</p>
          </noscript>
          <div class="node-type-colors" aria-label="Node type colors">
${renderNodeTypeColorLegend(model.graphPreview.nodeTypeDistribution)}
          </div>
          <h3>Accepted Memory Nodes</h3>
          <table id="knowledge-graph-table">
            <thead><tr><th>Node ID</th><th>Node Type</th><th>Title</th><th>Source Quest</th><th>Source Proposal</th><th>Degree</th></tr></thead>
            <tbody>
${graphNodes}
            </tbody>
          </table>
          <div class="node-details" aria-label="Accepted memory node details">
${nodeDetails}
          </div>
        </div>
        <aside id="graph-detail-panel" class="graph-detail-panel" aria-label="Selected node detail" aria-live="polite">
          <h3>Graph Summary</h3>
          <p>Accepted memory node count: ${model.acceptedMemoryNodes}</p>
          <p>Edge count: ${model.graphPreview.edges.length}</p>
          <p>Project boundary active: ${model.projectBoundaryActive ? "yes" : "no"}</p>
          <h3>Node Type Distribution</h3>
          <table>
            <thead><tr><th>Node Type</th><th>Count</th></tr></thead>
            <tbody>
${graphTypes}
            </tbody>
          </table>
        </aside>
      </div>
    </section>
    <div class="notice">
      <ul>
${statusMessages}
      </ul>
    </div>
    <script id="orange-knowledge-graph-state" type="application/json">
${graphDashboardState}
    </script>
    <script id="orange-hyper-state" type="application/json">
${stateJson}
    </script>
    <script>
(() => {
  const stateElement = document.getElementById("orange-knowledge-graph-state");
  const svg = document.getElementById("knowledge-graph-svg");
  const detail = document.getElementById("graph-detail-panel");
  const search = document.getElementById("graph-search");
  const typeFilter = document.getElementById("graph-type-filter");
  const empty = document.getElementById("graph-empty-message");
  if (!stateElement || !svg || !detail || !search || !typeFilter || !empty) return;
  const state = JSON.parse(stateElement.textContent || "{}");
  const allNodes = Array.isArray(state.nodes) ? state.nodes : [];
  const allEdges = Array.isArray(state.edges) ? state.edges : [];
  const colors = state.nodeTypeColors || {};
  const namespace = "http://www.w3.org/2000/svg";
  let selectedId = allNodes[0]?.id || null;

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const selectedType = typeFilter.value;
    const nodes = allNodes.filter((node) => {
      const typeMatch = !selectedType || node.node_type === selectedType;
      const haystack = [
        node.id,
        node.label,
        node.title,
        node.node_type,
        node.source_quest,
        node.source_proposal,
        node.candidate_memory_summary,
        ...(node.tags || []),
        ...(node.keywords || [])
      ].join(" ").toLowerCase();
      return typeMatch && (!query || haystack.includes(query));
    });
    const ids = new Set(nodes.map((node) => node.id));
    const edges = allEdges.filter((edge) => ids.has(edge.from) && ids.has(edge.to));
    if (!ids.has(selectedId)) selectedId = nodes[0]?.id || null;
    draw(nodes, edges);
    renderDetail(nodes.find((node) => node.id === selectedId) || null, edges.length);
  };

  const draw = (nodes, edges) => {
    svg.replaceChildren();
    empty.hidden = nodes.length !== 0;
    if (!nodes.length) return;
    const layout = computeLayout(nodes);
    for (const edge of edges) {
      const from = layout.get(edge.from);
      const to = layout.get(edge.to);
      if (!from || !to) continue;
      const line = document.createElementNS(namespace, "line");
      line.setAttribute("class", "graph-edge");
      line.setAttribute("x1", from.x);
      line.setAttribute("y1", from.y);
      line.setAttribute("x2", to.x);
      line.setAttribute("y2", to.y);
      line.setAttribute("data-relation", edge.relation || "");
      svg.appendChild(line);
    }
    for (const node of nodes) {
      const point = layout.get(node.id);
      if (!point) continue;
      const group = document.createElementNS(namespace, "g");
      group.setAttribute("class", "graph-node");
      group.setAttribute("tabindex", "0");
      group.setAttribute("role", "button");
      group.setAttribute("aria-selected", node.id === selectedId ? "true" : "false");
      group.setAttribute("aria-label", String(node.node_type || "") + ": " + String(node.label || node.id || ""));
      group.addEventListener("click", () => {
        selectedId = node.id;
        render();
      });
      group.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectedId = node.id;
          render();
        }
      });
      const circle = document.createElementNS(namespace, "circle");
      circle.setAttribute("cx", point.x);
      circle.setAttribute("cy", point.y);
      circle.setAttribute("r", String(14 + Math.min(14, Number(node.degree || 0) * 3)));
      circle.setAttribute("fill", colors[node.node_type] || "${DEFAULT_NODE_COLOR}");
      const text = document.createElementNS(namespace, "text");
      text.setAttribute("x", point.x);
      text.setAttribute("y", point.y + 31);
      text.setAttribute("text-anchor", "middle");
      text.textContent = trimLabel(node.label || node.id);
      group.append(circle, text);
      svg.appendChild(group);
    }
  };

  const computeLayout = (nodes) => {
    const width = 920;
    const height = 430;
    const centerX = width / 2;
    const centerY = height / 2;
    const sorted = [...nodes].sort((left, right) =>
      Number(right.degree || 0) - Number(left.degree || 0) ||
      String(left.id).localeCompare(String(right.id))
    );
    const points = new Map();
    if (sorted.length === 1) {
      points.set(sorted[0].id, { x: centerX, y: centerY });
      return points;
    }
    if (sorted.length === 2) {
      points.set(sorted[0].id, { x: centerX - 170, y: centerY });
      points.set(sorted[1].id, { x: centerX + 170, y: centerY });
      return points;
    }
    const radiusX = Math.min(350, 120 + sorted.length * 22);
    const radiusY = Math.min(150, 80 + sorted.length * 8);
    sorted.forEach((node, index) => {
      const angle = (-Math.PI / 2) + (index * Math.PI * 2) / sorted.length;
      const degreePull = Math.min(48, Number(node.degree || 0) * 10);
      points.set(node.id, {
        x: centerX + Math.cos(angle) * Math.max(70, radiusX - degreePull),
        y: centerY + Math.sin(angle) * Math.max(50, radiusY - degreePull)
      });
    });
    return points;
  };

  const renderDetail = (node, visibleEdgeCount) => {
    if (!node) {
      detail.innerHTML = '<h3>Graph Summary</h3><p>No accepted memory nodes match the current filter.</p><p>Visible edges: ' + visibleEdgeCount + '</p>';
      return;
    }
    detail.innerHTML = [
      '<h3>' + escapeHtml(node.label || node.id) + '</h3>',
      '<p class="subtle">' + escapeHtml(node.id) + '</p>',
      '<div class="graph-meta">',
      '<div><strong>Type</strong><br>' + escapeHtml(node.node_type) + '</div>',
      '<div><strong>Degree</strong><br>' + Number(node.degree || 0) + '</div>',
      '<div><strong>Source Quest</strong><br>' + escapeHtml(node.source_quest || "none") + '</div>',
      '<div><strong>Source Proposal</strong><br>' + escapeHtml(node.source_proposal || "none") + '</div>',
      '<div><strong>Project ID</strong><br>' + escapeHtml(node.project_id || "") + '</div>',
      '<div><strong>Candidate Memory</strong><br>' + escapeHtml(node.candidate_memory_summary || node.summary || "") + '</div>',
      '</div>',
      '<p class="subtle">Read-only: ' + (node.readOnly ? "true" : "false") + '</p>',
      '<p class="subtle">Visible edges: ' + visibleEdgeCount + '</p>'
    ].join('');
  };

  const trimLabel = (value) => {
    const text = String(value || "");
    return text.length > 32 ? text.slice(0, 29) + "..." : text;
  };

  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  search.addEventListener("input", render);
  typeFilter.addEventListener("change", render);
  render();
})();
    </script>
  </main>
</body>
</html>
`;
}

function renderGraphSvg(nodes) {
  const visible = nodes.slice(0, 8);
  if (!visible.length) {
    return `<svg class="graph-svg" role="img" aria-label="No accepted memory nodes" viewBox="0 0 720 180">
      <text x="24" y="92" fill="#736a5d">No accepted memory nodes yet</text>
    </svg>`;
  }
  const step = 640 / Math.max(visible.length - 1, 1);
  const points = visible.map((node, index) => ({
    node,
    x: 40 + step * index,
    y: index % 2 === 0 ? 70 : 115
  }));
  const lines = points.slice(1).map((point, index) => {
    const prev = points[index];
    return `<line x1="${prev.x}" y1="${prev.y}" x2="${point.x}" y2="${point.y}" stroke="#d4aa5e" stroke-width="2" />`;
  }).join("\n");
  const circles = points.map((point) => `<g>
      <circle cx="${point.x}" cy="${point.y}" r="14" fill="#ff8a1f" stroke="#9b4e00" stroke-width="2" />
      <text x="${point.x}" y="${point.y + 34}" text-anchor="middle" fill="#5f574c" font-size="11">${escapeHtml(point.node.node_type)}</text>
    </g>`).join("\n");
  return `<svg class="graph-svg" role="img" aria-label="Accepted memory node-link preview" viewBox="0 0 720 180">
${lines}
${circles}
    </svg>`;
}

function renderNodeTypeOptions(distribution) {
  return Object.keys(distribution)
    .sort((left, right) => left.localeCompare(right))
    .map((nodeType) => `<option value="${escapeHtml(nodeType)}">${escapeHtml(nodeType)}</option>`)
    .join("\n");
}

function renderNodeTypeColorLegend(distribution) {
  const nodeTypes = Object.keys(distribution).sort((left, right) => left.localeCompare(right));
  if (!nodeTypes.length) {
    return "<span class=\"swatch\" style=\"--node-color: #f8fafc\">no node types yet</span>";
  }
  return nodeTypes
    .map((nodeType) => `<span class="swatch" style="--node-color: ${escapeHtml(NODE_TYPE_COLORS[nodeType] || DEFAULT_NODE_COLOR)}">${escapeHtml(nodeType)}</span>`)
    .join("\n");
}

function renderSelectedNodeDetail(node) {
  const tags = (node.tags || []).map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("");
  return [
    `<p><strong>${escapeHtml(node.title)}</strong></p>`,
    `<p class="subtle">${escapeHtml(node.id)}</p>`,
    `<p>Type: ${escapeHtml(node.node_type)}</p>`,
    `<p>Source Quest: ${escapeHtml(node.source_quest)}</p>`,
    `<p>Source Proposal: ${escapeHtml(node.source_proposal)}</p>`,
    `<p>Candidate Memory: ${escapeHtml(node.candidate_memory || node.summary || "")}</p>`,
    `<p>${escapeHtml(node.summary || "")}</p>`,
    tags ? `<div>${tags}</div>` : ""
  ].join("\n");
}

function renderNodeDetails(nodes) {
  if (!nodes.length) {
    return "<p class=\"subtle\">No accepted node selected.</p>";
  }
  return nodes.map((node, index) => `<details id="${nodeAnchorId(node.id)}" class="node-detail"${index === 0 ? " open" : ""}>
  <summary>${escapeHtml(node.node_type)} - ${escapeHtml(node.title)}</summary>
  ${renderSelectedNodeDetail(node)}
</details>`).join("\n");
}

function nodeAnchorId(value) {
  return `node-${String(value).replace(/[^A-Za-z0-9_-]+/g, "-")}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeScriptJson(value) {
  return String(value).replace(/</g, "\\u003c");
}

function formatRatio(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}
