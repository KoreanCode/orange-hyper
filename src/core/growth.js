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
  branch: "Several accepted memories or completed Quests point to stable habits; no automatic unlock follows.",
  canopy: "Broad repeated evidence is visible across memory and verification; still advisory only."
};

const TOPIC_RULES = [
  {
    id: "backend-api-focus",
    title: "Backend/API focus",
    patterns: [
      /\b(api|backend|endpoint|controller|service|database|db|schema|auth|server|request|response)\b/i,
      /백엔드|서버|API|엔드포인트|서비스|컨트롤러|데이터베이스|인증/i
    ],
    reason: "Repeated backend, API, service, or data-access terms appear in Quest or memory evidence.",
    nextStep: "Review whether future backend/API work needs a focused checklist, but keep role creation manual.",
    evidencePrefix: "backend/API signal"
  },
  {
    id: "documentation-focus",
    title: "Documentation focus",
    patterns: [
      /\b(readme|docs?|documentation|roadmap|release notes?|adapter contract|guide|manual)\b/i,
      /문서|README|로드맵|릴리즈|가이드|어댑터/i
    ],
    reason: "Repeated documentation, roadmap, release, or adapter-contract evidence appears in project work.",
    nextStep: "Keep documentation updates tied to explicit verification such as README sync and adapter examples.",
    evidencePrefix: "documentation signal"
  },
  {
    id: "mcp-documentation-advisor-readiness",
    title: "MCP documentation advisor readiness",
    patterns: [
      /\b(api|breaking|deprecated?|docs?|documentation|framework|fresh|latest|library|libraries|migration|version)\b/i,
      /최신|문서|버전|라이브러리|프레임워크|마이그레이션|사용법|API/i
    ],
    reason: "Documentation freshness or API-version evidence appears often enough to consider MCP Advisor usage.",
    nextStep: "Run `orange mcp suggest --query <need> --json` only when the user asks for current documentation support.",
    evidencePrefix: "MCP documentation signal"
  },
  {
    id: "hook-hygiene",
    title: "Hook hygiene",
    patterns: [
      /\b(hook|session-start|session start|stop event|warning|stale|freshness|doctor warning)\b/i,
      /훅|경고|세션|정지|신선도|스테일/i
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
  const dominantAcceptedNodeType = dominantNodeType(nodeTypeDistribution);
  const questVerification = verificationSummary(completed.length, verified.length, unverified.length);
  const hookWarningSummary = summarizeHookWarnings(hook, doctor);
  const evidenceCorpus = buildEvidenceCorpus(quests, graph.nodes);
  const mcpAdvisorSignals = summarizeMcpAdvisorSignals(evidenceCorpus);
  const growthLevel = inferGrowthLevel({
    acceptedMemoryNodes: graph.nodes.length,
    completedQuestCount: completed.length,
    verifiedRatio: questVerification.verifiedRatio,
    signalCount: mcpAdvisorSignals.signalCount,
    pendingMemoryProposals
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
    dominantAcceptedNodeType,
    routeLayerDistribution,
    questLayerDistribution,
    questVerification,
    pendingMemoryProposals,
    hookWarningSummary,
    mcpAdvisorSignals,
    growthLevel,
    growthLevelDescription: GROWTH_LEVEL_DESCRIPTIONS[growthLevel],
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
      confidenceRank(right.confidence) - confidenceRank(left.confidence) ||
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
  const corpus = buildEvidenceCorpus(quests, graph.nodes);
  return {
    status,
    corpus,
    verification: verificationEvidence(status, graph.nodes, quests),
    memory: memoryEvidence(status),
    topics: Object.fromEntries(TOPIC_RULES.map((rule) => [rule.id, topicEvidence(rule, corpus)]))
  };
}

function buildCandidatesFromEvidence(evidence) {
  const candidates = [];
  const add = (id, title, reason, items, suggestedNextStep) => {
    const uniqueEvidence = uniqueStrings(items).slice(0, 8);
    if (uniqueEvidence.length < 2) {
      return;
    }
    candidates.push({
      id,
      title,
      reason,
      evidence: uniqueEvidence,
      confidence: confidenceForEvidence(uniqueEvidence.length),
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
    "Accepted nodes, pending proposals, or graph/doctor warnings indicate memory review habits worth keeping visible.",
    evidence.memory,
    "Review pending proposals manually and keep accepted graph nodes tied to source Quest/proposal provenance."
  );

  for (const rule of TOPIC_RULES) {
    add(rule.id, rule.title, rule.reason, evidence.topics[rule.id], rule.nextStep);
  }

  return candidates;
}

function verificationEvidence(status, nodes, quests) {
  const evidence = [];
  const summary = status.questVerification;
  if (summary.completed > 0) {
    evidence.push(`${summary.completed} completed Quest${summary.completed === 1 ? "" : "s"} observed`);
  }
  if (summary.verified > 0) {
    evidence.push(`${summary.verified}/${summary.completed} completed Quest${summary.completed === 1 ? "" : "s"} verified`);
  }
  if (summary.unverified > 0) {
    evidence.push(`${summary.unverified}/${summary.completed} completed Quest${summary.completed === 1 ? "" : "s"} unverified`);
  }
  if (status.nodeTypeDistribution.verification > 0) {
    evidence.push(`${status.nodeTypeDistribution.verification} accepted verification memory node${status.nodeTypeDistribution.verification === 1 ? "" : "s"}`);
  }
  const planned = quests.filter((quest) =>
    asArray(quest.data.expected_verification).some((item) => /test|check|verify|검증|테스트/i.test(String(item)))
  ).length;
  if (planned > 0) {
    evidence.push(`${planned} Quest${planned === 1 ? "" : "s"} include explicit verification planning`);
  }
  const verificationNodes = nodes.filter((node) => /test|verify|검증|테스트/i.test([
    node.title,
    node.summary,
    node.candidate_memory,
    node.evidence
  ].filter(Boolean).join(" "))).length;
  if (verificationNodes > 0) {
    evidence.push(`${verificationNodes} accepted memory node${verificationNodes === 1 ? "" : "s"} mention tests or verification`);
  }
  return evidence;
}

function memoryEvidence(status) {
  const evidence = [];
  if (status.acceptedMemoryNodes > 0) {
    evidence.push(`${status.acceptedMemoryNodes} accepted memory node${status.acceptedMemoryNodes === 1 ? "" : "s"}`);
  }
  if (status.pendingMemoryProposals > 0) {
    evidence.push(`${status.pendingMemoryProposals} pending memory proposal${status.pendingMemoryProposals === 1 ? "" : "s"} need manual review`);
  }
  if (status.dominantAcceptedNodeType) {
    evidence.push(`dominant accepted node type is ${status.dominantAcceptedNodeType.nodeType} (${status.dominantAcceptedNodeType.count})`);
  }
  if (Object.keys(status.nodeTypeDistribution).length > 1) {
    evidence.push(`${Object.keys(status.nodeTypeDistribution).length} accepted memory node types are present`);
  }
  if (status.warnings.length > 0) {
    evidence.push(`${status.warnings.length} memory/doctor/hook warning${status.warnings.length === 1 ? "" : "s"} observed`);
  }
  return evidence;
}

function topicEvidence(rule, corpus) {
  const matches = [];
  for (const item of corpus) {
    if (rule.patterns.some((pattern) => pattern.test(item.text))) {
      matches.push(`${rule.evidencePrefix}: ${item.label}`);
    }
  }
  return uniqueStrings(matches);
}

function buildEvidenceCorpus(quests, nodes) {
  const questItems = quests.map((quest) => ({
    label: `Quest ${quest.data.id || "(unknown)"} (${quest.data.title || "untitled"})`,
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
    label: `Accepted node ${node.id || "(unknown)"} (${node.title || node.node_type || "untitled"})`,
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
    signals: evidence.slice(0, 6),
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

function inferGrowthLevel(input) {
  const { acceptedMemoryNodes, completedQuestCount, verifiedRatio, signalCount, pendingMemoryProposals } = input;
  if (acceptedMemoryNodes >= 8 && completedQuestCount >= 10 && verifiedRatio >= 0.7) {
    return "canopy";
  }
  if (acceptedMemoryNodes >= 3 || completedQuestCount >= 5 || signalCount >= 5) {
    return "branch";
  }
  if (acceptedMemoryNodes >= 1 || completedQuestCount >= 2 || pendingMemoryProposals >= 1) {
    return "sprout";
  }
  return "seed";
}

function confidenceForEvidence(count) {
  if (count >= 4) {
    return "high";
  }
  if (count >= 2) {
    return "medium";
  }
  return "low";
}

function confidenceRank(value) {
  return { high: 3, medium: 2, low: 1 }[value] || 0;
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
    `Rule growth.${candidate.id} matched ${candidate.evidence.length} evidence item${candidate.evidence.length === 1 ? "" : "s"}.`,
    "The result is advisory only: auto_unlock is false and user approval is required."
  ].join(" ");
}

function growthRuleSummaries() {
  return [
    {
      id: "growth.verification-discipline",
      description: "Suggests verification discipline when completed Quest verification, verification nodes, or test evidence repeat.",
      threshold: "at least 2 evidence items"
    },
    {
      id: "growth.memory-hygiene",
      description: "Suggests memory hygiene when accepted nodes, pending proposals, multiple node types, or memory/doctor warnings repeat.",
      threshold: "at least 2 evidence items"
    },
    ...TOPIC_RULES.map((rule) => ({
      id: `growth.${rule.id}`,
      description: rule.reason,
      threshold: "at least 2 matching Quest or accepted-node evidence items"
    }))
  ];
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
