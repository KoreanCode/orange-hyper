import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { originMetadata, originSummaryLines } from "./origin.js";
import { workspacePaths } from "./paths.js";

export const CONFIG_VERSION = "0.1.0";
export const ORANGE_GITIGNORE = [
  "capsules/",
  "traces/",
  "identity/",
  "local/",
  "proposals/memory-delta/pending/",
  "proposals/memory-delta/rejected/",
  ""
].join("\n");

export const ROOT_GITIGNORE_REQUIRED_LINES = [
  ".DS_Store",
  "node_modules/",
  "dist/",
  "build/",
  "coverage/",
  ".env",
  ".env.*",
  ".orange-hyper/capsules/",
  ".orange-hyper/traces/",
  ".orange-hyper/identity/",
  ".orange-hyper/local/",
  ".orange-hyper/proposals/memory-delta/pending/",
  ".orange-hyper/proposals/memory-delta/rejected/"
];

const LEGACY_ORANGE_GITIGNORE_BLOCKERS = new Set([
  "proposals",
  "proposals/",
  "/proposals",
  "/proposals/"
]);

const EMPTY_GRAPH_INDEX = {
  schema_version: 1,
  index_version: "0.3.0",
  project_id: null,
  project_name: "",
  updated_at: null,
  generated_at: null,
  source: "graph-node-markdown",
  ...originMetadata(),
  nodes: []
};

export function defaultConfig(cwd = process.cwd()) {
  const projectId = createProjectId();
  const projectName = path.basename(cwd);
  return {
    version: CONFIG_VERSION,
    origin: originMetadata(),
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
  fs.mkdirSync(paths.graphDecisionNodes, { recursive: true });
  fs.mkdirSync(paths.graphConstraintNodes, { recursive: true });
  fs.mkdirSync(paths.graphComponentNodes, { recursive: true });
  fs.mkdirSync(paths.graphRiskNodes, { recursive: true });
  fs.mkdirSync(paths.graphVerificationNodes, { recursive: true });
  fs.mkdirSync(paths.traces, { recursive: true });

  if (!fs.existsSync(paths.config) || options.force) {
    const config = normalizeConfigProjectIdentity(defaultConfig(cwd), cwd, {
      projectName: options.projectName
    });
    fs.writeFileSync(paths.config, `${JSON.stringify(config, null, 2)}\n`);
  }

  if (!fs.existsSync(paths.currentCapsule) || options.force) {
    const identity = readProjectIdentity(cwd);
    fs.writeFileSync(
      paths.currentCapsule,
      [
        "# Orange Hyper Current Capsule",
        "",
        ...originSummaryLines(),
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
  } else {
    ensureOrangeGitignorePolicy(paths.orangeGitignore);
  }

  if (!fs.existsSync(paths.routeTrace) || options.force) {
    fs.writeFileSync(paths.routeTrace, "");
  }

  if (!fs.existsSync(paths.graphEdges) || options.force) {
    fs.writeFileSync(paths.graphEdges, "");
  }

  if (!fs.existsSync(paths.graphIndex) || options.force) {
    const project = fs.existsSync(paths.config)
      ? projectIdentityFromConfig(JSON.parse(fs.readFileSync(paths.config, "utf8")), cwd)
      : { project_id: "", project_name: path.basename(cwd) };
    fs.writeFileSync(paths.graphIndex, `${JSON.stringify({
      ...EMPTY_GRAPH_INDEX,
      project_id: project.project_id || null,
      project_name: project.project_name || ""
    }, null, 2)}\n`);
  }

  return paths;
}

export function ensureOrangeGitignorePolicy(filePath) {
  const original = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const lines = original
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line, index, array) => !(index === array.length - 1 && line === ""))
    .filter((line) => !LEGACY_ORANGE_GITIGNORE_BLOCKERS.has(line.trim()));
  const existing = new Set(lines.map((line) => line.trim()).filter(Boolean));

  for (const expected of ORANGE_GITIGNORE.split(/\n/).filter(Boolean)) {
    if (!existing.has(expected)) {
      lines.push(expected);
      existing.add(expected);
    }
  }

  const next = `${lines.join("\n")}\n`;
  if (next !== original) {
    fs.writeFileSync(filePath, next);
  }
}

export function requireInitialized(cwd = process.cwd()) {
  if (!isInitialized(cwd)) {
    throw new Error("Workspace is not initialized. Run `orange init` first.");
  }
}
