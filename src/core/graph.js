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
import { workspacePaths } from "./paths.js";
import { asArray } from "./text.js";
import { nowIso } from "./time.js";

export const GRAPH_INDEX_VERSION = "0.3.0-alpha.0";

export function listGraphNodes(cwd = process.cwd()) {
  requireInitialized(cwd);
  const project = requireProjectIdentity(cwd);
  const scan = scanGraphNodes(cwd, project);
  return {
    project,
    nodes: scan.nodes,
    warnings: scan.warnings
  };
}

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

export function searchGraphNodes(cwd = process.cwd(), query) {
  requireInitialized(cwd);
  const normalizedQuery = String(query || "").trim();
  if (!normalizedQuery) {
    throw new Error("Graph search query is required.");
  }
  const graph = listGraphNodes(cwd);
  const needle = normalizedQuery.toLowerCase();
  const results = graph.nodes
    .map((node) => ({
      node,
      matches: searchableGraphFields(node)
        .filter((field) => field.value.toLowerCase().includes(needle))
        .map((field) => field.name)
    }))
    .filter((result) => result.matches.length > 0);
  return {
    project: graph.project,
    query: normalizedQuery,
    nodes: results.map((result) => ({
      ...result.node,
      matches: result.matches
    })),
    warnings: graph.warnings
  };
}

export function rebuildGraphIndex(cwd = process.cwd(), options = {}) {
  requireInitialized(cwd);
  const project = requireProjectIdentity(cwd);
  const paths = workspacePaths(cwd);
  const scan = scanGraphNodes(cwd, project);
  const updatedAt = nowIso(options.clock);
  const index = buildGraphIndex(project, scan.nodes, updatedAt);
  writeGraphIndexFile(paths.graphIndex, index);
  return {
    project,
    index,
    filePath: paths.graphIndex,
    nodes: scan.nodes,
    warnings: scan.warnings
  };
}

export function buildGraphIndex(project, nodes, updatedAt) {
  return {
    schema_version: MEMORY_GRAPH_NODE_SCHEMA_VERSION,
    index_version: GRAPH_INDEX_VERSION,
    project_id: project.project_id,
    project_name: project.project_name,
    updated_at: updatedAt,
    source: "graph-node-markdown",
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
    candidate_memory: node.candidate_memory,
    summary: node.summary,
    tags: node.tags,
    keywords: node.keywords
  };
}

export function validateGraphReadModel(cwd = process.cwd(), context = {}) {
  const paths = workspacePaths(cwd);
  if (!fs.existsSync(paths.config)) {
    return { errors: [], warnings: [], checks: [] };
  }
  const project = context.projectIdentity || readProjectIdentity(cwd);
  const errors = [];
  const warnings = [];
  const checks = [];
  const graphIndex = readIndexForValidation(cwd, errors, checks);
  const scan = scanGraphNodes(cwd, project);
  warnings.push(...scan.warnings);
  const currentNodes = scan.nodes;
  const currentNodeIds = new Set(currentNodes.map((node) => node.id));
  const allNodeIds = new Set(scan.allNodes.map((node) => node.data?.id).filter(Boolean));
  const allNodesById = new Map(scan.allNodes.map((node) => [node.data?.id, node]).filter(([id]) => Boolean(id)));
  const allNodeFiles = new Set(scan.allNodes.map((node) => path.relative(cwd, node.filePath)));
  const acceptedProposals = listMemoryDeltaProposals(cwd, "accepted");
  const acceptedProposalIds = new Set(acceptedProposals.map((proposal) => proposal.data.id));

  for (const node of scan.allNodes) {
    if (node.data?.id) {
      try {
        assertSafeGraphSelector(node.data.id);
      } catch {
        errors.push(`graph node ${node.data.id} has unsafe id`);
      }
    }
    if (node.filePath) {
      const nodeRoot = path.resolve(paths.graphNodes);
      if (!isInside(path.resolve(node.filePath), nodeRoot)) {
        errors.push(`graph node ${node.data?.id || path.basename(node.filePath)} path must stay inside ${path.relative(paths.root, paths.graphNodes)}`);
      }
    }
    const sourceProposal = node.data?.source_proposal || node.data?.provenance?.source_proposal || node.data?.provenance?.proposal_id;
    if (sourceProposal && !acceptedProposalIds.has(sourceProposal)) {
      errors.push(`graph node ${node.data?.id || "(unknown)"} source_proposal ${sourceProposal} is not an accepted proposal`);
    }
  }

  for (const proposal of acceptedProposals) {
    if (proposal.data.project_id && proposal.data.project_id !== project.project_id) {
      continue;
    }
    const expectedNodeId = `${proposal.data.node_type}.${proposal.data.id}`;
    if (!currentNodeIds.has(expectedNodeId) && !allNodeIds.has(expectedNodeId)) {
      errors.push(`accepted memory proposal ${proposal.data.id} is missing graph node ${expectedNodeId}`);
    }
  }

  if (graphIndex) {
    if (graphIndex.project_id && project.project_id && graphIndex.project_id !== project.project_id) {
      errors.push(`graph/index.json project_id ${graphIndex.project_id} does not match config project_id ${project.project_id}`);
    }
    const indexNodes = Array.isArray(graphIndex.nodes) ? graphIndex.nodes : null;
    if (!indexNodes) {
      errors.push("graph/index.json nodes must be an array");
    } else {
      const expectedEntries = buildGraphIndex(project, currentNodes, graphIndex.updated_at || null).nodes;
      const expectedById = new Map(expectedEntries.map((entry) => [entry.id, normalizeIndexEntry(entry)]));
      const seen = new Set();
      for (const entry of indexNodes) {
        const label = entry?.id || "(unknown)";
        if (!entry || typeof entry !== "object") {
          errors.push("graph/index.json contains a non-object node entry");
          continue;
        }
        try {
          assertSafeGraphSelector(entry.id);
        } catch {
          errors.push(`graph/index.json entry ${label} has unsafe id`);
        }
        if (entry.file && !allNodeFiles.has(entry.file)) {
          errors.push(`graph/index.json entry ${label} is orphaned from source graph nodes`);
        }
        if (entry.project_id && entry.project_id !== project.project_id) {
          errors.push(`graph/index.json entry ${label} project_id ${entry.project_id} does not match config project_id ${project.project_id}`);
        }
        const expected = expectedById.get(entry.id);
        if (!expected) {
          const sourceNode = allNodesById.get(entry.id);
          if (sourceNode && !sourceNode.data?.project_id) {
            continue;
          }
          errors.push(`graph/index.json entry ${label} does not match any current-project graph node`);
          continue;
        }
        seen.add(entry.id);
        const actual = normalizeIndexEntry(entry);
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          errors.push(`graph/index.json entry ${label} does not match source graph node`);
        }
      }
      for (const expected of expectedEntries) {
        if (!seen.has(expected.id)) {
          errors.push(`graph/index.json is missing entry for graph node ${expected.id}`);
        }
      }
    }
  }

  return { errors, warnings, checks };
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
