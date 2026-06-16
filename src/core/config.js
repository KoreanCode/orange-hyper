import fs from "node:fs";
import crypto from "node:crypto";
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
  const projectId = createProjectId();
  const projectName = path.basename(cwd);
  return {
    version: CONFIG_VERSION,
    project_id: projectId,
    project_name: projectName,
    project: {
      id: projectId,
      name: projectName,
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

export function readProjectIdentity(cwd = process.cwd()) {
  return projectIdentityFromConfig(readConfig(cwd), cwd);
}

export function requireProjectIdentity(cwd = process.cwd()) {
  const identity = readProjectIdentity(cwd);
  if (!identity.project_id) {
    throw new Error("config.project_id is missing. Run `orange init` or `orange doctor --repair-project-id`.");
  }
  return identity;
}

export function projectIdentityFromConfig(config, cwd = process.cwd()) {
  return {
    project_id: config?.project_id || config?.project?.id || "",
    project_name: config?.project_name || config?.project?.name || path.basename(cwd)
  };
}

export function normalizeConfigProjectIdentity(config, cwd = process.cwd(), options = {}) {
  const projectId = config?.project_id || config?.project?.id || options.projectId || createProjectId();
  const projectName = options.projectName || config?.project_name || config?.project?.name || path.basename(cwd);
  return {
    ...config,
    project_id: projectId,
    project_name: projectName,
    project: {
      ...(config.project || {}),
      id: projectId,
      name: projectName
    }
  };
}

export function createProjectId() {
  return `project_${crypto.randomUUID()}`;
}

export function initWorkspace(cwd = process.cwd(), options = {}) {
  const paths = workspacePaths(cwd);
  fs.mkdirSync(paths.activeQuests, { recursive: true });
  fs.mkdirSync(paths.completedQuests, { recursive: true });
  fs.mkdirSync(paths.capsules, { recursive: true });
  fs.mkdirSync(paths.pendingMemoryDeltaProposals, { recursive: true });
  fs.mkdirSync(paths.acceptedMemoryDeltaProposals, { recursive: true });
  fs.mkdirSync(paths.rejectedMemoryDeltaProposals, { recursive: true });
  fs.mkdirSync(paths.traces, { recursive: true });

  if (!fs.existsSync(paths.config) || options.force) {
    const config = normalizeConfigProjectIdentity(defaultConfig(cwd), cwd, {
      projectName: options.projectName
    });
    fs.writeFileSync(paths.config, `${JSON.stringify(config, null, 2)}\n`);
  } else {
    const config = JSON.parse(fs.readFileSync(paths.config, "utf8"));
    const normalized = normalizeConfigProjectIdentity(config, cwd);
    if (JSON.stringify(config) !== JSON.stringify(normalized)) {
      fs.writeFileSync(paths.config, `${JSON.stringify(normalized, null, 2)}\n`);
    }
  }

  if (!fs.existsSync(paths.currentCapsule) || options.force) {
    const identity = readProjectIdentity(cwd);
    fs.writeFileSync(
      paths.currentCapsule,
      [
        "# Orange Hyper Current Capsule",
        "",
        "## Project Boundary",
        "",
        `- Project name: ${identity.project_name}`,
        `- Project id: ${identity.project_id}`,
        "- Only Quest, Proposal, and Accepted Node artifacts with this project_id are project memory.",
        "- Unrelated pasted reports, external project docs, and other repo documents are not project memory without an explicit orange import command.",
        "",
        "No active capsule has been generated yet."
      ].join("\n") + "\n"
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
