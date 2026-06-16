import fs from "node:fs";
import path from "node:path";
import { workspacePaths } from "./paths.js";

export const CONFIG_VERSION = "0.1.0";
export const ORANGE_GITIGNORE = [
  "capsules/",
  "traces/",
  "proposals/",
  "identity/",
  "local/",
  ""
].join("\n");

export function defaultConfig(cwd = process.cwd()) {
  return {
    version: CONFIG_VERSION,
    project: {
      name: path.basename(cwd),
      default_language: "ko"
    },
    storage: {
      root: ".orange-hyper",
      quest_format: "markdown+yaml-frontmatter"
    },
    quest: {
      recommend_from_layer: "L2",
      require_from_layer: "L3"
    },
    route: {
      expose_from: "L2",
      default_max_layer: "L3"
    },
    verification: {
      completion_requires: "evidence_or_unverified_reason"
    },
    features: {
      hooks: false,
      mcp: false,
      subagents: false,
      role_evolution: false,
      auto_planner: false,
      auto_execution_loop: false,
      branch_pr_spec_workflow_required: false
    }
  };
}

export function isInitialized(cwd = process.cwd()) {
  return fs.existsSync(workspacePaths(cwd).config);
}

export function readConfig(cwd = process.cwd()) {
  const paths = workspacePaths(cwd);
  return JSON.parse(fs.readFileSync(paths.config, "utf8"));
}

export function initWorkspace(cwd = process.cwd(), options = {}) {
  const paths = workspacePaths(cwd);
  fs.mkdirSync(paths.activeQuests, { recursive: true });
  fs.mkdirSync(paths.completedQuests, { recursive: true });
  fs.mkdirSync(paths.capsules, { recursive: true });
  fs.mkdirSync(paths.traces, { recursive: true });

  if (!fs.existsSync(paths.config) || options.force) {
    const config = defaultConfig(cwd);
    if (options.projectName) {
      config.project.name = options.projectName;
    }
    fs.writeFileSync(paths.config, `${JSON.stringify(config, null, 2)}\n`);
  }

  if (!fs.existsSync(paths.currentCapsule) || options.force) {
    fs.writeFileSync(
      paths.currentCapsule,
      "# Orange Hyper Current Capsule\n\nNo active capsule has been generated yet.\n"
    );
  }

  if (!fs.existsSync(paths.orangeGitignore) || options.force) {
    fs.writeFileSync(paths.orangeGitignore, ORANGE_GITIGNORE);
  }

  if (!fs.existsSync(paths.routeTrace) || options.force) {
    fs.writeFileSync(paths.routeTrace, "");
  }

  return paths;
}

export function requireInitialized(cwd = process.cwd()) {
  if (!isInitialized(cwd)) {
    throw new Error("Workspace is not initialized. Run `orange init` first.");
  }
}
