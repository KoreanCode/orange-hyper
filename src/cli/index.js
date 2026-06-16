import fs from "node:fs";
import path from "node:path";
import { generateCapsule } from "../core/capsule.js";
import { initWorkspace, requireInitialized } from "../core/config.js";
import { runDoctor } from "../core/doctor.js";
import { buildIdentityPlaceholder } from "../core/identity.js";
import { buildRouteContract, appendRouteTrace, formatRouteLine } from "../core/route.js";
import { completeQuest, createQuest, findQuest, listQuests } from "../core/quest.js";
import { asArray } from "../core/text.js";

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
    write(io, `Wrote ${path.relative(cwd, capsule.filePath)}`);
    return;
  }

  if (command === "doctor") {
    const result = runDoctor(cwd);
    write(io, formatDoctor(result));
    if (!result.ok) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "identity") {
    await identityCommand(cwd, io, rest);
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
    write(io, `Wrote ${path.relative(cwd, quest.filePath)}`);
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
    const evidence = [
      ...asArray(args.flags.evidence),
      ...readEvidenceFiles(cwd, asArray(args.flags["evidence-file"]))
    ];
    const completed = completeQuest(cwd, selector, {
      evidence,
      unverifiedReason: args.flags.unverified
    });
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
  write(io, `Wrote ${path.relative(cwd, identity.filePath)}`);
  if (args.flags.open) {
    write(io, "Warning: identity build --open is not implemented in v0.1; HTML was generated without opening it.");
  }
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
    write(io, JSON.stringify({ trace, contract }, null, 2));
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
    if (eq === -1 && argv[index + 1] && !argv[index + 1].startsWith("--")) {
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

function formatDoctor(result) {
  const lines = ["Orange doctor"];
  for (const check of result.checks) {
    lines.push(`OK ${check}`);
  }
  for (const warning of result.warnings) {
    lines.push(`WARN ${warning}`);
  }
  for (const error of result.errors) {
    lines.push(`ERROR ${error}`);
  }
  lines.push(result.ok ? "No problems found." : `${result.errors.length} problem(s) found.`);
  return lines.join("\n");
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
  return files.map((file) => fs.readFileSync(path.isAbsolute(file) ? file : path.join(cwd, file), "utf8").trim());
}

function write(io, value) {
  io.stdout.write(`${value}\n`);
}

function usage() {
  return [
    "orange <command>",
    "",
    "Commands:",
    "  init [--project <name>] [--force]",
    "  quest new <request> [--title <title>] [--layer L2] [--verify <check>]",
    "  quest list [--completed|--all]",
    "  quest show <id-or-file>",
    "  quest done <id> (--evidence <text> | --unverified <reason>)",
    "  route <request> [--quest <id>] [--layer L2] [--json]",
    "  capsule [quest-id|--quest <id>]",
    "  identity build",
    "  doctor"
  ].join("\n");
}

function questUsage() {
  return [
    "orange quest <command>",
    "",
    "Commands:",
    "  new <request>",
    "  list [--completed|--all]",
    "  show <id-or-file>",
    "  done <id> (--evidence <text> | --unverified <reason>)"
  ].join("\n");
}

function identityUsage() {
  return [
    "orange identity <command>",
    "",
    "Commands:",
    "  build"
  ].join("\n");
}
