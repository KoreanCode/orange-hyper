import fs from "node:fs";
import path from "node:path";
import { listAdapterRecipes } from "./adapter.js";
import { readProjectIdentity, requireInitialized } from "./config.js";
import { runDoctor } from "./doctor.js";
import { listGraphNodes } from "./graph.js";
import { buildGrowthSuggestionResult } from "./growth.js";
import { listMcpCatalog } from "./mcp.js";
import { listMemoryDeltaProposals } from "./memory.js";
import { originMetadata } from "./origin.js";
import { workspacePaths } from "./paths.js";
import { listQuests } from "./quest.js";
import { nowIso } from "./time.js";

export const EVAL_REPORT_DIR_RELATIVE = ".orange-hyper/evals/reports";
export const EVAL_REPORT_SCHEMA_VERSION = 2;

/**
 * @returns {import("./types.d.ts").EvalSnapshot}
 */
export function buildEvalSnapshot(cwd = process.cwd(), options = {}) {
  requireInitialized(cwd);
  const generatedAt = nowIso(options.clock);
  const paths = workspacePaths(cwd);
  const project = safeProject(cwd);
  const quests = readQuestSummary(cwd);
  const proposals = readProposalSummary(cwd);
  const graph = readGraphSummary(cwd);
  const doctor = readDoctorSummary(cwd);
  const hookWarnings = readHookWarningSummary(cwd);
  const mcpAdvisor = readMcpAdvisorSummary(cwd);
  const growth = readGrowthSummary(cwd);
  const adapter = readAdapterSummary();
  const identity = readIdentityReportSummary(paths);

  /** @type {import("./types.d.ts").EvalSnapshot} */
  const snapshot = {
    ...originMetadata(),
    schema_version: /** @type {2} */ (EVAL_REPORT_SCHEMA_VERSION),
    generated_at: generatedAt,
    readOnly: true,
    deterministic: true,
    localOnly: true,
    telemetry: false,
    networkCall: false,
    llmJudge: false,
    mcpCall: false,
    hookRun: false,
    autoMutation: false,
    projectMemoryMutation: false,
    configMutation: false,
    project,
    project_id: project.project_id,
    project_name: project.project_name,
    quests,
    memoryProposals: proposals,
    graph,
    doctor,
    hookWarnings,
    mcpAdvisor,
    growth,
    adapter,
    identity,
    reportPolicy: {
      directory: EVAL_REPORT_DIR_RELATIVE,
      defaultWrite: false,
      written: false,
      file: null
    },
    boundaries: evalBoundaries(),
    metrics: [],
    unavailableMetrics: []
  };
  snapshot.metrics = buildEvalMetrics(snapshot);
  snapshot.unavailableMetrics = snapshot.metrics.filter((metric) => metric.unavailable);
  return snapshot;
}

/**
 * @returns {import("./types.d.ts").EvalReport}
 */
export function buildEvalReport(cwd = process.cwd(), options = {}) {
  const snapshot = buildEvalSnapshot(cwd, options);
  const sections = buildEvalReportSections(snapshot);
  const generatedAt = snapshot.generated_at;
  const reportId = `eval-report-${safeTimestamp(generatedAt)}`;
  const summary = buildEvalReportSummary(snapshot, sections);
  const unavailableMetrics = buildEvalUnavailableMetrics(snapshot);
  const knownGaps = buildEvalKnownGaps();
  /** @type {import("./types.d.ts").EvalReport} */
  const report = {
    ...originMetadata(),
    report_id: reportId,
    schema_version: /** @type {2} */ (EVAL_REPORT_SCHEMA_VERSION),
    report_kind: /** @type {"eval-report"} */ ("eval-report"),
    generated_at: generatedAt,
    format: /** @type {"markdown"} */ ("markdown"),
    readOnly: true,
    localOnly: true,
    local_only: true,
    telemetry: false,
    networkCall: false,
    network_upload: false,
    llmJudge: false,
    llm_judge: false,
    mcpCall: false,
    hookRun: false,
    autoMutation: false,
    projectMemoryMutation: false,
    configMutation: false,
    project: snapshot.project,
    project_id: snapshot.project_id,
    project_name: snapshot.project_name,
    summary,
    snapshot,
    sections,
    known_gaps: knownGaps,
    unavailable_metrics: unavailableMetrics,
    localReport: {
      directory: EVAL_REPORT_DIR_RELATIVE,
      defaultWrite: false,
      written: false,
      file: null,
      format: "markdown"
    },
    boundaries: evalBoundaries(),
    markdown: ""
  };
  report.markdown = renderEvalReportMarkdown(report);
  if (options.writeReport) {
    const localReport = writeEvalReport(cwd, report.markdown, report.report_id);
    report.localReport = localReport;
    report.snapshot = {
      ...snapshot,
      reportPolicy: {
        ...snapshot.reportPolicy,
        written: true,
        file: localReport.file
      }
    };
    report.markdown = renderEvalReportMarkdown(report);
    writeExistingEvalReport(cwd, localReport.file, report.markdown);
  }
  return report;
}

/**
 * @returns {import("./types.d.ts").EvalExplainResult}
 */
export function buildEvalExplainResult(cwd = process.cwd(), options = {}) {
  const snapshot = buildEvalSnapshot(cwd, options);
  return /** @type {import("./types.d.ts").EvalExplainResult} */ ({
    ...originMetadata(),
    schema_version: /** @type {2} */ (EVAL_REPORT_SCHEMA_VERSION),
    generated_at: snapshot.generated_at,
    readOnly: true,
    deterministic: true,
    localOnly: true,
    telemetry: false,
    networkCall: false,
    llmJudge: false,
    mcpCall: false,
    hookRun: false,
    autoMutation: false,
    projectMemoryMutation: false,
    configMutation: false,
    project: snapshot.project,
    project_id: snapshot.project_id,
    project_name: snapshot.project_name,
    metrics: snapshot.metrics.map((metric) => ({
      id: metric.id,
      label: metric.label,
      status: metric.status,
      value: metric.value,
      source: metric.source,
      explanation: metric.explanation,
      limitation: metric.limitation,
      unavailable: Boolean(metric.unavailable),
      unavailable_reason: metric.unavailable_reason || null
    })),
    boundaries: evalBoundaries(),
    notes: [
      "Quest count comes from .orange-hyper/quests/active and .orange-hyper/quests/completed.",
      "Memory proposal flow comes from proposals/memory-delta status directories.",
      "Hook warnings are read from existing local hook report files when present; eval does not run hook events automatically.",
      "memory.acceptance_rate is calculated from local proposal state only; it is not a success-rate improvement metric.",
      "Token savings and success-rate improvement are unavailable because Orange Hyper does not collect token counts or compare agent outcomes in v0.8."
    ]
  });
}

/**
 * @returns {import("./types.d.ts").EvalSnapshot["quests"]}
 */
function readQuestSummary(cwd) {
  const quests = listQuests(cwd, "all");
  const completed = quests.filter((quest) => quest.data.status === "completed");
  const active = quests.filter((quest) => quest.data.status === "active");
  const verified = completed.filter((quest) => quest.data.verification_status === "verified");
  const unverified = completed.filter((quest) => quest.data.verification_status === "unverified");
  const pendingVerification = quests.filter((quest) => quest.data.verification_status === "pending");
  return {
    total: quests.length,
    active: active.length,
    completed: completed.length,
    verified: verified.length,
    unverified: unverified.length,
    pendingVerification: pendingVerification.length,
    status: quests.length === 0
      ? "insufficient-data"
      : unverified.length > 0
        ? "needs-attention"
        : "good"
  };
}

/**
 * @returns {import("./types.d.ts").EvalSnapshot["memoryProposals"]}
 */
function readProposalSummary(cwd) {
  const proposals = listMemoryDeltaProposals(cwd, "all");
  const accepted = proposals.filter((proposal) => proposal.data.status === "accepted");
  const rejected = proposals.filter((proposal) => proposal.data.status === "rejected");
  const pending = proposals.filter((proposal) => proposal.data.status === "pending");
  return {
    total: proposals.length,
    accepted: accepted.length,
    rejected: rejected.length,
    pending: pending.length,
    status: proposals.length === 0
      ? "insufficient-data"
      : pending.length > 0
        ? "needs-attention"
        : "good"
  };
}

/**
 * @returns {import("./types.d.ts").EvalSnapshot["graph"]}
 */
function readGraphSummary(cwd) {
  const graph = safeRead(() => listGraphNodes(cwd), {
    nodes: [],
    warnings: []
  });
  return {
    acceptedNodeCount: graph.nodes.length,
    warningCount: graph.warnings.length,
    warnings: graph.warnings,
    status: graph.warnings.length
      ? "needs-attention"
      : graph.nodes.length
        ? "good"
        : "insufficient-data"
  };
}

/**
 * @returns {import("./types.d.ts").EvalSnapshot["doctor"]}
 */
function readDoctorSummary(cwd) {
  const doctor = runDoctor(cwd);
  const diagnosticCodes = [
    ...doctor.diagnostics.errors,
    ...doctor.diagnostics.warnings,
    ...doctor.diagnostics.repairs
  ].map((item) => item.code);
  return {
    ok: doctor.ok,
    checkCount: doctor.checks.length,
    errorCount: doctor.errors.length,
    warningCount: doctor.warnings.length,
    repairCount: doctor.repairs.length,
    projectBoundaryErrorCount: doctor.project_boundary.errors.length,
    projectBoundaryWarningCount: doctor.project_boundary.warnings.length,
    diagnosticCodes,
    status: doctor.ok && doctor.warnings.length === 0
      ? "good"
      : "needs-attention"
  };
}

/**
 * @returns {import("./types.d.ts").EvalSnapshot["hookWarnings"]}
 */
function readHookWarningSummary(cwd) {
  const latest = latestHookReport(cwd);
  if (!latest) {
    return {
      status: "insufficient-data",
      source: "unavailable",
      sourceFile: null,
      latestReportGeneratedAt: null,
      hookRun: false,
      warningCount: 0,
      warnings: [],
      summary: "No local hook report was found; eval did not run hook events automatically."
    };
  }
  const warnings = asWarningArray(latest.report.warnings);
  return {
    status: warnings.length ? "needs-attention" : "good",
    source: "local-hook-report",
    sourceFile: latest.relativePath,
    latestReportGeneratedAt: latest.report.generated_at || null,
    hookRun: false,
    warningCount: warnings.length,
    warnings,
    summary: warnings.length
      ? `${warnings.length} hook warning${warnings.length === 1 ? "" : "s"} found in the latest local hook report.`
      : "Latest local hook report contains no warnings."
  };
}

/**
 * @returns {import("./types.d.ts").EvalSnapshot["mcpAdvisor"]}
 */
function readMcpAdvisorSummary(cwd) {
  const catalog = listMcpCatalog();
  const growth = safeRead(() => buildGrowthSuggestionResult(cwd), null);
  const signals = growth?.status?.mcpAdvisorSignals || null;
  return {
    status: catalog.length ? "good" : "insufficient-data",
    available: catalog.length > 0,
    catalogCount: catalog.length,
    signalCount: signals?.signalCount || 0,
    signals: signals?.signals || [],
    summary: signals?.summary || "MCP Advisor catalog is available; no signal summary could be read.",
    readOnly: true,
    mcpCall: false,
    networkCall: false,
    autoInstall: false,
    autoRun: false,
    configMutation: false,
    projectMemoryMutation: false
  };
}

/**
 * @returns {import("./types.d.ts").EvalSnapshot["growth"]}
 */
function readGrowthSummary(cwd) {
  const result = buildGrowthSuggestionResult(cwd);
  return {
    status: result.candidates.length ? "good" : "insufficient-data",
    candidateCount: result.candidates.length,
    growthLevel: result.growthLevel,
    noCandidateReason: result.no_candidate_reason,
    autoUnlock: result.autoUnlock,
    projectMemoryMutation: result.projectMemoryMutation,
    configMutation: result.configMutation,
    mcpCall: result.mcpCall,
    networkCall: result.networkCall,
    llmCall: result.llmCall,
    summary: result.candidates.length
      ? `${result.candidates.length} growth candidate${result.candidates.length === 1 ? "" : "s"} available from local evidence.`
      : result.no_candidate_reason
  };
}

/**
 * @returns {import("./types.d.ts").EvalSnapshot["adapter"]}
 */
function readAdapterSummary() {
  const recipes = listAdapterRecipes();
  return {
    status: recipes.length ? "good" : "insufficient-data",
    recipeCount: recipes.length,
    recipeIds: recipes.map((recipe) => recipe.id),
    expectedContractVersion: "0.1",
    dryRunOnly: true,
    summary: `${recipes.length} adapter recipe${recipes.length === 1 ? "" : "s"} available.`
  };
}

/**
 * @returns {import("./types.d.ts").EvalSnapshot["identity"]}
 */
function readIdentityReportSummary(paths) {
  const summary = readJsonFile(paths.identitySummaryJson);
  const summaryExists = existsFile(paths.identitySummaryJson);
  const htmlExists = existsFile(paths.identityHtml);
  return {
    status: summaryExists || htmlExists ? "good" : "insufficient-data",
    summaryExists,
    htmlExists,
    summaryFile: normalizeRelative(paths.identitySummaryJson, paths.root),
    htmlFile: normalizeRelative(paths.identityHtml, paths.root),
    generatedAt: summary?.generatedAt || summary?.generated_at || null,
    acceptedMemoryNodes: summary?.acceptedMemoryNodes ?? null,
    projectBoundaryActive: summary?.projectBoundaryActive ?? null
  };
}

/**
 * @param {import("./types.d.ts").EvalSnapshot} snapshot
 * @returns {import("./types.d.ts").EvalMetric[]}
 */
function buildEvalMetrics(snapshot) {
  const proposalAcceptanceRate = snapshot.memoryProposals.total
    ? Number((snapshot.memoryProposals.accepted / snapshot.memoryProposals.total).toFixed(4))
    : null;
  return [
    metric(
      "project.identity",
      "Project identity",
      snapshot.project.project_id,
      snapshot.project.project_id ? "good" : "needs-attention",
      ".orange-hyper/config.json",
      "project_id and project_name are read from the local Orange config.",
      { limitation: "Eval does not repair missing or mismatched project identity." }
    ),
    metric(
      "quest.count",
      "Quest count",
      snapshot.quests.total,
      snapshot.quests.status,
      ".orange-hyper/quests/",
      "Counts active and completed Quest markdown files.",
      { limitation: "Counts files only; it does not judge task quality or outcome quality." }
    ),
    metric(
      "quest.completed",
      "Completed Quest count",
      snapshot.quests.completed,
      snapshot.quests.completed ? "good" : "insufficient-data",
      ".orange-hyper/quests/completed/",
      "Counts completed Quest files only.",
      { limitation: "Completion is based on local Quest state, not external validation." }
    ),
    metric(
      "quest.verified",
      "Verified Quest count",
      snapshot.quests.verified,
      snapshot.quests.completed === 0 ? "insufficient-data" : snapshot.quests.unverified > 0 ? "needs-attention" : "good",
      ".orange-hyper/quests/completed/",
      "Reads completed Quest verification_status without estimating missing evidence.",
      { limitation: "Verification status is only as strong as the evidence recorded in completed Quest files." }
    ),
    metric(
      "quest.unverified",
      "Unverified Quest count",
      snapshot.quests.unverified,
      snapshot.quests.unverified > 0 ? "needs-attention" : snapshot.quests.completed ? "good" : "insufficient-data",
      ".orange-hyper/quests/completed/",
      "Counts completed Quests whose verification_status is unverified.",
      { limitation: "Eval reports the local count and does not infer why evidence is missing." }
    ),
    metric(
      "memory.proposals",
      "Memory proposal count",
      snapshot.memoryProposals.total,
      snapshot.memoryProposals.status,
      ".orange-hyper/proposals/memory-delta/",
      "Counts pending, accepted, and rejected Memory Delta Proposal files.",
      { limitation: "Proposal counts describe local review state, not memory usefulness." }
    ),
    metric(
      "memory.acceptance_rate",
      "Memory proposal acceptance rate",
      proposalAcceptanceRate,
      snapshot.memoryProposals.total === 0
        ? "insufficient-data"
        : snapshot.memoryProposals.pending > 0
          ? "needs-attention"
          : "good",
      ".orange-hyper/proposals/memory-delta/{pending,accepted,rejected}/",
      "Calculates accepted proposals divided by total proposals from local proposal state.",
      { limitation: "This is proposal lifecycle evidence only; it is not a success-rate improvement claim." }
    ),
    metric(
      "memory.proposals.pending",
      "Pending memory proposal count",
      snapshot.memoryProposals.pending,
      snapshot.memoryProposals.pending > 0 ? "needs-attention" : snapshot.memoryProposals.total ? "good" : "insufficient-data",
      ".orange-hyper/proposals/memory-delta/pending/",
      "Pending proposals are local review work and are not accepted graph memory.",
      { limitation: "Eval does not accept, reject, revise, or auto-create proposals." }
    ),
    metric(
      "graph.accepted_nodes",
      "Accepted graph node count",
      snapshot.graph.acceptedNodeCount,
      snapshot.graph.status,
      ".orange-hyper/graph/nodes/",
      "Counts current-project accepted memory graph nodes through the graph reader.",
      { limitation: "Eval does not rebuild graph indexes or create graph nodes." }
    ),
    metric(
      "doctor.errors",
      "Doctor error count",
      snapshot.doctor.errorCount,
      snapshot.doctor.errorCount > 0 ? "needs-attention" : "good",
      "orange doctor --json",
      "Runs the local doctor without repair and counts structured errors.",
      { limitation: "Eval does not run doctor repair or mutate project state." }
    ),
    metric(
      "doctor.warnings",
      "Doctor warning count",
      snapshot.doctor.warningCount,
      snapshot.doctor.warningCount > 0 ? "needs-attention" : "good",
      "orange doctor --json",
      "Runs the local doctor without repair and counts structured warnings.",
      { limitation: "Warnings are reported as current local diagnostics and are not auto-fixed." }
    ),
    metric(
      "hook.warnings",
      "Hook warning count",
      snapshot.hookWarnings.warningCount,
      snapshot.hookWarnings.status,
      snapshot.hookWarnings.sourceFile || ".orange-hyper/hooks/reports/",
      "Reads the latest local hook report when present; eval does not run hook events automatically.",
      { limitation: "If no hook report exists, hook warning evidence is insufficient-data." }
    ),
    metric(
      "hook.warning.usefulness",
      "Hook warning usefulness",
      {
        latest_report_exists: Boolean(snapshot.hookWarnings.sourceFile),
        warning_count: snapshot.hookWarnings.warningCount
      },
      snapshot.hookWarnings.status,
      snapshot.hookWarnings.sourceFile || ".orange-hyper/hooks/reports/",
      "Uses an existing local hook report to decide whether warning output is available and actionable.",
      { limitation: "Eval does not run hooks; without a local hook report this metric remains insufficient-data." }
    ),
    metric(
      "mcp.advisor.availability",
      "MCP suggestion availability",
      snapshot.mcpAdvisor.available,
      snapshot.mcpAdvisor.status,
      "src/core/mcp.js catalog and local growth MCP signals",
      "Checks that the read-only MCP Advisor catalog exists and summarizes local signal availability without MCP calls.",
      { limitation: "Catalog availability is not MCP execution, installation, or network validation." }
    ),
    metric(
      "growth.candidates",
      "Growth candidate count",
      snapshot.growth.candidateCount,
      snapshot.growth.status,
      "orange growth suggest --json",
      "Counts deterministic local Growth Signal Preview candidates; it does not unlock anything.",
      { limitation: "Growth candidates are preview suggestions and do not auto-unlock roles, tools, hooks, MCP, subagents, workflows, config, graph, or memory." }
    ),
    metric(
      "adapter.recipes",
      "Adapter recipe count",
      snapshot.adapter.recipeCount,
      snapshot.adapter.status,
      "src/core/adapter.js",
      "Counts built-in adapter invocation recipes.",
      { limitation: "Recipes are invocation contracts only; eval does not execute adapter workflows." }
    ),
    metric(
      "identity.report.exists",
      "Identity report existence",
      snapshot.identity.summaryExists || snapshot.identity.htmlExists,
      snapshot.identity.status,
      ".orange-hyper/identity/",
      "Checks whether local identity summary or HTML report files exist.",
      { limitation: "Eval does not run identity build or inject eval summaries into identity artifacts." }
    ),
    metric(
      "token.savings",
      "Token savings",
      null,
      "insufficient-data",
      "unavailable",
      "Orange Hyper v0.8 does not collect token counts, so token savings are unavailable and not estimated.",
      {
        unavailable: true,
        unavailable_reason: "token counts are not collected",
        limitation: "No token usage collection exists in this local-only preview, so savings must remain unavailable."
      }
    ),
    metric(
      "success_rate.improvement",
      "Success-rate improvement",
      null,
      "insufficient-data",
      "unavailable",
      "Orange Hyper v0.8 does not compare raw-agent and Orange-assisted outcomes, so success-rate improvement is unavailable.",
      {
        unavailable: true,
        unavailable_reason: "comparative task-pack outcomes are not collected",
        limitation: "No comparison group or task-pack outcome dataset exists, so improvement claims must remain unavailable."
      }
    )
  ];
}

/**
 * @param {import("./types.d.ts").EvalSnapshot} snapshot
 * @returns {import("./types.d.ts").EvalReportSection[]}
 */
function buildEvalReportSections(snapshot) {
  const makeSection = (title, status, items, metrics, reason) => section(
    title,
    status,
    items,
    metrics,
    reason,
    metricEvidenceCount(snapshot.metrics, metrics)
  );
  return [
    makeSection("Project Summary", snapshot.project.project_id ? "good" : "needs-attention", [
      `Project: ${snapshot.project.project_name} (${snapshot.project.project_id || "missing project_id"})`,
      `Local-only: ${yesNo(snapshot.localOnly)}; telemetry: ${yesNo(snapshot.telemetry)}; network call: ${yesNo(snapshot.networkCall)}; LLM judge: ${yesNo(snapshot.llmJudge)}`,
      `Quests: ${snapshot.quests.total}; accepted graph nodes: ${snapshot.graph.acceptedNodeCount}; adapter recipes: ${snapshot.adapter.recipeCount}`
    ], ["project.identity", "quest.count", "graph.accepted_nodes", "adapter.recipes"], snapshot.project.project_id
      ? "Project identity exists and local project signals can be summarized."
      : "Project identity is missing, so the local project boundary needs attention."),
    makeSection("Quest Completion", snapshot.quests.status, [
      `Completed Quests: ${snapshot.quests.completed}/${snapshot.quests.total}`,
      `Active Quests: ${snapshot.quests.active}`,
      "No completion rate improvement is inferred."
    ], ["quest.count", "quest.completed"], statusReason(snapshot.quests.status, {
      good: "Quest files exist and no unverified completed Quest was found.",
      "needs-attention": "At least one completed Quest is unverified.",
      "insufficient-data": "No local Quest files were available to summarize."
    })),
    makeSection("Verification Honesty", verificationSectionStatus(snapshot), [
      `Verified completed Quests: ${snapshot.quests.verified}`,
      `Unverified completed Quests: ${snapshot.quests.unverified}`,
      "Unavailable token and success-rate metrics remain unestimated."
    ], ["quest.verified", "quest.unverified", "token.savings", "success_rate.improvement"], statusReason(verificationSectionStatus(snapshot), {
      good: "Completed Quests are marked verified and unavailable metrics are not estimated.",
      "needs-attention": "One or more completed Quests are marked unverified.",
      "insufficient-data": "No completed Quest verification evidence exists yet."
    })),
    makeSection("Memory Proposal Flow", snapshot.memoryProposals.status, [
      `Proposals: ${snapshot.memoryProposals.total}`,
      `Accepted: ${snapshot.memoryProposals.accepted}; rejected: ${snapshot.memoryProposals.rejected}; pending: ${snapshot.memoryProposals.pending}`,
      "Pending and rejected proposals remain local review state; accepted proposals are the shareable graph source."
    ], ["memory.proposals", "memory.acceptance_rate", "memory.proposals.pending"], statusReason(snapshot.memoryProposals.status, {
      good: "Proposal state exists and no pending memory proposals remain.",
      "needs-attention": "Pending memory proposals need explicit user review.",
      "insufficient-data": "No local memory proposals exist yet."
    })),
    makeSection("Graph Memory Health", graphSectionStatus(snapshot), [
      `Accepted graph nodes: ${snapshot.graph.acceptedNodeCount}`,
      `Graph reader warnings: ${snapshot.graph.warningCount}`,
      "Eval does not rebuild graph indexes or create graph nodes."
    ], ["graph.accepted_nodes"], statusReason(graphSectionStatus(snapshot), {
      good: "Accepted graph nodes exist and graph/doctor diagnostics did not report blocking issues.",
      "needs-attention": "Graph warnings or doctor errors need attention.",
      "insufficient-data": "No accepted graph nodes exist yet."
    })),
    makeSection("Doctor Diagnostics", snapshot.doctor.status, [
      `Doctor ok: ${yesNo(snapshot.doctor.ok)}`,
      `Errors: ${snapshot.doctor.errorCount}; warnings: ${snapshot.doctor.warningCount}; repairs run: ${snapshot.doctor.repairCount}`,
      `Diagnostic codes: ${formatList(snapshot.doctor.diagnosticCodes)}`
    ], ["doctor.errors", "doctor.warnings"], statusReason(snapshot.doctor.status, {
      good: "Doctor reports no errors or warnings without running repair.",
      "needs-attention": "Doctor reported errors or warnings that require explicit follow-up.",
      "insufficient-data": "Doctor data was unavailable."
    })),
    makeSection("Hook Warning Usefulness", snapshot.hookWarnings.status, [
      `Source: ${snapshot.hookWarnings.sourceFile || snapshot.hookWarnings.source}`,
      `Hook warnings: ${snapshot.hookWarnings.warningCount}`,
      snapshot.hookWarnings.summary
    ], ["hook.warnings", "hook.warning.usefulness"], statusReason(snapshot.hookWarnings.status, {
      good: "A local hook report exists and contains no warnings.",
      "needs-attention": "The latest local hook report contains warnings.",
      "insufficient-data": "No local hook report exists; eval did not run hooks to create one."
    })),
    makeSection("MCP Advisor Signals", snapshot.mcpAdvisor.status, [
      `Advisor catalog available: ${yesNo(snapshot.mcpAdvisor.available)} (${snapshot.mcpAdvisor.catalogCount} tools)`,
      `Local MCP-shaped signal count: ${snapshot.mcpAdvisor.signalCount}`,
      "No MCP server was installed, run, or called."
    ], ["mcp.advisor.availability"], statusReason(snapshot.mcpAdvisor.status, {
      good: "The built-in MCP Advisor catalog is available for read-only suggestion cards.",
      "needs-attention": "MCP Advisor reported a local issue.",
      "insufficient-data": "No MCP Advisor catalog evidence was available."
    })),
    makeSection("Growth Signal Preview", snapshot.growth.status, [
      `Growth level: ${snapshot.growth.growthLevel} (preview only)`,
      `Candidate count: ${snapshot.growth.candidateCount}`,
      "No role, tool, hook, MCP, subagent, workflow, config, graph, or project memory was unlocked or mutated."
    ], ["growth.candidates"], statusReason(snapshot.growth.status, {
      good: "Local evidence produced at least one growth preview candidate.",
      "needs-attention": "Growth preview reported a local issue.",
      "insufficient-data": "No growth candidates are available from current local evidence."
    })),
    makeSection("Adapter Invocation Readiness", snapshot.adapter.status, [
      `Adapter recipes: ${snapshot.adapter.recipeCount}`,
      `Expected adapter JSON contract: ${snapshot.adapter.expectedContractVersion}`,
      "Adapter recipes remain dry-run/invocation contracts, not runtime automation."
    ], ["adapter.recipes"], statusReason(snapshot.adapter.status, {
      good: "Built-in adapter invocation recipes are available.",
      "needs-attention": "Adapter recipes reported a local issue.",
      "insufficient-data": "No adapter recipes are available."
    })),
    makeSection("Known Gaps", "insufficient-data", [
      "Token savings are unavailable because token counts are not collected.",
      "Success-rate improvement is unavailable because v0.8 does not run comparative task packs.",
      "Identity build does not automatically include eval summaries in v0.8-alpha.1.",
      "HTML dashboards, external telemetry, network upload, LLM judges, hook auto-run, MCP auto-run, and auto planner loops are not included."
    ], ["token.savings", "success_rate.improvement"], "These metrics and integrations are intentionally unavailable rather than estimated or auto-generated.")
  ];
}

/**
 * @param {import("./types.d.ts").EvalSnapshot} snapshot
 * @param {import("./types.d.ts").EvalReportSection[]} sections
 * @returns {import("./types.d.ts").EvalReportSummary}
 */
function buildEvalReportSummary(snapshot, sections) {
  return {
    project_id: snapshot.project_id,
    project_name: snapshot.project_name,
    generated_at: snapshot.generated_at,
    report_mode: "local-only",
    total_sections: sections.length,
    needs_attention_count: sections.filter((sectionItem) => sectionItem.status === "needs-attention").length,
    insufficient_data_count: sections.filter((sectionItem) => sectionItem.status === "insufficient-data").length,
    no_telemetry: true,
    no_network: true,
    no_llm_judge: true
  };
}

/**
 * @param {import("./types.d.ts").EvalSnapshot} snapshot
 * @returns {import("./types.d.ts").EvalUnavailableMetric[]}
 */
function buildEvalUnavailableMetrics(snapshot) {
  return snapshot.metrics
    .filter((metricItem) => metricItem.unavailable)
    .map((metricItem) => ({
      id: metricItem.id,
      label: metricItem.label,
      status: metricItem.status,
      source: metricItem.source,
      value: metricItem.value,
      unavailable: true,
      unavailable_reason: metricItem.unavailable_reason,
      limitation: metricItem.limitation
    }));
}

/**
 * @returns {import("./types.d.ts").EvalKnownGap[]}
 */
function buildEvalKnownGaps() {
  return [
    {
      id: "token.savings",
      status: "insufficient-data",
      reason: "Token counts are not collected by the local-only Eval and Reports Preview.",
      source: "unavailable",
      limitation: "Do not estimate token savings without explicit token usage collection.",
      future_target: "An opt-in usage dataset would be required before reporting token savings."
    },
    {
      id: "success_rate.improvement",
      status: "insufficient-data",
      reason: "No raw-agent versus Orange-assisted comparison group is collected.",
      source: "unavailable",
      limitation: "Do not claim success-rate improvement without comparative task-pack outcomes.",
      future_target: "A separate, explicit comparison eval would be required before reporting improvement."
    },
    {
      id: "identity.eval_summary_integration",
      status: "insufficient-data",
      reason: "identity build does not automatically add eval summaries in v0.8-alpha.1.",
      source: "future-target",
      limitation: "Eval report remains a separate explicit command and does not mutate identity artifacts.",
      future_target: "Consider an explicit user-approved identity integration in a future release."
    }
  ];
}

/**
 * @param {import("./types.d.ts").EvalReport} report
 */
function renderEvalReportMarkdown(report) {
  const lines = [
    "# Orange Eval Report",
    "",
    "## Summary",
    "",
    `Generated at: ${report.generated_at}`,
    `Project: ${report.project.project_name} (${report.project.project_id || "missing project_id"})`,
    `Report mode: ${report.summary.report_mode}`,
    `Total sections: ${report.summary.total_sections}`,
    `Needs attention: ${report.summary.needs_attention_count}`,
    `Insufficient data: ${report.summary.insufficient_data_count}`,
    `No telemetry: ${yesNo(report.summary.no_telemetry)}; no network: ${yesNo(report.summary.no_network)}; no LLM judge: ${yesNo(report.summary.no_llm_judge)}`,
    "",
    "This is a local-only Eval and Reports Preview. It does not upload telemetry, call a network API, invoke an LLM judge, install or run MCP servers, run hooks automatically, or mutate project memory/config.",
    "",
    `Report file: ${report.localReport.written ? report.localReport.file : "stdout only (use --write-report to save)"}`,
    ""
  ];
  for (const sectionItem of report.sections) {
    lines.push(`## ${sectionItem.title}`);
    lines.push("");
    lines.push(`Status: ${sectionItem.status}`);
    lines.push(`Reason: ${sectionItem.reason}`);
    lines.push(`Evidence count: ${sectionItem.evidence_count}`);
    lines.push("");
    for (const item of sectionItem.items) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

/**
 * @returns {import("./types.d.ts").EvalLocalReportStatus}
 */
function writeEvalReport(cwd, markdown, reportId) {
  const paths = workspacePaths(cwd);
  const reportsDir = paths.evalReports;
  fs.mkdirSync(reportsDir, { recursive: true });
  const fileName = `${reportId}.md`;
  const filePath = path.join(reportsDir, fileName);
  assertInside(path.resolve(filePath), path.resolve(reportsDir));
  fs.writeFileSync(filePath, markdown);
  return {
    directory: EVAL_REPORT_DIR_RELATIVE,
    defaultWrite: false,
    written: true,
    file: normalizeRelative(filePath, cwd),
    format: "markdown"
  };
}

function writeExistingEvalReport(cwd, relativeFile, markdown) {
  const paths = workspacePaths(cwd);
  const reportsDir = path.resolve(paths.evalReports);
  const filePath = path.resolve(cwd, relativeFile);
  assertInside(filePath, reportsDir);
  fs.writeFileSync(filePath, markdown);
}

function latestHookReport(cwd) {
  const paths = workspacePaths(cwd);
  if (!fs.existsSync(paths.hookReports)) {
    return null;
  }
  const files = filesUnder(paths.hookReports)
    .filter((filePath) => filePath.endsWith(".json"))
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);
  for (const filePath of files) {
    const report = readJsonFile(filePath);
    if (!report || !Array.isArray(report.warnings)) {
      continue;
    }
    return {
      filePath,
      relativePath: normalizeRelative(filePath, cwd),
      report
    };
  }
  return null;
}

/**
 * @returns {import("./types.d.ts").EvalSnapshot["project"]}
 */
function safeProject(cwd) {
  try {
    const project = readProjectIdentity(cwd);
    return {
      project_id: project.project_id || null,
      project_name: project.project_name || path.basename(cwd)
    };
  } catch {
    return {
      project_id: null,
      project_name: path.basename(cwd)
    };
  }
}

/**
 * @param {import("./types.d.ts").JsonValue} value
 * @param {import("./types.d.ts").EvalMetricStatus} status
 * @returns {import("./types.d.ts").EvalMetric}
 */
function metric(id, label, value, status, source, explanation, options = {}) {
  return {
    id,
    label,
    value,
    status,
    source,
    explanation,
    limitation: options.limitation || "Limited to local repository state available at report generation time.",
    unavailable: Boolean(options.unavailable),
    unavailable_reason: options.unavailable_reason || null
  };
}

/**
 * @param {import("./types.d.ts").EvalMetricStatus} status
 * @returns {import("./types.d.ts").EvalReportSection}
 */
function section(title, status, items, metrics, reason, evidenceCount) {
  return {
    title,
    status,
    reason,
    evidence_count: evidenceCount,
    items,
    metrics,
    summary: items[0] || ""
  };
}

function metricEvidenceCount(metrics, metricIds) {
  const byId = new Map(metrics.map((metricItem) => [metricItem.id, metricItem]));
  return metricIds.filter((id) => {
    const metricItem = byId.get(id);
    return metricItem && !metricItem.unavailable && metricItem.status !== "insufficient-data";
  }).length;
}

function statusReason(status, reasons) {
  return reasons[status];
}

/**
 * @returns {import("./types.d.ts").EvalMetricStatus}
 */
function verificationSectionStatus(snapshot) {
  if (snapshot.quests.completed === 0) {
    return "insufficient-data";
  }
  return snapshot.quests.unverified > 0 ? "needs-attention" : "good";
}

/**
 * @returns {import("./types.d.ts").EvalMetricStatus}
 */
function graphSectionStatus(snapshot) {
  if (snapshot.graph.warningCount > 0 || snapshot.doctor.errorCount > 0) {
    return "needs-attention";
  }
  return snapshot.graph.acceptedNodeCount > 0 ? "good" : "insufficient-data";
}

function evalBoundaries() {
  return /** @type {import("./types.d.ts").EvalBoundaryFlags} */ ({
    local_only: true,
    external_telemetry: false,
    network_upload: false,
    api_call: false,
    llm_judge_call: false,
    mcp_call: false,
    hook_auto_run: false,
    subagent_run: false,
    auto_planner_loop: false,
    project_memory_auto_mutation: false,
    config_auto_mutation: false,
    quest_auto_creation: false,
    proposal_auto_creation: false,
    graph_auto_creation: false,
    token_savings_estimation: false,
    success_rate_improvement_claim: false
  });
}

function safeRead(read, fallback) {
  try {
    return read();
  } catch {
    return fallback;
  }
}

/**
 * @returns {import("./types.d.ts").HookWarning[]}
 */
function asWarningArray(value) {
  return Array.isArray(value)
    ? value.map((item) => ({
        code: /** @type {`HOOK_${string}`} */ (String(item?.code || "HOOK_WARNING")),
        message: String(item?.message || item || ""),
        hint: String(item?.hint || "")
      }))
    : [];
}

function readJsonFile(filePath) {
  if (!existsFile(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function filesUnder(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return filesUnder(filePath);
    }
    return entry.isFile() ? [filePath] : [];
  });
}

function existsFile(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function safeTimestamp(value = new Date().toISOString()) {
  return value.replace(/[^0-9A-Za-z]/g, "");
}

function assertInside(target, parent) {
  const relative = path.relative(parent, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Eval report path must stay inside .orange-hyper/evals/reports.");
  }
}

function normalizeRelative(filePath, root) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function yesNo(value) {
  return value ? "yes" : "no";
}

function formatList(values) {
  return values?.length ? values.join(", ") : "none";
}
