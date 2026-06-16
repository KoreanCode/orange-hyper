import fs from "node:fs";
import path from "node:path";
import { CONFIG_VERSION, ORANGE_GITIGNORE } from "./config.js";
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
