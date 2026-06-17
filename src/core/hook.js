import fs from "node:fs";
import path from "node:path";
import { isInitialized, projectIdentityFromConfig } from "./config.js";
import { runDoctor } from "./doctor.js";
import { listGraphNodes } from "./graph.js";
import { listMemoryDeltaProposals } from "./memory.js";
import { originMetadata } from "./origin.js";
import { workspacePaths } from "./paths.js";
import { questFiles, readQuestFile, validateQuestDocument } from "./quest.js";
import { nowIso } from "./time.js";

export const HOOK_SUPPORTED_EVENTS = ["session-start", "stop"];
export const HOOK_UNSUPPORTED_EVENTS = [
  "user-prompt-submit",
  "pre-tool-use",
  "post-tool-use",
  "notification",
  "subagent-stop"
];

const REPORT_DIR_RELATIVE = ".orange-hyper/hooks/reports";

/**
 * @returns {import("./types.d.ts").HookPreviewResult}
 */
export function previewHook(cwd = process.cwd(), options = {}) {
  const paths = workspacePaths(cwd);
  const project = readProjectSnapshot(cwd);
  const data = {
    previewAvailable: true,
    installed: false,
    readOnly: true,
    autoMutation: false,
    project: {
      initialized: isInitialized(cwd),
      orangeRootExists: existsDir(paths.root),
      configExists: existsFile(paths.config),
      project_id: project.project_id,
      project_name: project.project_name,
      projectIdExists: Boolean(project.project_id)
    },
    checks: [
      {
        id: "project_id",
        label: "project_id exists",
        target: ".orange-hyper/config.json",
        current: Boolean(project.project_id)
      },
      {
        id: "doctor.quick",
        label: "doctor quick check",
        target: "orange doctor --json",
        readOnly: true
      },
      {
        id: "capsule.freshness",
        label: "capsule freshness check",
        target: ".orange-hyper/capsules/current.md",
        readOnly: true
      },
      {
        id: "identity.summary",
        label: "identity summary check",
        target: ".orange-hyper/identity/summary.json",
        readOnly: true
      },
      {
        id: "graph.index",
        label: "graph/index check",
        target: ".orange-hyper/graph/index.json",
        readOnly: true
      }
    ],
    localReport: {
      directory: REPORT_DIR_RELATIVE,
      defaultWrite: false,
      written: false,
      file: null
    },
    warnings: project.warning ? [project.warning] : []
  };
  return maybeWriteReport(cwd, "hook-preview", data, options);
}

/**
 * @returns {import("./types.d.ts").HookStatusResult}
 */
export function hookStatus(cwd = process.cwd(), options = {}) {
  const project = readProjectSnapshot(cwd);
  const data = {
    previewAvailable: true,
    installed: false,
    readOnly: true,
    autoMutation: false,
    supportedEvents: [...HOOK_SUPPORTED_EVENTS],
    unsupportedEvents: [...HOOK_UNSUPPORTED_EVENTS],
    localReport: {
      directory: REPORT_DIR_RELATIVE,
      defaultWrite: false,
      written: false,
      file: null
    },
    project: {
      initialized: isInitialized(cwd),
      project_id: project.project_id,
      project_name: project.project_name,
      projectIdExists: Boolean(project.project_id)
    },
    warnings: project.warning ? [project.warning] : []
  };
  return maybeWriteReport(cwd, "hook-status", data, options);
}

/**
 * @param {import("./types.d.ts").HookEvent} event
 * @returns {import("./types.d.ts").HookRunResult}
 */
export function runHookEvent(cwd = process.cwd(), event, options = {}) {
  if (!HOOK_SUPPORTED_EVENTS.includes(event)) {
    throw new Error(`Unsupported hook event: ${event}`);
  }
  const result = event === "session-start"
    ? buildSessionStartResult(cwd)
    : buildStopResult(cwd);
  return maybeWriteReport(cwd, `hook-run-${event}`, result, options);
}

function buildSessionStartResult(cwd) {
  const paths = workspacePaths(cwd);
  const project = readProjectSnapshot(cwd);
  const doctor = safeDoctor(cwd);
  const graph = safeGraphSummary(cwd);
  const warnings = [
    ...(project.warning ? [project.warning] : []),
    ...doctorToWarnings(doctor.result),
    ...graph.warnings
  ];
  const observations = {
    orangeRootExists: existsDir(paths.root),
    configExists: existsFile(paths.config),
    projectIdExists: Boolean(project.project_id),
    projectBoundaryActive: Boolean(project.project_id) && doctor.projectBoundaryErrorCount === 0,
    identitySummaryExists: existsFile(paths.identitySummaryJson),
    acceptedMemoryNodeCount: graph.acceptedMemoryNodeCount,
    doctorQuickStatus: doctor.status
  };
  pushMissingObservationWarnings(warnings, observations);
  return baseRunResult("session-start", observations, warnings);
}

function buildStopResult(cwd) {
  const paths = workspacePaths(cwd);
  const project = readProjectSnapshot(cwd);
  const doctor = safeDoctor(cwd);
  const completedQuestVerification = inspectCompletedQuestVerification(cwd);
  const graph = safeGraphSummary(cwd);
  const pendingMemoryProposalCount = safePendingProposalCount(cwd);
  const freshness = inspectFreshness(cwd);
  const projectBoundaryWarnings = doctorProjectBoundaryWarnings(doctor.result);
  const graphProvenanceWarnings = doctorGraphProvenanceWarnings(doctor.result);
  const warnings = [
    ...(project.warning ? [project.warning] : []),
    ...doctorToWarnings(doctor.result),
    ...completedQuestVerification.warnings,
    ...graph.warnings,
    ...graphProvenanceWarnings,
    ...pendingMemoryProposalCount.warnings,
    ...freshness.warnings,
    ...projectBoundaryWarnings
  ];
  const observations = {
    doctorQuickStatus: doctor.status,
    completedQuestVerificationAnomalies: completedQuestVerification.anomalies,
    acceptedGraphNodeProvenanceAnomalies: graphProvenanceWarnings.map((item) => item.message),
    pendingMemoryProposalCount: pendingMemoryProposalCount.count,
    capsule: freshness.capsule,
    identity: freshness.identity,
    graphIndexExists: existsFile(paths.graphIndex),
    projectBoundaryActive: Boolean(project.project_id) && doctor.projectBoundaryErrorCount === 0,
    projectBoundaryWarnings: projectBoundaryWarnings.map((item) => item.message),
    acceptedMemoryNodeCount: graph.acceptedMemoryNodeCount
  };
  return baseRunResult("stop", observations, warnings);
}

function baseRunResult(event, observations, warnings) {
  return {
    event,
    installed: false,
    readOnly: true,
    autoMutation: false,
    report: {
      directory: REPORT_DIR_RELATIVE,
      defaultWrite: false,
      written: false,
      file: null
    },
    observations,
    warnings: uniqueWarnings(warnings),
    hints: uniqueWarnings(warnings).map((warning) => warning.hint).filter(Boolean)
  };
}

function readProjectSnapshot(cwd) {
  const paths = workspacePaths(cwd);
  if (!fs.existsSync(paths.config)) {
    return {
      project_id: null,
      project_name: path.basename(cwd),
      warning: warning(
        "CONFIG_MISSING",
        ".orange-hyper/config.json is missing.",
        "Run `orange init` explicitly if this repository should use Orange Hyper."
      )
    };
  }
  try {
    const config = JSON.parse(fs.readFileSync(paths.config, "utf8"));
    const identity = projectIdentityFromConfig(config, cwd);
    return {
      project_id: identity.project_id || null,
      project_name: identity.project_name || path.basename(cwd),
      warning: identity.project_id
        ? null
        : warning(
            "CONFIG_PROJECT_ID_MISSING",
            "config.project_id is missing.",
            "Run `orange doctor --repair-project-id` only after explicit user approval."
          )
    };
  } catch (error) {
    return {
      project_id: null,
      project_name: path.basename(cwd),
      warning: warning(
        "CONFIG_PARSE_ERROR",
        `config.json is not valid JSON: ${error.message}`,
        "Fix .orange-hyper/config.json manually; hook preview will not repair it."
      )
    };
  }
}

function safeDoctor(cwd) {
  const result = runDoctor(cwd);
  return {
    result,
    status: {
      ok: result.ok,
      checkCount: result.checks.length,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      repairCount: result.repairs.length,
      projectBoundaryErrorCount: result.project_boundary.errors.length,
      projectBoundaryWarningCount: result.project_boundary.warnings.length
    },
    projectBoundaryErrorCount: result.project_boundary.errors.length
  };
}

function safeGraphSummary(cwd) {
  try {
    if (!isInitialized(cwd)) {
      return { acceptedMemoryNodeCount: 0, warnings: [] };
    }
    const graph = listGraphNodes(cwd);
    return {
      acceptedMemoryNodeCount: graph.nodes.length,
      warnings: graph.warnings.map((message) => warning(
        "GRAPH_WARNING",
        message,
        "Inspect graph nodes manually; hook preview does not rebuild the graph."
      ))
    };
  } catch (error) {
    return {
      acceptedMemoryNodeCount: 0,
      warnings: [warning(
        "GRAPH_READ_FAILED",
        `Accepted graph node count could not be read: ${error.message}`,
        "Run `orange graph list --json` manually after resolving project boundary or graph diagnostics."
      )]
    };
  }
}

function safePendingProposalCount(cwd) {
  try {
    if (!isInitialized(cwd)) {
      return { count: 0, warnings: [] };
    }
    return {
      count: listMemoryDeltaProposals(cwd, "pending").length,
      warnings: []
    };
  } catch (error) {
    return {
      count: 0,
      warnings: [warning(
        "PENDING_PROPOSALS_READ_FAILED",
        `Pending memory proposal count could not be read: ${error.message}`,
        "Run `orange remember list --status pending --json` manually after resolving diagnostics."
      )]
    };
  }
}

function inspectCompletedQuestVerification(cwd) {
  const anomalies = [];
  const warnings = [];
  if (!existsDir(workspacePaths(cwd).completedQuests)) {
    return { anomalies, warnings };
  }
  for (const filePath of questFiles(cwd, "completed")) {
    try {
      const quest = readQuestFile(filePath);
      const errors = validateQuestDocument(quest, "completed")
        .filter((message) => /completed quest|verified quest|unverified quest/.test(message));
      anomalies.push(...errors);
    } catch (error) {
      anomalies.push(`${path.relative(cwd, filePath)} failed to parse: ${error.message}`);
    }
  }
  for (const anomaly of anomalies) {
    warnings.push(warning(
      "COMPLETED_QUEST_VERIFICATION_ANOMALY",
      anomaly,
      "Inspect the completed Quest; hook preview does not edit Quest verification state."
    ));
  }
  return { anomalies, warnings };
}

function inspectFreshness(cwd) {
  const paths = workspacePaths(cwd);
  const latestQuestOrMemory = latestMtime([
    paths.config,
    ...filesUnder(paths.activeQuests),
    ...filesUnder(paths.completedQuests),
    ...filesUnder(paths.pendingMemoryDeltaProposals),
    ...filesUnder(paths.acceptedMemoryDeltaProposals),
    ...filesUnder(paths.rejectedMemoryDeltaProposals),
    ...filesUnder(paths.graphNodes),
    paths.graphIndex
  ]);
  const capsule = freshnessFor(paths.currentCapsule, latestQuestOrMemory);
  const identity = freshnessFor(paths.identitySummaryJson, latestQuestOrMemory);
  const warnings = [];
  if (!capsule.exists) {
    warnings.push(warning(
      "CAPSULE_MISSING",
      "Current capsule is missing.",
      "Run `orange capsule` explicitly if a refreshed capsule is needed."
    ));
  } else if (capsule.stale) {
    warnings.push(warning(
      "CAPSULE_STALE",
      "Current capsule may be stale relative to Quest, proposal, or graph state.",
      "Run `orange capsule` explicitly if a refreshed capsule is needed."
    ));
  }
  if (!identity.exists) {
    warnings.push(warning(
      "IDENTITY_SUMMARY_MISSING",
      "Identity summary is missing.",
      "Run `orange identity build` explicitly if a refreshed identity summary is needed."
    ));
  } else if (identity.stale) {
    warnings.push(warning(
      "IDENTITY_SUMMARY_STALE",
      "Identity summary may be stale relative to Quest, proposal, or graph state.",
      "Run `orange identity build` explicitly if a refreshed identity summary is needed."
    ));
  }
  return { capsule, identity, warnings };
}

function freshnessFor(filePath, latestSourceMtime) {
  const exists = existsFile(filePath);
  const mtimeMs = exists ? fs.statSync(filePath).mtimeMs : null;
  return {
    path: normalizeRelative(filePath, path.dirname(path.dirname(filePath))),
    exists,
    mtimeMs,
    stale: Boolean(exists && latestSourceMtime && mtimeMs + 1 < latestSourceMtime)
  };
}

function doctorToWarnings(result) {
  if (!result) {
    return [];
  }
  return [
    ...result.diagnostics.errors,
    ...result.diagnostics.warnings
  ].map((item) => warning(item.code, item.message, item.hint));
}

function doctorProjectBoundaryWarnings(result) {
  if (!result) {
    return [];
  }
  return [
    ...result.project_boundary.diagnostics.errors,
    ...result.project_boundary.diagnostics.warnings
  ].map((item) => warning(item.code, item.message, item.hint));
}

function doctorGraphProvenanceWarnings(result) {
  if (!result) {
    return [];
  }
  const graphCodes = /^(ACCEPTED_|GRAPH_NODE_|GRAPH_INDEX_)/;
  return result.diagnostics.errors
    .filter((item) => graphCodes.test(item.code))
    .map((item) => warning(item.code, item.message, item.hint));
}

function pushMissingObservationWarnings(warnings, observations) {
  if (!observations.orangeRootExists) {
    warnings.push(warning(
      "ORANGE_ROOT_MISSING",
      ".orange-hyper directory is missing.",
      "Run `orange init` explicitly if this repository should use Orange Hyper."
    ));
  }
  if (!observations.projectIdExists) {
    warnings.push(warning(
      "CONFIG_PROJECT_ID_MISSING",
      "config.project_id is missing.",
      "Run `orange doctor --repair-project-id` only after explicit user approval."
    ));
  }
  if (!observations.identitySummaryExists) {
    warnings.push(warning(
      "IDENTITY_SUMMARY_MISSING",
      "Identity summary is missing.",
      "Run `orange identity build` explicitly if a refreshed identity summary is needed."
    ));
  }
}

function maybeWriteReport(cwd, reportKind, data, options) {
  if (!options.writeReport) {
    return data;
  }
  const report = writeHookReport(cwd, reportKind, buildReportPayload(cwd, reportKind));
  if (data.report) {
    return {
      ...data,
      report
    };
  }
  if (data.localReport) {
    return {
      ...data,
      localReport: report
    };
  }
  return data;
}

function writeHookReport(cwd, reportKind, payload) {
  const paths = workspacePaths(cwd);
  const reportsDir = paths.hookReports;
  fs.mkdirSync(reportsDir, { recursive: true });
  const fileName = `${safeReportSlug(reportKind)}-${safeTimestamp()}.json`;
  const filePath = path.join(reportsDir, fileName);
  assertInside(path.resolve(filePath), path.resolve(reportsDir));
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
  return {
    directory: REPORT_DIR_RELATIVE,
    defaultWrite: false,
    written: true,
    file: path.relative(cwd, filePath)
  };
}

function buildReportPayload(cwd, reportKind) {
  const paths = workspacePaths(cwd);
  const doctor = runDoctor(cwd);
  const freshness = inspectFreshness(cwd);
  const identitySummary = readIdentitySummary(paths.identitySummaryJson);
  return {
    ...originMetadata(),
    report_kind: reportKind,
    generated_at: nowIso(),
    readOnly: true,
    autoMutation: false,
    doctor: {
      ok: doctor.ok,
      checkCount: doctor.checks.length,
      errorCount: doctor.errors.length,
      warningCount: doctor.warnings.length,
      repairCount: doctor.repairs.length,
      diagnosticCodes: [
        ...doctor.diagnostics.errors,
        ...doctor.diagnostics.warnings,
        ...doctor.diagnostics.repairs
      ].map((item) => item.code)
    },
    project_boundary: {
      project_id: doctor.project_boundary.project_id,
      project_name: doctor.project_boundary.project_name,
      errorCount: doctor.project_boundary.errors.length,
      warningCount: doctor.project_boundary.warnings.length,
      repairCount: doctor.project_boundary.repairs.length,
      diagnosticCodes: [
        ...doctor.project_boundary.diagnostics.errors,
        ...doctor.project_boundary.diagnostics.warnings,
        ...doctor.project_boundary.diagnostics.repairs
      ].map((item) => item.code)
    },
    capsule: freshness.capsule,
    identity: {
      ...freshness.identity,
      generatedAt: identitySummary?.generatedAt || null,
      acceptedMemoryNodes: identitySummary?.acceptedMemoryNodes ?? null,
      projectBoundaryActive: identitySummary?.projectBoundaryActive ?? null
    }
  };
}

function readIdentitySummary(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function warning(code, message, hint) {
  return { code, message, hint };
}

function uniqueWarnings(warnings) {
  const seen = new Set();
  const unique = [];
  for (const item of warnings.filter(Boolean)) {
    const key = `${item.code}:${item.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(item);
  }
  return unique;
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

function latestMtime(filePaths) {
  const mtimes = filePaths
    .filter((filePath) => fs.existsSync(filePath) && fs.statSync(filePath).isFile())
    .map((filePath) => fs.statSync(filePath).mtimeMs);
  return mtimes.length ? Math.max(...mtimes) : null;
}

function existsFile(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function existsDir(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isDirectory();
}

function safeReportSlug(value) {
  const slug = String(value).replace(/[^A-Za-z0-9_.-]+/g, "-");
  if (!slug || slug.includes("..") || slug.includes("/") || slug.includes("\\")) {
    throw new Error("Hook report kind must be a safe identifier.");
  }
  return slug;
}

function safeTimestamp() {
  return new Date().toISOString().replace(/[^0-9A-Za-z]/g, "");
}

function assertInside(target, parent) {
  const relative = path.relative(parent, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Hook report path must stay inside .orange-hyper/hooks/reports.");
  }
}

function normalizeRelative(filePath, root) {
  return path.relative(root, filePath).split(path.sep).join("/");
}
