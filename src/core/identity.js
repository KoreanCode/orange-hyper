import fs from "node:fs";
import path from "node:path";
import { readProjectIdentity, requireInitialized } from "./config.js";
import { listGraphNodes } from "./graph.js";
import { pendingProposalWarningCount, proposalCountsByStatus, topProposalNodeTypes } from "./memory.js";
import { workspacePaths } from "./paths.js";
import { listQuests } from "./quest.js";
import { nowIso } from "./time.js";

const IDENTITY_STATUS_MESSAGES = [
  "Memory proposal review is active.",
  "Graph preview is read-only.",
  "Graph editing is not supported.",
  "Accepted memory nodes are candidate project memory."
];

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
  const generatedAt = nowIso(options.clock);
  const projectName = project.project_name || path.basename(cwd);

  fs.mkdirSync(paths.identity, { recursive: true });
  const summary = {
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
    topProposalNodeTypes: proposalNodeTypes,
    graphPreview,
    graphWarnings: graph.warnings,
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

function readRouteDistribution(routeTracePath) {
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
  return {
    readOnly: true,
    editingSupported: false,
    acceptedMemoryNodes: nodes.length,
    nodeTypeDistribution,
    nodes: nodes.map((node) => ({
      id: node.id,
      project_id: node.project_id,
      project_name: node.project_name,
      node_type: node.node_type,
      title: node.title,
      source_quest: node.source_quest,
      source_proposal: node.source_proposal,
      accepted_at: node.accepted_at,
      summary: node.summary,
      tags: node.tags,
      keywords: node.keywords
    })),
    sourceLinks
  };
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
    .map((node) => `<tr><td>${escapeHtml(node.node_type)}</td><td>${escapeHtml(node.title)}</td><td>${escapeHtml(node.source_quest)}</td><td>${escapeHtml(node.source_proposal)}</td></tr>`)
    .join("\n");
  const graphNodes = graphRows || "<tr><td>none</td><td>No accepted memory nodes</td><td>none</td><td>none</td></tr>";
  const selectedNode = model.graphPreview.nodes[0] || null;
  const statusMessages = model.statusMessages
    .map((message) => `<li>${escapeHtml(message)}</li>`)
    .join("\n");
  const stateJson = escapeScriptJson(JSON.stringify({
    schemaVersion: "0.3.0-alpha.0",
    project: {
      project_id: model.project_id || "",
      project_name: model.project_name || model.projectName || "",
      generatedAt: model.generatedAt
    },
    acceptedMemoryNodes: model.acceptedMemoryNodes,
    nodeTypeDistribution: model.graphPreview.nodeTypeDistribution,
    graphPreview: model.graphPreview,
    readOnly: true,
    editingSupported: false
  }, null, 2));
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
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
    <section class="graph-preview" aria-label="Read-only graph preview">
      <h2>Memory Graph Preview</h2>
      <div class="split">
        <div>
          ${renderGraphSvg(model.graphPreview.nodes)}
          <h3>Accepted Memory Nodes</h3>
          <table>
            <thead><tr><th>Node Type</th><th>Title</th><th>Source Quest</th><th>Source Proposal</th></tr></thead>
            <tbody>
${graphNodes}
            </tbody>
          </table>
        </div>
        <aside class="detail" aria-label="Selected node detail">
          <h3>Selected Node Detail</h3>
          ${selectedNode ? renderSelectedNodeDetail(selectedNode) : "<p class=\"subtle\">No accepted node selected.</p>"}
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
    `<p>${escapeHtml(node.summary || "")}</p>`,
    tags ? `<div>${tags}</div>` : ""
  ].join("\n");
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
