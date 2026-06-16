import fs from "node:fs";
import path from "node:path";
import { CONFIG_VERSION, ORANGE_GITIGNORE } from "./config.js";
import {
  findGraphNodesForProposal,
  hashMemoryDeltaProposalSource,
  memoryDeltaProposalFiles,
  readMemoryDeltaProposalFile,
  validateGraphJson,
  validateMemoryDeltaProposalDetailed
} from "./memory.js";
import { workspacePaths } from "./paths.js";
import { questFiles, readQuestFile, validateQuestDocument } from "./quest.js";

export function runDoctor(cwd = process.cwd()) {
  const paths = workspacePaths(cwd);
  const errors = [];
  const warnings = [];
  const checks = [];

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
      const config = JSON.parse(fs.readFileSync(paths.config, "utf8"));
      if (config.version !== CONFIG_VERSION) {
        warnings.push(`config version is ${config.version}; expected ${CONFIG_VERSION}`);
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

  if (fs.existsSync(paths.memoryDeltaProposals)) {
    for (const filePath of memoryDeltaProposalFiles(cwd, "all")) {
      let proposal;
      try {
        proposal = readMemoryDeltaProposalFile(filePath);
      } catch (error) {
        errors.push(`${path.relative(cwd, filePath)} failed to parse: ${error.message}`);
        continue;
      }
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

  const graphJson = validateGraphJson(cwd);
  errors.push(...graphJson.errors);
  checks.push(...graphJson.checks);

  return { ok: errors.length === 0, errors, warnings, checks };
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
