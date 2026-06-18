import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { requireInitialized, requireProjectIdentity } from "./config.js";
import { splitFrontmatter, stringifyFrontmatter } from "./frontmatter.js";
import { originMetadata } from "./origin.js";
import { workspacePaths } from "./paths.js";
import { findQuest, listQuests } from "./quest.js";
import { asArray } from "./text.js";
import { nowIso } from "./time.js";

export const MEMORY_DELTA_SCHEMA_VERSION = 1;
export const MEMORY_GRAPH_NODE_SCHEMA_VERSION = 1;
export const MEMORY_PROPOSAL_STATUSES = new Set(["pending", "accepted", "rejected"]);
export const MEMORY_NODE_TYPES = new Set(["decision", "constraint", "component", "risk", "verification"]);
export const MEMORY_CONFIDENCE_LEVELS = new Set(["low", "medium", "high"]);

const REQUIRED_PROPOSAL_FIELDS = [
  "schema_version",
  "id",
  "status",
  "source_quest",
  "node_type",
  "confidence",
  "created_at",
  "updated_at"
];

const REQUIRED_PROPOSAL_SECTIONS = [
  "Candidate Memory",
  "Why this should be remembered",
  "Evidence",
  "Suggested Node"
];

const GENERIC_CANDIDATE_MEMORY = new Set([
  "fix bug",
  "implement feature",
  "update docs",
  "remember this",
  "memory",
  "todo",
  "not specified",
  "unknown"
]);

export function ensureMemoryProposalDirs(cwd = process.cwd()) {
  const paths = workspacePaths(cwd);
  fs.mkdirSync(paths.pendingMemoryDeltaProposals, { recursive: true });
  fs.mkdirSync(paths.acceptedMemoryDeltaProposals, { recursive: true });
  fs.mkdirSync(paths.rejectedMemoryDeltaProposals, { recursive: true });
  return paths;
}

export function ensureMemoryGraphDirs(cwd = process.cwd()) {
  const paths = workspacePaths(cwd);
  for (const dir of memoryGraphNodeDirs(paths)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(paths.graphEdges)) {
    fs.writeFileSync(paths.graphEdges, "");
  }
  if (!fs.existsSync(paths.graphIndex)) {
    writeGraphIndexFile(paths.graphIndex, {
      schema_version: MEMORY_GRAPH_NODE_SCHEMA_VERSION,
      index_version: "0.3.0",
      project_id: null,
      project_name: "",
      updated_at: null,
      generated_at: null,
      source: "graph-node-markdown",
      ...originMetadata(),
      nodes: []
    });
  }
  return paths;
}

/**
 * @returns {import("./types.d.ts").MemoryProposalDocument}
 */
export function proposeMemoryDelta(cwd, questSelector, options = {}) {
  requireInitialized(cwd);
  const project = requireProjectIdentity(cwd);
  const paths = ensureMemoryProposalDirs(cwd);
  if (!questSelector) {
    throw new Error("remember propose requires --quest <quest-id>.");
  }
  const quest = findQuest(cwd, questSelector);
  assertCurrentProject("source quest", quest.data.id, quest.data, project);
  if (quest.data.status !== "completed") {
    throw new Error("Memory proposals can only be created from completed quests.");
  }
  if (quest.data.layer === "L0" || quest.data.layer === "L1") {
    throw new Error("Memory proposals are disabled by default for L0/L1 quests in v0.2.");
  }
  const evidence = asArray(quest.data.verification_evidence).filter(Boolean);
  const unverifiedReason = quest.data.unverified_reason || "";
  if (!evidence.length && !unverifiedReason) {
    throw new Error("Memory proposals require source Quest verification evidence or an unverified reason.");
  }

  const nodeType = options.nodeType || inferProposalNodeType(quest);
  if (!MEMORY_NODE_TYPES.has(nodeType)) {
    throw new Error(`Unsupported memory proposal node type: ${nodeType}`);
  }
  const createdAt = nowIso(options.clock);
  const baseId = options.id || proposalIdForQuest(quest, nodeType);
  assertSafeId(baseId, "Proposal id");
  const data = {
    schema_version: MEMORY_DELTA_SCHEMA_VERSION,
    ...originMetadata(),
    project_id: project.project_id,
    project_name: project.project_name,
    id: baseId,
    status: "pending",
    source_quest: quest.data.id,
    node_type: nodeType,
    confidence: confidenceForQuest(quest),
    created_at: createdAt,
    updated_at: createdAt,
    title: quest.data.title
  };
  const body = renderProposalBody(quest, data);
  const duplicate = findDuplicatePendingProposal(cwd, data.source_quest, data.node_type, body);
  if (duplicate) {
    return withProposalMetadata(duplicate, {
      duplicated: true,
      warnings: validateMemoryDeltaProposalDetailed(duplicate, { cwd }).warnings
    });
  }

  const id = nextAvailableProposalId(cwd, baseId);
  data.id = id;
  const filePath = path.join(paths.pendingMemoryDeltaProposals, `${id}.md`);
  const draft = {
    filePath,
    data,
    body,
    statusDirectory: "pending"
  };
  const validation = validateMemoryDeltaProposalDetailed(draft, { cwd });
  if (validation.errors.length) {
    throw new Error(`Cannot create memory proposal ${id}: ${validation.errors.join("; ")}`);
  }
  fs.writeFileSync(filePath, stringifyFrontmatter(data, body));
  return withProposalMetadata(readMemoryDeltaProposalFile(filePath), {
    duplicated: false,
    warnings: validation.warnings
  });
}

/**
 * @param {string} cwd
 * @param {string | { status?: string, nodeType?: string | null, sourceQuest?: string | null }} [filters]
 * @returns {import("./types.d.ts").MemoryProposalDocument[]}
 */
export function listMemoryDeltaProposals(cwd, filters = "all") {
  requireInitialized(cwd);
  const paths = workspacePaths(cwd);
  const normalizedFilters = normalizeProposalFilters(filters);
  return memoryProposalFiles(paths, normalizedFilters.status)
    .map(readMemoryDeltaProposalFile)
    .filter((proposal) => matchesProposalFilters(proposal, normalizedFilters))
    .sort((a, b) => String(b.data.updated_at).localeCompare(String(a.data.updated_at)));
}

export function memoryDeltaProposalFiles(cwd, status = "all") {
  requireInitialized(cwd);
  return memoryProposalFiles(workspacePaths(cwd), status);
}

/**
 * @returns {import("./types.d.ts").MemoryProposalDocument}
 */
export function findMemoryDeltaProposal(cwd, selector) {
  requireInitialized(cwd);
  assertSafeSelector(selector, "Proposal selector");
  const proposals = listMemoryDeltaProposals(cwd, "all");
  const matches = proposals.filter((proposal) => {
    const base = path.basename(proposal.filePath, ".md");
    return proposal.data.id === selector || base === selector || base.startsWith(selector);
  });
  if (matches.length === 0) {
    throw new Error(`Memory proposal not found: ${selector}`);
  }
  if (matches.length > 1) {
    throw new Error(`Memory proposal selector is ambiguous: ${selector}`);
  }
  return matches[0];
}

export function validateMemoryDeltaProposalBySelector(cwd, selector) {
  requireInitialized(cwd);
  const proposal = findMemoryDeltaProposal(cwd, selector);
  const validation = validateMemoryDeltaProposalDetailed(proposal, { cwd });
  return {
    proposal: withProposalMetadata(proposal, { warnings: validation.warnings }),
    validation
  };
}

export function reviseMemoryDeltaProposal(cwd, selector, revisions = {}, options = {}) {
  requireInitialized(cwd);
  const project = requireProjectIdentity(cwd);
  const proposal = findMemoryDeltaProposal(cwd, selector);
  assertCurrentProject("memory proposal", proposal.data.id, proposal.data, project);
  assertPendingProposal(proposal);

  const normalized = normalizeProposalRevisions(revisions);
  let body = proposal.body;
  if (normalized.candidate !== undefined) {
    body = replaceSection(body, "Candidate Memory", normalized.candidate);
  }
  if (normalized.why !== undefined) {
    body = replaceSection(body, "Why this should be remembered", normalized.why);
  }

  const updatedAt = nowIso(options.clock);
  const data = {
    ...proposal.data,
    updated_at: updatedAt,
    ...(normalized.confidence !== undefined ? { confidence: normalized.confidence } : {})
  };
  if (normalized.confidence !== undefined) {
    body = updateSuggestedNodeConfidence(body, normalized.confidence);
  }

  const draft = {
    ...proposal,
    data,
    body,
    source: stringifyFrontmatter(data, body)
  };
  const validation = validateMemoryDeltaProposalDetailed(draft, {
    cwd,
    expectedStatus: "pending"
  });
  if (validation.errors.length) {
    throw new Error(`Cannot revise memory proposal ${proposal.data.id}: ${validation.errors.join("; ")}`);
  }

  const duplicate = findDuplicatePendingCandidateMemory(cwd, body, {
    excludeId: proposal.data.id
  });
  if (duplicate) {
    throw new Error(`Cannot revise memory proposal ${proposal.data.id}: Candidate Memory duplicates pending proposal ${duplicate.data.id}`);
  }

  fs.writeFileSync(proposal.filePath, stringifyFrontmatter(data, body));
  const saved = readMemoryDeltaProposalFile(proposal.filePath);
  const savedValidation = validateMemoryDeltaProposalDetailed(saved, { cwd });
  return {
    proposal: withProposalMetadata(saved, { warnings: savedValidation.warnings }),
    validation: savedValidation,
    revisions: Object.keys(normalized)
  };
}

/**
 * @returns {import("./types.d.ts").MemoryAcceptResult}
 */
export function acceptMemoryDelta(cwd, selector, options = {}) {
  requireInitialized(cwd);
  const project = requireProjectIdentity(cwd);
  const proposal = findMemoryDeltaProposal(cwd, selector);
  assertCurrentProject("memory proposal", proposal.data.id, proposal.data, project);
  assertPendingProposal(proposal);

  const validation = validateMemoryDeltaProposalDetailed(proposal, {
    cwd,
    expectedStatus: "pending"
  });
  if (validation.errors.length) {
    throw new Error(`Cannot accept memory proposal ${proposal.data.id}: ${validation.errors.join("; ")}`);
  }
  const sourceQuest = findQuest(cwd, proposal.data.source_quest);
  assertCurrentProject("source quest", sourceQuest.data.id, sourceQuest.data, project);
  assertSameProject("memory proposal", proposal.data.id, proposal.data, "source quest", sourceQuest.data.id, sourceQuest.data);

  const paths = ensureMemoryGraphDirs(cwd);
  const acceptedAt = nowIso(options.clock);
  const nodeId = graphNodeIdForProposal(proposal);
  const nodeFilePath = path.join(graphNodeDirForType(paths, proposal.data.node_type), `${nodeId}.md`);
  if (fs.existsSync(nodeFilePath)) {
    throw new Error(`Graph node already exists for proposal ${proposal.data.id}: ${nodeId}`);
  }

  const accepted = moveProposal(cwd, proposal, "accepted", acceptedAt);
  const node = buildGraphNodeFromProposal(cwd, accepted, acceptedAt, project, sourceQuest);
  fs.writeFileSync(nodeFilePath, stringifyFrontmatter(node.data, node.body));
  const summary = extractSection(node.body, "Summary") || proposal.data.title || node.data.id;
  const keywords = inferGraphIndexKeywords([
    node.data.id,
    node.data.node_type,
    proposal.data.title,
    summary,
    proposal.data.source_quest,
    proposal.data.id
  ]);
  updateGraphIndex(paths.graphIndex, {
    id: node.data.id,
    file: path.relative(cwd, nodeFilePath),
    project_id: node.data.project_id,
    project_name: node.data.project_name,
    title: titleFromCandidate(summary),
    source_proposal: proposal.data.id,
    source_quest: proposal.data.source_quest,
    source_path: node.data.source_path || "",
    scope_paths: node.data.scope_paths || [],
    accepted_at: node.data.accepted_at,
    node_type: node.data.node_type,
    candidate_memory: summary,
    summary,
    tags: tagsForGraphIndexEntry(node, keywords),
    keywords
  }, acceptedAt);

  return {
    proposal: accepted,
    node: readMemoryGraphNodeFile(nodeFilePath)
  };
}

/**
 * @returns {import("./types.d.ts").MemoryProposalDocument}
 */
export function rejectMemoryDelta(cwd, selector, options = {}) {
  requireInitialized(cwd);
  const project = requireProjectIdentity(cwd);
  const proposal = findMemoryDeltaProposal(cwd, selector);
  assertCurrentProject("memory proposal", proposal.data.id, proposal.data, project);
  assertPendingProposal(proposal);
  const validation = validateMemoryDeltaProposalDetailed(proposal, {
    cwd,
    expectedStatus: "pending"
  });
  if (validation.errors.length) {
    throw new Error(`Cannot reject memory proposal ${proposal.data.id}: ${validation.errors.join("; ")}`);
  }
  const rejectedAt = nowIso(options.clock);
  return moveProposal(cwd, proposal, "rejected", rejectedAt);
}

/**
 * @returns {import("./types.d.ts").MemoryProposalDocument}
 */
export function readMemoryDeltaProposalFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const parsed = splitFrontmatter(source);
  return /** @type {import("./types.d.ts").MemoryProposalDocument} */ ({
    filePath,
    source,
    ...parsed,
    statusDirectory: path.basename(path.dirname(filePath))
  });
}

/**
 * @returns {import("./types.d.ts").AcceptedMemoryNodeDocument}
 */
export function readMemoryGraphNodeFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const parsed = splitFrontmatter(source);
  return /** @type {import("./types.d.ts").AcceptedMemoryNodeDocument} */ ({ filePath, source, ...parsed });
}

export function listMemoryGraphNodes(cwd) {
  requireInitialized(cwd);
  const paths = workspacePaths(cwd);
  if (!fs.existsSync(paths.graphNodes)) {
    return [];
  }
  return memoryGraphNodeDirs(paths)
    .flatMap((dir) => {
      if (!fs.existsSync(dir)) {
        return [];
      }
      return fs
        .readdirSync(dir)
        .filter((name) => name.endsWith(".md"))
        .map((name) => path.join(dir, name));
    })
    .map(readMemoryGraphNodeFile)
    .sort((a, b) => String(a.data.id).localeCompare(String(b.data.id)));
}

export function proposalCountsByStatus(cwd) {
  const counts = {
    pending: 0,
    accepted: 0,
    rejected: 0
  };
  for (const proposal of listMemoryDeltaProposals(cwd, "all")) {
    if (counts[proposal.data.status] !== undefined) {
      counts[proposal.data.status] += 1;
    }
  }
  return counts;
}

export function topProposalNodeTypes(cwd) {
  const counts = {};
  for (const proposal of listMemoryDeltaProposals(cwd, "all")) {
    const nodeType = proposal.data.node_type || "unknown";
    counts[nodeType] = (counts[nodeType] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([nodeType, count]) => ({ nodeType, count }));
}

export function pendingProposalWarningCount(cwd) {
  return listMemoryDeltaProposals(cwd, "pending")
    .filter((proposal) => validateMemoryDeltaProposalDetailed(proposal, { cwd }).warnings.length > 0)
    .length;
}

export function validateMemoryDeltaProposal(proposal, options = {}) {
  return validateMemoryDeltaProposalDetailed(proposal, options).errors;
}

export function validateMemoryDeltaProposalDetailed(proposal, options = {}) {
  const data = proposal.data || {};
  const errors = [];
  const warnings = [];
  const label = data.id || path.basename(proposal.filePath || "unknown", ".md");
  for (const field of REQUIRED_PROPOSAL_FIELDS) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      errors.push(`memory proposal ${label} missing ${field}`);
    }
  }
  if (data.schema_version !== MEMORY_DELTA_SCHEMA_VERSION) {
    errors.push(`memory proposal ${label} has unsupported schema_version ${data.schema_version}`);
  }
  if (!MEMORY_PROPOSAL_STATUSES.has(data.status)) {
    errors.push(`memory proposal ${label} has invalid status ${data.status}`);
  }
  if (!MEMORY_NODE_TYPES.has(data.node_type)) {
    errors.push(`memory proposal ${label} has invalid node_type ${data.node_type}`);
  }
  if (!MEMORY_CONFIDENCE_LEVELS.has(data.confidence)) {
    errors.push(`memory proposal ${label} has invalid confidence ${data.confidence}`);
  }
  if (data.id) {
    try {
      assertSafeId(data.id, "Memory proposal id");
    } catch (error) {
      errors.push(error.message);
    }
    if (proposal.filePath && path.basename(proposal.filePath, ".md") !== data.id) {
      errors.push(`memory proposal ${label} filename does not match id`);
    }
  }
  if (data.source_quest) {
    try {
      assertSafeId(data.source_quest, "Memory proposal source_quest");
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (proposal.statusDirectory && data.status && proposal.statusDirectory !== data.status) {
    errors.push(`memory proposal ${label} is in ${proposal.statusDirectory} directory but status is ${data.status}`);
  }
  if (options.expectedStatus && data.status !== options.expectedStatus) {
    errors.push(`memory proposal ${label} expected ${options.expectedStatus} status but has ${data.status}`);
  }
  if (data.created_at && data.updated_at && String(data.updated_at) < String(data.created_at)) {
    warnings.push(`memory proposal ${label} updated_at is earlier than created_at`);
  }
  for (const section of REQUIRED_PROPOSAL_SECTIONS) {
    const pattern = new RegExp(`^## ${escapeRegExp(section)}\\s*$`, "m");
    if (!pattern.test(proposal.body || "")) {
      errors.push(`memory proposal ${label} missing section ${section}`);
    }
  }
  const quality = validateProposalQuality(proposal, label);
  errors.push(...quality.errors);
  warnings.push(...quality.warnings);
  if (options.cwd && data.source_quest && isSafeId(data.source_quest)) {
    const questExists = listQuests(options.cwd, "all").some((quest) => quest.data.id === data.source_quest);
    if (!questExists) {
      errors.push(`memory proposal ${label} source_quest not found: ${data.source_quest}`);
    }
  }
  if (options.cwd && proposal.filePath && data.status && MEMORY_PROPOSAL_STATUSES.has(data.status)) {
    const paths = workspacePaths(options.cwd);
    const expectedDir = proposalDirForStatus(paths, data.status);
    if (!isInside(path.resolve(proposal.filePath), path.resolve(expectedDir))) {
      errors.push(`memory proposal ${label} path must stay inside ${path.relative(paths.root, expectedDir)}`);
    }
  }
  return { errors, warnings };
}

export function findGraphNodesForProposal(cwd, proposalId) {
  return listMemoryGraphNodes(cwd).filter((node) =>
    node.data.source_proposal === proposalId ||
    node.data.provenance?.proposal_id === proposalId
  );
}

export function hashMemoryDeltaProposalSource(proposal) {
  return crypto.createHash("sha256").update(proposal.source || stringifyFrontmatter(proposal.data || {}, proposal.body || "")).digest("hex");
}

export function readGraphIndex(cwd) {
  const paths = workspacePaths(cwd);
  if (!fs.existsSync(paths.graphIndex)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(paths.graphIndex, "utf8"));
}

export function validateGraphJson(cwd) {
  const paths = workspacePaths(cwd);
  const errors = [];
  const checks = [];
  if (fs.existsSync(paths.graph) && !fs.existsSync(paths.graphIndex)) {
    errors.push("missing graph/index.json");
  }
  if (fs.existsSync(paths.graph) && !fs.existsSync(paths.graphEdges)) {
    errors.push("missing graph/edges.jsonl");
  }
  if (fs.existsSync(paths.graphIndex)) {
    try {
      JSON.parse(fs.readFileSync(paths.graphIndex, "utf8"));
      checks.push("graph/index.json parses");
    } catch (error) {
      errors.push(`graph/index.json is not valid JSON: ${error.message}`);
    }
  }
  if (fs.existsSync(paths.graphEdges)) {
    const lines = fs.readFileSync(paths.graphEdges, "utf8").split(/\r?\n/).filter(Boolean);
    lines.forEach((line, index) => {
      try {
        JSON.parse(line);
      } catch (error) {
        errors.push(`graph/edges.jsonl line ${index + 1} is invalid JSON: ${error.message}`);
      }
    });
    checks.push(`graph/edges.jsonl has ${lines.length} entr${lines.length === 1 ? "y" : "ies"}`);
  }
  return { errors, checks };
}

function proposalIdForQuest(quest, nodeType) {
  return `mem_delta_${quest.data.id}_${nodeType}`;
}

function inferProposalNodeType(quest) {
  const text = [
    quest.data.title,
    quest.data.output_contract,
    ...asArray(quest.data.constraints),
    ...asArray(quest.data.expected_verification)
  ].join(" ").toLowerCase();
  if (includesAny(text, ["constraint", "guardrail", "invariant", "must", "policy", "rule", "제약", "규칙", "정책", "금지"])) {
    return "constraint";
  }
  if (includesAny(text, ["risk", "regression", "caution", "failure", "위험", "회귀", "주의"])) {
    return "risk";
  }
  if (includesAny(text, ["component", "module", "architecture", "path", "컴포넌트", "모듈", "구조"])) {
    return "component";
  }
  if (quest.data.output_contract === "validation" || includesAny(text, ["verification", "validate", "test", "검증", "테스트"])) {
    return "verification";
  }
  if (quest.data.output_contract === "review" || quest.data.output_contract === "audit") {
    return "risk";
  }
  return "decision";
}

function confidenceForQuest(quest) {
  if (quest.data.verification_status === "verified" && quest.data.layer === "L3") {
    return "high";
  }
  if (quest.data.verification_status === "verified") {
    return "medium";
  }
  return "low";
}

function renderProposalBody(quest, data) {
  const evidence = asArray(quest.data.verification_evidence).filter(Boolean);
  const evidenceLines = evidence.length
    ? evidence.map((item) => `- Evidence: ${item}`)
    : [`- Unverified reason: ${quest.data.unverified_reason}`];
  return [
    `# Memory Delta Proposal: ${quest.data.title}`,
    "",
    "## Candidate Memory",
    "",
    `${quest.data.title}`,
    "",
    "## Why this should be remembered",
    "",
    `This completed ${quest.data.layer} Quest may be useful for future ${quest.data.output_contract} work in this project. Review it before accepting; Orange Hyper does not write memory nodes automatically.`,
    "",
    "## Evidence",
    "",
    `- Source Quest: ${quest.data.id}`,
    `- Verification status: ${quest.data.verification_status}`,
    ...evidenceLines,
    "",
    "## Suggested Node",
    "",
    `- Type: ${data.node_type}`,
    `- Confidence: ${data.confidence}`,
    `- Summary: ${quest.data.title}`,
    `- Source Quest: ${quest.data.id}`
  ].join("\n");
}

function withProposalMetadata(proposal, metadata = {}) {
  return {
    ...proposal,
    duplicated: Boolean(metadata.duplicated),
    warnings: metadata.warnings || []
  };
}

function findDuplicatePendingProposal(cwd, sourceQuest, nodeType, body) {
  const candidateMemory = normalizeCandidateMemory(extractSection(body, "Candidate Memory"));
  return listMemoryDeltaProposals(cwd, "pending").find((proposal) =>
    proposal.data.source_quest === sourceQuest &&
    proposal.data.node_type === nodeType &&
    normalizeCandidateMemory(extractSection(proposal.body, "Candidate Memory")) === candidateMemory
  );
}

function findDuplicatePendingCandidateMemory(cwd, body, options = {}) {
  const candidateMemory = normalizeCandidateMemory(extractSection(body, "Candidate Memory"));
  if (!candidateMemory) {
    return null;
  }
  return listMemoryDeltaProposals(cwd, "pending").find((proposal) =>
    proposal.data.id !== options.excludeId &&
    normalizeCandidateMemory(extractSection(proposal.body, "Candidate Memory")) === candidateMemory
  ) || null;
}

function normalizeProposalRevisions(revisions) {
  const normalized = {};
  if (Object.hasOwn(revisions, "candidate")) {
    normalized.candidate = normalizeRevisionText(revisions.candidate, "--candidate");
  }
  if (Object.hasOwn(revisions, "why")) {
    normalized.why = normalizeRevisionText(revisions.why, "--why");
  }
  if (Object.hasOwn(revisions, "confidence")) {
    const confidence = normalizeRevisionText(revisions.confidence, "--confidence");
    if (!MEMORY_CONFIDENCE_LEVELS.has(confidence)) {
      throw new Error(`Unsupported memory proposal confidence: ${confidence}`);
    }
    normalized.confidence = confidence;
  }
  if (!Object.keys(normalized).length) {
    throw new Error("remember revise requires --candidate, --why, or --confidence.");
  }
  return normalized;
}

function normalizeRevisionText(value, flag) {
  if (Array.isArray(value)) {
    throw new Error(`${flag} can only be provided once.`);
  }
  if (value === true || value === false || value === undefined || value === null) {
    throw new Error(`${flag} requires a value.`);
  }
  return String(value).trim();
}

function replaceSection(body, sectionName, content) {
  const pattern = new RegExp(`^## ${escapeRegExp(sectionName)}\\s*$`, "m");
  const match = body.match(pattern);
  if (!match) {
    throw new Error(`Memory proposal is missing section ${sectionName}.`);
  }
  const sectionEnd = match.index + match[0].length;
  const rest = body.slice(sectionEnd);
  const next = rest.search(/^## /m);
  const replacement = `\n\n${String(content).trim()}\n\n`;
  if (next === -1) {
    return `${body.slice(0, sectionEnd)}${replacement}`.trimEnd();
  }
  return `${body.slice(0, sectionEnd)}${replacement}${rest.slice(next)}`.trimEnd();
}

function updateSuggestedNodeConfidence(body, confidence) {
  const suggestedNode = extractSection(body, "Suggested Node");
  const lines = suggestedNode.split(/\r?\n/);
  let replaced = false;
  const updated = lines.map((line) => {
    if (/^\s*-\s*Confidence:\s*/i.test(line)) {
      replaced = true;
      return `- Confidence: ${confidence}`;
    }
    return line;
  });
  if (!replaced) {
    updated.push(`- Confidence: ${confidence}`);
  }
  return replaceSection(body, "Suggested Node", updated.join("\n"));
}

function nextAvailableProposalId(cwd, baseId) {
  if (!proposalIdExists(cwd, baseId)) {
    return baseId;
  }
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${baseId}_${suffix}`;
    if (!proposalIdExists(cwd, candidate)) {
      return candidate;
    }
  }
  throw new Error(`Could not allocate a unique memory proposal id for ${baseId}`);
}

function proposalIdExists(cwd, id) {
  return listMemoryDeltaProposals(cwd, "all").some((proposal) =>
    proposal.data.id === id || path.basename(proposal.filePath, ".md") === id
  );
}

function normalizeProposalFilters(filters) {
  if (typeof filters === "string" || filters === undefined || filters === null) {
    return { status: filters || "all", nodeType: null, sourceQuest: null };
  }
  const status = filters.status || "all";
  if (status !== "all" && !MEMORY_PROPOSAL_STATUSES.has(status)) {
    throw new Error(`Unsupported memory proposal status: ${status}`);
  }
  if (filters.nodeType && !MEMORY_NODE_TYPES.has(filters.nodeType)) {
    throw new Error(`Unsupported memory proposal node type: ${filters.nodeType}`);
  }
  if (filters.sourceQuest) {
    assertSafeId(filters.sourceQuest, "Memory proposal source_quest filter");
  }
  return {
    status,
    nodeType: filters.nodeType || null,
    sourceQuest: filters.sourceQuest || null
  };
}

function matchesProposalFilters(proposal, filters) {
  if (filters.nodeType && proposal.data.node_type !== filters.nodeType) {
    return false;
  }
  if (filters.sourceQuest && proposal.data.source_quest !== filters.sourceQuest) {
    return false;
  }
  return true;
}

function validateProposalQuality(proposal, label) {
  const data = proposal.data || {};
  const errors = [];
  const warnings = [];
  const candidateMemory = extractSection(proposal.body || "", "Candidate Memory");
  const why = extractSection(proposal.body || "", "Why this should be remembered");
  const evidence = extractSection(proposal.body || "", "Evidence");
  const suggestedNode = extractSection(proposal.body || "", "Suggested Node");

  if (!candidateMemory.trim()) {
    errors.push(`memory proposal ${label} Candidate Memory is empty`);
  }
  if (!why.trim()) {
    errors.push(`memory proposal ${label} Why this should be remembered is empty`);
  }
  if (!evidenceReferencesSource(evidence, data.source_quest)) {
    errors.push(`memory proposal ${label} Evidence must reference source quest or verification information`);
  }

  const suggestedNodeType = extractSuggestedNodeType(suggestedNode);
  if (suggestedNodeType && data.node_type && suggestedNodeType !== data.node_type) {
    errors.push(`memory proposal ${label} Suggested Node type ${suggestedNodeType} conflicts with node_type ${data.node_type}`);
  }

  if (isWeakCandidateMemory(candidateMemory)) {
    warnings.push(`memory proposal ${label} Candidate Memory is very short or generic; consider making it more specific before accepting`);
  }
  return { errors, warnings };
}

function evidenceReferencesSource(evidence, sourceQuest) {
  const text = evidence.toLowerCase();
  if (!text.trim()) {
    return false;
  }
  return (sourceQuest && evidence.includes(sourceQuest)) ||
    text.includes("source quest") ||
    text.includes("verification") ||
    text.includes("evidence") ||
    text.includes("unverified");
}

function extractSuggestedNodeType(suggestedNode) {
  const match = suggestedNode.match(/^\s*-\s*(?:Type|Node Type|node_type|kind):\s*([A-Za-z0-9_.-]+)\s*$/im);
  return match ? match[1] : null;
}

function isWeakCandidateMemory(candidateMemory) {
  const normalized = normalizeCandidateMemory(candidateMemory);
  const words = normalized.split(/\s+/).filter(Boolean);
  return !normalized ||
    normalized.length < 24 ||
    words.length < 4 ||
    GENERIC_CANDIDATE_MEMORY.has(normalized);
}

function normalizeCandidateMemory(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function moveProposal(cwd, proposal, status, updatedAt) {
  const paths = workspacePaths(cwd);
  const targetDir = proposalDirForStatus(paths, status);
  fs.mkdirSync(targetDir, { recursive: true });
  const data = {
    ...proposal.data,
    status,
    updated_at: updatedAt
  };
  const targetPath = path.join(targetDir, `${data.id}.md`);
  fs.writeFileSync(targetPath, stringifyFrontmatter(data, proposal.body));
  fs.unlinkSync(proposal.filePath);
  return readMemoryDeltaProposalFile(targetPath);
}

function assertPendingProposal(proposal) {
  if (proposal.data.status !== "pending" || proposal.statusDirectory !== "pending") {
    const status = proposal.data.status || proposal.statusDirectory || "unknown";
    throw new Error(`Memory proposal is already ${status}: ${proposal.data.id}`);
  }
}

function assertCurrentProject(kind, id, data, project) {
  if (data?.project_id && data.project_id !== project.project_id) {
    throw new Error(`${kind} ${id || "(unknown)"} belongs to project_id ${data.project_id}, not current project_id ${project.project_id}`);
  }
}

function assertSameProject(leftKind, leftId, leftData, rightKind, rightId, rightData) {
  if (!leftData?.project_id || !rightData?.project_id || leftData.project_id === rightData.project_id) {
    return;
  }
  throw new Error(`${leftKind} ${leftId || "(unknown)"} project_id ${leftData.project_id} does not match ${rightKind} ${rightId || "(unknown)"} project_id ${rightData.project_id}`);
}

function buildGraphNodeFromProposal(cwd, proposal, createdAt, project, sourceQuest = null) {
  const nodeId = graphNodeIdForProposal(proposal);
  const sourceProposalHash = hashMemoryDeltaProposalSource(proposal);
  const scopePaths = asArray(sourceQuest?.data?.scope_paths).map((item) => String(item)).filter(Boolean);
  const sourcePath = scopePaths.length === 1 ? scopePaths[0] : "";
  const data = {
    schema_version: MEMORY_GRAPH_NODE_SCHEMA_VERSION,
    ...originMetadata(),
    project_id: project.project_id,
    project_name: project.project_name,
    id: nodeId,
    kind: proposal.data.node_type,
    node_type: proposal.data.node_type,
    status: "candidate",
    confidence: proposal.data.confidence,
    created_at: createdAt,
    updated_at: createdAt,
    accepted_at: createdAt,
    origin: "memory-delta-proposal",
    source_proposal: proposal.data.id,
    source_quest: proposal.data.source_quest,
    source_path: sourcePath,
    scope_paths: scopePaths,
    source_proposal_hash: sourceProposalHash,
    provenance: {
      ...originMetadata(),
      project_id: project.project_id,
      project_name: project.project_name,
      proposal_id: proposal.data.id,
      source_proposal: proposal.data.id,
      source_quest: proposal.data.source_quest,
      source_path: sourcePath,
      scope_paths: scopePaths,
      accepted_at: createdAt,
      node_type: proposal.data.node_type,
      origin: "memory-delta-proposal",
      source_proposal_hash: sourceProposalHash
    }
  };
  const body = [
    "# Suggested Memory Node",
    "",
    "## Summary",
    "",
    extractSection(proposal.body, "Candidate Memory") || proposal.data.title || proposal.data.id,
    "",
    "## Evidence",
    "",
    extractSection(proposal.body, "Evidence") || `- Source Quest: ${proposal.data.source_quest}`,
    "",
    "## Source Proposal",
    "",
    `- Proposal: ${proposal.data.id}`,
    `- File: ${path.relative(cwd, proposal.filePath)}`
  ].join("\n");
  return { data, body };
}

function titleFromCandidate(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) {
    return "";
  }
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

function tagsForGraphIndexEntry(node, keywords) {
  return Array.from(new Set([
    node.data.node_type,
    node.data.kind,
    ...keywords.slice(0, 8)
  ].filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

function inferGraphIndexKeywords(values) {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  const words = text
    .split(/[^a-z0-9가-힣_.-]+/i)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3)
    .filter((word) => !GRAPH_INDEX_STOP_WORDS.has(word));
  return Array.from(new Set(words)).slice(0, 24);
}

function graphNodeIdForProposal(proposal) {
  return `${proposal.data.node_type}.${proposal.data.id}`;
}

function updateGraphIndex(indexPath, nodeEntry, updatedAt) {
  let index = {
    schema_version: MEMORY_GRAPH_NODE_SCHEMA_VERSION,
    index_version: "0.3.0",
    project_id: nodeEntry.project_id || null,
    project_name: nodeEntry.project_name || "",
    updated_at: null,
    generated_at: null,
    source: "graph-node-markdown",
    ...originMetadata(),
    nodes: []
  };
  if (fs.existsSync(indexPath)) {
    index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  }
  const nodes = Array.isArray(index.nodes) ? index.nodes.filter((node) => node.id !== nodeEntry.id) : [];
  nodes.push(nodeEntry);
  nodes.sort((left, right) => left.id.localeCompare(right.id));
  writeGraphIndexFile(indexPath, {
    ...index,
    schema_version: MEMORY_GRAPH_NODE_SCHEMA_VERSION,
    index_version: "0.3.0",
    project_id: nodeEntry.project_id || index.project_id || null,
    project_name: nodeEntry.project_name || index.project_name || "",
    updated_at: updatedAt,
    generated_at: updatedAt,
    source: "graph-node-markdown",
    ...originMetadata(),
    nodes
  });
}

export function writeGraphIndexFile(indexPath, index) {
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
}

function memoryProposalFiles(paths, status) {
  const statuses = status === "all" ? Array.from(MEMORY_PROPOSAL_STATUSES) : [status];
  return statuses.flatMap((item) => {
    if (!MEMORY_PROPOSAL_STATUSES.has(item)) {
      throw new Error(`Unsupported memory proposal status: ${item}`);
    }
    const dir = proposalDirForStatus(paths, item);
    if (!fs.existsSync(dir)) {
      return [];
    }
    return fs
      .readdirSync(dir)
      .filter((name) => name.endsWith(".md"))
      .map((name) => path.join(dir, name));
  });
}

function proposalDirForStatus(paths, status) {
  if (status === "pending") {
    return paths.pendingMemoryDeltaProposals;
  }
  if (status === "accepted") {
    return paths.acceptedMemoryDeltaProposals;
  }
  if (status === "rejected") {
    return paths.rejectedMemoryDeltaProposals;
  }
  throw new Error(`Unsupported memory proposal status: ${status}`);
}

function memoryGraphNodeDirs(paths) {
  return [
    paths.graphDecisionNodes,
    paths.graphConstraintNodes,
    paths.graphComponentNodes,
    paths.graphRiskNodes,
    paths.graphVerificationNodes
  ];
}

function graphNodeDirForType(paths, nodeType) {
  if (nodeType === "decision") {
    return paths.graphDecisionNodes;
  }
  if (nodeType === "constraint") {
    return paths.graphConstraintNodes;
  }
  if (nodeType === "component") {
    return paths.graphComponentNodes;
  }
  if (nodeType === "risk") {
    return paths.graphRiskNodes;
  }
  if (nodeType === "verification") {
    return paths.graphVerificationNodes;
  }
  throw new Error(`Unsupported memory node type: ${nodeType}`);
}

function assertSafeSelector(value, label) {
  if (!value || typeof value !== "string") {
    throw new Error(`${label} is required.`);
  }
  assertSafeId(value, label);
}

function assertSafeId(value, label) {
  if (!isSafeId(value)) {
    throw new Error(`${label} must be an id, not a path.`);
  }
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

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
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

const GRAPH_INDEX_STOP_WORDS = new Set([
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
