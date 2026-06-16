import fs from "node:fs";
import path from "node:path";
import { readConfig, requireInitialized } from "./config.js";
import { listMemoryGraphNodes, proposalCountsByStatus, topProposalNodeTypes } from "./memory.js";
import { workspacePaths } from "./paths.js";
import { listQuests } from "./quest.js";
import { nowIso } from "./time.js";

export function buildIdentityPlaceholder(cwd = process.cwd(), options = {}) {
  requireInitialized(cwd);
  const paths = workspacePaths(cwd);
  const config = readConfig(cwd);
  const quests = listQuests(cwd, "all");
  const active = quests.filter((quest) => quest.data.status === "active");
  const completed = quests.filter((quest) => quest.data.status === "completed");
  const verified = completed.filter((quest) => quest.data.verification_status === "verified");
  const unverified = completed.filter((quest) => quest.data.verification_status === "unverified");
  const routeDistribution = readRouteDistribution(paths.routeTrace);
  const memoryProposalCounts = proposalCountsByStatus(cwd);
  const acceptedMemoryNodes = listMemoryGraphNodes(cwd).length;
  const proposalNodeTypes = topProposalNodeTypes(cwd);
  const generatedAt = nowIso(options.clock);
  const projectName = config.project?.name || path.basename(cwd);

  fs.mkdirSync(paths.identity, { recursive: true });
  const html = renderIdentityHtml({
    projectName,
    generatedAt,
    activeCount: active.length,
    completedCount: completed.length,
    verifiedCount: verified.length,
    unverifiedCount: unverified.length,
    routeDistribution,
    pendingMemoryProposals: memoryProposalCounts.pending,
    acceptedMemoryProposals: memoryProposalCounts.accepted,
    rejectedMemoryProposals: memoryProposalCounts.rejected,
    acceptedMemoryNodes,
    topProposalNodeTypes: proposalNodeTypes
  });
  fs.writeFileSync(paths.identityHtml, html);
  return {
    filePath: paths.identityHtml,
    html,
    summary: {
      projectName,
      activeCount: active.length,
      completedCount: completed.length,
      verifiedCount: verified.length,
      unverifiedCount: unverified.length,
      routeDistribution,
      pendingMemoryProposals: memoryProposalCounts.pending,
      acceptedMemoryProposals: memoryProposalCounts.accepted,
      rejectedMemoryProposals: memoryProposalCounts.rejected,
      acceptedMemoryNodes,
      topProposalNodeTypes: proposalNodeTypes
    }
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
    .notice { margin-top: 24px; padding: 16px; border-radius: 8px; background: #fff0d1; border: 1px solid #e4bf72; }
  </style>
</head>
<body>
  <main>
    <p class="subtle">Generated ${escapeHtml(model.generatedAt)}</p>
    <h1>${escapeHtml(model.projectName)}</h1>
    <p class="subtle">Level: Seed</p>
    <section class="grid" aria-label="Quest summary">
      <div class="card"><div class="label">Active Quests</div><div class="value">${model.activeCount}</div></div>
      <div class="card"><div class="label">Completed Quests</div><div class="value">${model.completedCount}</div></div>
      <div class="card"><div class="label">Verified</div><div class="value">${model.verifiedCount}</div></div>
      <div class="card"><div class="label">Unverified</div><div class="value">${model.unverifiedCount}</div></div>
      <div class="card"><div class="label">Pending Memory Proposals</div><div class="value">${model.pendingMemoryProposals}</div></div>
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
    <div class="notice">This project is still in Seed Kernel mode. Memory graph is not active yet.</div>
  </main>
</body>
</html>
`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
