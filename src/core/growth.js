import fs from "node:fs";
import path from "node:path";
import { readProjectIdentity, requireInitialized } from "./config.js";
import { runDoctor } from "./doctor.js";
import { listGraphNodes } from "./graph.js";
import { hookStatus } from "./hook.js";
import { listMemoryDeltaProposals } from "./memory.js";
import { workspacePaths } from "./paths.js";
import { listQuests } from "./quest.js";
import { asArray } from "./text.js";

const GROWTH_LEVEL_DESCRIPTIONS = {
  seed: "Early project-memory signal; no role, tool, hook, or workflow unlock is implied.",
  sprout: "Repeated project evidence is visible; this is still a preview label only.",
  branch: "Several accepted memories and verified Quests point to stable habits; no automatic unlock follows.",
  canopy: "Broad repeated evidence is visible across memory, node types, and verification; still advisory only."
};

const CANDIDATE_THRESHOLDS = {
  "verification-discipline": {
    minEvidence: 3,
    minSources: 2,
    minSignals: 2
  },
  "memory-hygiene": {
    minEvidence: 3,
    minSources: 2,
    minSignals: 2
  },
  defaultTopic: {
    minEvidence: 3,
    minSources: 2,
    minSignals: 2
  },
  "hook-hygiene": {
    minEvidence: 2,
    minSources: 2,
    minSignals: 2
  }
};

const TOPIC_RULES = [
  {
    id: "backend-api-focus",
    title: "Backend/API focus",
    signals: [
      { id: "backend", pattern: /\bbackend\b|백엔드/i, strong: true },
      { id: "endpoint", pattern: /\b(endpoints?|controllers?)\b|엔드포인트|컨트롤러/i, strong: true },
      { id: "service", pattern: /\bservices?\b|서비스/i, strong: true },
      { id: "data-access", pattern: /\b(database|db|schema)\b|데이터베이스|스키마/i, strong: true },
      { id: "auth-server", pattern: /\b(auth|server)\b|인증|서버/i, strong: true },
      { id: "request-response", pattern: /\b(request|response)\b|요청|응답/i, strong: true },
      { id: "api", pattern: /\bapi\b|API/i, strong: false }
    ],
    requireStrongSignal: true,
    reason: "Repeated backend, API, service, or data-access evidence appears across project sources.",
    nextStep: "Review whether future backend/API work needs a focused checklist, but keep role creation manual.",
    evidencePrefix: "backend/API signal"
  },
  {
    id: "documentation-focus",
    title: "Documentation focus",
    signals: [
      { id: "readme", pattern: /\breadme\b|README/i, strong: true },
      { id: "docs", pattern: /\bdocs?|documentation\b|문서/i, strong: true },
      { id: "roadmap", pattern: /\broadmap\b|로드맵/i, strong: true },
      { id: "release-notes", pattern: /\brelease notes?\b|릴리즈/i, strong: true },
      { id: "adapter-contract", pattern: /\badapter contract\b|어댑터/i, strong: true },
      { id: "guide-manual", pattern: /\b(guide|manual)\b|가이드/i, strong: true }
    ],
    reason: "Repeated documentation, roadmap, release, or adapter-contract evidence appears in project work.",
    nextStep: "Keep documentation updates tied to explicit verification such as README sync and adapter examples.",
    evidencePrefix: "documentation signal"
  },
  {
    id: "mcp-documentation-advisor-readiness",
    title: "MCP documentation advisor readiness",
    signals: [
      { id: "api-freshness", pattern: /\b(api|breaking|deprecated?)\b|API/i, strong: true },
      { id: "docs-freshness", pattern: /\b(docs?|documentation|fresh|latest)\b|최신|문서/i, strong: true },
      { id: "library-version", pattern: /\b(library|libraries|version|framework)\b|버전|라이브러리|프레임워크/i, strong: true },
      { id: "migration", pattern: /\bmigration\b|마이그레이션/i, strong: true }
    ],
    reason: "Documentation freshness or API-version evidence appears often enough to consider MCP Advisor usage.",
    nextStep: "Run `orange mcp suggest --query <need> --json` only when the user asks for current documentation support.",
    evidencePrefix: "MCP documentation signal"
  },
  {
    id: "hook-hygiene",
    title: "Hook hygiene",
    signals: [
      { id: "hook", pattern: /\bhook\b|훅/i, strong: true },
      { id: "session", pattern: /\b(session-start|session start|stop event)\b|세션|정지/i, strong: true },
      { id: "warning", pattern: /\b(warning|doctor warning)\b|경고/i, strong: true },
      { id: "freshness", pattern: /\b(stale|freshness)\b|신선도|스테일/i, strong: true }
    ],
    reason: "Hook, warning, freshness, or doctor-observation evidence appears repeatedly.",
    nextStep: "Use explicit `orange hook ... --json` checks for diagnosis; do not install or change hook policy automatically.",
    evidencePrefix: "hook hygiene signal"
  }
];

/**
 * @returns {import("./types.d.ts").GrowthStatus}
 */
export function buildGrowthStatus(cwd = process.cwd()) {
  requireInitialized(cwd);
  const paths = workspacePaths(cwd);
  const project = readProjectIdentity(cwd);
  const projectName = project.project_name || path.basename(cwd);
  const quests = listQuests(cwd, "all");
  const completed = quests.filter((quest) => quest.data.status === "completed");
  const verified = completed.filter((quest) => quest.data.verification_status === "verified");
  const unverified = completed.filter((quest) => quest.data.verification_status === "unverified");
  const graph = safeRead("graph", () => listGraphNodes(cwd), {
    project,
    filters: { type: null, source_quest: null, source_proposal: null },
    nodes: [],
    warnings: []
  });
  const pendingMemoryProposals = safeRead("pending proposals", () => listMemoryDeltaProposals(cwd, "pending").length, 0);
  const doctor = safeRead("doctor", () => runDoctor(cwd), null);
  const hook = safeRead("hook", () => hookStatus(cwd), null);
  const routeLayerDistribution = readRouteLayerDistribution(paths.routeTrace);
  const questLayerDistribution = distribution(quests.map((quest) => quest.data.layer || "unknown"));
  const nodeTypeDistribution = distribution(graph.nodes.map((node) => node.node_type || "unknown"));
  const nodeTypeDiversity = Object.keys(nodeTypeDistribution).length;
  const dominantAcceptedNodeType = dominantNodeType(nodeTypeDistribution);
  const questVerification = verificationSummary(completed.length, verified.length, unverified.length);
  const hookWarningSummary = summarizeHookWarnings(hook, doctor);
  const evidenceCorpus = buildEvidenceCorpus(quests, graph.nodes, questMap(quests));
  const mcpAdvisorSignals = summarizeMcpAdvisorSignals(evidenceCorpus);
  const doctorOk = Boolean(doctor?.ok);
  const projectBoundaryActive = Boolean(project.project_id);
  const repeatedEvidenceCount = estimateRepeatedEvidenceCount({
    acceptedMemoryNodes: graph.nodes.length,
    nodeTypeDiversity,
    verifiedQuestCount: verified.length,
    routeLayerDistribution,
    hookWarningCount: hookWarningSummary.warningCount,
    mcpSignalCount: mcpAdvisorSignals.signalCount,
    pendingMemoryProposals
  });
  const level = inferGrowthLevel({
    acceptedMemoryNodes: graph.nodes.length,
    nodeTypeDiversity,
    completedQuestCount: completed.length,
    verifiedRatio: questVerification.verifiedRatio,
    repeatedEvidenceCount,
    pendingMemoryProposals,
    doctorOk,
    projectBoundaryActive
  });

  return {
    readOnly: true,
    deterministic: true,
    autoUnlock: false,
    autoMutation: false,
    projectMemoryMutation: false,
    configMutation: false,
    project: {
      project_id: project.project_id || null,
      project_name: projectName
    },
    project_id: project.project_id || null,
    project_name: projectName,
    acceptedMemoryNodes: graph.nodes.length,
    nodeTypeDistribution,
    nodeTypeDiversity,
    dominantAcceptedNodeType,
    routeLayerDistribution,
    questLayerDistribution,
    questVerification,
    pendingMemoryProposals,
    doctorOk,
    projectBoundaryActive,
    repeatedEvidenceCount,
    hookWarningSummary,
    mcpAdvisorSignals,
    growthLevel: level.growthLevel,
    growthLevelReason: level.reason,
    growthLevelDescription: GROWTH_LEVEL_DESCRIPTIONS[level.growthLevel],
    growthLevelUnlocks: false,
    warnings: [
      ...asArray(graph.warnings),
      ...asArray(hook?.warnings).map((item) => item.message),
      ...asArray(doctor?.warnings)
    ],
    boundaries: growthBoundaries()
  };
}

/**
 * @returns {import("./types.d.ts").GrowthSuggestionResult}
 */
export function buildGrowthSuggestionResult(cwd = process.cwd()) {
  const status = buildGrowthStatus(cwd);
  const evidence = collectGrowthEvidence(cwd, status);
  const candidates = buildCandidatesFromEvidence(evidence)
    .sort((left, right) =>
      right.score - left.score ||
      left.id.localeCompare(right.id)
    );
  return {
    readOnly: true,
    deterministic: true,
    llmCall: false,
    networkCall: false,
    mcpCall: false,
    autoUnlock: false,
    projectMemoryMutation: false,
    configMutation: false,
    project: status.project,
    growthLevel: status.growthLevel,
    status,
    candidates,
    no_candidate_reason: candidates.length
      ? null
      : "No repeated growth evidence matched the deterministic preview rules strongly enough for a candidate.",
    boundaries: growthBoundaries()
  };
}

/**
 * @returns {import("./types.d.ts").GrowthExplainResult}
 */
export function buildGrowthExplainResult(cwd = process.cwd()) {
  const suggestion = buildGrowthSuggestionResult(cwd);
  return {
    readOnly: true,
    deterministic: true,
    llmCall: false,
    networkCall: false,
    mcpCall: false,
    autoUnlock: false,
    projectMemoryMutation: false,
    configMutation: false,
    project: suggestion.project,
    growthLevel: suggestion.growthLevel,
    candidates: suggestion.candidates,
    explanations: suggestion.candidates.map((candidate) => ({
      candidate_id: candidate.id,
      title: candidate.title,
      rule_id: `growth.${candidate.id}`,
      reason: candidate.reason,
      score: candidate.score,
      evidence_count: candidate.evidence_count,
      matched_signals: candidate.matched_signals,
      evidence: candidate.evidence,
      confidence: candidate.confidence,
      why_suggested: explainCandidate(candidate),
      auto_unlock: false,
      requires_user_approval: true
    })),
    rules: growthRuleSummaries(),
    no_candidate_reason: suggestion.no_candidate_reason,
    boundaries: growthBoundaries()
  };
}

function collectGrowthEvidence(cwd, status) {
  const graph = safeRead("graph", () => listGraphNodes(cwd), {
    nodes: [],
    warnings: []
  });
  const quests = safeRead("quests", () => listQuests(cwd, "all"), []);
  const pendingProposals = safeRead("pending proposals", () => listMemoryDeltaProposals(cwd, "pending"), []);
  const questsById = questMap(quests);
  const corpus = buildEvidenceCorpus(quests, graph.nodes, questsById);
  const topics = Object.fromEntries(TOPIC_RULES.map((rule) => [rule.id, topicEvidence(rule, corpus)]));
  topics["hook-hygiene"] = uniqueEvidenceItems([
    ...asArray(topics["hook-hygiene"]),
    ...hookWarningEvidence(status)
  ]);
  return {
    status,
    corpus,
    verification: verificationEvidence(graph.nodes, quests, questsById),
    memory: memoryEvidence(graph.nodes, pendingProposals, questsById),
    topics
  };
}

function buildCandidatesFromEvidence(evidence) {
  const candidates = [];
  const add = (id, title, reason, items, suggestedNextStep) => {
    const uniqueEvidence = uniqueEvidenceItems(items).slice(0, 8);
    const matchedSignals = uniqueStrings(uniqueEvidence.flatMap((item) => asArray(item.matched_signals))).sort();
    const threshold = thresholdForCandidate(id);
    const sourceCount = uniqueSourceCount(uniqueEvidence);
    if (
      uniqueEvidence.length < threshold.minEvidence ||
      sourceCount < threshold.minSources ||
      matchedSignals.length < threshold.minSignals ||
      !hasRequiredSignals(id, matchedSignals)
    ) {
      return;
    }
    const score = scoreCandidate(uniqueEvidence, matchedSignals, sourceCount);
    candidates.push({
      id,
      title,
      reason,
      score,
      evidence_count: uniqueEvidence.length,
      matched_signals: matchedSignals,
      evidence: uniqueEvidence,
      confidence: confidenceForScore(score, uniqueEvidence.length, matchedSignals.length),
      suggested_next_step: suggestedNextStep,
      auto_unlock: false,
      requires_user_approval: true
    });
  };

  add(
    "verification-discipline",
    "Verification discipline",
    verificationReason(evidence.status.questVerification),
    evidence.verification,
    "Keep using explicit evidence or unverified reasons before accepting new memory proposals."
  );

  add(
    "memory-hygiene",
    "Memory hygiene",
    "Accepted nodes, pending proposals, and node-type diversity indicate memory review habits worth keeping visible.",
    evidence.memory,
    "Review pending proposals manually and keep accepted graph nodes tied to source Quest/proposal provenance."
  );

  for (const rule of TOPIC_RULES) {
    add(rule.id, rule.title, rule.reason, evidence.topics[rule.id], rule.nextStep);
  }

  return candidates;
}

function verificationEvidence(nodes, quests, questsById) {
  const evidence = [];
  for (const quest of quests.filter((item) => item.data.status === "completed")) {
    const title = quest.data.title || quest.data.id || "untitled";
    evidence.push(evidenceItem(
      `quest:${quest.data.id}:completed`,
      `Completed Quest observed: ${title}`,
      sourceFromQuest(quest),
      ["quest.completed"]
    ));
    if (quest.data.verification_status === "verified") {
      evidence.push(evidenceItem(
        `quest:${quest.data.id}:verified`,
        `Verified Quest evidence recorded: ${title}`,
        sourceFromQuest(quest),
        ["quest.verified"]
      ));
    }
    if (quest.data.verification_status === "unverified") {
      evidence.push(evidenceItem(
        `quest:${quest.data.id}:unverified`,
        `Unverified Quest outcome recorded: ${title}`,
        sourceFromQuest(quest),
        ["quest.unverified"]
      ));
    }
    if (asArray(quest.data.expected_verification).some((item) => /test|check|verify|검증|테스트/i.test(String(item)))) {
      evidence.push(evidenceItem(
        `quest:${quest.data.id}:verification-plan`,
        `Quest includes explicit verification planning: ${title}`,
        sourceFromQuest(quest),
        ["quest.verification-plan"]
      ));
    }
  }
  for (const node of nodes) {
    const haystack = [
      node.title,
      node.summary,
      node.candidate_memory,
      node.evidence
    ].filter(Boolean).join(" ");
    if (/test|verify|검증|테스트/i.test(haystack) || node.node_type === "verification") {
      evidence.push(evidenceItem(
        `node:${node.id}:verification`,
        `Accepted memory node mentions verification: ${node.title || node.id}`,
        sourceFromNode(node, questsById),
        ["memory.verification-node"]
      ));
    }
  }
  return evidence;
}

function memoryEvidence(nodes, pendingProposals, questsById) {
  const evidence = [];
  for (const node of nodes) {
    evidence.push(evidenceItem(
      `node:${node.id}:accepted`,
      `Accepted memory node observed: ${node.node_type} - ${node.title || node.id}`,
      sourceFromNode(node, questsById),
      ["memory.accepted-node", `memory.node-type.${node.node_type || "unknown"}`]
    ));
  }
  for (const proposal of pendingProposals) {
    evidence.push(evidenceItem(
      `proposal:${proposal.data.id}:pending`,
      `Pending memory proposal needs manual review: ${proposal.data.id}`,
      sourceFromProposal(proposal, questsById),
      ["memory.pending-proposal"]
    ));
  }
  return evidence;
}

function hookWarningEvidence(status) {
  return asArray(status.hookWarningSummary?.warnings).map((warning, index) => evidenceItem(
    `hook-warning:${warning.code || index}`,
    `Hook warning observed: ${warning.code || "HOOK_WARNING"}`,
    sourceFromHookWarning(warning),
    ["hook.warning", warning.code ? `hook.warning.${warning.code}` : "hook.warning.unknown"]
  ));
}

function topicEvidence(rule, corpus) {
  const matches = [];
  for (const item of corpus) {
    const signals = matchedTopicSignals(rule, item.text);
    if (!signals.length) {
      continue;
    }
    const matchedSignals = signals.map((signal) => `${rule.id}.${signal.id}`);
    const source = rule.id === "mcp-documentation-advisor-readiness"
      ? sourceWithMcpSignal(item.source, mcpSignalId(rule.id, matchedSignals, item.source))
      : item.source;
    matches.push(evidenceItem(
      `topic:${rule.id}:${item.id}`,
      `${rule.evidencePrefix}: ${item.label}`,
      source,
      matchedSignals
    ));
  }
  return uniqueEvidenceItems(matches);
}

function buildEvidenceCorpus(quests, nodes, questsById) {
  const questItems = quests.map((quest) => ({
    id: `quest:${quest.data.id || "(unknown)"}`,
    label: `Quest ${quest.data.id || "(unknown)"} (${quest.data.title || "untitled"})`,
    source: sourceFromQuest(quest),
    text: [
      quest.data.title,
      quest.data.output_contract,
      quest.data.layer,
      ...asArray(quest.data.constraints),
      ...asArray(quest.data.expected_verification),
      ...asArray(quest.data.verification_evidence),
      quest.data.unverified_reason
    ].filter(Boolean).join("\n")
  }));
  const nodeItems = nodes.map((node) => ({
    id: `node:${node.id || "(unknown)"}`,
    label: `Accepted node ${node.id || "(unknown)"} (${node.title || node.node_type || "untitled"})`,
    source: sourceFromNode(node, questsById),
    text: [
      node.id,
      node.node_type,
      node.title,
      node.candidate_memory,
      node.summary,
      node.evidence,
      ...asArray(node.tags),
      ...asArray(node.keywords)
    ].filter(Boolean).join("\n")
  }));
  return [...questItems, ...nodeItems];
}

function summarizeMcpAdvisorSignals(corpus) {
  const rule = TOPIC_RULES.find((item) => item.id === "mcp-documentation-advisor-readiness");
  const evidence = rule ? topicEvidence(rule, corpus) : [];
  return /** @type {import("./types.d.ts").GrowthStatus["mcpAdvisorSignals"]} */ ({
    readOnly: true,
    mcpCall: false,
    networkCall: false,
    autoInstall: false,
    autoRun: false,
    configMutation: false,
    projectMemoryMutation: false,
    signalCount: evidence.length,
    signals: evidence.map((item) => item.label).slice(0, 6),
    summary: evidence.length
      ? `${evidence.length} documentation/API freshness signal${evidence.length === 1 ? "" : "s"} observed.`
      : "No repeated MCP documentation advisor signal observed."
  });
}

function summarizeHookWarnings(hook, doctor) {
  const hookWarnings = asArray(hook?.warnings);
  const doctorWarnings = asArray(doctor?.diagnostics?.warnings);
  const doctorErrors = asArray(doctor?.diagnostics?.errors);
  const warnings = hookWarnings.map((item) => ({
    code: item.code,
    message: item.message,
    hint: item.hint
  }));
  return /** @type {import("./types.d.ts").GrowthStatus["hookWarningSummary"]} */ ({
    readOnly: true,
    hookRun: false,
    autoMutation: false,
    warningCount: warnings.length,
    warnings,
    doctorWarningCount: doctorWarnings.length,
    doctorErrorCount: doctorErrors.length,
    diagnosticCodes: [
      ...doctorErrors.map((item) => item.code),
      ...doctorWarnings.map((item) => item.code)
    ],
    summary: warnings.length
      ? `${warnings.length} hook status warning${warnings.length === 1 ? "" : "s"} observed.`
      : "No hook status warnings observed."
  });
}

function readRouteLayerDistribution(routeTracePath) {
  /** @type {Record<string, number>} */
  const result = {};
  if (!fs.existsSync(routeTracePath)) {
    return result;
  }
  const lines = fs.readFileSync(routeTracePath, "utf8").split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    try {
      const trace = JSON.parse(line);
      const layer = trace.contract?.layer || String(trace.contract?.route || "").split("/")[0] || "unknown";
      result[layer] = (result[layer] || 0) + 1;
    } catch {
      result.invalid = (result.invalid || 0) + 1;
    }
  }
  return result;
}

function distribution(values) {
  /** @type {Record<string, number>} */
  const result = {};
  for (const value of values) {
    const key = String(value || "unknown");
    result[key] = (result[key] || 0) + 1;
  }
  return sortObject(result);
}

function dominantNodeType(counts) {
  const entries = Object.entries(counts);
  if (!entries.length) {
    return null;
  }
  const [key, count] = entries.sort((left, right) =>
    right[1] - left[1] ||
    left[0].localeCompare(right[0])
  )[0];
  return {
    nodeType: key,
    count
  };
}

function verificationSummary(completed, verified, unverified) {
  return {
    completed,
    verified,
    unverified,
    verifiedRatio: ratio(verified, completed),
    unverifiedRatio: ratio(unverified, completed)
  };
}

function ratio(numerator, denominator) {
  if (!denominator) {
    return 0;
  }
  return Number((numerator / denominator).toFixed(4));
}

function estimateRepeatedEvidenceCount(input) {
  const routeTraceCount = sumCounts(input.routeLayerDistribution);
  return (
    input.acceptedMemoryNodes +
    input.verifiedQuestCount +
    Math.max(0, input.nodeTypeDiversity - 1) +
    Math.min(input.mcpSignalCount, 4) +
    Math.min(routeTraceCount, 3) +
    Math.min(input.hookWarningCount, 3) +
    (input.pendingMemoryProposals > 0 ? 1 : 0)
  );
}

/**
 * @returns {{ growthLevel: import("./types.d.ts").GrowthLevel, reason: string }}
 */
function inferGrowthLevel(input) {
  const {
    acceptedMemoryNodes,
    nodeTypeDiversity,
    completedQuestCount,
    verifiedRatio,
    repeatedEvidenceCount,
    pendingMemoryProposals,
    doctorOk,
    projectBoundaryActive
  } = input;
  if (!projectBoundaryActive) {
    return {
      growthLevel: "seed",
      reason: "Project boundary is missing, so Growth Signal Preview stays at seed."
    };
  }
  if (!doctorOk) {
    return {
      growthLevel: "seed",
      reason: "Doctor is not ok, so Growth Signal Preview stays at seed until project state is clean."
    };
  }
  const highPendingReviewLoad = pendingMemoryProposals > Math.max(3, acceptedMemoryNodes);
  if (
    acceptedMemoryNodes >= 8 &&
    nodeTypeDiversity >= 3 &&
    completedQuestCount >= 10 &&
    verifiedRatio >= 0.8 &&
    repeatedEvidenceCount >= 14 &&
    pendingMemoryProposals <= 3
  ) {
    return {
      growthLevel: "canopy",
      reason: "Canopy requires many accepted nodes, at least three node types, high verified Quest ratio, repeated evidence, low pending review load, doctor ok, and active project boundary."
    };
  }
  if (
    acceptedMemoryNodes >= 3 &&
    nodeTypeDiversity >= 2 &&
    completedQuestCount >= 5 &&
    verifiedRatio >= 0.7 &&
    repeatedEvidenceCount >= 6 &&
    !highPendingReviewLoad
  ) {
    return {
      growthLevel: "branch",
      reason: "Branch requires accepted nodes plus node-type diversity, verified Quest history, repeated evidence, manageable pending proposals, doctor ok, and active project boundary."
    };
  }
  if (
    repeatedEvidenceCount >= 2 &&
    (acceptedMemoryNodes >= 1 || completedQuestCount >= 2 || pendingMemoryProposals >= 1)
  ) {
    return {
      growthLevel: "sprout",
      reason: "Sprout has repeated evidence, but branch/canopy require stronger node diversity, verification ratio, and review hygiene."
    };
  }
  return {
    growthLevel: "seed",
    reason: "Seed has not yet accumulated enough repeated evidence for a higher preview level."
  };
}

function thresholdForCandidate(id) {
  return CANDIDATE_THRESHOLDS[id] || CANDIDATE_THRESHOLDS.defaultTopic;
}

function hasRequiredSignals(id, matchedSignals) {
  if (id !== "backend-api-focus") {
    return true;
  }
  return matchedSignals.some((signal) =>
    signal === "backend-api-focus.backend" ||
    signal === "backend-api-focus.endpoint" ||
    signal === "backend-api-focus.service" ||
    signal === "backend-api-focus.data-access" ||
    signal === "backend-api-focus.auth-server" ||
    signal === "backend-api-focus.request-response"
  );
}

function scoreCandidate(evidence, matchedSignals, sourceCount) {
  return evidence.length * 10 + matchedSignals.length * 6 + sourceCount * 4;
}

function confidenceForScore(score, evidenceCount, matchedSignalCount) {
  if (score >= 70 && evidenceCount >= 5 && matchedSignalCount >= 3) {
    return "high";
  }
  if (score >= 40 && evidenceCount >= 3 && matchedSignalCount >= 2) {
    return "medium";
  }
  return "low";
}

function verificationReason(summary) {
  if (!summary.completed) {
    return "No completed Quest verification history exists yet.";
  }
  if (summary.unverified > 0) {
    return "Completed Quest history contains explicit verification and unverified outcomes, so verification discipline should stay visible.";
  }
  return "Completed Quest history repeatedly records verification evidence.";
}

function explainCandidate(candidate) {
  return [
    `Rule growth.${candidate.id} scored ${candidate.score} from ${candidate.evidence_count} source-backed evidence item${candidate.evidence_count === 1 ? "" : "s"} and ${candidate.matched_signals.length} matched signal${candidate.matched_signals.length === 1 ? "" : "s"}.`,
    "The result is advisory only: auto_unlock is false and user approval is required."
  ].join(" ");
}

function growthRuleSummaries() {
  return [
    {
      id: "growth.verification-discipline",
      description: "Suggests verification discipline when completed Quest verification, verification nodes, or test evidence repeat across sources.",
      threshold: "at least 3 evidence items, 2 source keys, and 2 matched signals"
    },
    {
      id: "growth.memory-hygiene",
      description: "Suggests memory hygiene when accepted nodes, pending proposals, or memory node types repeat across sources.",
      threshold: "at least 3 evidence items, 2 source keys, and 2 matched signals"
    },
    ...TOPIC_RULES.map((rule) => ({
      id: `growth.${rule.id}`,
      description: rule.reason,
      threshold: rule.id === "backend-api-focus"
        ? "at least 3 evidence items, 2 source keys, 2 matched signals, and one non-generic backend/API signal"
        : `at least ${thresholdForCandidate(rule.id).minEvidence} evidence items, ${thresholdForCandidate(rule.id).minSources} source keys, and ${thresholdForCandidate(rule.id).minSignals} matched signals`
    }))
  ];
}

function matchedTopicSignals(rule, text) {
  return rule.signals.filter((signal) => signal.pattern.test(text));
}

function evidenceItem(id, label, source, matchedSignals) {
  return {
    id,
    label,
    source: normalizeEvidenceSource(source),
    matched_signals: uniqueStrings(matchedSignals)
  };
}

function normalizeEvidenceSource(source = {}) {
  return {
    quest_id: source.quest_id || null,
    node_id: source.node_id || null,
    node_type: source.node_type || null,
    route_layer: source.route_layer || null,
    hook_warning_code: source.hook_warning_code || null,
    mcp_signal_id: source.mcp_signal_id || null
  };
}

function sourceFromQuest(quest) {
  return normalizeEvidenceSource({
    quest_id: quest.data.id || null,
    route_layer: quest.data.layer || null
  });
}

function sourceFromNode(node, questsById) {
  const quest = questsById.get(node.source_quest);
  return normalizeEvidenceSource({
    quest_id: node.source_quest || null,
    node_id: node.id || null,
    node_type: node.node_type || null,
    route_layer: quest?.data?.layer || null
  });
}

function sourceFromProposal(proposal, questsById) {
  const quest = questsById.get(proposal.data.source_quest);
  return normalizeEvidenceSource({
    quest_id: proposal.data.source_quest || null,
    node_type: proposal.data.node_type || null,
    route_layer: quest?.data?.layer || null
  });
}

function sourceFromHookWarning(warning) {
  return normalizeEvidenceSource({
    hook_warning_code: warning.code || null
  });
}

function sourceWithMcpSignal(source, mcpSignalId) {
  return normalizeEvidenceSource({
    ...source,
    mcp_signal_id: mcpSignalId
  });
}

function mcpSignalId(ruleId, matchedSignals, source) {
  return [ruleId, ...matchedSignals, sourceKey(source)]
    .join(":")
    .replace(/[^A-Za-z0-9_.:-]+/g, "-")
    .slice(0, 160);
}

function questMap(quests) {
  return new Map(quests.map((quest) => [quest.data.id, quest]));
}

function uniqueEvidenceItems(values) {
  const seen = new Set();
  const items = [];
  for (const item of values.filter(Boolean)) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    items.push(item);
  }
  return items.sort((left, right) => left.id.localeCompare(right.id));
}

function uniqueSourceCount(evidence) {
  return new Set(evidence.map((item) => sourceKey(item.source))).size;
}

function sourceKey(source) {
  const normalized = normalizeEvidenceSource(source);
  return [
    normalized.quest_id || "",
    normalized.node_id || "",
    normalized.node_type || "",
    normalized.route_layer || "",
    normalized.hook_warning_code || "",
    normalized.mcp_signal_id || ""
  ].join("|");
}

function sumCounts(value) {
  return Object.values(value || {}).reduce((total, count) => total + Number(count || 0), 0);
}

function sortObject(value) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean).map((value) => String(value))));
}

function safeRead(_label, read, fallback) {
  try {
    return read();
  } catch {
    return fallback;
  }
}

/**
 * @returns {import("./types.d.ts").GrowthBoundaryFlags}
 */
function growthBoundaries() {
  return {
    auto_role_creation: false,
    mcp_auto_install: false,
    mcp_auto_run: false,
    hook_policy_auto_change: false,
    subagent_auto_run: false,
    project_memory_auto_mutation: false,
    config_auto_mutation: false,
    graph_node_auto_creation: false,
    workflow_enforcement: false
  };
}
