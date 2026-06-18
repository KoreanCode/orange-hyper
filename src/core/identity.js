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

const GRAPH_DASHBOARD_SCHEMA_VERSION = "1.1.0-alpha.3";

const NODE_TYPE_COLORS = {
  decision: "#ffb454",
  constraint: "#67e8f9",
  component: "#a78bfa",
  risk: "#fb7185",
  verification: "#86efac"
};

const DEFAULT_NODE_COLOR = "#f8fafc";

const VISUAL_NODE_COLORS = {
  memory: "#ffb454",
  concept: "#67e8f9",
  sourceQuest: "#a78bfa",
  sourceProposal: "#f472b6",
  category: "#86efac"
};

const VISUAL_GRAPH_STOP_WORDS = new Set([
  "candidate",
  "evidence",
  "hyper",
  "memory",
  "node",
  "orange",
  "proposal",
  "quest",
  "remember",
  "this",
  "with"
]);

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
  const sourceGraph = buildSourceGraph(project, graphPreview, paths);
  const visualGraph = buildVisualGraph(project, sourceGraph);
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
    sourceGraph,
    visualGraph,
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

function buildSourceGraph(project, graphPreview, paths) {
  const nodes = graphPreview.nodes.map((node) => ({
    ...node,
    graphKind: "memory",
    sourceOfTruth: true,
    displayOnly: false,
    derived: false,
    readOnly: true
  }));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = readAcceptedSourceEdges(paths.graphEdges, nodeIds);
  return /** @type {import("./types.d.ts").IdentitySummary["sourceGraph"]} */ ({
    schemaVersion: GRAPH_DASHBOARD_SCHEMA_VERSION,
    readOnly: true,
    editingSupported: false,
    project_id: project.project_id || graphPreview.project_id || null,
    project_name: project.project_name || "",
    source: ".orange-hyper/graph",
    nodeBoundary: "accepted-memory-nodes-only",
    edgeBoundary: "persisted-accepted-memory-edges-only",
    nodeTypeColors: graphPreview.nodeTypeColors,
    nodeTypeDistribution: graphPreview.nodeTypeDistribution,
    acceptedMemoryNodes: nodes.length,
    nodes,
    edges
  });
}

function buildVisualGraph(project, sourceGraph) {
  const nodes = [];
  const nodeById = new Map();
  const edges = [];
  const edgeKeys = new Set();
  const conceptsByMemory = new Map();

  const addNode = (node) => addVisualNode(nodes, nodeById, node);
  const addEdge = (edge) => addVisualEdge(edges, edgeKeys, edge);

  for (const sourceNode of sourceGraph.nodes) {
    addNode({
      ...sourceNode,
      type: "memory",
      visualType: "memory",
      graphKind: "memory",
      label: sourceNode.label || sourceNode.title || sourceNode.id,
      color: sourceGraph.nodeTypeColors[sourceNode.node_type] || VISUAL_NODE_COLORS.memory,
      displayOnly: false,
      derived: false,
      readOnly: true,
      sourceMemoryIds: [sourceNode.id],
      importance: 10 + Number(sourceNode.degree || 0)
    });

    const categoryId = `category.${slugId(sourceNode.node_type || "memory")}`;
    addNode(derivedVisualNode(categoryId, "category", `${nodeTypeLabel(sourceNode.node_type)} memory`, {
      category: sourceNode.node_type || "memory",
      sourceMemoryIds: [sourceNode.id],
      importance: 6
    }));
    addEdge(visualEdge(sourceNode.id, categoryId, "classified_as", 0.94, 92, sourceNode.node_type));

    if (sourceNode.source_quest) {
      const sourceQuestId = `sourceQuest.${slugId(sourceNode.source_quest)}`;
      addNode(derivedVisualNode(sourceQuestId, "sourceQuest", shortSourceLabel("Quest", sourceNode.source_quest), {
        source_quest: sourceNode.source_quest,
        sourceMemoryIds: [sourceNode.id],
        importance: 4
      }));
      addEdge(visualEdge(sourceNode.id, sourceQuestId, "derived_from_source_quest", 0.78, 118, sourceNode.source_quest));
    }

    if (sourceNode.source_proposal) {
      const sourceProposalId = `sourceProposal.${slugId(sourceNode.source_proposal)}`;
      addNode(derivedVisualNode(sourceProposalId, "sourceProposal", shortSourceLabel("Proposal", sourceNode.source_proposal), {
        source_proposal: sourceNode.source_proposal,
        sourceMemoryIds: [sourceNode.id],
        importance: 4
      }));
      addEdge(visualEdge(sourceNode.id, sourceProposalId, "derived_from_source_proposal", 0.7, 128, sourceNode.source_proposal));
    }

    const concepts = extractVisualConcepts(sourceNode);
    conceptsByMemory.set(sourceNode.id, concepts);
    for (const concept of concepts) {
      const conceptId = `concept.${slugId(concept)}`;
      addNode(derivedVisualNode(conceptId, "concept", humanizeConceptLabel(concept), {
        concept,
        sourceMemoryIds: [sourceNode.id],
        importance: 5
      }));
      addEdge(visualEdge(sourceNode.id, conceptId, "mentions_concept", 0.88, 86, concept));
      addEdge(visualEdge(conceptId, categoryId, "concept_in_category", 0.42, 154, sourceNode.node_type));
    }
  }

  const memoryNodes = sourceGraph.nodes;
  for (let leftIndex = 0; leftIndex < memoryNodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < memoryNodes.length; rightIndex += 1) {
      const left = memoryNodes[leftIndex];
      const right = memoryNodes[rightIndex];
      const sharedConcepts = intersection(conceptsByMemory.get(left.id) || [], conceptsByMemory.get(right.id) || []);
      let strength = 0;
      let targetDistance = 190;
      const reasons = [];
      if (left.node_type && left.node_type === right.node_type) {
        strength += 0.38;
        targetDistance -= 34;
        reasons.push("same_type");
      }
      if (left.source_quest && left.source_quest === right.source_quest) {
        strength += 0.42;
        targetDistance -= 42;
        reasons.push("same_source_quest");
      }
      if (left.source_proposal && left.source_proposal === right.source_proposal) {
        strength += 0.32;
        targetDistance -= 28;
        reasons.push("same_source_proposal");
      }
      if (sharedConcepts.length) {
        strength += Math.min(0.46, sharedConcepts.length * 0.12);
        targetDistance -= Math.min(48, sharedConcepts.length * 10);
        reasons.push("shared_concepts");
      }
      if (strength > 0) {
        addEdge(visualEdge(left.id, right.id, reasons.join("+") || "shared_context", Math.min(0.96, strength), Math.max(90, targetDistance), sharedConcepts.slice(0, 5).join(",")));
      }
    }
  }

  const degree = degreeByVisualNodeId(nodes, edges);
  const visualNodes = nodes
    .map((node) => ({
      ...node,
      degree: degree.get(node.id) || 0,
      importance: Math.max(Number(node.importance || 1), 1 + (degree.get(node.id) || 0))
    }))
    .sort((left, right) =>
      typeRank(left.type) - typeRank(right.type) ||
      String(left.id).localeCompare(String(right.id))
    );

  return /** @type {import("./types.d.ts").IdentitySummary["visualGraph"]} */ ({
    schemaVersion: GRAPH_DASHBOARD_SCHEMA_VERSION,
    readOnly: true,
    editingSupported: false,
    displayOnly: true,
    source: "identity-html-visual-only",
    project_id: project.project_id || sourceGraph.project_id || null,
    project_name: project.project_name || sourceGraph.project_name || "",
    seed: stableHash(`${project.project_id || ""}|${visualNodes.map((node) => node.id).join("|")}`),
    layout: "deterministic-seeded-force",
    nodeTypeColors: {
      ...VISUAL_NODE_COLORS,
      ...sourceGraph.nodeTypeColors
    },
    nodes: visualNodes,
    edges: edges.map((edge, index) => ({
      id: edge.id || `visual-edge-${String(index + 1).padStart(3, "0")}`,
      ...edge
    })).sort((left, right) => left.id.localeCompare(right.id))
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

function readAcceptedSourceEdges(edgesPath, nodeIds) {
  if (!fs.existsSync(edgesPath)) {
    return [];
  }
  const edges = [];
  const lines = fs.readFileSync(edgesPath, "utf8").split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    try {
      const edge = JSON.parse(line);
      const from = String(edge.from || edge.source || "");
      const to = String(edge.to || edge.target || "");
      if (!nodeIds.has(from) || !nodeIds.has(to)) {
        continue;
      }
      edges.push({
        id: edge.id || `source-edge-${stableHash(`${from}|${to}|${edge.type || edge.relation || "related"}`)}`,
        from,
        to,
        relation: String(edge.type || edge.relation || "related"),
        confidence: typeof edge.confidence === "number" ? edge.confidence : null,
        readOnly: true,
        sourceOfTruth: true,
        displayOnly: false,
        derived: false
      });
    } catch {
      continue;
    }
  }
  return edges.sort((left, right) => left.id.localeCompare(right.id));
}

function addVisualNode(nodes, nodeById, node) {
  const existing = nodeById.get(node.id);
  if (existing) {
    existing.sourceMemoryIds = Array.from(new Set([
      ...(existing.sourceMemoryIds || []),
      ...(node.sourceMemoryIds || [])
    ])).sort((left, right) => left.localeCompare(right));
    existing.importance = Math.max(Number(existing.importance || 0), Number(node.importance || 0));
    return existing;
  }
  const next = {
    ...node,
    sourceMemoryIds: Array.from(new Set(node.sourceMemoryIds || [])).sort((left, right) => left.localeCompare(right))
  };
  nodes.push(next);
  nodeById.set(next.id, next);
  return next;
}

function addVisualEdge(edges, edgeKeys, edge) {
  if (edge.from === edge.to) {
    return;
  }
  const key = [edge.from, edge.to, edge.relation, edge.source || ""].join("|");
  if (edgeKeys.has(key)) {
    return;
  }
  edgeKeys.add(key);
  edges.push(edge);
}

function derivedVisualNode(id, type, label, extra = {}) {
  return {
    id,
    type,
    visualType: type,
    graphKind: type,
    label,
    color: VISUAL_NODE_COLORS[type] || DEFAULT_NODE_COLOR,
    displayOnly: true,
    derived: true,
    readOnly: true,
    ...extra
  };
}

function visualEdge(from, to, relation, strength, distance, source) {
  return {
    id: `visual-edge-${stableHash(`${from}|${to}|${relation}|${source || ""}`)}`,
    from,
    to,
    relation,
    source: source || "identity-derived",
    strength,
    distance,
    displayOnly: true,
    derived: true,
    readOnly: true
  };
}

function extractVisualConcepts(node) {
  const concepts = [];
  const add = (value) => {
    const token = normalizeConceptToken(value);
    if (!token || VISUAL_GRAPH_STOP_WORDS.has(token) || concepts.includes(token)) {
      return;
    }
    concepts.push(token);
  };
  for (const value of [
    ...(node.keywords || []),
    ...(node.tags || []),
    node.title,
    node.label,
    node.candidate_memory_summary,
    node.candidate_memory,
    node.summary
  ]) {
    for (const token of String(value || "").split(/[^A-Za-z0-9_.-]+/)) {
      add(token);
    }
  }
  return concepts.slice(0, 8);
}

function normalizeConceptToken(value) {
  const token = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^[^A-Za-z0-9]+/, "")
    .replace(/[^A-Za-z0-9]+$/, "");
  if (
    token.length > 36 ||
    token.includes("mem_delta") ||
    token.startsWith("quest_") ||
    token.includes("202606")
  ) {
    return "";
  }
  return token;
}

function humanizeConceptLabel(value) {
  const text = String(value || "").replace(/[_.-]+/g, " ").trim();
  return text ? text.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Concept";
}

function nodeTypeLabel(value) {
  return humanizeConceptLabel(value || "memory");
}

function shortSourceLabel(prefix, value) {
  const text = String(value || "");
  return `${prefix} ${text.length > 14 ? text.slice(0, 6) + "..." + text.slice(-5) : text}`;
}

function slugId(value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^A-Za-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || stableHash(value);
}

function stableHash(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function intersection(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item));
}

function degreeByVisualNodeId(nodes, edges) {
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

function typeRank(type) {
  const ranks = {
    memory: 0,
    category: 1,
    concept: 2,
    sourceQuest: 3,
    sourceProposal: 4
  };
  return ranks[type] ?? 9;
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
  const sourceGraph = model.sourceGraph;
  const visualGraph = model.visualGraph;
  const routeRows = renderCountRows(model.routeDistribution, "Route Layer");
  const proposalRows = model.topProposalNodeTypes
    .map((item) => `<tr><td>${escapeHtml(item.nodeType)}</td><td>${item.count}</td></tr>`)
    .join("\n") || "<tr><td>none</td><td>0</td></tr>";
  const graphTypeRows = renderCountRows(sourceGraph.nodeTypeDistribution, "Node Type");
  const sourceLinkRows = sourceGraph.nodes
    .map((node) => `<tr><td>${escapeHtml(node.id)}</td><td>${escapeHtml(node.node_type)}</td><td>${escapeHtml(node.source_quest || "none")}</td><td>${escapeHtml(node.source_proposal || "none")}</td></tr>`)
    .join("\n") || "<tr><td>none</td><td>none</td><td>none</td><td>none</td></tr>";
  const acceptedMemoryRows = sourceGraph.nodes
    .map((node) => `<tr><td><a href="#${nodeAnchorId(node.id)}">${escapeHtml(node.id)}</a></td><td>${escapeHtml(node.node_type)}</td><td>${escapeHtml(node.title)}</td><td>${escapeHtml(node.source_quest)}</td><td>${escapeHtml(node.source_proposal)}</td><td>${node.degree}</td></tr>`)
    .join("\n") || "<tr><td>none</td><td>none</td><td>No accepted memory nodes</td><td>none</td><td>none</td><td>0</td></tr>";
  const fallbackTable = `<table id="knowledge-graph-table" class="data-table" data-fallback-table>
    <thead><tr><th>Node ID</th><th>Node Type</th><th>Title</th><th>Source Quest</th><th>Source Proposal</th><th>Degree</th></tr></thead>
    <tbody>
${acceptedMemoryRows}
    </tbody>
  </table>`;
  const nodeDetails = renderNodeDetails(sourceGraph.nodes);
  const growthTypes = renderCountRows(model.growthPreview.nodeTypeDistribution, "Node Type");
  const growthCandidateRows = model.growthPreview.topCandidates
    .map((candidate) => `<tr><td>${escapeHtml(candidate.id)}</td><td>${candidate.score}</td><td>${candidate.evidence_count}</td><td>${escapeHtml(candidate.confidence)}</td></tr>`)
    .join("\n") || "<tr><td>none</td><td>0</td><td>0</td><td>none</td></tr>";
  const growthCandidateDetails = model.growthPreview.topCandidates.length
    ? `<ul>${model.growthPreview.topCandidates.map((candidate) => `<li><strong>${escapeHtml(candidate.title)}</strong>: ${escapeHtml(candidate.suggested_next_step)}</li>`).join("\n")}</ul>`
    : "<p class=\"muted\">No growth candidates met the evidence threshold.</p>";
  const statusMessages = model.statusMessages
    .map((message) => `<li>${escapeHtml(message)}</li>`)
    .join("\n");
  const boundaryItems = [
    "Read-only Knowledge Graph",
    "Built from accepted project memory",
    "Derived concept/source nodes are visual-only",
    "Not a code dependency graph",
    "Pending/rejected proposals excluded"
  ];
  const dashboardState = {
    schemaVersion: GRAPH_DASHBOARD_SCHEMA_VERSION,
    project: {
      project_id: model.project_id || "",
      project_name: model.project_name || model.projectName || "",
      generatedAt: model.generatedAt
    },
    origin: model.origin || originMetadata(),
    acceptedMemoryNodes: model.acceptedMemoryNodes,
    projectBoundaryActive: model.projectBoundaryActive,
    nodeTypeDistribution: sourceGraph.nodeTypeDistribution,
    graph: {
      readOnly: true,
      nodes: model.graphPreview.nodes,
      edges: model.graphPreview.edges,
      nodeTypeColors: model.graphPreview.nodeTypeColors,
      project_id: model.project_id || "",
      project_name: model.project_name || model.projectName || ""
    },
    graphPreview: model.graphPreview,
    sourceGraph,
    visualGraph,
    growthPreview: model.growthPreview,
    boundary: boundaryItems,
    readOnly: true,
    editingSupported: false
  };
  const stateJson = escapeScriptJson(JSON.stringify(dashboardState, null, 2));
  const graphDashboardState = escapeScriptJson(JSON.stringify(dashboardState, null, 2));
  const rawDetails = escapeHtml(JSON.stringify({
    sourceGraph,
    visualGraph,
    graphPreview: model.graphPreview,
    growthPreview: model.growthPreview,
    graphWarnings: model.graphWarnings
  }, null, 2));
  const visualTypeOptions = renderVisualTypeOptions(visualGraph.nodes);
  const visualLegend = renderVisualLegend(visualGraph.nodes, visualGraph.nodeTypeColors);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="generator" content="${escapeHtml(model.generated_by || "Orange Hyper")} ${escapeHtml(model.generator_version || "")}">
  <meta name="source-repository" content="${escapeHtml(model.source_repository || "")}">
  <title>Orange Hyper Identity - ${escapeHtml(model.projectName)}</title>
  <style>
    :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #04060c; color: #eef6ff; }
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; }
    body { margin: 0; overflow: hidden; background: #04060c; color: #eef6ff; }
    button, input, select { font: inherit; letter-spacing: 0; }
    button { min-height: 36px; border: 1px solid rgba(226, 232, 240, .18); border-radius: 8px; background: rgba(9, 14, 25, .72); color: #eef6ff; cursor: pointer; }
    button:hover, button:focus-visible { border-color: rgba(255, 180, 84, .76); outline: 0; }
    a { color: #ffcf8a; }
    .identity-shell { position: relative; width: 100vw; height: 100vh; overflow: hidden; background: #04060c; }
    .graph-stage { position: absolute; inset: 0; width: 100vw; height: 100vh; overflow: hidden; background:
      linear-gradient(115deg, rgba(103, 232, 249, .08), transparent 30%),
      linear-gradient(245deg, rgba(255, 180, 84, .08), transparent 34%),
      radial-gradient(circle at 48% 44%, rgba(52, 211, 153, .13), transparent 26%),
      #04060c; }
    .graph-stage::before { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: .34; background-image:
      linear-gradient(rgba(148, 163, 184, .08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(148, 163, 184, .06) 1px, transparent 1px);
      background-size: 64px 64px, 64px 64px; }
    .knowledge-graph-svg { position: absolute; inset: 0; display: block; width: 100vw; height: 100vh; cursor: grab; touch-action: none; }
    .knowledge-graph-svg.is-panning { cursor: grabbing; }
    .topbar { position: absolute; z-index: 4; top: 16px; left: 16px; right: 16px; display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto auto; gap: 10px; align-items: center; pointer-events: none; }
    .topbar > * { pointer-events: auto; }
    .icon-button { width: 42px; height: 42px; display: inline-grid; place-items: center; padding: 0; }
    .hamburger-lines { width: 18px; display: grid; gap: 4px; }
    .hamburger-lines span { display: block; height: 2px; border-radius: 999px; background: #eef6ff; }
    .project-chip { min-width: 0; justify-self: start; max-width: min(680px, 58vw); padding: 9px 12px; border: 1px solid rgba(148, 163, 184, .22); border-radius: 8px; background: rgba(5, 8, 16, .68); backdrop-filter: blur(12px); }
    .project-chip strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; letter-spacing: 0; }
    .project-chip span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; color: #aebbd0; font-size: 12px; }
    .stage-button { padding: 0 12px; }
    .boundary-ribbon { position: absolute; z-index: 3; left: 16px; right: 16px; bottom: 50px; display: flex; flex-wrap: wrap; gap: 8px; pointer-events: none; }
    .boundary-ribbon span { border: 1px solid rgba(148, 163, 184, .16); border-radius: 999px; padding: 5px 9px; background: rgba(4, 6, 12, .58); color: #cbd8e8; font-size: 12px; }
    .bottom-status-bar { position: absolute; z-index: 3; left: 0; right: 0; bottom: 0; min-height: 36px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 16px; border-top: 1px solid rgba(148, 163, 184, .16); background: rgba(4, 6, 12, .74); color: #b9c7db; font-size: 12px; }
    .graph-empty-message { position: absolute; z-index: 2; inset: 0; display: grid; place-items: center; padding: 24px; color: #d7e4f5; text-align: center; }
    .graph-empty-message[hidden] { display: none; }
    .side-drawer, .filter-drawer, .node-detail-drawer { position: absolute; z-index: 6; top: 0; height: 100vh; overflow: auto; border-color: rgba(148, 163, 184, .18); background: rgba(6, 10, 20, .94); color: #eef6ff; backdrop-filter: blur(18px); transition: transform .18s ease; }
    .side-drawer { left: 0; width: min(440px, calc(100vw - 40px)); border-right: 1px solid rgba(148, 163, 184, .18); transform: translateX(-102%); }
    .side-drawer[data-open="true"] { transform: translateX(0); }
    .filter-drawer { right: 0; width: min(360px, calc(100vw - 40px)); border-left: 1px solid rgba(148, 163, 184, .18); transform: translateX(102%); padding: 18px; }
    .filter-drawer[data-open="true"] { transform: translateX(0); }
    .node-detail-drawer { right: 0; width: min(420px, calc(100vw - 40px)); border-left: 1px solid rgba(148, 163, 184, .18); transform: translateX(102%); padding: 18px; }
    .node-detail-drawer[data-open="true"] { transform: translateX(0); }
    .drawer-header { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid rgba(148, 163, 184, .14); background: rgba(6, 10, 20, .96); }
    .drawer-header h2, .drawer-header h3 { margin: 0; font-size: 16px; letter-spacing: 0; }
    .drawer-body { padding: 18px; display: grid; gap: 18px; }
    .panel-section { display: grid; gap: 10px; }
    .panel-section h3 { margin: 0; font-size: 14px; color: #f7c779; letter-spacing: 0; }
    .metric-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .metric { border: 1px solid rgba(148, 163, 184, .16); border-radius: 8px; padding: 10px; background: rgba(15, 23, 42, .52); }
    .metric .label { color: #aebbd0; font-size: 12px; }
    .metric .value { margin-top: 4px; font-size: 20px; font-weight: 700; color: #eef6ff; }
    .data-table { width: 100%; border-collapse: collapse; border: 1px solid rgba(148, 163, 184, .16); background: rgba(15, 23, 42, .36); }
    .data-table th, .data-table td { text-align: left; padding: 8px 9px; border-bottom: 1px solid rgba(148, 163, 184, .12); vertical-align: top; font-size: 12px; }
    .data-table th { color: #c9d6e6; background: rgba(15, 23, 42, .7); }
    .muted { color: #aebbd0; }
    .field { display: grid; gap: 6px; margin-bottom: 12px; color: #cbd8e8; font-size: 13px; }
    .field input, .field select { width: 100%; min-height: 38px; border: 1px solid rgba(148, 163, 184, .22); border-radius: 8px; background: rgba(4, 6, 12, .72); color: #eef6ff; padding: 8px 10px; }
    .check-field { display: flex; align-items: center; gap: 8px; min-height: 34px; color: #cbd8e8; font-size: 13px; }
    .check-field input { width: 16px; height: 16px; }
    .drawer-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .swatch-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .swatch { display: inline-flex; align-items: center; gap: 6px; color: #cbd8e8; font-size: 12px; }
    .swatch::before { content: ""; width: 10px; height: 10px; border-radius: 999px; background: var(--node-color, #f8fafc); box-shadow: 0 0 12px var(--node-color, #f8fafc); }
    .node-details { display: grid; gap: 10px; }
    .node-detail { border: 1px solid rgba(148, 163, 184, .16); border-radius: 8px; padding: 10px; background: rgba(15, 23, 42, .42); }
    .node-detail summary { cursor: pointer; font-weight: 700; }
    .pill { display: inline-block; border: 1px solid rgba(148, 163, 184, .22); border-radius: 999px; padding: 3px 8px; margin: 2px 4px 2px 0; font-size: 12px; color: #cbd8e8; }
    .raw-json { max-height: 360px; overflow: auto; margin: 0; padding: 12px; border: 1px solid rgba(148, 163, 184, .16); border-radius: 8px; background: rgba(2, 6, 23, .72); color: #cbd8e8; font-size: 11px; white-space: pre-wrap; }
    .graph-edge { stroke: rgba(164, 183, 205, .56); stroke-linecap: round; }
    .graph-node { cursor: pointer; }
    .graph-node circle { stroke: rgba(255, 255, 255, .72); stroke-width: 1.4; }
    .graph-node text { fill: #edf5ff; font-size: 12px; paint-order: stroke; stroke: #04060c; stroke-width: 4px; stroke-linejoin: round; pointer-events: none; }
    .graph-node[data-type="concept"] text, .graph-node[data-type="sourceQuest"] text, .graph-node[data-type="sourceProposal"] text { font-size: 10px; fill: #d9e6f7; }
    .graph-node[aria-selected="true"] circle { stroke: #ffffff; stroke-width: 2.8; }
    .noscript-fallback { position: fixed; z-index: 20; inset: 18px; overflow: auto; border: 1px solid rgba(148, 163, 184, .28); border-radius: 8px; padding: 18px; background: #060a14; color: #eef6ff; }
    .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    @media (max-width: 760px) {
      .topbar { grid-template-columns: auto minmax(0, 1fr) auto; }
      .topbar .stage-button:nth-of-type(n+3) { display: none; }
      .project-chip { max-width: 46vw; }
      .boundary-ribbon { bottom: 72px; }
      .bottom-status-bar { align-items: flex-start; flex-direction: column; }
    }
  </style>
</head>
<body>
  <main class="identity-shell" data-identity-dashboard>
    <section class="graph-stage" aria-label="Read-only Knowledge Graph Dashboard">
      <svg id="knowledge-graph-svg" class="knowledge-graph-svg" role="img" aria-label="Full-screen read-only project memory Knowledge Graph" viewBox="0 0 1200 800"></svg>
      <div id="graph-empty-message" class="graph-empty-message" hidden>No accepted memory nodes yet. The Knowledge Graph will appear after memory proposals are accepted.</div>
      <div class="topbar" aria-label="Graph controls">
        <button id="sidebar-toggle" class="icon-button" type="button" aria-label="Open sidebar" aria-controls="identity-sidebar" aria-expanded="false"><span class="hamburger-lines" aria-hidden="true"><span></span><span></span><span></span></span></button>
        <div class="project-chip">
          <strong>${escapeHtml(model.projectName)}</strong>
          <span>Project ID: ${escapeHtml(model.project_id || "")} · Generated ${escapeHtml(model.generatedAt)}</span>
        </div>
        <button id="filter-toggle" class="stage-button" type="button" aria-controls="filter-drawer" aria-expanded="false">Filters</button>
        <button id="fit-view" class="stage-button" type="button">Fit</button>
        <button id="reset-view" class="stage-button" type="button">Reset</button>
      </div>
      <div class="boundary-ribbon" role="note">
${boundaryItems.map((item) => `        <span>${escapeHtml(item)}</span>`).join("\n")}
      </div>
      <div class="bottom-status-bar" aria-live="polite">
        <span id="graph-status-counts">Source nodes: ${sourceGraph.nodes.length} · Visual nodes: ${visualGraph.nodes.length} · Visual edges: ${visualGraph.edges.length}</span>
        <span>Read-only local HTML · no network fetch · no graph source mutation</span>
      </div>
    </section>
    <aside id="identity-sidebar" class="side-drawer" data-open="false" aria-hidden="true" aria-label="Identity sidebar">
      <div class="drawer-header">
        <h2>Identity</h2>
        <button id="sidebar-close" type="button">Close</button>
      </div>
      <div class="drawer-body">
        <section class="panel-section" aria-label="Project summary">
          <h3>Project Summary</h3>
          <div class="metric-grid">
            <div class="metric"><div class="label">Active Quests</div><div class="value">${model.activeCount}</div></div>
            <div class="metric"><div class="label">Completed Quests</div><div class="value">${model.completedCount}</div></div>
            <div class="metric"><div class="label">Verified</div><div class="value">${model.verifiedCount}</div></div>
            <div class="metric"><div class="label">Unverified</div><div class="value">${model.unverifiedCount}</div></div>
            <div class="metric"><div class="label">Accepted Memory</div><div class="value">${model.acceptedMemoryNodes}</div></div>
            <div class="metric"><div class="label">Project Boundary</div><div class="value">${model.projectBoundaryActive ? "Yes" : "No"}</div></div>
          </div>
        </section>
        <section class="panel-section" aria-label="Visual legend">
          <h3>Visual Legend</h3>
          <div class="swatch-list">
${visualLegend}
          </div>
        </section>
        <section class="panel-section" aria-label="Boundary text">
          <h3>Boundary</h3>
          <ul>
${boundaryItems.map((item) => `            <li>${escapeHtml(item)}</li>`).join("\n")}
            <li>Graph editing is not supported.</li>
          </ul>
        </section>
        <section class="panel-section" aria-label="Growth preview">
          <h3>Growth Signal Preview</h3>
          <table class="data-table">
            <thead><tr><th>Signal</th><th>Value</th></tr></thead>
            <tbody>
              <tr><td>Growth Level</td><td>${escapeHtml(model.growthPreview.growthLevel)} (preview only)</td></tr>
              <tr><td>Growth Level Reason</td><td>${escapeHtml(model.growthPreview.growthLevelReason)}</td></tr>
              <tr><td>Accepted Memory Nodes</td><td>${model.growthPreview.acceptedMemoryNodes}</td></tr>
              <tr><td>Node Type Diversity</td><td>${model.growthPreview.nodeTypeDiversity}</td></tr>
              <tr><td>Pending Memory Proposals</td><td>${model.growthPreview.pendingMemoryProposals}</td></tr>
              <tr><td>Verified Quest Ratio</td><td>${formatRatio(model.growthPreview.questVerification.verifiedRatio)}</td></tr>
              <tr><td>Hook Warnings</td><td>${model.growthPreview.hookWarningCount}</td></tr>
              <tr><td>MCP Advisor Signals</td><td>${model.growthPreview.mcpAdvisorSignalCount}</td></tr>
              <tr><td>Candidate Count</td><td>${model.growthPreview.candidateCount}</td></tr>
              <tr><td>Automatic Unlocks</td><td>${escapeHtml(model.growthPreview.noAutomaticUnlocks)}</td></tr>
              <tr><td>Suggested Command</td><td><code>${escapeHtml(model.growthPreview.suggestedCommand)}</code></td></tr>
            </tbody>
          </table>
          ${growthCandidateDetails}
        </section>
        <section class="panel-section" aria-label="Eval summary">
          <h3>Eval Summary</h3>
          <p class="muted">Eval reports remain separate explicit local reports. Identity HTML reads local summary signals only and does not run eval commands.</p>
        </section>
        <section class="panel-section" aria-label="Route distribution">
          <h3>Route Distribution</h3>
          <table class="data-table">
            <thead><tr><th>Route Layer</th><th>Count</th></tr></thead>
            <tbody>
${routeRows}
            </tbody>
          </table>
        </section>
        <section class="panel-section" aria-label="Memory proposal node types">
          <h3>Memory Proposal Node Types</h3>
          <table class="data-table">
            <thead><tr><th>Node Type</th><th>Count</th></tr></thead>
            <tbody>
${proposalRows}
            </tbody>
          </table>
        </section>
        <section class="panel-section" aria-label="Node type distribution">
          <h3>Node Type Distribution</h3>
          <table class="data-table">
            <thead><tr><th>Node Type</th><th>Count</th></tr></thead>
            <tbody>
${graphTypeRows}
            </tbody>
          </table>
        </section>
        <section class="panel-section" aria-label="Growth node type distribution">
          <h3>Growth Node Types</h3>
          <table class="data-table">
            <thead><tr><th>Node Type</th><th>Count</th></tr></thead>
            <tbody>
${growthTypes}
            </tbody>
          </table>
        </section>
        <section class="panel-section" aria-label="Growth candidates">
          <h3>Top Candidates</h3>
          <table class="data-table">
            <thead><tr><th>Candidate</th><th>Score</th><th>Evidence</th><th>Confidence</th></tr></thead>
            <tbody>
${growthCandidateRows}
            </tbody>
          </table>
        </section>
        <section class="panel-section" aria-label="Accepted memory table">
          <h3>Accepted Memory Table</h3>
          ${fallbackTable}
        </section>
        <section class="panel-section" aria-label="Source quest and proposal links">
          <h3>Source Quest / Proposal Links</h3>
          <table class="data-table">
            <thead><tr><th>Node</th><th>Type</th><th>Source Quest</th><th>Source Proposal</th></tr></thead>
            <tbody>
${sourceLinkRows}
            </tbody>
          </table>
        </section>
        <section class="panel-section" aria-label="Accepted memory node details">
          <h3>Accepted Memory Node Details</h3>
          <div class="node-details">
${nodeDetails}
          </div>
        </section>
        <section class="panel-section" aria-label="Status messages">
          <h3>Status Messages</h3>
          <ul>
${statusMessages}
          </ul>
        </section>
        <section class="panel-section" aria-label="Debug raw details">
          <h3>Debug / Raw Details</h3>
          <pre class="raw-json">${rawDetails}</pre>
        </section>
      </div>
    </aside>
    <aside id="filter-drawer" class="filter-drawer" data-open="false" aria-hidden="true" aria-label="Search and filters">
      <div class="drawer-header">
        <h3>Search / Filter</h3>
        <button id="filter-close" type="button">Close</button>
      </div>
      <div class="drawer-body">
        <label class="field">Search
          <input id="graph-search" type="search" autocomplete="off" placeholder="Search visual graph">
        </label>
        <label class="field">Type
          <select id="graph-type-filter">
            <option value="">All types</option>
${visualTypeOptions}
          </select>
        </label>
        <label class="check-field"><input id="toggle-derived" type="checkbox" checked> Show derived visual nodes</label>
        <label class="check-field"><input id="toggle-labels" type="checkbox" checked> Show labels</label>
        <div class="drawer-actions">
          <button id="drawer-fit-view" type="button">Fit</button>
          <button id="drawer-reset-view" type="button">Reset</button>
        </div>
      </div>
    </aside>
    <aside id="node-detail-drawer" class="node-detail-drawer" data-open="false" aria-hidden="true" aria-label="Node detail drawer">
      <div class="drawer-header">
        <h3>Node Detail</h3>
        <button id="detail-close" type="button">Close</button>
      </div>
      <div id="node-detail-body" class="drawer-body">
        <p class="muted">Select a node to inspect accepted memory, visual-only derivation, source quest, and provenance.</p>
      </div>
    </aside>
  </main>
  <noscript>
    <section class="noscript-fallback" aria-label="JavaScript disabled fallback">
      <h1>${escapeHtml(model.projectName)} Knowledge Graph Fallback</h1>
      <p>JavaScript is disabled, so this read-only accepted memory table is shown instead of the SVG graph.</p>
      ${fallbackTable}
    </section>
  </noscript>
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
  const sidebar = document.getElementById("identity-sidebar");
  const filterDrawer = document.getElementById("filter-drawer");
  const detailDrawer = document.getElementById("node-detail-drawer");
  const detailBody = document.getElementById("node-detail-body");
  const search = document.getElementById("graph-search");
  const typeFilter = document.getElementById("graph-type-filter");
  const toggleDerived = document.getElementById("toggle-derived");
  const toggleLabels = document.getElementById("toggle-labels");
  const empty = document.getElementById("graph-empty-message");
  const statusCounts = document.getElementById("graph-status-counts");
  if (!stateElement || !svg || !sidebar || !filterDrawer || !detailDrawer || !detailBody || !search || !typeFilter || !toggleDerived || !toggleLabels || !empty) return;
  const state = JSON.parse(stateElement.textContent || "{}");
  const graph = state.visualGraph || {};
  const allNodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const allEdges = Array.isArray(graph.edges) ? graph.edges : [];
  const colors = graph.nodeTypeColors || {};
  const namespace = "http://www.w3.org/2000/svg";
  let selectedId = (allNodes.find((node) => node.type === "memory") || allNodes[0] || {}).id || null;
  let viewportRoot = null;
  let visiblePositions = new Map();
  let visibleNodes = [];
  let visibleEdges = [];
  const stage = { width: 1200, height: 800 };
  const view = { x: 0, y: 0, scale: 1 };
  let dragging = null;

  const setDrawer = (drawer, open, button) => {
    drawer.dataset.open = open ? "true" : "false";
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    if (button) {
      button.setAttribute("aria-expanded", open ? "true" : "false");
    }
  };

  const sidebarToggle = document.getElementById("sidebar-toggle");
  const filterToggle = document.getElementById("filter-toggle");
  const sidebarClose = document.getElementById("sidebar-close");
  const filterClose = document.getElementById("filter-close");
  const detailClose = document.getElementById("detail-close");
  const fitButtons = [document.getElementById("fit-view"), document.getElementById("drawer-fit-view")].filter(Boolean);
  const resetButtons = [document.getElementById("reset-view"), document.getElementById("drawer-reset-view")].filter(Boolean);
  sidebarToggle.addEventListener("click", () => setDrawer(sidebar, sidebar.dataset.open !== "true", sidebarToggle));
  filterToggle.addEventListener("click", () => setDrawer(filterDrawer, filterDrawer.dataset.open !== "true", filterToggle));
  sidebarClose.addEventListener("click", () => setDrawer(sidebar, false, sidebarToggle));
  filterClose.addEventListener("click", () => setDrawer(filterDrawer, false, filterToggle));
  detailClose.addEventListener("click", () => setDrawer(detailDrawer, false));
  for (const button of fitButtons) button.addEventListener("click", fitToView);
  for (const button of resetButtons) button.addEventListener("click", resetView);

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const selectedType = typeFilter.value;
    const nodes = allNodes.filter((node) => {
      if (!toggleDerived.checked && node.derived) return false;
      const typeMatch = !selectedType || filterType(node) === selectedType;
      const haystack = [
        node.id,
        node.label,
        node.title,
        node.type,
        node.node_type,
        node.concept,
        node.source_quest,
        node.source_proposal,
        node.candidate_memory_summary,
        ...(node.sourceMemoryIds || []),
        ...(node.tags || []),
        ...(node.keywords || [])
      ].join(" ").toLowerCase();
      return typeMatch && (!query || haystack.includes(query));
    });
    const ids = new Set(nodes.map((node) => node.id));
    const edges = allEdges.filter((edge) => ids.has(edge.from) && ids.has(edge.to));
    if (!ids.has(selectedId)) selectedId = nodes[0]?.id || null;
    draw(nodes, edges);
    renderDetail(nodes.find((node) => node.id === selectedId) || null, edges.length, nodes.length);
    if (statusCounts) {
      statusCounts.textContent = "Source nodes: " + ((state.sourceGraph && state.sourceGraph.nodes) || []).length + " · Visual nodes: " + nodes.length + " / " + allNodes.length + " · Visual edges: " + edges.length;
    }
  };

  const draw = (nodes, edges) => {
    svg.replaceChildren();
    empty.hidden = nodes.length !== 0;
    visibleNodes = nodes;
    visibleEdges = edges;
    visiblePositions = computeLayout(nodes, edges);
    appendDefs(svg);
    const field = document.createElementNS(namespace, "g");
    field.setAttribute("opacity", "0.34");
    drawField(field, graph.seed || "orange-hyper");
    svg.appendChild(field);
    viewportRoot = document.createElementNS(namespace, "g");
    viewportRoot.setAttribute("id", "graph-viewport");
    svg.appendChild(viewportRoot);
    applyView();
    if (!nodes.length) return;
    for (const edge of edges) {
      const from = visiblePositions.get(edge.from);
      const to = visiblePositions.get(edge.to);
      if (!from || !to) continue;
      const line = document.createElementNS(namespace, "line");
      line.setAttribute("class", "graph-edge");
      line.setAttribute("x1", from.x);
      line.setAttribute("y1", from.y);
      line.setAttribute("x2", to.x);
      line.setAttribute("y2", to.y);
      line.setAttribute("data-relation", edge.relation || "");
      line.setAttribute("stroke-width", String(0.7 + Number(edge.strength || 0.4) * 1.7));
      line.setAttribute("opacity", String(Math.min(0.82, 0.22 + Number(edge.strength || 0.4) * 0.48)));
      viewportRoot.appendChild(line);
    }
    for (const node of nodes) {
      const point = visiblePositions.get(node.id);
      if (!point) continue;
      const group = document.createElementNS(namespace, "g");
      group.setAttribute("class", "graph-node");
      group.setAttribute("data-type", node.type || "");
      group.setAttribute("tabindex", "0");
      group.setAttribute("role", "button");
      group.setAttribute("aria-selected", node.id === selectedId ? "true" : "false");
      group.setAttribute("aria-label", String(node.node_type || "") + ": " + String(node.label || node.id || ""));
      group.addEventListener("click", () => {
        selectNode(node.id);
      });
      group.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectNode(node.id);
        }
      });
      const circle = document.createElementNS(namespace, "circle");
      circle.setAttribute("cx", point.x);
      circle.setAttribute("cy", point.y);
      circle.setAttribute("r", String(radiusForNode(node)));
      circle.setAttribute("fill", node.color || colors[node.node_type] || colors[node.type] || "${DEFAULT_NODE_COLOR}");
      circle.setAttribute("filter", "url(#node-glow)");
      group.appendChild(circle);
      if (toggleLabels.checked) {
        const text = document.createElementNS(namespace, "text");
        text.setAttribute("x", point.x);
        text.setAttribute("y", point.y + radiusForNode(node) + 16);
        text.setAttribute("text-anchor", "middle");
        text.textContent = trimLabel(node.label || node.id);
        group.appendChild(text);
      }
      viewportRoot.appendChild(group);
    }
  };

  const computeLayout = (nodes, edges) => {
    const width = stage.width;
    const height = stage.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const sorted = [...nodes].sort((left, right) =>
      Number(right.importance || right.degree || 0) - Number(left.importance || left.degree || 0) ||
      String(left.id).localeCompare(String(right.id))
    );
    const points = new Map();
    const velocity = new Map();
    if (sorted.length === 0) {
      return points;
    }
    if (sorted.length === 1) {
      points.set(sorted[0].id, { x: centerX, y: centerY });
      return points;
    }
    const types = Array.from(new Set(sorted.map(filterType))).sort((left, right) => left.localeCompare(right));
    sorted.forEach((node) => {
      const typeIndex = Math.max(0, types.indexOf(filterType(node)));
      const angle = (-Math.PI / 2) + (typeIndex * Math.PI * 2) / Math.max(types.length, 1);
      const baseRadius = node.type === "memory" ? 150 : node.type === "concept" ? 240 : 300;
      const jitterX = (hashUnit((graph.seed || "") + node.id + "x") - 0.5) * 150;
      const jitterY = (hashUnit((graph.seed || "") + node.id + "y") - 0.5) * 110;
      points.set(node.id, {
        x: centerX + Math.cos(angle) * baseRadius + jitterX,
        y: centerY + Math.sin(angle) * baseRadius * 0.64 + jitterY
      });
      velocity.set(node.id, { x: 0, y: 0 });
    });
    for (let iteration = 0; iteration < 150; iteration += 1) {
      for (let leftIndex = 0; leftIndex < sorted.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < sorted.length; rightIndex += 1) {
          const left = sorted[leftIndex];
          const right = sorted[rightIndex];
          const leftPoint = points.get(left.id);
          const rightPoint = points.get(right.id);
          const dx = rightPoint.x - leftPoint.x || 0.01;
          const dy = rightPoint.y - leftPoint.y || 0.01;
          const distSq = Math.max(80, dx * dx + dy * dy);
          const force = 7600 / distSq;
          const dist = Math.sqrt(distSq);
          const fx = dx / dist * force;
          const fy = dy / dist * force;
          velocity.get(left.id).x -= fx;
          velocity.get(left.id).y -= fy;
          velocity.get(right.id).x += fx;
          velocity.get(right.id).y += fy;
        }
      }
      for (const edge of edges) {
        const from = points.get(edge.from);
        const to = points.get(edge.to);
        if (!from || !to) continue;
        const dx = to.x - from.x || 0.01;
        const dy = to.y - from.y || 0.01;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const target = Number(edge.distance || 140);
        const strength = Number(edge.strength || 0.55);
        const force = (dist - target) * 0.008 * strength;
        const fx = dx / dist * force;
        const fy = dy / dist * force;
        velocity.get(edge.from).x += fx;
        velocity.get(edge.from).y += fy;
        velocity.get(edge.to).x -= fx;
        velocity.get(edge.to).y -= fy;
      }
      for (const node of sorted) {
        const point = points.get(node.id);
        const vel = velocity.get(node.id);
        const typeIndex = Math.max(0, types.indexOf(filterType(node)));
        const angle = (-Math.PI / 2) + (typeIndex * Math.PI * 2) / Math.max(types.length, 1);
        const anchorRadius = node.type === "memory" ? 118 : node.type === "category" ? 235 : 260;
        const anchorX = centerX + Math.cos(angle) * anchorRadius;
        const anchorY = centerY + Math.sin(angle) * anchorRadius * 0.62;
        const anchorStrength = node.type === "category" ? 0.018 : node.type === "memory" ? 0.006 : 0.01;
        vel.x += (anchorX - point.x) * anchorStrength;
        vel.y += (anchorY - point.y) * anchorStrength;
        point.x = clamp(point.x + vel.x, 44, width - 44);
        point.y = clamp(point.y + vel.y, 54, height - 54);
        vel.x *= 0.72;
        vel.y *= 0.72;
      }
    }
    return points;
  };

  const renderDetail = (node, visibleEdgeCount, visibleNodeCount) => {
    if (!node) {
      detailBody.innerHTML = '<p class="muted">No graph nodes match the current filter.</p><p>Visible nodes: ' + visibleNodeCount + '</p><p>Visible edges: ' + visibleEdgeCount + '</p>';
      return;
    }
    detailBody.innerHTML = [
      '<div class="panel-section"><h3>' + escapeHtml(node.label || node.id) + '</h3>',
      '<p class="subtle">' + escapeHtml(node.id) + '</p>',
      '<table class="data-table"><tbody>',
      '<tr><th>Visual Type</th><td>' + escapeHtml(node.type || "") + '</td></tr>',
      '<tr><th>Memory Type</th><td>' + escapeHtml(node.node_type || node.category || "") + '</td></tr>',
      '<tr><th>Derived</th><td>' + Boolean(node.derived) + '</td></tr>',
      '<tr><th>Display-only</th><td>' + Boolean(node.displayOnly) + '</td></tr>',
      '<tr><th>Read-only</th><td>' + Boolean(node.readOnly) + '</td></tr>',
      '<tr><th>Degree</th><td>' + Number(node.degree || 0) + '</td></tr>',
      '<tr><th>Source Quest</th><td>' + escapeHtml(node.source_quest || "none") + '</td></tr>',
      '<tr><th>Source Proposal</th><td>' + escapeHtml(node.source_proposal || "none") + '</td></tr>',
      '<tr><th>Source Memory IDs</th><td>' + escapeHtml((node.sourceMemoryIds || []).join(", ") || "none") + '</td></tr>',
      '<tr><th>Candidate Memory</th><td>' + escapeHtml(node.candidate_memory_summary || node.candidate_memory || node.summary || "") + '</td></tr>',
      '</tbody></table>',
      '<p class="muted">Visible nodes: ' + visibleNodeCount + ' · Visible edges: ' + visibleEdgeCount + '</p></div>'
    ].join('');
  };

  const selectNode = (id) => {
    selectedId = id;
    setDrawer(detailDrawer, true);
    render();
  };

  const appendDefs = (target) => {
    const defs = document.createElementNS(namespace, "defs");
    defs.innerHTML = '<filter id="node-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5" result="blur"></feGaussianBlur><feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter>';
    target.appendChild(defs);
  };

  const drawField = (target, seed) => {
    for (let index = 0; index < 52; index += 1) {
      const x1 = hashUnit(seed + "field-x1-" + index) * stage.width;
      const y1 = hashUnit(seed + "field-y1-" + index) * stage.height;
      const x2 = x1 + (hashUnit(seed + "field-x2-" + index) - 0.5) * 180;
      const y2 = y1 + (hashUnit(seed + "field-y2-" + index) - 0.5) * 120;
      const line = document.createElementNS(namespace, "line");
      line.setAttribute("x1", String(x1));
      line.setAttribute("y1", String(y1));
      line.setAttribute("x2", String(clamp(x2, 0, stage.width)));
      line.setAttribute("y2", String(clamp(y2, 0, stage.height)));
      line.setAttribute("stroke", "rgba(125, 211, 252, .16)");
      line.setAttribute("stroke-width", "1");
      target.appendChild(line);
    }
  };

  const applyView = () => {
    if (viewportRoot) {
      viewportRoot.setAttribute("transform", "translate(" + view.x + " " + view.y + ") scale(" + view.scale + ")");
    }
  };

  function fitToView() {
    if (!visibleNodes.length || !visiblePositions.size) return;
    const points = visibleNodes.map((node) => visiblePositions.get(node.id)).filter(Boolean);
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    const scale = Math.min(1.9, Math.max(0.6, Math.min(stage.width / Math.max(260, maxX - minX + 220), stage.height / Math.max(220, maxY - minY + 180))));
    view.scale = scale;
    view.x = (stage.width - (minX + maxX) * scale) / 2;
    view.y = (stage.height - (minY + maxY) * scale) / 2;
    applyView();
  }

  function resetView() {
    view.x = 0;
    view.y = 0;
    view.scale = 1;
    applyView();
  }

  const radiusForNode = (node) => {
    const degree = Number(node.degree || 0);
    if (node.type === "memory") return 16 + Math.min(18, degree * 1.6);
    if (node.type === "category") return 11 + Math.min(9, degree * 0.8);
    if (node.type === "concept") return 7 + Math.min(7, degree * 0.55);
    return 6 + Math.min(6, degree * 0.45);
  };

  const filterType = (node) => node.type === "memory" ? "memory:" + (node.node_type || "unknown") : String(node.type || "unknown");

  const hashNumber = (value) => {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };

  const hashUnit = (value) => hashNumber(value) / 4294967295;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const svgPoint = (event) => {
    const rect = svg.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (stage.width / Math.max(1, rect.width)),
      y: (event.clientY - rect.top) * (stage.height / Math.max(1, rect.height))
    };
  };

  svg.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    dragging = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y };
    svg.classList.add("is-panning");
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const rect = svg.getBoundingClientRect();
    const dx = (event.clientX - dragging.x) * (stage.width / Math.max(1, rect.width));
    const dy = (event.clientY - dragging.y) * (stage.height / Math.max(1, rect.height));
    view.x = dragging.viewX + dx;
    view.y = dragging.viewY + dy;
    applyView();
  });
  svg.addEventListener("pointerup", (event) => {
    dragging = null;
    svg.classList.remove("is-panning");
    try { svg.releasePointerCapture(event.pointerId); } catch {}
  });
  svg.addEventListener("wheel", (event) => {
    event.preventDefault();
    const point = svgPoint(event);
    const beforeX = (point.x - view.x) / view.scale;
    const beforeY = (point.y - view.y) / view.scale;
    const factor = event.deltaY < 0 ? 1.12 : 0.9;
    view.scale = clamp(view.scale * factor, 0.42, 3.4);
    view.x = point.x - beforeX * view.scale;
    view.y = point.y - beforeY * view.scale;
    applyView();
  }, { passive: false });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setDrawer(sidebar, false, sidebarToggle);
      setDrawer(filterDrawer, false, filterToggle);
      setDrawer(detailDrawer, false);
    }
  });

  const trimLabel = (value) => {
    const text = String(value || "");
    return text.length > 34 ? text.slice(0, 31) + "..." : text;
  };

  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  search.addEventListener("input", render);
  typeFilter.addEventListener("change", render);
  toggleDerived.addEventListener("change", render);
  toggleLabels.addEventListener("change", render);
  render();
  fitToView();
})();
    </script>
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

function renderCountRows(distribution, emptyLabel) {
  const rows = Object.entries(distribution || {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, count]) => `<tr><td>${escapeHtml(label)}</td><td>${count}</td></tr>`)
    .join("\n");
  return rows || `<tr><td>none</td><td>0</td></tr>`;
}

function renderVisualTypeOptions(nodes) {
  const labels = new Map();
  for (const node of nodes) {
    const value = node.type === "memory" ? `memory:${node.node_type || "unknown"}` : String(node.type || "unknown");
    const label = node.type === "memory" ? `Memory: ${node.node_type || "unknown"}` : humanizeConceptLabel(node.type || "unknown");
    labels.set(value, label);
  }
  return Array.from(labels.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
    .join("\n");
}

function renderVisualLegend(nodes, colors) {
  const labels = new Map();
  for (const node of nodes) {
    const key = node.type === "memory" ? node.node_type || "memory" : node.type || "unknown";
    const label = node.type === "memory" ? `memory:${node.node_type || "unknown"}` : key;
    labels.set(label, node.color || colors[key] || colors[node.type] || DEFAULT_NODE_COLOR);
  }
  if (!labels.size) {
    return "<span class=\"swatch\" style=\"--node-color: #f8fafc\">no visual nodes yet</span>";
  }
  return Array.from(labels.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, color]) => `<span class="swatch" style="--node-color: ${escapeHtml(color)}">${escapeHtml(label)}</span>`)
    .join("\n");
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
