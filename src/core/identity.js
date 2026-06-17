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
  "Graph preview is read-only.",
  "Graph editing is not supported.",
  "Accepted memory nodes are candidate project memory."
];

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
  return /** @type {import("./types.d.ts").IdentitySummary["graphPreview"]} */ ({
    readOnly: true,
    editingSupported: false,
    acceptedMemoryNodes: nodes.length,
    nodeTypeDistribution,
    nodes: nodes.map((node) => ({
      id: node.id,
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
      summary: node.summary,
      tags: node.tags,
      keywords: node.keywords
    })),
    sourceLinks
  });
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
    .map((node) => `<tr><td><a href="#${nodeAnchorId(node.id)}">${escapeHtml(node.id)}</a></td><td>${escapeHtml(node.node_type)}</td><td>${escapeHtml(node.title)}</td><td>${escapeHtml(node.source_quest)}</td><td>${escapeHtml(node.source_proposal)}</td></tr>`)
    .join("\n");
  const graphNodes = graphRows || "<tr><td>none</td><td>none</td><td>No accepted memory nodes</td><td>none</td><td>none</td></tr>";
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
    schemaVersion: "0.3.0",
    project: {
      project_id: model.project_id || "",
      project_name: model.project_name || model.projectName || "",
      generatedAt: model.generatedAt
    },
    origin: model.origin || originMetadata(),
    acceptedMemoryNodes: model.acceptedMemoryNodes,
    projectBoundaryActive: model.projectBoundaryActive,
    nodeTypeDistribution: model.graphPreview.nodeTypeDistribution,
    graphPreview: model.graphPreview,
    growthPreview: model.growthPreview,
    readOnly: true,
    editingSupported: false
  }, null, 2));
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
    a { color: #8b4a00; }
    .pill { display: inline-block; border: 1px solid #d6c6aa; border-radius: 999px; padding: 3px 8px; margin: 2px 4px 2px 0; font-size: 12px; color: #5f574c; }
    .notice { margin-top: 24px; padding: 16px; border-radius: 8px; background: #fff0d1; border: 1px solid #e4bf72; }
    @media (max-width: 760px) { .split { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <p class="subtle">Generated ${escapeHtml(model.generatedAt)}</p>
    <h1>${escapeHtml(model.projectName)}</h1>
    <p class="subtle">Project ID: ${escapeHtml(model.project_id || "")}</p>
    <p class="subtle">Level: Seed</p>
    <p class="subtle">Graph preview is read-only. Graph editing is not supported.</p>
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
    <section class="graph-preview" aria-label="Read-only graph preview">
      <h2>Memory Graph Preview</h2>
      <div class="split">
        <div>
          ${renderGraphSvg(model.graphPreview.nodes)}
          <h3>Accepted Memory Nodes</h3>
          <table>
            <thead><tr><th>Node ID</th><th>Node Type</th><th>Title</th><th>Source Quest</th><th>Source Proposal</th></tr></thead>
            <tbody>
${graphNodes}
            </tbody>
          </table>
          <div class="node-details" aria-label="Accepted memory node details">
${nodeDetails}
          </div>
        </div>
        <aside class="detail" aria-label="Selected node detail">
          <h3>Graph Summary</h3>
          <p>Accepted memory node count: ${model.acceptedMemoryNodes}</p>
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
    <script id="orange-hyper-state" type="application/json">
${stateJson}
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
