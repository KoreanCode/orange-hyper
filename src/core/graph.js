import fs from "node:fs";
import path from "node:path";
import { readProjectIdentity, requireInitialized, requireProjectIdentity } from "./config.js";
import {
  MEMORY_GRAPH_NODE_SCHEMA_VERSION,
  MEMORY_NODE_TYPES,
  listMemoryDeltaProposals,
  listMemoryGraphNodes,
  readGraphIndex,
  writeGraphIndexFile
} from "./memory.js";
import { originMetadata } from "./origin.js";
import { workspacePaths } from "./paths.js";
import { asArray } from "./text.js";
import { nowIso } from "./time.js";

export const GRAPH_INDEX_VERSION = "0.3.0";

/**
 * @returns {import("./types.d.ts").GraphListResult}
 */
export function listGraphNodes(cwd = process.cwd(), filters = {}) {
  requireInitialized(cwd);
  const project = requireProjectIdentity(cwd);
  const normalizedFilters = normalizeGraphFilters(filters);
  const scan = scanGraphNodes(cwd, project);
  return {
    project,
    filters: normalizedFilters,
    nodes: filterGraphNodes(scan.nodes, normalizedFilters),
    warnings: scan.warnings
  };
}

/**
 * @returns {import("./types.d.ts").GraphShowResult}
 */
export function showGraphNode(cwd = process.cwd(), selector) {
  requireInitialized(cwd);
  assertSafeGraphSelector(selector);
  const graph = listGraphNodes(cwd);
  const matches = graph.nodes.filter((node) =>
    node.id === selector ||
    path.basename(node.file, ".md") === selector ||
    node.id.startsWith(selector)
  );
  if (matches.length === 0) {
    throw new Error(`Graph node not found in current project: ${selector}`);
  }
  if (matches.length > 1) {
    throw new Error(`Graph node selector is ambiguous: ${selector}`);
  }
  return {
    project: graph.project,
    node: matches[0],
    warnings: graph.warnings
  };
}

/**
 * @returns {import("./types.d.ts").GraphSearchResult}
 */
export function searchGraphNodes(cwd = process.cwd(), query, filters = {}) {
  requireInitialized(cwd);
  const normalizedQuery = String(query || "").trim();
  if (!normalizedQuery) {
    throw new Error("Graph search query is required.");
  }
  const graph = listGraphNodes(cwd, filters);
  const results = graph.nodes
    .map((node) => scoreGraphNode(node, normalizedQuery, graph.filters))
    .filter((result) => result.matches.length > 0)
    .sort((left, right) =>
      right.score - left.score ||
      left.node.id.localeCompare(right.node.id)
    );
  return {
    project: graph.project,
    filters: graph.filters,
    query: normalizedQuery,
    nodes: results.map((result) => ({
      ...result.node,
      matches: result.matches,
      score: result.score
    })),
    warnings: graph.warnings
  };
}

export function rebuildGraphIndex(cwd = process.cwd(), options = {}) {
  requireInitialized(cwd);
  const project = requireProjectIdentity(cwd);
  const paths = workspacePaths(cwd);
  const scan = scanGraphNodes(cwd, project);
  const generatedAt = nowIso(options.clock);
  const previous = readPreviousGraphIndex(cwd);
  const index = stabilizeGeneratedAt(previous, buildGraphIndex(project, scan.nodes, generatedAt));
  writeGraphIndexFile(paths.graphIndex, index);
  return {
    project,
    index,
    filePath: paths.graphIndex,
    nodes: scan.nodes,
    warnings: scan.warnings
  };
}

export function buildGraphIndex(project, nodes, generatedAt) {
  return {
    schema_version: MEMORY_GRAPH_NODE_SCHEMA_VERSION,
    index_version: GRAPH_INDEX_VERSION,
    project_id: project.project_id,
    project_name: project.project_name,
    updated_at: graphIndexUpdatedAt(nodes),
    generated_at: generatedAt,
    source: "graph-node-markdown",
    ...originMetadata(),
    nodes: nodes
      .map((node) => graphIndexEntryFromNode(node))
      .sort((left, right) => left.id.localeCompare(right.id))
  };
}

export function graphIndexEntryFromNode(node) {
  return {
    id: node.id,
    file: node.file,
    project_id: node.project_id || null,
    project_name: node.project_name || "",
    node_type: node.node_type,
    title: node.title,
    source_quest: node.source_quest,
    source_proposal: node.source_proposal,
    accepted_at: node.accepted_at,
    ...originMetadata(),
    candidate_memory: node.candidate_memory,
    summary: node.summary,
    tags: node.tags,
    keywords: node.keywords
  };
}

export function validateGraphReadModel(cwd = process.cwd(), context = {}) {
  const paths = workspacePaths(cwd);
  if (!fs.existsSync(paths.config)) {
    return { errors: [], warnings: [], checks: [], diagnostics: emptyDiagnostics() };
  }
  const project = context.projectIdentity || readProjectIdentity(cwd);
  const errors = [];
  const warnings = [];
  const checks = [];
  const diagnostics = emptyDiagnostics();
  const addError = (code, message, hint) => {
    errors.push(message);
    diagnostics.errors.push({ code, message, hint });
  };
  const addWarning = (code, message, hint) => {
    warnings.push(message);
    diagnostics.warnings.push({ code, message, hint });
  };
  const graphIndex = readIndexForValidation(cwd, errors, checks);
  const scan = scanGraphNodes(cwd, project);
  for (const warning of scan.warnings) {
    addWarning(
      "LEGACY_PROJECT_ID_MISSING",
      warning,
      "Run `orange doctor --repair-project-id` to fill missing legacy graph node project_id fields."
    );
  }
  const currentNodes = scan.nodes;
  const currentNodeIds = new Set(currentNodes.map((node) => node.id));
  const allNodeIds = new Set(scan.allNodes.map((node) => node.data?.id).filter(Boolean));
  const allNodesById = new Map();
  for (const node of scan.allNodes) {
    if (node.data?.id) {
      allNodesById.set(node.data.id, node);
    }
  }
  const allNodeFiles = new Set(scan.allNodes.map((node) => path.relative(cwd, node.filePath)));
  const acceptedProposals = listMemoryDeltaProposals(cwd, "accepted");
  const acceptedProposalIds = new Set(acceptedProposals.map((proposal) => proposal.data.id));

  for (const node of scan.allNodes) {
    if (node.data?.id) {
      try {
        assertSafeGraphSelector(node.data.id);
      } catch {
        addError(
          "GRAPH_NODE_UNSAFE_ID",
          `graph node ${node.data.id} has unsafe id`,
          "Rename or remove the graph node file; graph node ids must be safe ids, not paths."
        );
      }
    }
    if (node.filePath) {
      const nodeRoot = path.resolve(paths.graphNodes);
      if (!isInside(path.resolve(node.filePath), nodeRoot)) {
        addError(
          "GRAPH_NODE_PATH_ESCAPE",
          `graph node ${node.data?.id || path.basename(node.filePath)} path must stay inside ${path.relative(paths.root, paths.graphNodes)}`,
          "Move the graph node under `.orange-hyper/graph/nodes/<type>/` before rebuilding the index."
        );
      }
    }
    const sourceProposal = node.data?.source_proposal || node.data?.provenance?.source_proposal || node.data?.provenance?.proposal_id;
    if (isMemoryDeltaGraphNode(node.data) && !sourceProposal) {
      addError(
        "ACCEPTED_NODE_SOURCE_PROPOSAL_MISSING",
        `accepted graph node ${node.data?.id || "(unknown)"} is missing source_proposal provenance`,
        "Commit accepted proposal provenance or restore the accepted proposal file. Pending/rejected proposals are local by default, but accepted proposals should be shared with accepted graph nodes."
      );
    } else if (sourceProposal && !memoryProposalFileExists(paths, sourceProposal)) {
      addError(
        "ACCEPTED_NODE_SOURCE_PROPOSAL_MISSING",
        `accepted graph node ${node.data?.id || "(unknown)"} source_proposal ${sourceProposal} is missing accepted proposal file`,
        "Commit accepted proposal provenance or restore the accepted proposal file. Pending/rejected proposals are local by default, but accepted proposals should be shared with accepted graph nodes."
      );
    } else if (sourceProposal && !acceptedProposalIds.has(sourceProposal)) {
      addError(
        "GRAPH_NODE_SOURCE_PROPOSAL_NOT_ACCEPTED",
        `graph node ${node.data?.id || "(unknown)"} source_proposal ${sourceProposal} is not an accepted proposal`,
        "Graph nodes must come from accepted memory proposals; remove the node or inspect the proposal status."
      );
    }
  }

  for (const proposal of acceptedProposals) {
    if (proposal.data.project_id && proposal.data.project_id !== project.project_id) {
      continue;
    }
    const expectedNodeId = `${proposal.data.node_type}.${proposal.data.id}`;
    if (!currentNodeIds.has(expectedNodeId) && !allNodeIds.has(expectedNodeId)) {
      addError(
        "ACCEPTED_PROPOSAL_MISSING_NODE",
        `accepted memory proposal ${proposal.data.id} is missing graph node ${expectedNodeId}`,
        "Inspect the accepted proposal and recreate the graph node manually only if it still belongs to this project."
      );
    }
  }

  if (graphIndex) {
    if (graphIndex.project_id && project.project_id && graphIndex.project_id !== project.project_id) {
      addError(
        "GRAPH_INDEX_PROJECT_MISMATCH",
        `graph/index.json project_id ${graphIndex.project_id} does not match config project_id ${project.project_id}`,
        "Run `orange graph rebuild-index` after confirming graph nodes belong to the current project."
      );
    }
    const indexNodes = Array.isArray(graphIndex.nodes) ? graphIndex.nodes : null;
    if (!indexNodes) {
      addError(
        "GRAPH_INDEX_INVALID",
        "graph/index.json nodes must be an array",
        "Run `orange graph rebuild-index` to regenerate the read model from graph node Markdown."
      );
    } else {
      const expectedEntries = buildGraphIndex(project, currentNodes, graphIndex.generated_at || null).nodes;
      const expectedById = new Map(expectedEntries.map((entry) => [entry.id, normalizeIndexEntry(entry)]));
      const seen = new Set();
      for (const entry of indexNodes) {
        const label = entry?.id || "(unknown)";
        if (!entry || typeof entry !== "object") {
          addError(
            "GRAPH_INDEX_INVALID",
            "graph/index.json contains a non-object node entry",
            "Run `orange graph rebuild-index` to regenerate the read model from graph node Markdown."
          );
          continue;
        }
        try {
          assertSafeGraphSelector(entry.id);
        } catch {
          addError(
            "GRAPH_INDEX_UNSAFE_ID",
            `graph/index.json entry ${label} has unsafe id`,
            "Run `orange graph rebuild-index`; if the unsafe id remains, inspect the source graph node."
          );
        }
        if (entry.file && !allNodeFiles.has(entry.file)) {
          addError(
            "GRAPH_INDEX_ORPHAN_ENTRY",
            `graph/index.json entry ${label} is orphaned from source graph nodes`,
            "Run `orange graph rebuild-index` to drop stale read-model entries."
          );
        }
        if (entry.project_id && entry.project_id !== project.project_id) {
          addError(
            "GRAPH_INDEX_PROJECT_MISMATCH",
            `graph/index.json entry ${label} project_id ${entry.project_id} does not match config project_id ${project.project_id}`,
            "Cross-project index entries are not repaired automatically; inspect source nodes before rebuilding."
          );
        }
        const expected = expectedById.get(entry.id);
        if (!expected) {
          const sourceNode = allNodesById.get(entry.id);
          if (sourceNode && !sourceNode.data?.project_id) {
            continue;
          }
          addError(
            "GRAPH_INDEX_ORPHAN_ENTRY",
            `graph/index.json entry ${label} does not match any current-project graph node`,
            "Run `orange graph rebuild-index` to regenerate the read model for the current project."
          );
          continue;
        }
        seen.add(entry.id);
        const actual = normalizeIndexEntry(entry);
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          addError(
            "GRAPH_INDEX_STALE_ENTRY",
            `graph/index.json entry ${label} does not match source graph node`,
            "Run `orange graph rebuild-index` to refresh stale read-model fields."
          );
        }
      }
      for (const expected of expectedEntries) {
        if (!seen.has(expected.id)) {
          addError(
            "GRAPH_INDEX_MISSING_ENTRY",
            `graph/index.json is missing entry for graph node ${expected.id}`,
            "Run `orange graph rebuild-index` to add missing read-model entries."
          );
        }
      }
    }
  }

  return { errors, warnings, checks, diagnostics };
}

export function assertSafeGraphSelector(value) {
  if (!value || typeof value !== "string") {
    throw new Error("Graph node selector is required.");
  }
  if (!isSafeId(value)) {
    throw new Error("Graph node selector must be an id, not a path.");
  }
}

function scanGraphNodes(cwd, project) {
  const warnings = [];
  const nodes = [];
  const allNodes = listMemoryGraphNodes(cwd);
  for (const node of allNodes) {
    const label = node.data?.id || path.basename(node.filePath, ".md");
    if (!node.data?.project_id) {
      warnings.push(`graph node ${label} missing project_id (legacy file)`);
      continue;
    }
    if (node.data.project_id !== project.project_id) {
      continue;
    }
    if (!isAcceptedMemoryNode(node)) {
      continue;
    }
    nodes.push(formatGraphNode(cwd, node));
  }
  nodes.sort((left, right) => left.id.localeCompare(right.id));
  return { nodes, allNodes, warnings };
}

function formatGraphNode(cwd, node) {
  const paths = workspacePaths(cwd);
  const summary = extractSection(node.body || "", "Summary");
  const evidence = extractSection(node.body || "", "Evidence");
  const sourceProposalSection = extractSection(node.body || "", "Source Proposal");
  const candidateMemory = summary || node.data.title || node.data.id;
  const title = node.data.title || titleFromCandidate(candidateMemory) || node.data.id;
  const keywords = inferKeywords([
    node.data.id,
    node.data.node_type,
    title,
    candidateMemory,
    node.data.source_quest,
    node.data.source_proposal
  ]);
  return {
    id: node.data.id,
    file: path.relative(cwd, node.filePath),
    graph_file: path.relative(paths.root, node.filePath),
    project_id: node.data.project_id || null,
    project_name: node.data.project_name || "",
    kind: node.data.kind || node.data.node_type,
    node_type: node.data.node_type,
    status: node.data.status || "",
    confidence: node.data.confidence || "",
    title,
    source_quest: node.data.source_quest || "",
    source_proposal: node.data.source_proposal || "",
    accepted_at: node.data.accepted_at || "",
    origin: node.data.origin || "",
    source_proposal_hash: node.data.source_proposal_hash || "",
    generated_by: node.data.generated_by || "",
    generator_package: node.data.generator_package || "",
    generator_version: node.data.generator_version || "",
    source_repository: node.data.source_repository || "",
    official_package: node.data.official_package || "",
    updated_at: node.data.updated_at || "",
    candidate_memory: candidateMemory,
    summary,
    evidence,
    source_proposal_section: sourceProposalSection,
    tags: tagsForNode(node, keywords),
    keywords,
    provenance: node.data.provenance || {},
    content: node.source
  };
}

function isAcceptedMemoryNode(node) {
  const data = node.data || {};
  return data.source_proposal &&
    data.source_quest &&
    data.accepted_at &&
    data.origin === "memory-delta-proposal" &&
    MEMORY_NODE_TYPES.has(data.node_type);
}

function isMemoryDeltaGraphNode(data = {}) {
  return data.origin === "memory-delta-proposal" &&
    data.accepted_at &&
    MEMORY_NODE_TYPES.has(data.node_type);
}

function memoryProposalFileExists(paths, proposalId) {
  return [
    paths.pendingMemoryDeltaProposals,
    paths.acceptedMemoryDeltaProposals,
    paths.rejectedMemoryDeltaProposals
  ].some((dir) => fs.existsSync(path.join(dir, `${proposalId}.md`)));
}

function searchableGraphFields(node) {
  return [
    { name: "id", value: node.id },
    { name: "title", value: node.title },
    { name: "candidate_memory", value: node.candidate_memory },
    { name: "summary", value: node.summary },
    { name: "node_type", value: node.node_type },
    { name: "source_quest", value: node.source_quest },
    { name: "source_proposal", value: node.source_proposal },
    { name: "tags", value: asArray(node.tags).join(" ") },
    { name: "keywords", value: asArray(node.keywords).join(" ") }
  ].filter((field) => String(field.value || "").trim());
}

function normalizeGraphFilters(filters = {}) {
  const nodeType = filters.nodeType || filters.type || null;
  const sourceQuest = filters.sourceQuest || filters.source_quest || null;
  const sourceProposal = filters.sourceProposal || filters.source_proposal || null;
  if (nodeType && !MEMORY_NODE_TYPES.has(nodeType)) {
    throw new Error(`Unsupported graph node type: ${nodeType}`);
  }
  if (sourceQuest) {
    assertSafeFilterId(sourceQuest, "Graph source_quest filter");
  }
  if (sourceProposal) {
    assertSafeFilterId(sourceProposal, "Graph source_proposal filter");
  }
  return {
    type: nodeType,
    source_quest: sourceQuest,
    source_proposal: sourceProposal
  };
}

function filterGraphNodes(nodes, filters) {
  return nodes.filter((node) => {
    if (filters.type && node.node_type !== filters.type) {
      return false;
    }
    if (filters.source_quest && node.source_quest !== filters.source_quest) {
      return false;
    }
    if (filters.source_proposal && node.source_proposal !== filters.source_proposal) {
      return false;
    }
    return true;
  });
}

function scoreGraphNode(node, query, filters) {
  const needle = query.toLowerCase();
  const matches = [];
  let score = 0;
  for (const field of searchableGraphFields(node)) {
    const value = String(field.value || "").toLowerCase();
    if (!value.includes(needle)) {
      continue;
    }
    matches.push(field.name);
    score += fieldScore(field.name, value === needle);
  }
  if (matches.length) {
    if (filters.type && node.node_type === filters.type) {
      score += 5;
    }
    if (filters.source_quest && node.source_quest === filters.source_quest) {
      score += 5;
    }
    if (filters.source_proposal && node.source_proposal === filters.source_proposal) {
      score += 5;
    }
  }
  return {
    node,
    matches: Array.from(new Set(matches)),
    score
  };
}

function fieldScore(name, exact) {
  const exactScores = {
    id: 100,
    title: 90,
    candidate_memory: 80,
    node_type: 60,
    source_quest: 55,
    source_proposal: 55,
    summary: 45,
    tags: 30,
    keywords: 25
  };
  const partialScores = {
    id: 45,
    title: 40,
    candidate_memory: 35,
    node_type: 30,
    source_quest: 28,
    source_proposal: 28,
    summary: 25,
    tags: 15,
    keywords: 12
  };
  return exact ? exactScores[name] || 20 : partialScores[name] || 10;
}

function assertSafeFilterId(value, label) {
  if (!value || typeof value !== "string") {
    throw new Error(`${label} is required.`);
  }
  if (!isSafeId(value)) {
    throw new Error(`${label} must be an id, not a path.`);
  }
}

function graphIndexUpdatedAt(nodes) {
  const values = nodes
    .flatMap((node) => [node.updated_at, node.accepted_at])
    .filter(Boolean)
    .sort((left, right) => String(left).localeCompare(String(right)));
  return values.length ? values[values.length - 1] : null;
}

function readPreviousGraphIndex(cwd) {
  try {
    return readGraphIndex(cwd);
  } catch {
    return null;
  }
}

function stabilizeGeneratedAt(previous, next) {
  if (!previous) {
    return next;
  }
  if (JSON.stringify(semanticIndex(previous)) !== JSON.stringify(semanticIndex(next))) {
    return next;
  }
  return {
    ...next,
    generated_at: previous.generated_at || previous.updated_at || next.generated_at
  };
}

function semanticIndex(index) {
  return {
    schema_version: index?.schema_version,
    index_version: index?.index_version,
    project_id: index?.project_id || null,
    project_name: index?.project_name || "",
    updated_at: index?.updated_at || null,
    source: index?.source || "",
    nodes: asArray(index?.nodes).map(normalizeIndexEntry)
  };
}

function emptyDiagnostics() {
  return {
    errors: [],
    warnings: [],
    repairs: []
  };
}

function titleFromCandidate(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) {
    return "";
  }
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

function tagsForNode(node, keywords) {
  return Array.from(new Set([
    node.data.node_type,
    node.data.kind,
    ...keywords.slice(0, 8)
  ].filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

function inferKeywords(values) {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  const words = text
    .split(/[^a-z0-9가-힣_.-]+/i)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3)
    .filter((word) => !STOP_WORDS.has(word));
  return Array.from(new Set(words)).slice(0, 24);
}

function readIndexForValidation(cwd, errors, checks) {
  const paths = workspacePaths(cwd);
  if (!fs.existsSync(paths.graphIndex)) {
    if (fs.existsSync(paths.graph)) {
      errors.push("missing graph/index.json");
    }
    return null;
  }
  try {
    const index = readGraphIndex(cwd);
    checks.push("graph/index.json parses");
    return index;
  } catch (error) {
    errors.push(`graph/index.json is not valid JSON: ${error.message}`);
    return null;
  }
}

function normalizeIndexEntry(entry) {
  return {
    id: entry.id,
    file: entry.file,
    project_id: entry.project_id || null,
    project_name: entry.project_name || "",
    node_type: entry.node_type,
    title: entry.title || "",
    source_quest: entry.source_quest || "",
    source_proposal: entry.source_proposal || "",
    accepted_at: entry.accepted_at || "",
    candidate_memory: entry.candidate_memory || "",
    summary: entry.summary || "",
    tags: asArray(entry.tags).sort((left, right) => String(left).localeCompare(String(right))),
    keywords: asArray(entry.keywords)
  };
}

function isSafeId(value) {
  return typeof value === "string" &&
    value.length > 0 &&
    !value.includes("..") &&
    !value.includes("/") &&
    !value.includes("\\") &&
    /^[A-Za-z0-9_.-]+$/.test(value);
}

function isInside(target, parent) {
  const relative = path.relative(parent, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function extractSection(body, sectionName) {
  const pattern = new RegExp(`^## ${escapeRegExp(sectionName)}\\s*$`, "m");
  const match = body.match(pattern);
  if (!match) {
    return "";
  }
  const rest = body.slice(match.index + match[0].length).replace(/^\s+/, "");
  const next = rest.search(/^## /m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "source",
  "quest",
  "proposal",
  "memory",
  "node",
  "orange",
  "hyper",
  "candidate",
  "remember"
]);
