import fs from "node:fs";
import path from "node:path";
import { generateCapsule } from "../core/capsule.js";
import { initWorkspace, requireInitialized } from "../core/config.js";
import { runDoctor } from "../core/doctor.js";
import { listGraphNodes, rebuildGraphIndex, searchGraphNodes, showGraphNode } from "../core/graph.js";
import { buildIdentityPlaceholder } from "../core/identity.js";
import {
  acceptMemoryDelta,
  findMemoryDeltaProposal,
  listMemoryDeltaProposals,
  proposeMemoryDelta,
  rejectMemoryDelta,
  reviseMemoryDeltaProposal,
  validateMemoryDeltaProposalBySelector
} from "../core/memory.js";
import { buildRouteContract, appendRouteTrace, formatRouteLine } from "../core/route.js";
import { completeQuest, createQuest, findQuest, listQuests } from "../core/quest.js";
import { asArray } from "../core/text.js";

export const EXIT_CODES = {
  success: 0,
  userInput: 1,
  validation: 2,
  filesystem: 3,
  internal: 4
};

export const JSON_CONTRACT_VERSION = "0.1";

const COMMAND_IDS = {
  capsule: "capsule.build",
  doctor: "doctor.run",
  graph: {
    list: "graph.list",
    show: "graph.show",
    search: "graph.search",
    "rebuild-index": "graph.rebuildIndex"
  },
  identity: {
    build: "identity.build"
  },
  quest: {
    done: "quest.done",
    new: "quest.new"
  },
  remember: {
    accept: "remember.accept",
    list: "remember.list",
    propose: "remember.propose",
    reject: "remember.reject",
    revise: "remember.revise",
    validate: "remember.validate",
    show: "remember.show"
  },
  route: "route.show"
};

export async function main(argv = process.argv.slice(2), env = {}) {
  const cwd = env.cwd || process.cwd();
  const io = env.io || {
    stdout: process.stdout,
    stderr: process.stderr
  };
  const [command, ...rest] = argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    write(io, usage());
    return;
  }

  if (command === "init") {
    const args = parseArgs(rest);
    const paths = initWorkspace(cwd, {
      force: Boolean(args.flags.force),
      projectName: args.flags.project
    });
    write(io, `Initialized ${path.relative(cwd, paths.root)}`);
    return;
  }

  if (command === "route") {
    await routeCommand(cwd, io, rest);
    return;
  }

  if (command === "capsule") {
    const args = parseArgs(rest);
    const selector = args.flags.quest || args.positionals[0];
    const capsule = generateCapsule(cwd, selector);
    if (args.flags.json) {
      writeJson(io, jsonOk(COMMAND_IDS.capsule, formatCapsuleJson(cwd, capsule)));
      return;
    }
    write(io, `Wrote ${path.relative(cwd, capsule.filePath)}`);
    return;
  }

  if (command === "doctor") {
    const args = parseArgs(rest);
    const result = runDoctor(cwd, {
      repairProjectId: Boolean(args.flags["repair-project-id"])
    });
    if (args.flags.json) {
      if (result.ok) {
        writeJson(io, jsonOk(COMMAND_IDS.doctor, result));
      } else {
        writeJson(io, jsonError(COMMAND_IDS.doctor, {
          code: "DOCTOR_FAILED",
          message: `Orange doctor found ${result.errors.length} problem(s).`,
          hint: "Run `orange doctor` without --json for human-readable diagnostics.",
          data: result
        }));
        process.exitCode = EXIT_CODES.validation;
      }
      return;
    }
    write(io, formatDoctor(result));
    if (!result.ok) {
      process.exitCode = EXIT_CODES.validation;
    }
    return;
  }

  if (command === "identity") {
    await identityCommand(cwd, io, rest);
    return;
  }

  if (command === "graph") {
    await graphCommand(cwd, io, rest);
    return;
  }

  if (command === "remember") {
    await rememberCommand(cwd, io, rest);
    return;
  }

  if (command === "quest") {
    await questCommand(cwd, io, rest);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

async function questCommand(cwd, io, argv) {
  const [subcommand, ...rest] = argv;
  if (!subcommand || subcommand === "help") {
    write(io, questUsage());
    return;
  }
  if (subcommand === "new") {
    const args = parseArgs(rest);
    const rawRequest = args.positionals.join(" ").trim();
    const quest = createQuest(cwd, rawRequest, {
      title: args.flags.title,
      layer: args.flags.layer,
      outputContract: args.flags.contract,
      paths: asArray(args.flags.path),
      constraints: asArray(args.flags.constraint),
      unknowns: asArray(args.flags.unknown),
      expectedVerification: asArray(args.flags.verify)
    });
    if (args.flags.json) {
      writeJson(io, jsonOk(COMMAND_IDS.quest.new, formatQuestNewJson(cwd, quest)));
      return;
    }
    write(io, `Created quest: ${quest.id}`);
    write(io, `File: ${path.relative(cwd, quest.filePath)}`);
    write(io, "Next:");
    write(io, `  orange route --quest ${quest.id}`);
    write(io, `  orange capsule --quest ${quest.id}`);
    write(io, formatRouteLine(quest.contract));
    write(io, `Quest policy: ${quest.contract.quest_policy}`);
    if (quest.contract.quest_policy === "not_recommended") {
      write(io, "Warning: This looks like a lightweight task. A Quest was created because you explicitly requested quest new, but Orange Hyper would not require one for this layer.");
    }
    return;
  }
  if (subcommand === "list") {
    requireInitialized(cwd);
    const args = parseArgs(rest);
    const status = args.flags.all ? "all" : args.flags.completed ? "completed" : "active";
    const quests = listQuests(cwd, status);
    write(io, formatQuestList(quests));
    return;
  }
  if (subcommand === "show") {
    requireInitialized(cwd);
    const args = parseArgs(rest);
    const selector = args.positionals[0];
    if (!selector) {
      throw new Error("Quest selector is required.");
    }
    const quest = findQuest(cwd, selector);
    write(io, quest.source.trimEnd());
    return;
  }
  if (subcommand === "done") {
    const args = parseArgs(rest);
    const selector = args.positionals[0];
    if (!selector) {
      throw new Error("Quest selector is required.");
    }
    const evidenceValues = asArray(args.flags.evidence);
    const evidenceFiles = asArray(args.flags["evidence-file"]);
    if (args.flags.unverified && (evidenceValues.length || evidenceFiles.length)) {
      throw new Error("Completion cannot combine verification evidence with --unverified.");
    }
    const evidence = [
      ...evidenceValues,
      ...readEvidenceFiles(cwd, evidenceFiles)
    ];
    const completed = completeQuest(cwd, selector, {
      evidence,
      unverifiedReason: args.flags.unverified
    });
    if (args.flags.json) {
      writeJson(io, jsonOk(COMMAND_IDS.quest.done, formatQuestDoneJson(cwd, completed)));
      return;
    }
    write(io, `Completed ${completed.data.id}`);
    write(io, `Moved to ${path.relative(cwd, completed.filePath)}`);
    write(io, `Verification status: ${completed.data.verification_status}`);
    return;
  }
  throw new Error(`Unknown quest command: ${subcommand}`);
}

async function identityCommand(cwd, io, argv) {
  const [subcommand, ...rest] = argv;
  if (!subcommand || subcommand === "help") {
    write(io, identityUsage());
    return;
  }
  if (subcommand !== "build") {
    throw new Error(`Unknown identity command: ${subcommand}`);
  }
  const args = parseArgs(rest);
  const identity = buildIdentityPlaceholder(cwd);
  if (args.flags.json) {
    writeJson(io, jsonOk(COMMAND_IDS.identity.build, formatIdentityJson(cwd, identity, args)));
    return;
  }
  write(io, `Wrote ${path.relative(cwd, identity.filePath)}`);
  if (args.flags.open) {
    write(io, "Warning: identity build --open is not implemented in v0.1; HTML was generated without opening it.");
  }
}

async function graphCommand(cwd, io, argv) {
  const [subcommand, ...rest] = argv;
  if (!subcommand || subcommand === "help") {
    write(io, graphUsage());
    return;
  }
  if (subcommand === "list") {
    const args = parseArgs(rest);
    const result = listGraphNodes(cwd);
    const data = formatGraphListJson(result);
    if (args.flags.json) {
      writeJson(io, jsonOk(COMMAND_IDS.graph.list, data));
      return;
    }
    write(io, formatGraphNodeList(result.nodes));
    writeGraphWarnings(io, result.warnings);
    return;
  }
  if (subcommand === "show") {
    const args = parseArgs(rest);
    const selector = args.positionals[0];
    const result = showGraphNode(cwd, selector);
    const data = {
      project: formatGraphProject(result.project),
      node: formatGraphNodeForJson(result.node, { includeContent: true }),
      warnings: result.warnings
    };
    if (args.flags.json) {
      writeJson(io, jsonOk(COMMAND_IDS.graph.show, data));
      return;
    }
    write(io, result.node.content.trimEnd());
    writeGraphWarnings(io, result.warnings);
    return;
  }
  if (subcommand === "search") {
    const args = parseArgs(rest);
    const query = args.positionals.join(" ").trim();
    const result = searchGraphNodes(cwd, query);
    const data = {
      project: formatGraphProject(result.project),
      query: result.query,
      count: result.nodes.length,
      nodes: result.nodes.map((node) => formatGraphNodeForJson(node, { includeMatches: true })),
      warnings: result.warnings
    };
    if (args.flags.json) {
      writeJson(io, jsonOk(COMMAND_IDS.graph.search, data));
      return;
    }
    write(io, formatGraphSearchResult(result));
    writeGraphWarnings(io, result.warnings);
    return;
  }
  if (subcommand === "rebuild-index") {
    const args = parseArgs(rest);
    const result = rebuildGraphIndex(cwd);
    const data = {
      project: formatGraphProject(result.project),
      file: path.relative(cwd, result.filePath),
      count: result.index.nodes.length,
      index: result.index,
      warnings: result.warnings
    };
    if (args.flags.json) {
      writeJson(io, jsonOk(COMMAND_IDS.graph["rebuild-index"], data));
      return;
    }
    write(io, `Rebuilt ${path.relative(cwd, result.filePath)} with ${result.index.nodes.length} node${result.index.nodes.length === 1 ? "" : "s"}.`);
    writeGraphWarnings(io, result.warnings);
    return;
  }
  throw new Error(`Unknown graph command: ${subcommand}`);
}

async function rememberCommand(cwd, io, argv) {
  const [subcommand, ...rest] = argv;
  if (!subcommand || subcommand === "help") {
    write(io, rememberUsage());
    return;
  }
  if (subcommand === "propose") {
    const args = parseArgs(rest);
    if (Object.hasOwn(args.flags, "from-file")) {
      throw new Error("External source memory import is a future feature; v0.2 only supports `orange remember propose --quest <quest-id>`.");
    }
    const questSelector = args.flags.quest;
    const proposal = proposeMemoryDelta(cwd, questSelector);
    if (args.flags.json) {
      writeJson(io, jsonOk(COMMAND_IDS.remember.propose, {
        duplicated: proposal.duplicated,
        warnings: proposal.warnings || [],
        proposal: formatMemoryProposalJson(cwd, proposal, { includeBody: false })
      }));
      return;
    }
    write(io, proposal.duplicated ? `Existing pending memory proposal: ${proposal.data.id}` : `Created memory proposal: ${proposal.data.id}`);
    write(io, `File: ${path.relative(cwd, proposal.filePath)}`);
    for (const warning of proposal.warnings || []) {
      write(io, `Warning: ${warning}`);
    }
    write(io, "Next:");
    write(io, `  orange remember show ${proposal.data.id}`);
    write(io, `  orange remember accept ${proposal.data.id}`);
    write(io, `  orange remember reject ${proposal.data.id}`);
    return;
  }
  if (subcommand === "list") {
    requireInitialized(cwd);
    const args = parseArgs(rest);
    const filters = {
      status: args.flags.status || "all",
      nodeType: args.flags.type || null,
      sourceQuest: args.flags.quest || null
    };
    const proposals = listMemoryDeltaProposals(cwd, filters);
    if (args.flags.json) {
      writeJson(io, jsonOk(COMMAND_IDS.remember.list, {
        filters: formatMemoryProposalListFilters(filters),
        proposals: proposals.map((proposal) => formatMemoryProposalJson(cwd, proposal, { includeBody: false }))
      }));
      return;
    }
    write(io, formatMemoryProposalList(proposals));
    return;
  }
  if (subcommand === "show") {
    requireInitialized(cwd);
    const args = parseArgs(rest);
    const selector = args.positionals[0];
    const proposal = findMemoryDeltaProposal(cwd, selector);
    if (args.flags.json) {
      writeJson(io, jsonOk(COMMAND_IDS.remember.show, {
        proposal: formatMemoryProposalJson(cwd, proposal, { includeBody: true })
      }));
      return;
    }
    write(io, proposal.source.trimEnd());
    return;
  }
  if (subcommand === "validate") {
    requireInitialized(cwd);
    const args = parseArgs(rest);
    const selector = args.positionals[0];
    const result = validateMemoryDeltaProposalBySelector(cwd, selector);
    const data = formatMemoryProposalValidationJson(cwd, result);
    if (args.flags.json) {
      if (data.validation.valid) {
        writeJson(io, jsonOk(COMMAND_IDS.remember.validate, data));
      } else {
        writeJson(io, jsonError(COMMAND_IDS.remember.validate, {
          code: "MEMORY_PROPOSAL_INVALID",
          message: `Memory proposal ${result.proposal.data.id} failed validation.`,
          hint: "Run `orange remember validate <proposal-id>` without --json for human-readable diagnostics.",
          data
        }));
        process.exitCode = EXIT_CODES.validation;
      }
      return;
    }
    write(io, formatMemoryProposalValidation(result.proposal, data.validation));
    if (!data.validation.valid) {
      process.exitCode = EXIT_CODES.validation;
    }
    return;
  }
  if (subcommand === "revise") {
    requireInitialized(cwd);
    const args = parseArgs(rest);
    const selector = args.positionals[0];
    const revised = reviseMemoryDeltaProposal(cwd, selector, {
      ...(Object.hasOwn(args.flags, "candidate") ? { candidate: args.flags.candidate } : {}),
      ...(Object.hasOwn(args.flags, "why") ? { why: args.flags.why } : {}),
      ...(Object.hasOwn(args.flags, "confidence") ? { confidence: args.flags.confidence } : {})
    });
    if (args.flags.json) {
      writeJson(io, jsonOk(COMMAND_IDS.remember.revise, formatMemoryProposalRevisionJson(cwd, revised)));
      return;
    }
    write(io, `Revised memory proposal: ${revised.proposal.data.id}`);
    write(io, `Proposal: ${path.relative(cwd, revised.proposal.filePath)}`);
    write(io, formatValidationSummary(revised.validation));
    for (const warning of revised.validation.warnings) {
      write(io, `Warning: ${warning}`);
    }
    write(io, "Next:");
    write(io, `  orange remember validate ${revised.proposal.data.id}`);
    write(io, `  orange remember accept ${revised.proposal.data.id}`);
    return;
  }
  if (subcommand === "accept") {
    requireInitialized(cwd);
    const args = parseArgs(rest);
    const selector = args.positionals[0];
    const accepted = acceptMemoryDelta(cwd, selector);
    if (args.flags.json) {
      writeJson(io, jsonOk(COMMAND_IDS.remember.accept, {
        proposal: formatMemoryProposalJson(cwd, accepted.proposal, { includeBody: false }),
        node: formatMemoryNodeJson(cwd, accepted.node)
      }));
      return;
    }
    write(io, `Accepted memory proposal: ${accepted.proposal.data.id}`);
    write(io, `Proposal: ${path.relative(cwd, accepted.proposal.filePath)}`);
    write(io, `Node: ${path.relative(cwd, accepted.node.filePath)}`);
    return;
  }
  if (subcommand === "reject") {
    requireInitialized(cwd);
    const args = parseArgs(rest);
    const selector = args.positionals[0];
    const rejected = rejectMemoryDelta(cwd, selector);
    if (args.flags.json) {
      writeJson(io, jsonOk(COMMAND_IDS.remember.reject, {
        proposal: formatMemoryProposalJson(cwd, rejected, { includeBody: false })
      }));
      return;
    }
    write(io, `Rejected memory proposal: ${rejected.data.id}`);
    write(io, `Proposal: ${path.relative(cwd, rejected.filePath)}`);
    return;
  }
  throw new Error(`Unknown remember command: ${subcommand}`);
}

async function routeCommand(cwd, io, argv) {
  requireInitialized(cwd);
  const args = parseArgs(argv);
  let rawRequest = args.positionals.join(" ").trim();
  let questId = null;
  let questLayer = null;
  let questOutputContract = null;
  if (args.flags.quest) {
    const quest = findQuest(cwd, args.flags.quest);
    questId = quest.data.id;
    questLayer = quest.data.layer;
    questOutputContract = quest.data.output_contract;
    rawRequest = rawRequest || extractRequest(quest.body) || quest.data.title;
  }
  if (!rawRequest) {
    throw new Error("Route request is required, or pass --quest <id>.");
  }
  const contract = buildRouteContract(rawRequest, {
    layer: args.flags.layer || questLayer,
    outputContract: args.flags.contract || questOutputContract
  });
  const trace = appendRouteTrace(cwd, rawRequest, contract, { questId });
  if (args.flags.json) {
    writeJson(io, jsonOk(COMMAND_IDS.route, { trace, contract }));
    return;
  }
  write(io, formatRouteLine(contract));
  write(io, `Output contract: ${contract.output_contract}`);
  write(io, `Quest policy: ${contract.quest_policy}`);
  write(io, `Trace: ${trace.trace_id}`);
}

function parseArgs(argv) {
  const flags = {};
  const positionals = [];
  const booleanFlags = new Set(["all", "completed", "force", "json", "open", "repair-project-id"]);
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      positionals.push(value);
      continue;
    }
    const withoutPrefix = value.slice(2);
    const eq = withoutPrefix.indexOf("=");
    const key = eq === -1 ? withoutPrefix : withoutPrefix.slice(0, eq);
    let flagValue = eq === -1 ? true : withoutPrefix.slice(eq + 1);
    if (eq === -1 && !booleanFlags.has(key) && argv[index + 1] && !argv[index + 1].startsWith("--")) {
      flagValue = argv[index + 1];
      index += 1;
    }
    if (flags[key] === undefined) {
      flags[key] = flagValue;
    } else if (Array.isArray(flags[key])) {
      flags[key].push(flagValue);
    } else {
      flags[key] = [flags[key], flagValue];
    }
  }
  return { flags, positionals };
}

function formatQuestList(quests) {
  if (!quests.length) {
    return "No quests found.";
  }
  const rows = quests.map((quest) => ({
    status: quest.data.status,
    id: quest.data.id,
    layer: quest.data.layer,
    verification: quest.data.verification_status,
    title: quest.data.title
  }));
  const widths = {
    status: Math.max(6, ...rows.map((row) => row.status.length)),
    id: Math.max(2, ...rows.map((row) => row.id.length)),
    layer: 5,
    verification: Math.max(12, ...rows.map((row) => String(row.verification).length))
  };
  const header = `${"STATUS".padEnd(widths.status)}  ${"ID".padEnd(widths.id)}  ${"LAYER".padEnd(widths.layer)}  ${"VERIFICATION".padEnd(widths.verification)}  TITLE`;
  const lines = rows.map((row) =>
    `${row.status.padEnd(widths.status)}  ${row.id.padEnd(widths.id)}  ${row.layer.padEnd(widths.layer)}  ${String(row.verification).padEnd(widths.verification)}  ${row.title}`
  );
  return [header, ...lines].join("\n");
}

function formatMemoryProposalList(proposals) {
  if (!proposals.length) {
    return "No memory proposals found.";
  }
  const rows = proposals.map((proposal) => ({
    status: proposal.data.status,
    id: proposal.data.id,
    type: proposal.data.node_type,
    confidence: proposal.data.confidence,
    source: proposal.data.source_quest,
    title: proposal.data.title || proposal.data.id
  }));
  const widths = {
    status: Math.max(6, ...rows.map((row) => row.status.length)),
    id: Math.max(2, ...rows.map((row) => row.id.length)),
    type: Math.max(4, ...rows.map((row) => row.type.length)),
    confidence: Math.max(10, ...rows.map((row) => row.confidence.length)),
    source: Math.max(6, ...rows.map((row) => row.source.length))
  };
  const header = `${"STATUS".padEnd(widths.status)}  ${"ID".padEnd(widths.id)}  ${"TYPE".padEnd(widths.type)}  ${"CONFIDENCE".padEnd(widths.confidence)}  ${"SOURCE".padEnd(widths.source)}  TITLE`;
  const lines = rows.map((row) =>
    `${row.status.padEnd(widths.status)}  ${row.id.padEnd(widths.id)}  ${row.type.padEnd(widths.type)}  ${row.confidence.padEnd(widths.confidence)}  ${row.source.padEnd(widths.source)}  ${row.title}`
  );
  return [header, ...lines].join("\n");
}

function formatGraphNodeList(nodes) {
  if (!nodes.length) {
    return "No accepted memory graph nodes found for this project.";
  }
  const rows = nodes.map((node) => ({
    id: node.id,
    type: node.node_type,
    source: node.source_quest,
    accepted: node.accepted_at,
    title: node.title
  }));
  const widths = {
    id: Math.max(2, ...rows.map((row) => row.id.length)),
    type: Math.max(4, ...rows.map((row) => row.type.length)),
    source: Math.max(6, ...rows.map((row) => row.source.length)),
    accepted: Math.max(11, ...rows.map((row) => row.accepted.length))
  };
  const header = `${"ID".padEnd(widths.id)}  ${"TYPE".padEnd(widths.type)}  ${"SOURCE".padEnd(widths.source)}  ${"ACCEPTED_AT".padEnd(widths.accepted)}  TITLE`;
  const lines = rows.map((row) =>
    `${row.id.padEnd(widths.id)}  ${row.type.padEnd(widths.type)}  ${row.source.padEnd(widths.source)}  ${row.accepted.padEnd(widths.accepted)}  ${row.title}`
  );
  return [header, ...lines].join("\n");
}

function formatGraphSearchResult(result) {
  if (!result.nodes.length) {
    return `No graph nodes matched: ${result.query}`;
  }
  const rows = result.nodes.map((node) => ({
    id: node.id,
    type: node.node_type,
    matches: node.matches.join(","),
    title: node.title
  }));
  const widths = {
    id: Math.max(2, ...rows.map((row) => row.id.length)),
    type: Math.max(4, ...rows.map((row) => row.type.length)),
    matches: Math.max(7, ...rows.map((row) => row.matches.length))
  };
  const header = `${"ID".padEnd(widths.id)}  ${"TYPE".padEnd(widths.type)}  ${"MATCHES".padEnd(widths.matches)}  TITLE`;
  const lines = rows.map((row) =>
    `${row.id.padEnd(widths.id)}  ${row.type.padEnd(widths.type)}  ${row.matches.padEnd(widths.matches)}  ${row.title}`
  );
  return [header, ...lines].join("\n");
}

function writeGraphWarnings(io, warnings) {
  for (const warning of warnings || []) {
    write(io, `Warning: ${warning}`);
  }
}

function formatDoctor(result) {
  const lines = ["Orange doctor"];
  for (const check of result.checks) {
    lines.push(`OK ${check}`);
  }
  for (const warning of result.warnings) {
    lines.push(`WARN ${warning}`);
  }
  for (const repair of result.repairs || []) {
    lines.push(`REPAIR ${repair}`);
  }
  for (const error of result.errors) {
    lines.push(`ERROR ${error}`);
  }
  lines.push(result.ok ? "No problems found." : `${result.errors.length} problem(s) found.`);
  return lines.join("\n");
}

function formatMemoryProposalValidation(proposal, validation) {
  const lines = [
    validation.valid
      ? `Memory proposal ${proposal.data.id} is valid.`
      : `Memory proposal ${proposal.data.id} failed validation.`
  ];
  for (const warning of validation.warnings) {
    lines.push(`WARN ${warning}`);
  }
  for (const error of validation.errors) {
    lines.push(`ERROR ${error}`);
  }
  return lines.join("\n");
}

function formatValidationSummary(validation) {
  const warningCount = validation.warnings.length;
  if (validation.errors.length) {
    return `Validation: failed with ${validation.errors.length} error(s).`;
  }
  return warningCount
    ? `Validation: passed with ${warningCount} warning(s).`
    : "Validation: passed.";
}

function extractRequest(body) {
  const match = body.match(/^## Request\s*$/m);
  if (!match) {
    return "";
  }
  const rest = body.slice(match.index + match[0].length).replace(/^\s+/, "");
  const next = rest.search(/^## /m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function readEvidenceFiles(cwd, files) {
  return files.map((file) => {
    if (typeof file !== "string" || !file.trim()) {
      throw new Error("--evidence-file requires a UTF-8 text file path.");
    }
    const evidencePath = path.isAbsolute(file) ? file : path.join(cwd, file);
    try {
      return fs.readFileSync(evidencePath, "utf8").trim();
    } catch (error) {
      const reason = error?.code === "ENOENT" ? "file does not exist" : error.message;
      throw new Error(`Could not read evidence file ${file}: ${reason}`);
    }
  });
}

export function isJsonMode(argv = []) {
  return argv.includes("--json");
}

export function commandName(argv = []) {
  const [command, subcommand] = argv;
  if (!command || command.startsWith("--")) {
    return "unknown.command";
  }
  const commandId = COMMAND_IDS[command];
  if (!commandId) {
    return `${command}.unknown`;
  }
  if (typeof commandId === "string") {
    return commandId;
  }
  if (!subcommand || subcommand.startsWith("--")) {
    return `${command}.unknown`;
  }
  return commandId[subcommand] || `${command}.${subcommand}`;
}

export function jsonErrorFor(error, argv = []) {
  const normalized = normalizeError(error);
  return jsonError(commandName(argv), normalized);
}

export function exitCodeForError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (error?.exitCode && Number.isInteger(error.exitCode)) {
    return error.exitCode;
  }
  if (isFilesystemError(error, message)) {
    return EXIT_CODES.filesystem;
  }
  if (isValidationError(message)) {
    return EXIT_CODES.validation;
  }
  if (/internal|invariant/i.test(message)) {
    return EXIT_CODES.internal;
  }
  return EXIT_CODES.userInput;
}

function jsonOk(command, data) {
  return {
    ok: true,
    contract_version: JSON_CONTRACT_VERSION,
    command,
    data
  };
}

function jsonError(command, error) {
  const payload = {
    ok: false,
    contract_version: JSON_CONTRACT_VERSION,
    command,
    error: {
      code: error.code,
      message: error.message,
      hint: error.hint || defaultErrorHint(command)
    }
  };
  if (error.data !== undefined) {
    payload.data = error.data;
  }
  return payload;
}

function normalizeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    code: errorCodeFor(error, message),
    message,
    hint: defaultErrorHint()
  };
}

function errorCodeFor(error, message) {
  if (error?.orangeCode) {
    return error.orangeCode;
  }
  if (isFilesystemError(error, message)) {
    return "FILESYSTEM_ERROR";
  }
  if (isValidationError(message)) {
    return "VALIDATION_ERROR";
  }
  if (/internal|invariant/i.test(message)) {
    return "INTERNAL_INVARIANT_ERROR";
  }
  return "USER_INPUT_ERROR";
}

function isFilesystemError(error, message) {
  const filesystemCodes = new Set(["ENOENT", "EACCES", "EPERM", "ENOTDIR", "EISDIR"]);
  return filesystemCodes.has(error?.code) || /Could not read evidence file|file does not exist|not a directory|permission denied/i.test(message);
}

function isValidationError(message) {
  return /frontmatter|schema|invalid JSON|not valid JSON|unsupported layer|unsupported schema|route contract|doctor found/i.test(message);
}

function defaultErrorHint(command = "command") {
  return "Run `orange --help` for command usage, or rerun without --json for human-readable diagnostics.";
}

function write(io, value) {
  io.stdout.write(`${value}\n`);
}

function writeJson(io, value) {
  write(io, JSON.stringify(value, null, 2));
}

function formatQuestNewJson(cwd, quest) {
  const routeCommand = `orange route --quest ${quest.id}`;
  const capsuleCommand = `orange capsule --quest ${quest.id}`;
  const warning = quest.contract.quest_policy === "not_recommended"
    ? "This looks like a lightweight task. A Quest was created because you explicitly requested quest new, but Orange Hyper would not require one for this layer."
    : null;
  return {
    quest: {
      id: quest.id,
      file: path.relative(cwd, quest.filePath),
      project_id: quest.data.project_id || null,
      project_name: quest.data.project_name || "",
      status: quest.data.status,
      layer: quest.data.layer,
      quest_policy: quest.data.quest_policy,
      output_contract: quest.data.output_contract,
      verification_status: quest.data.verification_status
    },
    contract: quest.contract,
    next: {
      route: routeCommand,
      capsule: capsuleCommand
    },
    warning
  };
}

function formatQuestDoneJson(cwd, quest) {
  return {
    quest: formatQuestJson(cwd, quest)
  };
}

function formatCapsuleJson(cwd, capsule) {
  return {
    capsule: {
      file: path.relative(cwd, capsule.filePath),
      content: capsule.content
    },
    quest: formatQuestJson(cwd, capsule.quest)
  };
}

function formatIdentityJson(cwd, identity, args) {
  const data = {
    file: path.relative(cwd, identity.filePath),
    summary_file: path.relative(cwd, identity.summaryFilePath),
    summary: identity.summary
  };
  if (args.flags.open) {
    data.warning = "identity build --open is not implemented in v0.1; HTML was generated without opening it.";
  }
  return data;
}

function formatMemoryProposalJson(cwd, proposal, options = {}) {
  const data = {
    id: proposal.data.id,
    file: path.relative(cwd, proposal.filePath),
    project_id: proposal.data.project_id || null,
    project_name: proposal.data.project_name || "",
    status: proposal.data.status,
    source_quest: proposal.data.source_quest,
    node_type: proposal.data.node_type,
    confidence: proposal.data.confidence,
    created_at: proposal.data.created_at,
    updated_at: proposal.data.updated_at,
    title: proposal.data.title || "",
    duplicated: Boolean(proposal.duplicated)
  };
  if (proposal.warnings?.length) {
    data.warnings = proposal.warnings;
  }
  if (options.includeBody) {
    data.body = proposal.body;
    data.content = proposal.source;
  }
  return data;
}

function formatMemoryProposalValidationJson(cwd, result) {
  return {
    proposal: formatMemoryProposalJson(cwd, result.proposal, { includeBody: false }),
    validation: {
      valid: result.validation.errors.length === 0,
      errors: result.validation.errors,
      warnings: result.validation.warnings
    }
  };
}

function formatMemoryProposalRevisionJson(cwd, result) {
  return {
    revised: true,
    revisions: result.revisions,
    proposal: formatMemoryProposalJson(cwd, result.proposal, { includeBody: false }),
    validation: {
      valid: result.validation.errors.length === 0,
      errors: result.validation.errors,
      warnings: result.validation.warnings
    }
  };
}

function formatMemoryProposalListFilters(filters) {
  return {
    status: filters.status || "all",
    type: filters.nodeType || null,
    quest: filters.sourceQuest || null
  };
}

function formatGraphListJson(result) {
  return {
    project: formatGraphProject(result.project),
    count: result.nodes.length,
    nodes: result.nodes.map((node) => formatGraphNodeForJson(node)),
    warnings: result.warnings
  };
}

function formatGraphProject(project) {
  return {
    project_id: project.project_id || null,
    project_name: project.project_name || ""
  };
}

function formatGraphNodeForJson(node, options = {}) {
  const data = {
    id: node.id,
    file: node.file,
    project_id: node.project_id || null,
    project_name: node.project_name || "",
    kind: node.kind,
    node_type: node.node_type,
    status: node.status,
    confidence: node.confidence,
    title: node.title,
    source_quest: node.source_quest,
    source_proposal: node.source_proposal,
    accepted_at: node.accepted_at,
    origin: node.origin,
    candidate_memory: node.candidate_memory,
    summary: node.summary,
    tags: node.tags,
    keywords: node.keywords
  };
  if (options.includeMatches) {
    data.matches = node.matches || [];
  }
  if (options.includeContent) {
    data.evidence = node.evidence;
    data.source_proposal_section = node.source_proposal_section;
    data.source_proposal_hash = node.source_proposal_hash;
    data.provenance = node.provenance;
    data.content = node.content;
  }
  return data;
}

function formatMemoryNodeJson(cwd, node) {
  return {
    id: node.data.id,
    file: path.relative(cwd, node.filePath),
    project_id: node.data.project_id || null,
    project_name: node.data.project_name || "",
    kind: node.data.kind,
    node_type: node.data.node_type,
    status: node.data.status,
    confidence: node.data.confidence,
    accepted_at: node.data.accepted_at,
    origin: node.data.origin,
    source_proposal: node.data.source_proposal,
    source_quest: node.data.source_quest,
    source_proposal_hash: node.data.source_proposal_hash,
    provenance: node.data.provenance || {}
  };
}

function formatQuestJson(cwd, quest) {
  return {
    id: quest.data.id,
    file: path.relative(cwd, quest.filePath),
    project_id: quest.data.project_id || null,
    project_name: quest.data.project_name || "",
    status: quest.data.status,
    title: quest.data.title,
    layer: quest.data.layer,
    quest_policy: quest.data.quest_policy,
    output_contract: quest.data.output_contract,
    verification_status: quest.data.verification_status,
    verification_evidence: asArray(quest.data.verification_evidence),
    unverified_reason: quest.data.unverified_reason || "",
    completed_at: quest.data.completed_at || null
  };
}

function usage() {
  return [
    "orange <command>",
    "",
    "Commands:",
    "  init [--project <name>] [--force]",
    "  quest new <request> [--title <title>] [--layer L2] [--verify <check>] [--json]",
    "  quest list [--completed|--all]",
    "  quest show <id-or-file>",
    "  quest done <id> (--evidence <text> | --evidence-file <path> | --unverified <reason>) [--json]",
    "  route <request> [--quest <id>] [--layer L2] [--json]",
    "  capsule [quest-id|--quest <id>] [--json]",
    "  remember propose --quest <quest-id> [--json]",
    "  remember list [--status pending|accepted|rejected] [--type decision|constraint|component|risk|verification] [--quest <quest-id>] [--json]",
    "  remember show <proposal-id> [--json]",
    "  remember validate <proposal-id> [--json]",
    "  remember revise <proposal-id> [--candidate <text>] [--why <text>] [--confidence low|medium|high] [--json]",
    "  remember accept <proposal-id> [--json]",
    "  remember reject <proposal-id> [--json]",
    "  graph list [--json]",
    "  graph show <node-id> [--json]",
    "  graph search <query> [--json]",
    "  graph rebuild-index [--json]",
    "  identity build [--json]",
    "  doctor [--json] [--repair-project-id]"
  ].join("\n");
}

function questUsage() {
  return [
    "orange quest <command>",
    "",
    "Commands:",
    "  new <request> [--json]",
    "  list [--completed|--all]",
    "  show <id-or-file>",
    "  done <id> (--evidence <text> | --evidence-file <path> | --unverified <reason>) [--json]"
  ].join("\n");
}

function identityUsage() {
  return [
    "orange identity <command>",
    "",
    "Commands:",
    "  build [--json]"
  ].join("\n");
}

function graphUsage() {
  return [
    "orange graph <command>",
    "",
    "Commands:",
    "  list [--json]",
    "  show <node-id> [--json]",
    "  search <query> [--json]",
    "  rebuild-index [--json]"
  ].join("\n");
}

function rememberUsage() {
  return [
    "orange remember <command>",
    "",
    "Commands:",
    "  propose --quest <quest-id> [--json]",
    "  list [--status pending|accepted|rejected] [--type decision|constraint|component|risk|verification] [--quest <quest-id>] [--json]",
    "  show <proposal-id> [--json]",
    "  validate <proposal-id> [--json]",
    "  revise <proposal-id> [--candidate <text>] [--why <text>] [--confidence low|medium|high] [--json]",
    "  accept <proposal-id> [--json]",
    "  reject <proposal-id> [--json]"
  ].join("\n");
}
