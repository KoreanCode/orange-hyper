import fs from "node:fs";
import path from "node:path";
import { readProjectIdentity, requireInitialized } from "./config.js";
import { listGraphNodes } from "./graph.js";
import { buildGrowthSuggestionResult } from "./growth.js";
import { pendingProposalWarningCount, proposalCountsByStatus, topProposalNodeTypes } from "./memory.js";
import { originMetadata } from "./origin.js";
import { workspacePaths } from "./paths.js";
import { listQuests } from "./quest.js";
import {
  buildMinimalStructureGraph,
  readStructureGraph,
  readStructureStatus,
  recordIdentityBuildSuccess
} from "./sync.js";
import { nowIso } from "./time.js";

const IDENTITY_STATUS_MESSAGES = [
  "Memory proposal review is active.",
  "This is a read-only Knowledge Graph.",
  "It is built from generated structure state plus accepted memory nodes.",
  "Structure, Memory, and Combined views share one deterministic layout.",
  "It is not a code dependency graph.",
  "Pending/rejected proposals are not included.",
  "Graph editing is not supported.",
  "Accepted memory nodes are candidate project memory."
];

const GRAPH_DASHBOARD_SCHEMA_VERSION = "1.1.0-alpha.8";

const NODE_TYPE_COLORS = {
  decision: "#ffb454",
  constraint: "#67e8f9",
  component: "#a78bfa",
  risk: "#fb7185",
  verification: "#86efac"
};

const DEFAULT_NODE_COLOR = "#f8fafc";

const VISUAL_NODE_COLORS = {
  project: "#f8fafc",
  module: "#67e8f9",
  domain: "#38bdf8",
  component: "#a78bfa",
  test: "#86efac",
  document: "#facc15",
  infrastructure: "#fb7185",
  datastore: "#f472b6",
  memory: "#ffb454",
  memoryCluster: "#cbd5e1"
};

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
  let memoryGraph = buildMemoryGraph(project, graphPreview, paths);
  const structureState = readIdentityStructureState(cwd, project);
  const structureGraph = structureState.graph;
  const memoryMapping = buildMemoryMapping(cwd, memoryGraph.nodes, structureGraph, quests);
  memoryGraph = applyMemoryMapping(memoryGraph, memoryMapping);
  const sourceGraph = memoryGraph;
  const identityGraph = buildIdentityGraph(project, structureGraph, memoryGraph);
  const visualGraph = identityGraph;
  const growthSuggestion = buildGrowthSuggestionResult(cwd);
  const growthPreview = buildGrowthPreview(growthSuggestion.status, growthSuggestion);
  const generatedAt = nowIso(options.clock);
  const projectName = project.project_name || path.basename(cwd);
  const origin = originMetadata();
  const stateRevision = structureState.status?.state_revision || structureGraph.state_revision || null;

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
    structureGraph,
    memoryGraph,
    identityGraph,
    sourceGraph,
    visualGraph,
    memoryMapping: memoryMapping.summary,
    memory_mapping: memoryMapping.summary,
    growthPreview,
    graphWarnings: graph.warnings,
    state_revision: stateRevision,
    identity_built_from_revision: stateRevision,
    identity_status: /** @type {"current"} */ ("current"),
    structure_status: structureState.status ? {
      last_sync_at: structureState.status.last_sync_at || null,
      state_revision: structureState.status.state_revision || null,
      identity_status: stateRevision ? "current" : structureState.status.identity_status || "stale"
    } : null,
    origin,
    statusMessages: IDENTITY_STATUS_MESSAGES
  };
  const html = renderIdentityHtml(summary);
  fs.writeFileSync(paths.identityHtml, html);
  fs.writeFileSync(paths.identitySummaryJson, `${JSON.stringify(summary, null, 2)}\n`);
  const result = {
    filePath: paths.identityHtml,
    summaryFilePath: paths.identitySummaryJson,
    html,
    summary
  };
  recordIdentityBuildSuccess(cwd, result, options);
  return result;
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
      source_path: node.source_path || "",
      scope_paths: Array.isArray(node.scope_paths) ? node.scope_paths : [],
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
      source_path: node.source_path || "",
      scope_paths: Array.isArray(node.scope_paths) ? node.scope_paths : [],
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

function buildMemoryGraph(project, graphPreview, paths) {
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

function readIdentityStructureState(cwd, project) {
  const graph = readStructureGraph(cwd) || buildMinimalStructureGraph(cwd, project);
  const status = readStructureStatus(cwd);
  return { graph, status };
}

function buildIdentityGraph(project, structureGraph, memoryGraph) {
  const nodes = [];
  const nodeById = new Map();
  const edges = [];
  const edgeKeys = new Set();

  const addNode = (node) => addVisualNode(nodes, nodeById, node);
  const addEdge = (edge) => addVisualEdge(edges, edgeKeys, edge);

  for (const structureNode of structureGraph.nodes || []) {
    addNode(identityStructureNode(structureNode));
  }
  for (const structureEdge of structureGraph.edges || []) {
    addEdge(identityGraphEdge(structureEdge.from, structureEdge.to, structureEdge.relation, 0.82, distanceForRelation(structureEdge.relation), structureEdge.source || "structure"));
  }
  for (const memoryEdge of memoryGraph.edges || []) {
    addEdge(identityGraphEdge(memoryEdge.from, memoryEdge.to, memoryEdge.relation, 0.58, 170, "memory-graph"));
  }

  let unmappedNodeAdded = false;
  let orphanedNodeAdded = false;
  for (const memoryNode of memoryGraph.nodes) {
    addNode(identityMemoryNode(memoryNode, memoryGraph));
    const targetId = memoryNode.mapped_structure_node_id || null;
    const target = targetId ? (structureGraph.nodes || []).find((node) => node.id === targetId) : null;
    if (target) {
      addEdge(identityGraphEdge(memoryNode.id, target.id, "documents", 0.76, 150, "memory-scope"));
    } else if (memoryNode.mapping_status === "orphaned") {
      if (!orphanedNodeAdded) {
        addNode(orphanedMemoryNode());
        addEdge(identityGraphEdge("project.root", "orphaned-memory", "contains", 0.62, 240, "memory-scope"));
        orphanedNodeAdded = true;
      }
      addEdge(identityGraphEdge("orphaned-memory", memoryNode.id, "contains", 0.64, 130, "memory-scope"));
    } else {
      if (!unmappedNodeAdded) {
        addNode(unmappedMemoryNode());
        addEdge(identityGraphEdge("project.root", "unmapped-memory", "contains", 0.62, 240, "memory-scope"));
        unmappedNodeAdded = true;
      }
      addEdge(identityGraphEdge("unmapped-memory", memoryNode.id, "contains", 0.64, 130, "memory-scope"));
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
  const seed = stableHash(`${project.project_id || ""}|${visualNodes.map((node) => node.id).join("|")}`);
  const layoutNodes = applyDeterministicIdentityLayout(visualNodes, edges, seed);

  return /** @type {import("./types.d.ts").IdentityGraph} */ ({
    schemaVersion: GRAPH_DASHBOARD_SCHEMA_VERSION,
    readOnly: true,
    editingSupported: false,
    displayOnly: true,
    source: "structure-plus-accepted-memory",
    project_id: project.project_id || structureGraph.project_id || memoryGraph.project_id || null,
    project_name: project.project_name || structureGraph.project_name || memoryGraph.project_name || "",
    seed,
    layout: "deterministic-radial-cluster-v2",
    nodeTypeColors: {
      ...VISUAL_NODE_COLORS,
      ...memoryGraph.nodeTypeColors
    },
    nodes: layoutNodes,
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

function identityStructureNode(node) {
  const isRoot = node.id === "project.root";
  return {
    id: node.id,
    type: node.type,
    visualType: node.type,
    graphKind: "structure",
    label: node.label || node.id,
    color: VISUAL_NODE_COLORS[node.type] || DEFAULT_NODE_COLOR,
    displayOnly: false,
    derived: false,
    readOnly: true,
    sourceMemoryIds: [],
    importance: isRoot ? 100 : importanceForStructureNode(node),
    degree: 0,
    structurePath: node.path || ".",
    structureRole: node.role || "",
    source: node.source || "project-sync-scanner",
    layoutRole: isRoot ? "center" : "structure"
  };
}

function identityMemoryNode(node, memoryGraph) {
  return {
    ...node,
    type: "memory",
    visualType: "memory",
    graphKind: "memory",
    label: node.label || node.title || node.id,
    color: memoryGraph.nodeTypeColors[node.node_type] || VISUAL_NODE_COLORS.memory,
    displayOnly: false,
    derived: false,
    readOnly: true,
    sourceMemoryIds: [node.id],
    importance: 18 + Number(node.degree || 0),
    layoutRole: "accepted-memory"
  };
}

function unmappedMemoryNode() {
  return {
    id: "unmapped-memory",
    type: "memoryCluster",
    visualType: "memoryCluster",
    graphKind: "memory-cluster",
    label: "Unmapped Memory",
    color: VISUAL_NODE_COLORS.memoryCluster,
    displayOnly: true,
    derived: true,
    readOnly: true,
    sourceMemoryIds: [],
    importance: 14,
    degree: 0,
    layoutRole: "unmapped-memory"
  };
}

function orphanedMemoryNode() {
  return {
    id: "orphaned-memory",
    type: "memoryCluster",
    visualType: "memoryCluster",
    graphKind: "memory-cluster",
    label: "Orphaned Memory",
    color: VISUAL_NODE_COLORS.memoryCluster,
    displayOnly: true,
    derived: true,
    readOnly: true,
    sourceMemoryIds: [],
    importance: 14,
    degree: 0,
    layoutRole: "orphaned-memory"
  };
}

function identityGraphEdge(from, to, relation, strength, distance, source) {
  return {
    id: `identity-edge-${stableHash(`${from}|${to}|${relation}|${source || ""}`)}`,
    from,
    to,
    relation,
    source: source || "identity-graph",
    strength,
    distance,
    displayOnly: true,
    derived: false,
    readOnly: true
  };
}

function buildMemoryMapping(cwd, memoryNodes, structureGraph, quests) {
  const questById = new Map(quests.map((quest) => [quest.data.id, quest]));
  const entries = memoryNodes.map((node) =>
    resolveMemoryMapping(cwd, node, structureGraph, questById.get(node.source_quest))
  );
  const counts = entries.reduce((acc, entry) => {
    acc[entry.status] = (acc[entry.status] || 0) + 1;
    return acc;
  }, { mapped: 0, unmapped: 0, orphaned: 0 });
  const byNodeId = new Map(entries.map((entry) => [entry.memory_node_id, entry]));
  return {
    byNodeId,
    summary: {
      total: entries.length,
      mapped: counts.mapped || 0,
      unmapped: counts.unmapped || 0,
      orphaned: counts.orphaned || 0,
      entries
    }
  };
}

function applyMemoryMapping(memoryGraph, memoryMapping) {
  return {
    ...memoryGraph,
    memory_mapping: memoryMapping.summary,
    nodes: memoryGraph.nodes.map((node) => {
      const entry = memoryMapping.byNodeId.get(node.id);
      return {
        ...node,
        mapping_status: entry?.status || "unmapped",
        mapped_structure_node_id: entry?.structure_node_id || null,
        mapped_structure_node_path: entry?.structure_node_path || null,
        mapping_reason: entry?.reason || "no mapping evaluated",
        mapping_candidates: entry?.candidates || []
      };
    })
  };
}

function resolveMemoryMapping(cwd, memoryNode, structureGraph, quest) {
  const nodes = structureGraph.nodes || [];
  const candidates = new Set();
  for (const scopePath of [
    ...(quest?.data?.scope_paths || []),
    ...(Array.isArray(memoryNode.scope_paths) ? memoryNode.scope_paths : []),
    memoryNode.source_path,
    memoryNode.provenance?.source_path
  ].filter(Boolean)) {
    const normalized = normalizeGraphPath(scopePath);
    if (normalized) {
      candidates.add(normalized);
    }
  }
  for (const candidate of candidates) {
    const exact = nodes.find((node) => normalizeGraphPath(node.path) === candidate);
    if (exact) {
      return mappingEntry(memoryNode, "mapped", exact, Array.from(candidates), "scope_path_exact");
    }
  }
  for (const candidate of candidates) {
    const existsOnDisk = candidate === "." || fs.existsSync(path.join(cwd, candidate));
    if (!existsOnDisk) {
      continue;
    }
    const nested = nodes
      .filter((node) => {
        const nodePath = normalizeGraphPath(node.path);
        return nodePath && (candidate.startsWith(`${nodePath}/`) || nodePath.startsWith(`${candidate}/`));
      })
      .sort((left, right) => normalizeGraphPath(right.path).length - normalizeGraphPath(left.path).length)[0];
    if (nested) {
      return mappingEntry(memoryNode, "mapped", nested, Array.from(candidates), "scope_path_parent");
    }
  }
  if (candidates.size) {
    return mappingEntry(memoryNode, "orphaned", null, Array.from(candidates), "scope_path_missing_from_structure");
  }
  const referenced = matchStructureNodeByText(memoryNode, nodes);
  if (referenced) {
    return mappingEntry(memoryNode, "mapped", referenced, [], "explicit_component_or_module_reference");
  }
  return mappingEntry(memoryNode, "unmapped", null, [], "no_scope_path_or_explicit_reference");
}

function mappingEntry(memoryNode, status, structureNode, candidates, reason) {
  return {
    memory_node_id: memoryNode.id,
    status,
    structure_node_id: structureNode?.id || null,
    structure_node_path: structureNode?.path || null,
    candidates: candidates.sort((left, right) => left.localeCompare(right)),
    reason
  };
}

function matchStructureNodeByText(memoryNode, nodes) {
  const text = [
    memoryNode.title,
    memoryNode.label,
    memoryNode.candidate_memory,
    memoryNode.summary,
    ...(Array.isArray(memoryNode.tags) ? memoryNode.tags : []),
    ...(Array.isArray(memoryNode.keywords) ? memoryNode.keywords : [])
  ].join(" ").toLowerCase();
  if (!text.trim()) {
    return null;
  }
  return nodes
    .filter((node) => node.id !== "project.root")
    .map((node) => ({ node, score: textReferenceScore(text, node) }))
    .filter((item) => item.score > 0)
    .sort((left, right) =>
      right.score - left.score ||
      typeRank(left.node.type) - typeRank(right.node.type) ||
      String(left.node.id).localeCompare(String(right.node.id))
    )[0]?.node || null;
}

function textReferenceScore(text, node) {
  const labels = Array.from(new Set([
    node.label,
    node.role,
    node.path,
    path.posix.basename(String(node.path || ""), path.posix.extname(String(node.path || "")))
  ].filter(Boolean).map((value) => normalizeReferenceText(value))));
  let score = 0;
  for (const label of labels) {
    if (label.length < 4) {
      continue;
    }
    if (text.includes(label)) {
      score += label.length + (node.type === "component" ? 12 : 0) + (node.type === "module" ? 6 : 0);
    }
  }
  return score;
}

function normalizeReferenceText(value) {
  return String(value || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[\/_.-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .trim();
}

function normalizeGraphPath(value) {
  const normalized = String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+$/g, "");
  if (!normalized || normalized === ".") {
    return ".";
  }
  return normalized;
}

function importanceForStructureNode(node) {
  const ranks = {
    module: 32,
    domain: 26,
    component: 18,
    test: 15,
    document: 13,
    infrastructure: 12,
    datastore: 16
  };
  return ranks[node.type] || 10;
}

function distanceForRelation(relation) {
  const distances = {
    contains: 145,
    depends_on: 190,
    tests: 160,
    documents: 170,
    configures: 180
  };
  return distances[relation] || 160;
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

function stableHashNumber(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashUnit(value) {
  return stableHashNumber(value) / 4294967295;
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
    project: 0,
    module: 1,
    domain: 2,
    component: 3,
    test: 4,
    document: 5,
    infrastructure: 6,
    datastore: 7,
    memory: 8,
    memoryCluster: 9
  };
  return ranks[type] ?? 9;
}

function applyDeterministicIdentityLayout(nodes, edges, seed) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const containsParentByChild = new Map();
  for (const edge of edges) {
    if (edge.relation === "contains" && nodeById.has(edge.from) && nodeById.has(edge.to)) {
      containsParentByChild.set(edge.to, edge.from);
    }
  }

  const structureAnchors = nodes
    .filter((node) => node.graphKind === "structure" && (node.type === "module" || node.type === "domain"))
    .sort((left, right) =>
      typeRank(left.type) - typeRank(right.type) ||
      String(left.structurePath || left.id).localeCompare(String(right.structurePath || right.id))
    );
  const anchorIds = new Set(structureAnchors.map((node) => node.id));
  const anchorPoints = new Map();
  const positions = new Map([["project.root", {
    x: 0,
    y: 0,
    cluster: "project.root",
    clusterLabel: "Project Root"
  }]]);

  structureAnchors.forEach((node, index) => {
    const parent = nearestStructureCluster(containsParentByChild, nodeById, node.id);
    const parentPoint = parent && anchorPoints.has(parent) ? anchorPoints.get(parent) : null;
    const angle = clusterAngle(seed, node.id, index, structureAnchors.length);
    const parentBias = parentPoint ? 0.45 : 1;
    const radius = node.type === "module" ? 320 : parentPoint ? 210 : 430;
    const baseX = parentPoint ? parentPoint.x : 0;
    const baseY = parentPoint ? parentPoint.y : 0;
    const point = {
      x: roundCoord(baseX + Math.cos(angle) * radius * parentBias + layoutJitter(seed, node.id, "x", 24)),
      y: roundCoord(baseY + Math.sin(angle) * radius * 0.72 * parentBias + layoutJitter(seed, node.id, "y", 18)),
      cluster: node.id,
      clusterLabel: node.label || node.id
    };
    anchorPoints.set(node.id, point);
    positions.set(node.id, point);
  });

  const structureGroups = new Map();
  for (const node of nodes) {
    if (node.id === "project.root" || node.graphKind !== "structure" || anchorIds.has(node.id)) {
      continue;
    }
    const cluster = nearestStructureCluster(containsParentByChild, nodeById, node.id) || "project.root";
    const group = structureGroups.get(cluster) || [];
    group.push(node);
    structureGroups.set(cluster, group);
  }
  for (const [cluster, group] of structureGroups) {
    const anchor = positions.get(cluster) || positions.get("project.root");
    const sorted = group.sort((left, right) =>
      typeRank(left.type) - typeRank(right.type) ||
      String(left.structurePath || left.id).localeCompare(String(right.structurePath || right.id))
    );
    sorted.forEach((node, index) => {
      const angle = clusterAngle(seed, node.id, index, sorted.length);
      const ring = structureRingRadius(node.type, index);
      positions.set(node.id, {
        x: roundCoord(anchor.x + Math.cos(angle) * ring + layoutJitter(seed, node.id, "x", 18)),
        y: roundCoord(anchor.y + Math.sin(angle) * ring * 0.68 + layoutJitter(seed, node.id, "y", 14)),
        cluster,
        clusterLabel: nodeById.get(cluster)?.label || "Project Root"
      });
    });
  }

  const memoryGroups = new Map();
  for (const node of nodes.filter((item) => item.type === "memory")) {
    const targetId = node.mapped_structure_node_id && positions.has(node.mapped_structure_node_id)
      ? node.mapped_structure_node_id
      : node.mapping_status === "orphaned"
        ? "orphaned-memory"
        : "unmapped-memory";
    const group = memoryGroups.get(targetId) || [];
    group.push(node);
    memoryGroups.set(targetId, group);
  }

  const clusterNodes = nodes.filter((node) => node.type === "memoryCluster");
  for (const node of clusterNodes) {
    const angle = node.id === "orphaned-memory" ? Math.PI * 0.18 : Math.PI * 0.82;
    positions.set(node.id, {
      x: roundCoord(Math.cos(angle) * 720),
      y: roundCoord(Math.sin(angle) * 430),
      cluster: node.id,
      clusterLabel: node.label || node.id
    });
  }

  for (const [targetId, group] of memoryGroups) {
    const target = positions.get(targetId) || positions.get("project.root");
    const sorted = group.sort((left, right) => String(left.id).localeCompare(String(right.id)));
    sorted.forEach((node, index) => {
      const angle = clusterAngle(seed, node.id, index, sorted.length);
      const ring = targetId === "unmapped-memory" || targetId === "orphaned-memory"
        ? 118 + (index % 4) * 22
        : 72 + (index % 5) * 16;
      positions.set(node.id, {
        x: roundCoord(target.x + Math.cos(angle) * ring + layoutJitter(seed, node.id, "x", 10)),
        y: roundCoord(target.y + Math.sin(angle) * ring * 0.76 + layoutJitter(seed, node.id, "y", 9)),
        cluster: targetId,
        clusterLabel: nodeById.get(targetId)?.label || nodeById.get(node.mapped_structure_node_id)?.label || "Mapped Memory"
      });
    });
  }

  return nodes.map((node) => {
    const point = positions.get(node.id) || fallbackPoint(seed, node.id);
    return {
      ...node,
      x: point.x,
      y: point.y,
      layoutCluster: point.cluster,
      layoutClusterLabel: point.clusterLabel,
      layoutComputedAt: "build-time"
    };
  });
}

function nearestStructureCluster(parentByChild, nodeById, nodeId) {
  let current = parentByChild.get(nodeId);
  const visited = new Set();
  while (current && !visited.has(current)) {
    visited.add(current);
    const node = nodeById.get(current);
    if (node && (node.type === "module" || node.type === "domain")) {
      return current;
    }
    current = parentByChild.get(current);
  }
  return null;
}

function clusterAngle(seed, id, index, count) {
  const evenAngle = (-Math.PI / 2) + (index * Math.PI * 2) / Math.max(count, 1);
  return evenAngle + (hashUnit(`${seed}:${id}:angle`) - 0.5) * Math.min(0.5, Math.PI / Math.max(count, 4));
}

function layoutJitter(seed, id, axis, amount) {
  return (hashUnit(`${seed}:${id}:${axis}`) - 0.5) * amount;
}

function roundCoord(value) {
  return Math.round(value * 10) / 10;
}

function structureRingRadius(type, index) {
  const base = {
    component: 112,
    datastore: 132,
    test: 154,
    document: 188,
    infrastructure: 214
  }[type] || 150;
  return base + (index % 6) * 18;
}

function fallbackPoint(seed, id) {
  const angle = hashUnit(`${seed}:${id}:fallback-angle`) * Math.PI * 2;
  const radius = 560 + hashUnit(`${seed}:${id}:fallback-radius`) * 180;
  return {
    x: roundCoord(Math.cos(angle) * radius),
    y: roundCoord(Math.sin(angle) * radius * 0.72),
    cluster: "fallback",
    clusterLabel: "Fallback"
  };
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
  const memoryGraph = model.memoryGraph;
  const identityGraph = model.identityGraph;
  const mapping = model.memoryMapping || model.memory_mapping || { total: 0, mapped: 0, unmapped: 0, orphaned: 0, entries: [] };
  const boundaryItems = [
    "Read-only Knowledge Graph",
    "Structure Graph and Memory Graph stay separate before composition",
    "Combined view shows mapping edges",
    "Pending/rejected proposals excluded",
    "Graph editing is not supported"
  ];
  const acceptedMemoryRows = memoryGraph.nodes
    .map((node) => `<tr><td>${escapeHtml(node.node_type)}</td><td>${escapeHtml(node.title || node.label || node.id)}</td><td>${escapeHtml(node.mapping_status || "unmapped")}</td><td>${escapeHtml(node.mapped_structure_node_path || "none")}</td></tr>`)
    .join("\n") || "<tr><td>none</td><td>No accepted memory nodes</td><td>none</td><td>none</td></tr>";
  const fallbackTable = `<table id="knowledge-graph-table" class="data-table" data-fallback-table>
    <thead><tr><th>Type</th><th>Title</th><th>Mapping</th><th>Structure Path</th></tr></thead>
    <tbody>
${acceptedMemoryRows}
    </tbody>
  </table>`;
  const dashboardState = {
    schemaVersion: GRAPH_DASHBOARD_SCHEMA_VERSION,
    project: {
      project_id: model.project_id || "",
      project_name: model.project_name || model.projectName || "",
      generatedAt: model.generatedAt
    },
    origin: model.origin || originMetadata(),
    summary: {
      activeCount: model.activeCount,
      completedCount: model.completedCount,
      verifiedCount: model.verifiedCount,
      unverifiedCount: model.unverifiedCount,
      acceptedMemoryNodes: model.acceptedMemoryNodes,
      projectBoundaryActive: model.projectBoundaryActive
    },
    structureGraph: model.structureGraph,
    memoryGraph,
    identityGraph,
    mappingSummary: mapping,
    memoryMapping: mapping,
    memory_mapping: mapping,
    growthPreview: model.growthPreview,
    graphWarnings: model.graphWarnings || [],
    routeDistribution: model.routeDistribution,
    state_revision: model.state_revision || null,
    identity_built_from_revision: model.identity_built_from_revision || null,
    identity_status: model.identity_status || "current",
    renderer: {
      surface: "canvas",
      layout: identityGraph.layout,
      layoutComputedAt: "build-time",
      runtimeFetch: false,
      cdn: false,
      graphEditing: false
    },
    boundary: boundaryItems,
    readOnly: true,
    editingSupported: false
  };
  const graphDashboardState = escapeScriptJson(JSON.stringify(dashboardState, null, 2));
  const rawDetails = escapeHtml(JSON.stringify({
    structureGraph: model.structureGraph,
    memoryGraph,
    identityGraph,
    memoryMapping: mapping,
    growthPreview: model.growthPreview,
    graphWarnings: model.graphWarnings
  }, null, 2));
  const visualLegend = renderVisualLegend(identityGraph.nodes, identityGraph.nodeTypeColors);
  const structureRows = renderCountRows(model.structureGraph.summary?.nodes_by_type || {}, "Structure Type");
  const memoryRows = renderCountRows(memoryGraph.nodeTypeDistribution || {}, "Memory Type");
  const routeRows = renderCountRows(model.routeDistribution, "Route Layer");
  const statusMessages = model.statusMessages.map((message) => `<li>${escapeHtml(message)}</li>`).join("\n");
  const growthPreview = model.growthPreview || {};
  const topGrowthCandidates = Array.isArray(growthPreview.topCandidates) ? growthPreview.topCandidates.slice(0, 3) : [];
  const growthCandidateRows = topGrowthCandidates
    .map((candidate) => `<li>${escapeHtml(candidate.title || candidate.id || "candidate")} · ${escapeHtml(candidate.confidence || "unknown")}</li>`)
    .join("\n") || "<li>No candidates</li>";
  const growthPreviewPanel = `<section class="panel-section" aria-label="Growth Signal Preview">
            <h3>Growth Signal Preview</h3>
            <ul class="detail-list">
              <li>Growth Level: ${escapeHtml(growthPreview.growthLevel || "seed")}</li>
              <li>Growth Level Reason: ${escapeHtml(growthPreview.growthLevelReason || "preview only")}</li>
              <li>${escapeHtml(growthPreview.noAutomaticUnlocks || "No automatic unlocks")} · preview only</li>
            </ul>
            <h3>Top Candidates</h3>
            <ul>${growthCandidateRows}</ul>
          </section>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="generator" content="${escapeHtml(model.generated_by || "Orange Hyper")} ${escapeHtml(model.generator_version || "")}">
  <meta name="source-repository" content="${escapeHtml(model.source_repository || "")}">
  <title>Orange Hyper Identity - ${escapeHtml(model.projectName)} Knowledge Graph Dashboard</title>
  <style>
    :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0a0c10; color: #f4f7fb; }
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; }
    body { margin: 0; overflow: hidden; background: #0a0c10; color: #f4f7fb; }
    button, input, select { font: inherit; letter-spacing: 0; }
    button { min-height: 38px; border: 1px solid rgba(244, 247, 251, .18); border-radius: 8px; background: rgba(17, 19, 24, .86); color: #f4f7fb; cursor: pointer; }
    button:hover, button:focus-visible, input:focus-visible, select:focus-visible { border-color: rgba(255, 180, 84, .82); outline: 0; }
    a { color: #ffcf8a; }
    .identity-shell { position: relative; width: 100vw; height: 100vh; overflow: hidden; background: #0a0c10; }
    .graph-stage { position: absolute; inset: 0; width: 100vw; height: 100vh; overflow: hidden; background: #0a0c10; }
    .graph-stage::before { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: .35; background-image:
      linear-gradient(rgba(244, 247, 251, .07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(244, 247, 251, .05) 1px, transparent 1px);
      background-size: 64px 64px, 64px 64px; }
    .knowledge-graph-canvas { position: absolute; inset: 0; display: block; width: 100vw; height: 100vh; cursor: grab; touch-action: none; }
    .knowledge-graph-canvas.is-panning { cursor: grabbing; }
    .topbar { position: absolute; z-index: 4; top: 14px; left: 14px; right: 14px; display: grid; grid-template-columns: 42px minmax(120px, .8fr) minmax(160px, 1fr) 132px auto; gap: 10px; align-items: center; pointer-events: none; }
    .topbar > * { pointer-events: auto; }
    .icon-button { width: 42px; height: 42px; display: inline-grid; place-items: center; padding: 0; }
    .hamburger-lines { width: 18px; display: grid; gap: 4px; }
    .hamburger-lines span { display: block; height: 2px; border-radius: 999px; background: #f4f7fb; }
    .project-chip { min-width: 0; padding: 9px 12px; border: 1px solid rgba(244, 247, 251, .18); border-radius: 8px; background: rgba(10, 12, 16, .72); backdrop-filter: blur(12px); }
    .project-chip strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; letter-spacing: 0; }
    .graph-search, .view-select { width: 100%; min-height: 42px; border: 1px solid rgba(244, 247, 251, .18); border-radius: 8px; background: rgba(10, 12, 16, .72); color: #f4f7fb; padding: 9px 11px; backdrop-filter: blur(12px); }
    .desktop-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .stage-button { min-width: 64px; padding: 0 12px; background: rgba(10, 12, 16, .72); backdrop-filter: blur(12px); }
    .mobile-menu-button { display: none; }
    .graph-empty-message { position: absolute; z-index: 2; inset: 0; display: grid; place-items: center; padding: 24px; color: #d7e4f5; text-align: center; }
    .graph-empty-message[hidden] { display: none; }
    .side-drawer, .control-drawer, .node-detail-drawer { position: fixed; z-index: 6; top: 0; height: 100dvh; max-height: 100dvh; overflow: auto; overflow-x: hidden; border-color: rgba(244, 247, 251, .16); background: rgba(12, 14, 18, .96); color: #f4f7fb; backdrop-filter: blur(18px); transition: left .18s ease, right .18s ease; overflow-wrap: anywhere; word-break: break-word; pointer-events: none; }
    .side-drawer { left: max(-460px, -100dvw); width: min(460px, 100dvw); max-width: 100dvw; border-right: 1px solid rgba(244, 247, 251, .16); }
    .side-drawer[data-open="false"] { left: max(-460px, -100dvw); pointer-events: none; }
    .side-drawer[data-open="true"] { left: 0; pointer-events: auto; }
    .control-drawer, .node-detail-drawer { right: max(-420px, -100dvw); width: min(420px, 100dvw); max-width: 100dvw; border-left: 1px solid rgba(244, 247, 251, .16); }
    .control-drawer[data-open="false"], .node-detail-drawer[data-open="false"] { right: max(-420px, -100dvw); pointer-events: none; }
    .control-drawer[data-open="true"], .node-detail-drawer[data-open="true"] { right: 0; pointer-events: auto; }
    .drawer-header { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid rgba(244, 247, 251, .14); background: rgba(12, 14, 18, .98); }
    .drawer-header h2, .drawer-header h3 { margin: 0; font-size: 16px; letter-spacing: 0; }
    .drawer-body { padding: 18px; display: grid; gap: 18px; }
    .drawer-tabs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; padding: 12px 12px 0; }
    .drawer-tab { min-width: 0; min-height: 36px; padding: 0 8px; color: #cfd8e5; }
    .drawer-tab[aria-selected="true"] { border-color: rgba(255, 180, 84, .82); color: #fff7ed; background: rgba(255, 180, 84, .13); }
    .tab-panel { display: none; gap: 16px; }
    .tab-panel[data-active="true"] { display: grid; }
    .panel-section { display: grid; gap: 10px; }
    .panel-section h3 { margin: 0; font-size: 14px; color: #f7c779; letter-spacing: 0; }
    .metric-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .metric { border: 1px solid rgba(244, 247, 251, .14); border-radius: 8px; padding: 10px; background: rgba(28, 30, 35, .58); min-width: 0; }
    .metric .label { color: #b9c4d3; font-size: 12px; }
    .metric .value { margin-top: 4px; font-size: 20px; font-weight: 700; color: #f4f7fb; overflow-wrap: anywhere; }
    .data-table { width: 100%; border-collapse: collapse; border: 1px solid rgba(244, 247, 251, .14); background: rgba(28, 30, 35, .42); table-layout: fixed; }
    .data-table th, .data-table td { text-align: left; padding: 8px 9px; border-bottom: 1px solid rgba(244, 247, 251, .1); vertical-align: top; font-size: 12px; overflow-wrap: anywhere; word-break: break-word; }
    .data-table th { color: #d4dbe6; background: rgba(38, 40, 46, .74); }
    .muted { color: #b9c4d3; }
    .drawer-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .swatch-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .swatch { display: inline-flex; align-items: center; gap: 6px; color: #cfd8e5; font-size: 12px; }
    .swatch::before { content: ""; width: 10px; height: 10px; border-radius: 999px; background: var(--node-color, #f8fafc); box-shadow: 0 0 10px var(--node-color, #f8fafc); }
    .raw-json { max-height: 360px; overflow: auto; overflow-x: hidden; margin: 0; padding: 12px; border: 1px solid rgba(244, 247, 251, .14); border-radius: 8px; background: rgba(8, 9, 12, .82); color: #d4dbe6; font-size: 11px; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }
    .detail-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
    .detail-list li { border: 1px solid rgba(244, 247, 251, .12); border-radius: 8px; padding: 9px; background: rgba(28, 30, 35, .42); }
    .noscript-fallback { position: fixed; z-index: 20; inset: 18px; overflow: auto; border: 1px solid rgba(244, 247, 251, .24); border-radius: 8px; padding: 18px; background: #0c0e12; color: #f4f7fb; }
    .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    @media (max-width: 760px) {
      .topbar { top: 10px; left: 10px; right: 10px; grid-template-columns: 42px minmax(0, 1fr) 42px; gap: 8px; }
      .project-chip { grid-column: 2 / 3; }
      .graph-search { grid-column: 1 / 4; grid-row: 2; }
      .view-select { grid-column: 1 / 3; grid-row: 3; }
      .desktop-actions { display: none; }
      .mobile-menu-button { display: inline-grid; grid-column: 3; grid-row: 3; min-width: 42px; }
      .side-drawer, .control-drawer, .node-detail-drawer { width: 100dvw; max-width: 100dvw; height: 100dvh; max-height: 100dvh; }
      .drawer-tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  </style>
</head>
<body>
  <main class="identity-shell" data-identity-dashboard>
    <section class="graph-stage" aria-label="Read-only Knowledge Graph Dashboard">
      <canvas id="knowledge-graph-canvas" class="knowledge-graph-canvas" role="img" aria-label="Full-screen read-only Identity Graph"></canvas>
      <div id="graph-empty-message" class="graph-empty-message" hidden>No graph nodes match the current view. No accepted memory nodes yet.</div>
      <div class="topbar" aria-label="Graph controls">
        <button id="sidebar-toggle" class="icon-button" type="button" aria-label="Open sidebar" aria-controls="identity-sidebar" aria-expanded="false"><span class="hamburger-lines" aria-hidden="true"><span></span><span></span><span></span></span></button>
        <div class="project-chip"><strong>${escapeHtml(model.projectName)}</strong></div>
        <input id="graph-search" class="graph-search" type="search" autocomplete="off" placeholder="Search">
        <select id="graph-view-mode" class="view-select" aria-label="Layer view">
          <option value="combined" selected>Combined</option>
          <option value="structure">Structure</option>
          <option value="memory">Memory</option>
        </select>
        <div class="desktop-actions">
          <button id="fit-view" class="stage-button" type="button">Fit</button>
          <button id="reset-view" class="stage-button" type="button">Reset</button>
        </div>
        <button id="mobile-menu-toggle" class="icon-button mobile-menu-button" type="button" aria-label="Open graph controls" aria-controls="control-drawer" aria-expanded="false">...</button>
      </div>
      <p id="graph-live-status" class="visually-hidden" aria-live="polite"></p>
    </section>
    <aside id="identity-sidebar" class="side-drawer" data-open="false" aria-hidden="true" aria-label="Identity sidebar">
      <div class="drawer-header">
        <h2>Identity</h2>
        <button id="sidebar-close" type="button">Close</button>
      </div>
      <div class="drawer-tabs" role="tablist" aria-label="Identity sections">
        <button class="drawer-tab" id="tab-overview" data-tab="overview" role="tab" aria-selected="true" aria-controls="panel-overview">Overview</button>
        <button class="drawer-tab" id="tab-structure" data-tab="structure" role="tab" aria-selected="false" aria-controls="panel-structure">Structure</button>
        <button class="drawer-tab" id="tab-memory" data-tab="memory" role="tab" aria-selected="false" aria-controls="panel-memory">Memory</button>
        <button class="drawer-tab" id="tab-diagnostics" data-tab="diagnostics" role="tab" aria-selected="false" aria-controls="panel-diagnostics">Diagnostics</button>
      </div>
      <div class="drawer-body">
        <section id="panel-overview" class="tab-panel" data-active="true" role="tabpanel" aria-labelledby="tab-overview">
          <div class="metric-grid">
            <div class="metric"><div class="label">Structure Nodes</div><div class="value">${model.structureGraph.nodes.length}</div></div>
            <div class="metric"><div class="label">Accepted Memory</div><div class="value">${model.acceptedMemoryNodes}</div></div>
            <div class="metric"><div class="label">Mapped</div><div class="value">${mapping.mapped}</div></div>
            <div class="metric"><div class="label">Identity Status</div><div class="value">${escapeHtml(model.identity_status || "current")}</div></div>
          </div>
          ${growthPreviewPanel}
          <section class="panel-section" aria-label="Visual legend"><h3>Legend</h3><div class="swatch-list">${visualLegend}</div></section>
          <section class="panel-section" aria-label="Boundary"><h3>Boundary</h3><ul>${boundaryItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n")}</ul></section>
        </section>
        <section id="panel-structure" class="tab-panel" data-active="false" role="tabpanel" aria-labelledby="tab-structure">
          <section class="panel-section"><h3>Structure</h3><table class="data-table"><thead><tr><th>Type</th><th>Count</th></tr></thead><tbody>${structureRows}</tbody></table></section>
          <section class="panel-section"><h3>Revision</h3><ul class="detail-list"><li>state_revision: ${escapeHtml(model.state_revision || "none")}</li><li>identity_built_from_revision: ${escapeHtml(model.identity_built_from_revision || "none")}</li></ul></section>
        </section>
        <section id="panel-memory" class="tab-panel" data-active="false" role="tabpanel" aria-labelledby="tab-memory">
          <section class="panel-section"><h3>Memory Mapping</h3><div class="metric-grid"><div class="metric"><div class="label">Mapped</div><div class="value">${mapping.mapped}</div></div><div class="metric"><div class="label">Unmapped</div><div class="value">${mapping.unmapped}</div></div><div class="metric"><div class="label">Orphaned</div><div class="value">${mapping.orphaned}</div></div><div class="metric"><div class="label">Total</div><div class="value">${mapping.total}</div></div></div></section>
          <section class="panel-section"><h3>Memory Types</h3><table class="data-table"><thead><tr><th>Type</th><th>Count</th></tr></thead><tbody>${memoryRows}</tbody></table></section>
          <details><summary>Accepted memory rows</summary>${fallbackTable}</details>
        </section>
        <section id="panel-diagnostics" class="tab-panel" data-active="false" role="tabpanel" aria-labelledby="tab-diagnostics">
          <section class="panel-section"><h3>Status Messages</h3><ul>${statusMessages}</ul></section>
          <section class="panel-section"><h3>Route Distribution</h3><table class="data-table"><thead><tr><th>Layer</th><th>Count</th></tr></thead><tbody>${routeRows}</tbody></table></section>
          <details><summary>Raw JSON</summary><pre class="raw-json">${rawDetails}</pre></details>
        </section>
      </div>
    </aside>
    <aside id="control-drawer" class="control-drawer" data-open="false" aria-hidden="true" aria-label="Graph controls drawer">
      <div class="drawer-header"><h3>Controls</h3><button id="control-close" type="button">Close</button></div>
      <div class="drawer-body"><div class="drawer-actions"><button id="drawer-fit-view" type="button">Fit</button><button id="drawer-reset-view" type="button">Reset</button></div></div>
    </aside>
    <aside id="node-detail-drawer" class="node-detail-drawer" data-open="false" aria-hidden="true" aria-label="Node detail drawer">
      <div class="drawer-header"><h3>Node Detail</h3><button id="detail-close" type="button">Close</button></div>
      <div id="node-detail-body" class="drawer-body"><p class="muted">Select a node to inspect structure, accepted memory, source scope, and provenance.</p></div>
    </aside>
  </main>
  <noscript>
    <section class="noscript-fallback" aria-label="JavaScript disabled fallback">
      <h1>${escapeHtml(model.projectName)} Knowledge Graph Fallback</h1>
      <p>JavaScript is disabled, so this read-only accepted memory table is shown instead of the canvas graph.</p>
      ${fallbackTable}
    </section>
  </noscript>
  <script id="orange-knowledge-graph-state" type="application/json">
${graphDashboardState}
  </script>
  <script>
(() => {
  const startTime = performance.now();
  const stateElement = document.getElementById("orange-knowledge-graph-state");
  const canvas = document.getElementById("knowledge-graph-canvas");
  const sidebar = document.getElementById("identity-sidebar");
  const controls = document.getElementById("control-drawer");
  const detailDrawer = document.getElementById("node-detail-drawer");
  const detailBody = document.getElementById("node-detail-body");
  const empty = document.getElementById("graph-empty-message");
  const liveStatus = document.getElementById("graph-live-status");
  const search = document.getElementById("graph-search");
  const modeSelect = document.getElementById("graph-view-mode");
  if (!stateElement || !canvas || !sidebar || !controls || !detailDrawer || !detailBody || !search || !modeSelect) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const state = JSON.parse(stateElement.textContent || "{}");
  const graph = state.identityGraph || {};
  const allNodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const allEdges = Array.isArray(graph.edges) ? graph.edges : [];
  const colors = graph.nodeTypeColors || {};
  const nodeById = new Map(allNodes.map((node) => [node.id, node]));
  let visibleNodes = [];
  let visibleEdges = [];
  let selectedId = (allNodes.find((node) => node.id === "project.root") || allNodes[0] || {}).id || null;
  let hoveredId = null;
  let dragging = null;
  let frame = 0;
  let frameFallback = 0;
  const view = { x: 0, y: 0, scale: 1 };

  function setDrawer(drawer, open, button) {
    drawer.dataset.open = open ? "true" : "false";
    drawer.setAttribute("aria-hidden", open ? "false" : "true");
    drawer.style.pointerEvents = open ? "auto" : "none";
    const width = Math.max(1, Math.round(drawer.getBoundingClientRect().width || drawer.offsetWidth || window.innerWidth));
    if (drawer.classList.contains("side-drawer")) {
      drawer.style.left = open ? "0px" : "-" + width + "px";
    } else {
      drawer.style.right = open ? "0px" : "-" + width + "px";
    }
    if (button) button.setAttribute("aria-expanded", open ? "true" : "false");
  }

  const sidebarToggle = document.getElementById("sidebar-toggle");
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  const fitButtons = [document.getElementById("fit-view"), document.getElementById("drawer-fit-view")].filter(Boolean);
  const resetButtons = [document.getElementById("reset-view"), document.getElementById("drawer-reset-view")].filter(Boolean);
  sidebarToggle.addEventListener("click", () => setDrawer(sidebar, sidebar.dataset.open !== "true", sidebarToggle));
  document.getElementById("sidebar-close").addEventListener("click", () => setDrawer(sidebar, false, sidebarToggle));
  mobileMenuToggle.addEventListener("click", () => setDrawer(controls, controls.dataset.open !== "true", mobileMenuToggle));
  document.getElementById("control-close").addEventListener("click", () => setDrawer(controls, false, mobileMenuToggle));
  document.getElementById("detail-close").addEventListener("click", () => setDrawer(detailDrawer, false));
  for (const button of fitButtons) button.addEventListener("click", fitToView);
  for (const button of resetButtons) button.addEventListener("click", resetView);
  for (const tab of document.querySelectorAll(".drawer-tab")) {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      for (const item of document.querySelectorAll(".drawer-tab")) item.setAttribute("aria-selected", item.dataset.tab === target ? "true" : "false");
      for (const panel of document.querySelectorAll(".tab-panel")) panel.dataset.active = panel.id === "panel-" + target ? "true" : "false";
    });
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    resetView();
  }

  function updateVisible() {
    const query = search.value.trim().toLowerCase();
    const mode = modeSelect.value || "combined";
    const nodes = allNodes.filter((node) => modeMatch(node, mode) && queryMatch(node, query));
    const ids = new Set(nodes.map((node) => node.id));
    const edges = allEdges.filter((edge) => ids.has(edge.from) && ids.has(edge.to) && edgeModeMatch(edge, mode));
    visibleNodes = nodes;
    visibleEdges = edges;
    if (!ids.has(selectedId)) selectedId = nodes.find((node) => node.id === "project.root")?.id || nodes[0]?.id || null;
    empty.hidden = nodes.length !== 0;
    renderDetail(nodeById.get(selectedId) || null);
    if (liveStatus) liveStatus.textContent = mode + " view, " + nodes.length + " nodes, " + edges.length + " edges.";
    scheduleDraw();
  }

  function modeMatch(node, mode) {
    if (mode === "structure") return node.graphKind === "structure";
    if (mode === "memory") return node.type === "memory";
    return true;
  }

  function edgeModeMatch(edge, mode) {
    if (mode === "combined") return true;
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) return false;
    if (mode === "structure") return from.graphKind === "structure" && to.graphKind === "structure";
    if (mode === "memory") return from.type === "memory" && to.type === "memory";
    return true;
  }

  function queryMatch(node, query) {
    if (!query) return true;
    const haystack = [
      node.id,
      node.label,
      node.title,
      node.type,
      node.node_type,
      node.graphKind,
      node.structurePath,
      node.structureRole,
      node.layoutClusterLabel,
      node.source_quest,
      node.source_proposal,
      node.candidate_memory_summary,
      node.mapped_structure_node_path,
      ...(node.sourceMemoryIds || []),
      ...(node.tags || []),
      ...(node.keywords || [])
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  }

  function scheduleDraw() {
    if (frame || frameFallback) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (frameFallback) {
        clearTimeout(frameFallback);
        frameFallback = 0;
      }
      draw();
    });
    frameFallback = setTimeout(() => {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      frameFallback = 0;
      draw();
    }, 120);
  }

  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);
    drawGrid(width, height);
    drawClusters();
    for (const edge of visibleEdges) drawEdge(edge);
    const sorted = [...visibleNodes].sort((left, right) => nodeDrawRank(left) - nodeDrawRank(right));
    for (const node of sorted) drawNode(node);
    window.__orangeHyperRendererStats = {
      renderer: "canvas",
      mode: modeSelect.value || "combined",
      visibleNodes: visibleNodes.length,
      visibleEdges: visibleEdges.length,
      domNodes: document.querySelectorAll("*").length,
      layoutMs: 0,
      sourceStateUnmodified: true
    };
    if (!window.__orangeHyperInitialRender) {
      window.__orangeHyperInitialRender = {
        renderer: "canvas",
        firstDrawMs: Math.round((performance.now() - startTime) * 10) / 10,
        layoutMs: 0,
        layout: graph.layout || ""
      };
    }
  }

  function drawGrid(width, height) {
    ctx.save();
    ctx.strokeStyle = "rgba(244,247,251,.045)";
    ctx.lineWidth = 1;
    const step = 64 * view.scale;
    const offsetX = ((width / 2 + view.x) % step + step) % step;
    const offsetY = ((height / 2 + view.y) % step + step) % step;
    for (let x = offsetX; x < width; x += step) line(x, 0, x, height);
    for (let y = offsetY; y < height; y += step) line(0, y, width, y);
    ctx.restore();
  }

  function drawClusters() {
    if (modeSelect.value === "memory") return;
    const anchors = visibleNodes.filter((node) => node.type === "module" || node.type === "domain");
    ctx.save();
    for (const node of anchors) {
      const p = toScreen(node);
      const radius = Math.max(54, (node.type === "module" ? 120 : 88) * view.scale);
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = node.type === "module" ? "rgba(103,232,249,.045)" : "rgba(56,189,248,.052)";
      ctx.strokeStyle = node.type === "module" ? "rgba(103,232,249,.16)" : "rgba(56,189,248,.18)";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEdge(edge) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) return;
    const a = toScreen(from);
    const b = toScreen(to);
    ctx.save();
    ctx.globalAlpha = edge.source === "memory-scope" ? 0.72 : 0.48;
    ctx.strokeStyle = edge.source === "memory-scope" ? "#ffb454" : edge.source === "memory-graph" ? "#c084fc" : "#9aa6b2";
    ctx.lineWidth = Math.max(0.7, Number(edge.strength || 0.5) * 1.8);
    if (edge.source === "memory-scope") ctx.setLineDash([6, 5]);
    line(a.x, a.y, b.x, b.y);
    ctx.restore();
  }

  function drawNode(node) {
    const p = toScreen(node);
    const radius = radiusForNode(node);
    const selected = node.id === selectedId;
    const hovered = node.id === hoveredId;
    ctx.save();
    ctx.globalAlpha = node.derived ? 0.82 : 1;
    ctx.fillStyle = node.color || colors[node.node_type] || colors[node.type] || "${DEFAULT_NODE_COLOR}";
    ctx.strokeStyle = selected ? "#ffffff" : hovered ? "#ffcf8a" : "rgba(255,255,255,.64)";
    ctx.lineWidth = selected || hovered ? 2.6 : 1.2;
    if (node.type === "module" || node.type === "domain") {
      roundRect(p.x - radius, p.y - radius, radius * 2, radius * 2, 6);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (shouldLabel(node, selected, hovered)) drawLabel(node, p, radius);
    ctx.restore();
  }

  function drawLabel(node, p, radius) {
    const text = trimLabel(node.label || node.id, node.type === "project" ? 34 : 28);
    ctx.font = (node.type === "project" ? "700 14px " : "600 12px ") + "ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#0a0c10";
    ctx.fillStyle = "#f4f7fb";
    ctx.strokeText(text, p.x, p.y + radius + 7);
    ctx.fillText(text, p.x, p.y + radius + 7);
  }

  function shouldLabel(node, selected, hovered) {
    if (selected || hovered || node.id === "project.root") return true;
    if (visibleNodes.length > 320) return node.type === "module" || node.type === "domain";
    if (visibleNodes.length > 120) return node.type === "module" || node.type === "domain" || node.type === "memory";
    return node.type !== "document" && node.type !== "infrastructure";
  }

  function toScreen(node) {
    return {
      x: canvas.clientWidth / 2 + view.x + Number(node.x || 0) * view.scale,
      y: canvas.clientHeight / 2 + view.y + Number(node.y || 0) * view.scale
    };
  }

  function toWorld(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - rect.width / 2 - view.x) / view.scale,
      y: (event.clientY - rect.top - rect.height / 2 - view.y) / view.scale
    };
  }

  function hitTest(event) {
    const world = toWorld(event);
    for (let index = visibleNodes.length - 1; index >= 0; index -= 1) {
      const node = visibleNodes[index];
      const dx = world.x - Number(node.x || 0);
      const dy = world.y - Number(node.y || 0);
      const r = radiusForNode(node) / Math.max(view.scale, 0.2) + 8;
      if (dx * dx + dy * dy <= r * r) return node;
    }
    return null;
  }

  function selectNode(node) {
    if (!node) return;
    selectedId = node.id;
    renderDetail(node);
    setDrawer(detailDrawer, true);
    scheduleDraw();
  }

  function renderDetail(node) {
    if (!node) {
      detailBody.innerHTML = '<p class="muted">No graph nodes match the current view.</p>';
      return;
    }
    detailBody.innerHTML = [
      '<section class="panel-section"><h3>' + escapeHtml(node.label || node.id) + '</h3>',
      '<ul class="detail-list">',
      '<li>ID: ' + escapeHtml(node.id) + '</li>',
      '<li>Type: ' + escapeHtml(node.type || "") + '</li>',
      '<li>Graph: ' + escapeHtml(node.graphKind || "") + '</li>',
      '<li>Cluster: ' + escapeHtml(node.layoutClusterLabel || node.layoutCluster || "none") + '</li>',
      '<li>Path: ' + escapeHtml(node.structurePath || node.mapped_structure_node_path || "none") + '</li>',
      '<li>Memory: ' + escapeHtml(node.candidate_memory_summary || node.candidate_memory || node.summary || "none") + '</li>',
      '<li>Source Quest: ' + escapeHtml(node.source_quest || "none") + '</li>',
      '<li>Source Proposal: ' + escapeHtml(node.source_proposal || "none") + '</li>',
      '</ul></section>'
    ].join("");
  }

  function resetView() {
    const width = canvas.clientWidth || 1200;
    const height = canvas.clientHeight || 800;
    view.x = 0;
    view.y = 0;
    view.scale = clamp(Math.min((width - 80) / 1650, (height - 120) / 1050), 0.22, 1.1);
    scheduleDraw();
  }

  function fitToView() {
    if (!visibleNodes.length) return;
    const xs = visibleNodes.map((node) => Number(node.x || 0));
    const ys = visibleNodes.map((node) => Number(node.y || 0));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = canvas.clientWidth || 1200;
    const height = canvas.clientHeight || 800;
    view.scale = clamp(Math.min((width - 96) / Math.max(320, maxX - minX + 260), (height - 120) / Math.max(260, maxY - minY + 220)), 0.2, 1.8);
    view.x = -((minX + maxX) / 2) * view.scale;
    view.y = -((minY + maxY) / 2) * view.scale;
    scheduleDraw();
  }

  function radiusForNode(node) {
    const degree = Number(node.degree || 0);
    const scale = Math.sqrt(Math.max(view.scale, 0.35));
    if (node.type === "project") return (24 + Math.min(10, degree)) * scale;
    if (node.type === "module" || node.type === "domain") return (14 + Math.min(8, degree * 0.7)) * scale;
    if (node.type === "memory") return (13 + Math.min(10, degree * 1.2)) * scale;
    if (node.type === "component" || node.type === "datastore") return (8 + Math.min(6, degree * 0.5)) * scale;
    return (5 + Math.min(4, degree * 0.35)) * scale;
  }

  function nodeDrawRank(node) {
    const ranks = { document: 0, infrastructure: 1, test: 2, datastore: 3, component: 4, module: 5, domain: 6, memoryCluster: 7, memory: 8, project: 9 };
    return ranks[node.type] || 0;
  }

  function line(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function trimLabel(value, max) {
    const text = String(value || "");
    return text.length > max ? text.slice(0, max - 3) + "..." : text;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const hit = hitTest(event);
    dragging = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y, node: hit };
    canvas.classList.add("is-panning");
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    const hit = hitTest(event);
    hoveredId = hit?.id || null;
    if (dragging) {
      view.x = dragging.viewX + (event.clientX - dragging.x);
      view.y = dragging.viewY + (event.clientY - dragging.y);
    }
    scheduleDraw();
  });
  canvas.addEventListener("pointerup", (event) => {
    const moved = dragging ? Math.abs(event.clientX - dragging.x) + Math.abs(event.clientY - dragging.y) : 0;
    const node = dragging?.node || hitTest(event);
    dragging = null;
    canvas.classList.remove("is-panning");
    try { canvas.releasePointerCapture(event.pointerId); } catch {}
    if (node && moved < 6) selectNode(node);
  });
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = event.clientX - rect.left - rect.width / 2;
    const sy = event.clientY - rect.top - rect.height / 2;
    const beforeX = (sx - view.x) / view.scale;
    const beforeY = (sy - view.y) / view.scale;
    const factor = event.deltaY < 0 ? 1.12 : 0.9;
    view.scale = clamp(view.scale * factor, 0.16, 3.5);
    view.x = sx - beforeX * view.scale;
    view.y = sy - beforeY * view.scale;
    scheduleDraw();
  }, { passive: false });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setDrawer(sidebar, false, sidebarToggle);
      setDrawer(controls, false, mobileMenuToggle);
      setDrawer(detailDrawer, false);
    }
  });
  search.addEventListener("input", updateVisible);
  modeSelect.addEventListener("change", updateVisible);
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  updateVisible();
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
