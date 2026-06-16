import fs from "node:fs";
import path from "node:path";
import { CONFIG_VERSION, ORANGE_GITIGNORE, normalizeConfigProjectIdentity, projectIdentityFromConfig } from "./config.js";
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

export function runDoctor(cwd = process.cwd(), options = {}) {
  const paths = workspacePaths(cwd);
  const errors = [];
  const warnings = [];
  const checks = [];
  const repairs = [];
  const boundaryErrors = [];
  const boundaryWarnings = [];
  const boundaryRepairs = [];
  const repairProjectId = Boolean(options.repairProjectId);
  let projectIdentity = { project_id: "", project_name: path.basename(cwd) };
  const questsById = new Map();
  const checkedNodePaths = new Set();

  const addBoundaryError = (message) => {
    errors.push(message);
    boundaryErrors.push(message);
  };
  const addBoundaryWarning = (message) => {
    warnings.push(message);
    boundaryWarnings.push(message);
  };
  const addBoundaryRepair = (message) => {
    repairs.push(message);
    boundaryRepairs.push(message);
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
  checkExists(paths.routeTrace, "file", "traces/route.jsonl", errors, checks);

  if (fs.existsSync(paths.config)) {
    try {
      let config = JSON.parse(fs.readFileSync(paths.config, "utf8"));
      if (repairProjectId) {
        const normalized = normalizeConfigProjectIdentity(config, cwd);
        if (JSON.stringify(config) !== JSON.stringify(normalized)) {
          fs.writeFileSync(paths.config, `${JSON.stringify(normalized, null, 2)}\n`);
          config = normalized;
          addBoundaryRepair("added missing project identity fields to config.json");
        }
      }
      projectIdentity = projectIdentityFromConfig(config, cwd);
      if (config.version !== CONFIG_VERSION) {
        warnings.push(`config version is ${config.version}; expected ${CONFIG_VERSION}`);
      }
      if (!config.project_id) {
        addBoundaryError("config.project_id is missing");
      }
      if (!config.project_name) {
        addBoundaryWarning("config.project_name is missing");
      }
      if (config.features?.hooks || config.features?.mcp || config.features?.subagents || config.features?.auto_execution_loop) {
        errors.push("v0.1 feature flags must keep hooks, MCP, subagents, and auto execution loop disabled");
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
            errors.push(`accepted memory proposal ${proposal.data.id} has no graph node provenance`);
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
  warnings.push(...graphReadModel.warnings);
  checks.push(...graphReadModel.checks);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    checks,
    repairs,
    project_boundary: {
      project_id: projectIdentity.project_id || null,
      project_name: projectIdentity.project_name || null,
      errors: boundaryErrors,
      warnings: boundaryWarnings,
      repairs: boundaryRepairs
    }
  };
}

function checkExists(target, kind, label, errors, checks) {
  if (!fs.existsSync(target)) {
    errors.push(`missing ${label}`);
    return;
  }
  const stat = fs.statSync(target);
  const isKind = kind === "directory" ? stat.isDirectory() : stat.isFile();
  if (!isKind) {
    errors.push(`${label} is not a ${kind}`);
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
    addBoundaryError(`${kind} ${label} project_id ${data.project_id} does not match config project_id ${projectIdentity.project_id}`);
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
    addBoundaryRepair(`added missing project identity fields to ${kind} ${label}`);
    return;
  }
  if (needsProjectId) {
    addBoundaryWarning(`${kind} ${label} missing project_id (legacy file)`);
  }
  if (needsProjectName) {
    addBoundaryWarning(`${kind} ${label} missing project_name (legacy file)`);
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
  addBoundaryError(`${leftKind} ${leftLabel} project_id ${leftProjectId} does not match ${rightKind} ${rightLabel} project_id ${rightProjectId}`);
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
    addBoundaryError(`capsules/current.md project_id ${projectId} does not match config project_id ${projectIdentity.project_id}`);
    return;
  }
  const needsProjectId = !projectId;
  const needsProjectName = !projectName;
  if (!needsProjectId && !needsProjectName) {
    return;
  }
  if (repairProjectId) {
    fs.writeFileSync(paths.currentCapsule, prependCapsuleBoundary(content, projectIdentity));
    addBoundaryRepair("added missing project boundary header to capsules/current.md");
    return;
  }
  if (needsProjectId) {
    addBoundaryWarning("capsules/current.md missing project_id (legacy file)");
  }
  if (needsProjectName) {
    addBoundaryWarning("capsules/current.md missing project_name (legacy file)");
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
    addBoundaryError(`identity summary project_id ${summary.project_id} does not match config project_id ${projectIdentity.project_id}`);
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
    addBoundaryRepair("added missing project identity fields to identity/summary.json");
    return;
  }
  if (needsProjectId) {
    addBoundaryWarning("identity summary missing project_id (legacy file)");
  }
  if (needsProjectName) {
    addBoundaryWarning("identity summary missing project_name (legacy file)");
  }
}

function extractMarkdownField(content, label) {
  const match = content.match(new RegExp(`^\\s*-?\\s*${escapeRegExp(label)}:\\s*(.+?)\\s*$`, "im"));
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
