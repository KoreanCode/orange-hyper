import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  CONFIG_VERSION,
  ORANGE_GITIGNORE,
  ROOT_GITIGNORE_REQUIRED_LINES,
  normalizeConfigProjectIdentity,
  projectIdentityFromConfig
} from "./config.js";
import { stringifyFrontmatter } from "./frontmatter.js";
import { validateGraphReadModel } from "./graph.js";
import {
  findGraphNodesForProposal,
  hashMemoryDeltaProposalSource,
  listMemoryGraphNodes,
  memoryDeltaProposalFiles,
  readMemoryDeltaProposalFile,
  validateGraphJson,
  validateMemoryDeltaProposalDetailed
} from "./memory.js";
import { workspacePaths } from "./paths.js";
import { questFiles, readQuestFile, validateQuestDocument } from "./quest.js";
import { validateStructureState } from "./sync.js";

/**
 * @returns {import("./types.d.ts").DoctorResult}
 */
export function runDoctor(cwd = process.cwd(), options = {}) {
  const paths = workspacePaths(cwd);
  const errors = [];
  const warnings = [];
  const checks = [];
  const repairs = [];
  const boundaryErrors = [];
  const boundaryWarnings = [];
  const boundaryRepairs = [];
  const diagnostics = emptyDiagnostics();
  const boundaryDiagnostics = emptyDiagnostics();
  const repairProjectId = Boolean(options.repairProjectId);
  let projectIdentity = { project_id: "", project_name: path.basename(cwd) };
  const questsById = new Map();
  const checkedNodePaths = new Set();

  const addDiagnostic = (severity, code, message, hint, options = {}) => {
    const item = { code, message, hint };
    if (severity === "error") {
      errors.push(message);
      diagnostics.errors.push(item);
      if (options.boundary) {
        boundaryErrors.push(message);
        boundaryDiagnostics.errors.push(item);
      }
      return;
    }
    if (severity === "warning") {
      warnings.push(message);
      diagnostics.warnings.push(item);
      if (options.boundary) {
        boundaryWarnings.push(message);
        boundaryDiagnostics.warnings.push(item);
      }
      return;
    }
    repairs.push(message);
    diagnostics.repairs.push(item);
    if (options.boundary) {
      boundaryRepairs.push(message);
      boundaryDiagnostics.repairs.push(item);
    }
  };

  const addBoundaryError = (message, code = "PROJECT_BOUNDARY_ERROR", hint = "Inspect the artifact project_id; cross-project mismatches are not repaired automatically.") => {
    addDiagnostic("error", code, message, hint, { boundary: true });
  };
  const addBoundaryWarning = (message, code = "PROJECT_BOUNDARY_WARNING", hint = "Run `orange doctor --repair-project-id` to fill missing legacy project identity fields.") => {
    addDiagnostic("warning", code, message, hint, { boundary: true });
  };
  const addBoundaryRepair = (message, code = "PROJECT_BOUNDARY_REPAIRED", hint = "Re-run `orange doctor --json` to confirm the repaired project boundary.") => {
    addDiagnostic("repair", code, message, hint, { boundary: true });
  };

  checkExists(paths.root, "directory", ".orange-hyper root", errors, checks);
  checkExists(paths.config, "file", "config.json", errors, checks);
  checkExists(paths.orangeGitignore, "file", ".orange-hyper/.gitignore", errors, checks);
  checkExists(paths.activeQuests, "directory", "quests/active", errors, checks);
  checkExists(paths.completedQuests, "directory", "quests/completed", errors, checks);
  checkExists(paths.currentCapsule, "file", "capsules/current.md", errors, checks);
  checkExists(paths.pendingMemoryDeltaProposals, "directory", "proposals/memory-delta/pending", errors, checks);
  checkExists(paths.acceptedMemoryDeltaProposals, "directory", "proposals/memory-delta/accepted", errors, checks);
  checkExists(paths.rejectedMemoryDeltaProposals, "directory", "proposals/memory-delta/rejected", errors, checks);
  checkExists(paths.graphDecisionNodes, "directory", "graph/nodes/decision", errors, checks, addDiagnostic);
  checkExists(paths.graphConstraintNodes, "directory", "graph/nodes/constraint", errors, checks, addDiagnostic);
  checkExists(paths.graphComponentNodes, "directory", "graph/nodes/component", errors, checks, addDiagnostic);
  checkExists(paths.graphRiskNodes, "directory", "graph/nodes/risk", errors, checks, addDiagnostic);
  checkExists(paths.graphVerificationNodes, "directory", "graph/nodes/verification", errors, checks, addDiagnostic);
  checkExists(paths.graphIndex, "file", "graph/index.json", errors, checks, addDiagnostic);
  checkExists(paths.graphEdges, "file", "graph/edges.jsonl", errors, checks, addDiagnostic);
  checkExists(paths.routeTrace, "file", "traces/route.jsonl", errors, checks);

  checkRootGitignorePolicy(cwd, checks, addDiagnostic);

  if (fs.existsSync(paths.config)) {
    try {
      let config = JSON.parse(fs.readFileSync(paths.config, "utf8"));
      const hasConfigProjectIdConflict = config.project_id && config.project?.id && config.project_id !== config.project.id;
      if (hasConfigProjectIdConflict) {
        addBoundaryError(
          `config.project_id ${config.project_id} does not match config.project.id ${config.project.id}`,
          "CONFIG_PROJECT_ID_MISMATCH",
          "Resolve config.json manually; doctor will not overwrite an existing different project_id."
        );
      } else if (repairProjectId) {
        const normalized = normalizeConfigProjectIdentity(config, cwd);
        if (JSON.stringify(config) !== JSON.stringify(normalized)) {
          fs.writeFileSync(paths.config, `${JSON.stringify(normalized, null, 2)}\n`);
          config = normalized;
          addBoundaryRepair(
            "added missing project identity fields to config.json",
            "CONFIG_PROJECT_ID_REPAIRED",
            "Re-run `orange doctor --json` to confirm config.project_id and project.id are present."
          );
        }
      }
      projectIdentity = projectIdentityFromConfig(config, cwd);
      if (config.version !== CONFIG_VERSION) {
        warnings.push(`config version is ${config.version}; expected ${CONFIG_VERSION}`);
      }
      if (!config.project_id) {
        addBoundaryError(
          "config.project_id is missing",
          "CONFIG_PROJECT_ID_MISSING",
          "Run `orange doctor --repair-project-id` to fill a missing project_id without overwriting mismatched project ids."
        );
      }
      if (!config.project_name) {
        addBoundaryWarning(
          "config.project_name is missing",
          "LEGACY_PROJECT_NAME_MISSING",
          "Run `orange doctor --repair-project-id` to fill missing legacy project_name fields."
        );
      }
      if (config.features?.hooks || config.features?.mcp || config.features?.subagents || config.features?.auto_execution_loop) {
        errors.push("preview feature flags must keep runtime hooks, MCP, subagents, and auto execution loop disabled");
      }
      checks.push("config.json parses");
    } catch (error) {
      errors.push(`config.json is not valid JSON: ${error.message}`);
    }
  }

  if (fs.existsSync(paths.orangeGitignore)) {
    const actual = fs.readFileSync(paths.orangeGitignore, "utf8");
    for (const expected of ORANGE_GITIGNORE.split(/\n/).filter(Boolean)) {
      if (!actual.split(/\r?\n/).includes(expected)) {
        errors.push(`.orange-hyper/.gitignore missing ${expected}`);
      }
    }
    checks.push(".orange-hyper/.gitignore policy checked");
  }

  for (const [status, dir] of [
    ["active", paths.activeQuests],
    ["completed", paths.completedQuests]
  ]) {
    if (!fs.existsSync(dir)) {
      continue;
    }
    for (const filePath of questFiles(cwd, status)) {
      try {
        const quest = readQuestFile(filePath);
        repairOrCheckFrontmatterProjectIdentity({
          kind: "quest",
          label: quest.data.id || path.basename(filePath, ".md"),
          document: quest,
          projectIdentity,
          repairProjectId,
          addBoundaryError,
          addBoundaryWarning,
          addBoundaryRepair
        });
        questsById.set(quest.data.id, quest);
        errors.push(...validateQuestDocument(quest, status));
        checks.push(`${path.relative(paths.root, filePath)} parses`);
      } catch (error) {
        errors.push(`${path.relative(cwd, filePath)} failed to parse: ${error.message}`);
      }
    }
  }

  if (fs.existsSync(paths.routeTrace)) {
    const lines = fs.readFileSync(paths.routeTrace, "utf8").split(/\r?\n/).filter(Boolean);
    lines.forEach((line, index) => {
      try {
        const trace = JSON.parse(line);
        if (!trace.trace_id || !trace.contract?.route) {
          errors.push(`route trace line ${index + 1} is missing trace_id or contract.route`);
        }
      } catch (error) {
        errors.push(`route trace line ${index + 1} is invalid JSON: ${error.message}`);
      }
    });
    checks.push(`traces/route.jsonl has ${lines.length} entr${lines.length === 1 ? "y" : "ies"}`);
  }

  if (fs.existsSync(paths.currentCapsule)) {
    checkCapsuleProjectBoundary({
      paths,
      projectIdentity,
      repairProjectId,
      addBoundaryError,
      addBoundaryWarning,
      addBoundaryRepair
    });
  }

  if (fs.existsSync(paths.identitySummaryJson)) {
    checkIdentitySummaryProjectBoundary({
      paths,
      projectIdentity,
      repairProjectId,
      addBoundaryError,
      addBoundaryWarning,
      addBoundaryRepair
    });
  }

  if (fs.existsSync(paths.memoryDeltaProposals)) {
    for (const filePath of memoryDeltaProposalFiles(cwd, "all")) {
      let proposal;
      try {
        proposal = readMemoryDeltaProposalFile(filePath);
      } catch (error) {
        errors.push(`${path.relative(cwd, filePath)} failed to parse: ${error.message}`);
        continue;
      }
      repairOrCheckFrontmatterProjectIdentity({
        kind: "memory proposal",
        label: proposal.data.id || path.basename(filePath, ".md"),
        document: proposal,
        projectIdentity,
        repairProjectId,
        addBoundaryError,
        addBoundaryWarning,
        addBoundaryRepair
      });
      const sourceQuest = questsById.get(proposal.data.source_quest);
      checkLinkedProjectIdentity({
        leftKind: "memory proposal",
        leftLabel: proposal.data.id || path.basename(filePath, ".md"),
        leftData: proposal.data,
        rightKind: "source quest",
        rightLabel: proposal.data.source_quest || "(unknown)",
        rightData: sourceQuest?.data
      }, addBoundaryError);
      const proposalValidation = validateMemoryDeltaProposalDetailed(proposal, { cwd });
      errors.push(...proposalValidation.errors);
      warnings.push(...proposalValidation.warnings);
      if (proposal.data.status === "accepted") {
        try {
          const nodes = findGraphNodesForProposal(cwd, proposal.data.id);
          if (!nodes.length) {
            addDiagnostic(
              "error",
              "ACCEPTED_PROPOSAL_MISSING_NODE",
              `accepted memory proposal ${proposal.data.id} has no graph node provenance`,
              "Run `orange remember accept <proposal-id>` only for pending proposals, or inspect the accepted proposal and graph node files manually."
            );
          }
          const proposalHash = hashMemoryDeltaProposalSource(proposal);
          for (const node of nodes) {
            checkedNodePaths.add(node.filePath);
            repairOrCheckFrontmatterProjectIdentity({
              kind: "graph node",
              label: node.data.id || path.basename(node.filePath, ".md"),
              document: node,
              projectIdentity,
              repairProjectId,
              addBoundaryError,
              addBoundaryWarning,
              addBoundaryRepair
            });
            checkLinkedProjectIdentity({
              leftKind: "graph node",
              leftLabel: node.data.id || path.basename(node.filePath, ".md"),
              leftData: node.data,
              rightKind: "source proposal",
              rightLabel: proposal.data.id || "(unknown)",
              rightData: proposal.data
            }, addBoundaryError);
            checkLinkedProjectIdentity({
              leftKind: "graph node provenance",
              leftLabel: node.data.id || path.basename(node.filePath, ".md"),
              leftData: node.data.provenance || {},
              rightKind: "graph node",
              rightLabel: node.data.id || "(unknown)",
              rightData: node.data
            }, addBoundaryError);
            if (node.data.source_quest !== proposal.data.source_quest || node.data.provenance?.source_quest !== proposal.data.source_quest) {
              errors.push(`graph node ${node.data.id || "(unknown)"} provenance does not match accepted proposal ${proposal.data.id}`);
            }
            if (node.data.source_proposal !== proposal.data.id || ![node.data.provenance?.proposal_id, node.data.provenance?.source_proposal].includes(proposal.data.id)) {
              errors.push(`graph node ${node.data.id || "(unknown)"} missing proposal provenance for ${proposal.data.id}`);
            }
            if (node.data.node_type !== proposal.data.node_type || node.data.provenance?.node_type !== proposal.data.node_type) {
              errors.push(`graph node ${node.data.id || "(unknown)"} node_type provenance does not match accepted proposal ${proposal.data.id}`);
            }
            if (node.data.origin !== "memory-delta-proposal" || node.data.provenance?.origin !== "memory-delta-proposal") {
              errors.push(`graph node ${node.data.id || "(unknown)"} origin provenance does not match memory-delta-proposal`);
            }
            if (!node.data.accepted_at || node.data.provenance?.accepted_at !== node.data.accepted_at) {
              errors.push(`graph node ${node.data.id || "(unknown)"} accepted_at provenance is missing or inconsistent`);
            }
            if (!node.data.source_proposal_hash || !node.data.provenance?.source_proposal_hash) {
              errors.push(`graph node ${node.data.id || "(unknown)"} source_proposal_hash provenance is missing`);
            }
            if (node.data.source_proposal_hash && node.data.source_proposal_hash !== proposalHash) {
              errors.push(`graph node ${node.data.id || "(unknown)"} source_proposal_hash does not match accepted proposal ${proposal.data.id}`);
            }
            if (node.data.provenance?.source_proposal_hash && node.data.provenance.source_proposal_hash !== proposalHash) {
              errors.push(`graph node ${node.data.id || "(unknown)"} provenance source_proposal_hash does not match accepted proposal ${proposal.data.id}`);
            }
          }
        } catch (error) {
          errors.push(`accepted memory proposal ${proposal.data.id} graph provenance check failed: ${error.message}`);
        }
      }
      if (proposal.data.status === "rejected") {
        try {
          const nodes = findGraphNodesForProposal(cwd, proposal.data.id);
          if (nodes.length) {
            errors.push(`rejected memory proposal ${proposal.data.id} must not have graph nodes`);
          }
        } catch (error) {
          errors.push(`rejected memory proposal ${proposal.data.id} graph check failed: ${error.message}`);
        }
      }
      checks.push(`${path.relative(paths.root, proposal.filePath)} parses`);
    }
  }

  if (fs.existsSync(paths.graphNodes)) {
    for (const node of listMemoryGraphNodes(cwd)) {
      if (checkedNodePaths.has(node.filePath)) {
        continue;
      }
      repairOrCheckFrontmatterProjectIdentity({
        kind: "graph node",
        label: node.data.id || path.basename(node.filePath, ".md"),
        document: node,
        projectIdentity,
        repairProjectId,
        addBoundaryError,
        addBoundaryWarning,
        addBoundaryRepair
      });
    }
  }

  const graphJson = validateGraphJson(cwd);
  errors.push(...graphJson.errors);
  checks.push(...graphJson.checks);
  const graphReadModel = validateGraphReadModel(cwd, { projectIdentity });
  errors.push(...graphReadModel.errors);
  pushUnique(warnings, graphReadModel.warnings);
  checks.push(...graphReadModel.checks);
  mergeDiagnostics(diagnostics, graphReadModel.diagnostics);
  const structureState = validateStructureState(cwd, { projectIdentity });
  errors.push(...structureState.errors);
  pushUnique(warnings, structureState.warnings);
  checks.push(...structureState.checks);
  mergeDiagnostics(diagnostics, structureState.diagnostics);

  checkPublicMemoryState(cwd, paths, checks, addDiagnostic);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    checks,
    repairs,
    diagnostics,
    project_boundary: {
      project_id: projectIdentity.project_id || null,
      project_name: projectIdentity.project_name || null,
      errors: boundaryErrors,
      warnings: boundaryWarnings,
      repairs: boundaryRepairs,
      diagnostics: boundaryDiagnostics
    }
  };
}

const PRIVATE_STATE_PREFIXES = [
  ".orange-hyper/capsules/",
  ".orange-hyper/traces/",
  ".orange-hyper/identity/",
  ".orange-hyper/structure/",
  ".orange-hyper/local/",
  ".orange-hyper/proposals/memory-delta/pending/",
  ".orange-hyper/proposals/memory-delta/rejected/"
];

const PRIVATE_LOOKING_PATTERNS = [
  { label: "/Users/", regex: /\/Users\/[^\s"'`)]+/ },
  { label: "/private/tmp/", regex: /\/private\/tmp\/[^\s"'`)]+/ },
  { label: "npm debug log", regex: /(?:^|[\/\s])npm-debug\.log[^\s"'`)]*/i }
];

const SECRET_LIKE_PATTERNS = [
  { label: ".env", regex: /(^|[^A-Za-z0-9_])\.env(?:$|[^A-Za-z0-9_])/i },
  { label: "NODE_AUTH_TOKEN", regex: /\bNODE_AUTH_TOKEN\b/i },
  { label: "NPM_TOKEN", regex: /\bNPM_TOKEN\b/i },
  { label: "npm token", regex: /\bnpm[_ -]?token\b/i },
  { label: "token", regex: /\btoken\b/i },
  { label: "secret", regex: /\bsecret\b/i },
  { label: "auth", regex: /\bauth(?:entication|orization)?\b/i }
];

function checkRootGitignorePolicy(cwd, checks, addDiagnostic) {
  const gitignorePath = path.join(cwd, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    return;
  }
  const lines = fs.readFileSync(gitignorePath, "utf8").split(/\r?\n/);
  for (const expected of ROOT_GITIGNORE_REQUIRED_LINES) {
    if (!lines.includes(expected)) {
      addDiagnostic(
        "warning",
        "PUBLIC_MEMORY_GITIGNORE_POLICY",
        `root .gitignore missing independent line ${expected}`,
        "Keep root .gitignore line-based so public shared memory can be tracked while local/generated/private .orange-hyper state stays ignored."
      );
    }
  }
  checks.push("root .gitignore public memory policy checked");
}

function checkPublicMemoryState(cwd, paths, checks, addDiagnostic) {
  checkTrackedPrivateState(cwd, checks, addDiagnostic);
  checkPublicMemoryContent(cwd, paths, checks, addDiagnostic);
}

function checkTrackedPrivateState(cwd, checks, addDiagnostic) {
  const tracked = trackedOrangeFiles(cwd);
  if (!tracked) {
    return;
  }
  checks.push("public memory git tracking checked");
  for (const file of tracked) {
    const normalized = normalizeRelativePath(file);
    if (!PRIVATE_STATE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
      continue;
    }
    addDiagnostic(
      "warning",
      "PUBLIC_MEMORY_TRACKED_PRIVATE_STATE",
      `${normalized} is tracked by Git but should remain local/generated/private state`,
      "Remove tracked private .orange-hyper state from Git. Commit only config, completed quests, accepted proposals, and graph provenance that pass public memory audit."
    );
  }
}

function trackedOrangeFiles(cwd) {
  const result = spawnSync("git", ["ls-files", "--", ".orange-hyper"], {
    cwd,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    return null;
  }
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

function checkPublicMemoryContent(cwd, paths, checks, addDiagnostic) {
  for (const filePath of publicMemoryFiles(paths)) {
    const relative = normalizeRelativePath(path.relative(cwd, filePath));
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      const privateMatch = firstPatternMatch(line, PRIVATE_LOOKING_PATTERNS);
      if (privateMatch) {
        addDiagnostic(
          "warning",
          "PUBLIC_MEMORY_PRIVATE_PATH",
          `${relative}:${index + 1} contains private-looking ${privateMatch.label}: ${privateMatch.value}`,
          "Public memory should keep reusable project knowledge, not local absolute paths or generated debug-log paths."
        );
      }
      const secretMatch = firstPatternMatch(line, SECRET_LIKE_PATTERNS);
      if (secretMatch) {
        addDiagnostic(
          "error",
          "PUBLIC_MEMORY_SECRET_LIKE_CONTENT",
          `${relative}:${index + 1} contains secret-like keyword ${secretMatch.label}`,
          "Remove credentials, .env references, auth markers, npm tokens, and token/secret-like strings from public memory before committing."
        );
      }
    });
  }
  checks.push("public memory content audit checked");
}

function publicMemoryFiles(paths) {
  return [
    ...existingFiles([paths.config]),
    ...markdownFiles(paths.completedQuests),
    ...markdownFiles(paths.acceptedMemoryDeltaProposals),
    ...recursiveFiles(paths.graph)
  ];
}

function existingFiles(filePaths) {
  return filePaths.filter((filePath) => fs.existsSync(filePath) && fs.statSync(filePath).isFile());
}

function markdownFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => path.join(dir, name))
    .filter((filePath) => fs.statSync(filePath).isFile());
}

function recursiveFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return recursiveFiles(filePath);
    }
    return entry.isFile() ? [filePath] : [];
  });
}

function firstPatternMatch(line, patterns) {
  for (const pattern of patterns) {
    const match = line.match(pattern.regex);
    if (match) {
      return {
        label: pattern.label,
        value: match[0].trim()
      };
    }
  }
  return null;
}

function normalizeRelativePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function checkExists(target, kind, label, errors, checks, addDiagnostic) {
  if (!fs.existsSync(target)) {
    const message = `missing ${label}`;
    if (addDiagnostic && label.startsWith("graph/")) {
      addDiagnostic(
        "error",
        "GRAPH_STRUCTURE_MISSING",
        message,
        "Run `orange init` to create missing v0.2/v0.3 storage directories and graph read-model files."
      );
    } else {
      errors.push(message);
    }
    return;
  }
  const stat = fs.statSync(target);
  const isKind = kind === "directory" ? stat.isDirectory() : stat.isFile();
  if (!isKind) {
    const message = `${label} is not a ${kind}`;
    if (addDiagnostic && label.startsWith("graph/")) {
      addDiagnostic(
        "error",
        "GRAPH_STRUCTURE_INVALID",
        message,
        "Move or remove the invalid path, then run `orange init` to recreate the graph storage structure."
      );
    } else {
      errors.push(message);
    }
    return;
  }
  checks.push(`${label} exists`);
}

function repairOrCheckFrontmatterProjectIdentity(context) {
  const {
    kind,
    label,
    document,
    projectIdentity,
    repairProjectId,
    addBoundaryError,
    addBoundaryWarning,
    addBoundaryRepair
  } = context;
  if (!projectIdentity.project_id) {
    return;
  }
  const data = document.data || {};
  if (data.project_id && data.project_id !== projectIdentity.project_id) {
    addBoundaryError(
      `${kind} ${label} project_id ${data.project_id} does not match config project_id ${projectIdentity.project_id}`,
      kind === "graph node" ? "GRAPH_NODE_PROJECT_MISMATCH" : "PROJECT_ID_MISMATCH",
      "Cross-project mismatches are not repaired automatically; inspect the artifact before moving or deleting it."
    );
    return;
  }
  const needsProjectId = !data.project_id;
  const needsProjectName = !data.project_name;
  if (!needsProjectId && !needsProjectName) {
    return;
  }
  if (repairProjectId && document.filePath) {
    const repaired = {
      ...data,
      ...(needsProjectId ? { project_id: projectIdentity.project_id } : {}),
      ...(needsProjectName ? { project_name: projectIdentity.project_name } : {})
    };
    const source = stringifyFrontmatter(repaired, document.body || "");
    fs.writeFileSync(document.filePath, source);
    document.data = repaired;
    document.source = source;
    addBoundaryRepair(
      `added missing project identity fields to ${kind} ${label}`,
      "LEGACY_PROJECT_ID_REPAIRED",
      "Re-run `orange doctor --json` to confirm the legacy artifact now has project identity."
    );
    return;
  }
  if (needsProjectId) {
    addBoundaryWarning(
      `${kind} ${label} missing project_id (legacy file)`,
      "LEGACY_PROJECT_ID_MISSING",
      "Run `orange doctor --repair-project-id` to fill missing legacy project_id fields."
    );
  }
  if (needsProjectName) {
    addBoundaryWarning(
      `${kind} ${label} missing project_name (legacy file)`,
      "LEGACY_PROJECT_NAME_MISSING",
      "Run `orange doctor --repair-project-id` to fill missing legacy project_name fields."
    );
  }
}

function checkLinkedProjectIdentity(context, addBoundaryError) {
  const {
    leftKind,
    leftLabel,
    leftData,
    rightKind,
    rightLabel,
    rightData
  } = context;
  const leftProjectId = leftData?.project_id;
  const rightProjectId = rightData?.project_id;
  if (!leftProjectId || !rightProjectId || leftProjectId === rightProjectId) {
    return;
  }
  addBoundaryError(
    `${leftKind} ${leftLabel} project_id ${leftProjectId} does not match ${rightKind} ${rightLabel} project_id ${rightProjectId}`,
    leftKind.includes("graph node") ? "GRAPH_NODE_PROJECT_MISMATCH" : "PROJECT_ID_MISMATCH",
    "Cross-project provenance mismatches are not repaired automatically; inspect the linked artifacts manually."
  );
}

function checkCapsuleProjectBoundary(context) {
  const {
    paths,
    projectIdentity,
    repairProjectId,
    addBoundaryError,
    addBoundaryWarning,
    addBoundaryRepair
  } = context;
  if (!projectIdentity.project_id) {
    return;
  }
  const content = fs.readFileSync(paths.currentCapsule, "utf8");
  const projectId = extractMarkdownField(content, "Project id");
  const projectName = extractMarkdownField(content, "Project name");
  if (projectId && projectId !== projectIdentity.project_id) {
    addBoundaryError(
      `capsules/current.md project_id ${projectId} does not match config project_id ${projectIdentity.project_id}`,
      "PROJECT_ID_MISMATCH",
      "Cross-project capsule boundaries are not repaired automatically; rebuild the capsule from a current-project Quest."
    );
    return;
  }
  const needsProjectId = !projectId;
  const needsProjectName = !projectName;
  if (!needsProjectId && !needsProjectName) {
    return;
  }
  if (repairProjectId) {
    fs.writeFileSync(paths.currentCapsule, prependCapsuleBoundary(content, projectIdentity));
    addBoundaryRepair(
      "added missing project boundary header to capsules/current.md",
      "LEGACY_PROJECT_ID_REPAIRED",
      "Re-run `orange doctor --json` to confirm the capsule project boundary."
    );
    return;
  }
  if (needsProjectId) {
    addBoundaryWarning(
      "capsules/current.md missing project_id (legacy file)",
      "LEGACY_PROJECT_ID_MISSING",
      "Run `orange doctor --repair-project-id` to add the missing capsule project boundary."
    );
  }
  if (needsProjectName) {
    addBoundaryWarning(
      "capsules/current.md missing project_name (legacy file)",
      "LEGACY_PROJECT_NAME_MISSING",
      "Run `orange doctor --repair-project-id` to add the missing capsule project name."
    );
  }
}

function checkIdentitySummaryProjectBoundary(context) {
  const {
    paths,
    projectIdentity,
    repairProjectId,
    addBoundaryError,
    addBoundaryWarning,
    addBoundaryRepair
  } = context;
  if (!projectIdentity.project_id) {
    return;
  }
  let summary;
  try {
    summary = JSON.parse(fs.readFileSync(paths.identitySummaryJson, "utf8"));
  } catch (error) {
    addBoundaryError(`identity/summary.json is not valid JSON: ${error.message}`);
    return;
  }
  if (summary.project_id && summary.project_id !== projectIdentity.project_id) {
    addBoundaryError(
      `identity summary project_id ${summary.project_id} does not match config project_id ${projectIdentity.project_id}`,
      "PROJECT_ID_MISMATCH",
      "Cross-project identity summaries are not repaired automatically; rebuild identity after confirming the project boundary."
    );
    return;
  }
  const needsProjectId = !summary.project_id;
  const needsProjectName = !summary.project_name;
  if (!needsProjectId && !needsProjectName) {
    return;
  }
  if (repairProjectId) {
    const repaired = {
      ...summary,
      ...(needsProjectId ? { project_id: projectIdentity.project_id, projectId: projectIdentity.project_id } : {}),
      ...(needsProjectName ? { project_name: projectIdentity.project_name, projectName: projectIdentity.project_name } : {})
    };
    fs.writeFileSync(paths.identitySummaryJson, `${JSON.stringify(repaired, null, 2)}\n`);
    addBoundaryRepair(
      "added missing project identity fields to identity/summary.json",
      "LEGACY_PROJECT_ID_REPAIRED",
      "Re-run `orange doctor --json` to confirm identity summary project identity."
    );
    return;
  }
  if (needsProjectId) {
    addBoundaryWarning(
      "identity summary missing project_id (legacy file)",
      "LEGACY_PROJECT_ID_MISSING",
      "Run `orange doctor --repair-project-id` to fill missing legacy identity summary fields."
    );
  }
  if (needsProjectName) {
    addBoundaryWarning(
      "identity summary missing project_name (legacy file)",
      "LEGACY_PROJECT_NAME_MISSING",
      "Run `orange doctor --repair-project-id` to fill missing legacy identity summary fields."
    );
  }
}

function emptyDiagnostics() {
  return {
    errors: [],
    warnings: [],
    repairs: []
  };
}

function mergeDiagnostics(target, source) {
  if (!source) {
    return;
  }
  for (const key of ["errors", "warnings", "repairs"]) {
    for (const item of source[key] || []) {
      if (!target[key].some((existing) => existing.code === item.code && existing.message === item.message)) {
        target[key].push(item);
      }
    }
  }
}

function pushUnique(target, values) {
  for (const value of values || []) {
    if (!target.includes(value)) {
      target.push(value);
    }
  }
}

function extractMarkdownField(content, label) {
  const match = content.match(new RegExp(`^\\s*-?\\s*${escapeRegExp(label)}:[ \\t]*([^\\r\\n]*?)\\s*$`, "im"));
  return match ? match[1].trim() : "";
}

function prependCapsuleBoundary(content, projectIdentity) {
  const boundary = [
    "## Project Boundary",
    "",
    `- Project name: ${projectIdentity.project_name}`,
    `- Project id: ${projectIdentity.project_id}`,
    "- Only Quest, Proposal, and Accepted Node artifacts with this project_id are project memory.",
    "- Unrelated pasted reports, external project docs, and other repo documents are not project memory without an explicit orange import command.",
    ""
  ].join("\n");
  if (content.startsWith("# Orange Hyper Current Capsule\n")) {
    return content.replace("# Orange Hyper Current Capsule\n", `# Orange Hyper Current Capsule\n\n${boundary}\n`);
  }
  return `${boundary}\n${content}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
