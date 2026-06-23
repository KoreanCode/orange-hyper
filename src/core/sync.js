import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { readProjectIdentity, requireInitialized } from "./config.js";
import { originMetadata } from "./origin.js";
import { workspacePaths } from "./paths.js";
import { nowIso } from "./time.js";

export const STRUCTURE_GRAPH_SCHEMA_VERSION = /** @type {1} */ (1);
export const STRUCTURE_GRAPH_VERSION = "1.1.0-beta.2";
export const STRUCTURE_STATUS_VERSION = "1.1.0-beta.2";

const STRUCTURE_NODE_TYPES = new Set([
  "project",
  "module",
  "domain",
  "component",
  "test",
  "document",
  "infrastructure",
  "datastore"
]);

const STRUCTURE_EDGE_TYPES = new Set([
  "contains",
  "depends_on",
  "tests",
  "documents",
  "configures"
]);

const IGNORED_DIR_NAMES = new Set([
  ".git",
  ".orange-hyper",
  "node_modules",
  "dist",
  "build",
  "target",
  "coverage",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  ".gradle",
  "out"
]);

const GENERATED_DIR_NAMES = new Set([
  "__generated__",
  "generated",
  ".generated"
]);

const BINARY_EXTENSIONS = new Set([
  ".7z",
  ".avif",
  ".bin",
  ".bmp",
  ".class",
  ".dmg",
  ".exe",
  ".gif",
  ".gz",
  ".ico",
  ".jar",
  ".jpeg",
  ".jpg",
  ".mov",
  ".mp3",
  ".mp4",
  ".pdf",
  ".png",
  ".tar",
  ".tgz",
  ".webp",
  ".zip"
]);

const ASSET_EXTENSIONS = new Set([
  ".ai",
  ".css.map",
  ".eot",
  ".fig",
  ".icns",
  ".map",
  ".otf",
  ".psd",
  ".sketch",
  ".svg",
  ".ttf",
  ".woff",
  ".woff2"
]);

const ASSET_DIR_NAMES = new Set([
  "asset",
  "assets",
  "fonts",
  "images",
  "media",
  "public",
  "static"
]);

const SOURCE_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".cpp",
  ".cs",
  ".css",
  ".go",
  ".java",
  ".js",
  ".jsx",
  ".kt",
  ".mjs",
  ".php",
  ".py",
  ".rb",
  ".rs",
  ".scala",
  ".scss",
  ".swift",
  ".ts",
  ".tsx",
  ".vue"
]);

const DOCUMENT_EXTENSIONS = new Set([".adoc", ".md", ".mdx", ".rst", ".txt"]);
const CONFIG_EXTENSIONS = new Set([".conf", ".config", ".env", ".ini", ".json", ".toml", ".yaml", ".yml"]);
const DATASTORE_EXTENSIONS = new Set([".prisma", ".sql"]);

const TOP_LEVEL_LIMITS = {
  component: 160,
  test: 120,
  document: 120,
  infrastructure: 120,
  datastore: 80
};

/**
 * @returns {import("./types.d.ts").SyncPlanResult}
 */
export function buildSyncPlan(cwd = process.cwd(), options = {}) {
  requireInitialized(cwd);
  const project = readProjectIdentity(cwd);
  const generatedAt = nowIso(options.clock);
  const graph = buildStructureGraph(cwd, project, { generatedAt: null, stateRevision: null });
  const stateRevision = stateRevisionForGraph(graph);
  const graphWithRevision = /** @type {import("./types.d.ts").StructureGraph} */ ({
    ...graph,
    generated_at: generatedAt,
    state_revision: stateRevision
  });
  const previousStatus = readStructureStatus(cwd);
  const previousGraph = readStructureGraph(cwd);
  const previousRevision = previousStatus?.state_revision || previousGraph?.state_revision || null;
  const freshness = freshnessForRevision(previousRevision, stateRevision);
  const diff = diffStructureGraphs(previousGraph, graphWithRevision);
  return {
    schema_version: STRUCTURE_GRAPH_SCHEMA_VERSION,
    plan_version: STRUCTURE_GRAPH_VERSION,
    generated_at: generatedAt,
    readOnly: true,
    mutates: false,
    project: formatProject(project),
    state_revision: stateRevision,
    previous_revision: previousRevision,
    current_revision: previousRevision,
    planned_revision: stateRevision,
    changed: freshness.changed,
    freshness,
    diff,
    ...diffFields(diff),
    files: structureFiles(cwd),
    graph: graphWithRevision,
    summary: summarizeStructureGraph(graphWithRevision),
    ignored: {
      directories: Array.from(IGNORED_DIR_NAMES).sort(),
      generated_directories: Array.from(GENERATED_DIR_NAMES).sort(),
      binary_extensions: Array.from(BINARY_EXTENSIONS).sort()
    },
    writes: []
  };
}

/**
 * @returns {import("./types.d.ts").SyncApplyResult}
 */
export function applySyncPlan(cwd = process.cwd(), options = {}) {
  const plan = buildSyncPlan(cwd, options);
  const paths = workspacePaths(cwd);
  const previousStatus = readStructureStatus(cwd);
  fs.mkdirSync(paths.structure, { recursive: true });
  fs.writeFileSync(paths.structureIndex, `${JSON.stringify(plan.graph, null, 2)}\n`);
  const status = buildAppliedStatus({
    cwd,
    plan,
    previousStatus,
    generatedAt: plan.generated_at
  });
  writeStructureStatus(cwd, status);
  return {
    schema_version: STRUCTURE_GRAPH_SCHEMA_VERSION,
    apply_version: STRUCTURE_GRAPH_VERSION,
    generated_at: plan.generated_at,
    readOnly: false,
    mutates: true,
    applied: true,
    project: plan.project,
    state_revision: plan.state_revision,
    previous_revision: plan.previous_revision,
    current_revision: plan.current_revision,
    planned_revision: plan.planned_revision,
    changed: plan.changed,
    diff: plan.diff,
    ...diffFields(plan.diff),
    files: plan.files,
    graph: plan.graph,
    summary: plan.summary,
    status,
    warnings: []
  };
}

/**
 * @returns {import("./types.d.ts").SyncStatusResult}
 */
export function getSyncStatus(cwd = process.cwd(), options = {}) {
  requireInitialized(cwd);
  const project = readProjectIdentity(cwd);
  const generatedAt = nowIso(options.clock);
  const status = readStructureStatus(cwd);
  const graph = buildStructureGraph(cwd, project, { generatedAt: null, stateRevision: null });
  const currentRevision = stateRevisionForGraph(graph);
  const graphWithRevision = /** @type {import("./types.d.ts").StructureGraph} */ ({
    ...graph,
    generated_at: generatedAt,
    state_revision: currentRevision
  });
  const appliedGraph = readStructureGraph(cwd);
  const previousRevision = status?.state_revision || appliedGraph?.state_revision || null;
  const freshness = freshnessForRevision(previousRevision, currentRevision);
  const diff = diffStructureGraphs(appliedGraph, graphWithRevision);
  const identityBuiltFromRevision = status?.identity_built_from_revision || null;
  const identityStatus = identityStatusFor(status, currentRevision);
  return {
    schema_version: STRUCTURE_GRAPH_SCHEMA_VERSION,
    status_version: STRUCTURE_STATUS_VERSION,
    generated_at: generatedAt,
    readOnly: true,
    mutates: false,
    project: formatProject(project),
    files: structureFiles(cwd),
    last_sync_at: status?.last_sync_at || null,
    state_revision: previousRevision,
    current_revision: previousRevision,
    planned_revision: currentRevision,
    changed: freshness.changed,
    freshness,
    diff,
    ...diffFields(diff),
    identity_built_from_revision: identityBuiltFromRevision,
    identity_status: identityStatus,
    identity_warning: status?.identity_warning || null,
    summary: summarizeStructureGraph({
      ...graph,
      state_revision: currentRevision,
      generated_at: generatedAt
    }),
    status
  };
}

export function readStructureGraph(cwd = process.cwd()) {
  const paths = workspacePaths(cwd);
  if (!fs.existsSync(paths.structureIndex)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(paths.structureIndex, "utf8"));
}

export function readStructureStatus(cwd = process.cwd()) {
  const paths = workspacePaths(cwd);
  if (!fs.existsSync(paths.structureStatus)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(paths.structureStatus, "utf8"));
}

export function writeStructureStatus(cwd = process.cwd(), status) {
  const paths = workspacePaths(cwd);
  fs.mkdirSync(paths.structure, { recursive: true });
  fs.writeFileSync(paths.structureStatus, `${JSON.stringify(status, null, 2)}\n`);
}

export function recordIdentityBuildSuccess(cwd = process.cwd(), result = {}, options = {}) {
  const status = readStructureStatus(cwd);
  if (!status) {
    return null;
  }
  const updatedAt = nowIso(options.clock);
  const next = {
    ...status,
    identity_built_from_revision: status.state_revision || null,
    identity_status: status.state_revision ? "current" : "stale",
    identity_updated_at: updatedAt,
    identity_file: result.filePath ? normalizeRelativePath(path.relative(cwd, result.filePath)) : status.identity_file || null,
    identity_summary_file: result.summaryFilePath ? normalizeRelativePath(path.relative(cwd, result.summaryFilePath)) : status.identity_summary_file || null,
    identity_warning: null
  };
  writeStructureStatus(cwd, next);
  return next;
}

export function recordIdentityBuildFailure(cwd = process.cwd(), error, options = {}) {
  const status = readStructureStatus(cwd);
  if (!status) {
    return null;
  }
  const updatedAt = nowIso(options.clock);
  const message = error instanceof Error ? error.message : String(error || "identity build failed");
  const next = {
    ...status,
    identity_status: "stale",
    identity_updated_at: updatedAt,
    identity_warning: message
  };
  writeStructureStatus(cwd, next);
  return next;
}

export function buildMinimalStructureGraph(cwd = process.cwd(), project = readProjectIdentity(cwd)) {
  const graph = emptyGraph(project, {
    generatedAt: null,
    stateRevision: null
  });
  const stateRevision = stateRevisionForGraph(graph);
  return /** @type {import("./types.d.ts").StructureGraph} */ ({
    ...graph,
    generated_at: null,
    state_revision: stateRevision
  });
}

export function validateStructureState(cwd = process.cwd(), context = {}) {
  const paths = workspacePaths(cwd);
  const errors = [];
  const warnings = [];
  const checks = [];
  const diagnostics = emptyDiagnostics();
  if (!fs.existsSync(paths.config)) {
    return { errors, warnings, checks, diagnostics };
  }
  const project = context.projectIdentity || readProjectIdentity(cwd);
  const status = readStructureStatus(cwd);
  const index = readStructureGraph(cwd);
  if (!status && !index) {
    checks.push("structure sync state not present");
    return { errors, warnings, checks, diagnostics };
  }
  if (!status) {
    addDiagnostic(warnings, diagnostics, "STRUCTURE_STATUS_MISSING", "structure/status.json is missing", "Run `orange sync apply --json` to regenerate structure sync state.");
    return { errors, warnings, checks, diagnostics };
  }
  if (!index) {
    addDiagnostic(warnings, diagnostics, "STRUCTURE_INDEX_MISSING", "structure/index.json is missing", "Run `orange sync apply --json` to regenerate structure sync state.");
    return { errors, warnings, checks, diagnostics };
  }
  checks.push("structure/index.json parses");
  checks.push("structure/status.json parses");
  if (index.project_id && project.project_id && index.project_id !== project.project_id) {
    errors.push(`structure/index.json project_id ${index.project_id} does not match config project_id ${project.project_id}`);
    diagnostics.errors.push({
      code: "STRUCTURE_PROJECT_MISMATCH",
      message: errors[errors.length - 1],
      hint: "Regenerate structure state only after confirming the project boundary."
    });
  }
  if (status.project_id && project.project_id && status.project_id !== project.project_id) {
    errors.push(`structure/status.json project_id ${status.project_id} does not match config project_id ${project.project_id}`);
    diagnostics.errors.push({
      code: "STRUCTURE_PROJECT_MISMATCH",
      message: errors[errors.length - 1],
      hint: "Regenerate structure status only after confirming the project boundary."
    });
  }
  if (index.state_revision && status.state_revision && index.state_revision !== status.state_revision) {
    addDiagnostic(warnings, diagnostics, "STRUCTURE_STATUS_STALE", "structure/status.json state_revision does not match structure/index.json", "Run `orange sync apply --json` to refresh generated structure state.");
  }
  if (status.identity_status === "stale" || (status.state_revision && status.identity_built_from_revision && status.identity_built_from_revision !== status.state_revision)) {
    addDiagnostic(warnings, diagnostics, "IDENTITY_STRUCTURE_STALE", "identity build is stale relative to structure sync state", "Run `orange identity build --json`; sync apply, remember accept, and graph rebuild-index refresh it automatically when possible.");
  }
  if (status.identity_status === "stale" && status.identity_warning) {
    addDiagnostic(
      warnings,
      diagnostics,
      "IDENTITY_BUILD_FAILED",
      `identity build failed after structure sync: ${status.identity_warning}`,
      "Source structure state was preserved. Re-run `orange identity build --json` after fixing the cause."
    );
  }
  return { errors, warnings, checks, diagnostics };
}

/**
 * @returns {import("./types.d.ts").StructureGraph}
 */
function buildStructureGraph(cwd, project, options = {}) {
  const graph = emptyGraph(project, options);
  const context = {
    cwd,
    project,
    nodes: graph.nodes,
    edges: graph.edges,
    nodeById: new Map(graph.nodes.map((node) => [node.id, node])),
    nodeIdByPath: new Map([[".", "project.root"]]),
    edgeKeys: new Set(),
    counts: {
      component: 0,
      test: 0,
      document: 0,
      infrastructure: 0,
      datastore: 0
    },
    ignored: []
  };

  inspectPackageJson(context, "package.json");
  inspectPomXml(context, "pom.xml");
  inspectGradle(context, "build.gradle");
  inspectGradle(context, "settings.gradle");
  inspectTopLevelDirectories(context);
  inspectFiles(context);
  linkTestsToComponents(context);

  graph.nodes = Array.from(context.nodeById.values()).sort(compareById);
  graph.edges = context.edges.sort(compareById);
  graph.summary = summarizeStructureGraph(graph);
  graph.ignored = {
    directories: Array.from(new Set(context.ignored)).sort()
  };
  return /** @type {import("./types.d.ts").StructureGraph} */ (graph);
}

/**
 * @returns {import("./types.d.ts").StructureGraph}
 */
function emptyGraph(project, options = {}) {
  return /** @type {import("./types.d.ts").StructureGraph} */ ({
    schema_version: STRUCTURE_GRAPH_SCHEMA_VERSION,
    graph_version: STRUCTURE_GRAPH_VERSION,
    generated_at: options.generatedAt || null,
    state_revision: options.stateRevision || null,
    source: /** @type {"project-sync-scanner"} */ ("project-sync-scanner"),
    readOnly: /** @type {true} */ (true),
    generated: /** @type {true} */ (true),
    project_id: project.project_id || null,
    project_name: project.project_name || "",
    ...originMetadata(),
    node_types: /** @type {import("./types.d.ts").StructureNodeType[]} */ (Array.from(STRUCTURE_NODE_TYPES)),
    edge_types: /** @type {import("./types.d.ts").StructureEdgeType[]} */ (Array.from(STRUCTURE_EDGE_TYPES)),
    scanner: {
      mode: /** @type {"minimal-project-structure"} */ ("minimal-project-structure"),
      llm: /** @type {false} */ (false),
      ast: /** @type {false} */ (false),
      callGraph: /** @type {false} */ (false),
      graphEditing: /** @type {false} */ (false)
    },
    nodes: [
      {
        id: "project.root",
        type: "project",
        role: "root",
        label: project.project_name || "Project",
        path: ".",
        source: "project-root",
        readOnly: true,
        generated: true,
        metadata: {}
      }
    ],
    edges: [],
    summary: {
      node_count: 1,
      edge_count: 0,
      nodes_by_type: { project: 1 },
      edges_by_relation: {},
      project_root_node: "project.root"
    },
    ignored: { directories: [] }
  });
}

function inspectPackageJson(context, relPath) {
  const filePath = path.join(context.cwd, relPath);
  if (!fs.existsSync(filePath)) {
    return;
  }
  const packageNode = addNode(context, {
    type: "infrastructure",
    role: "package-manifest",
    path: relPath,
    label: "package.json",
    source: "package.json"
  });
  addEdge(context, packageNode.id, "project.root", "configures", "package.json");
  const moduleNode = ensureRootModule(context, "npm package");
  addEdge(context, "project.root", moduleNode.id, "contains", "package.json");
  try {
    const pkg = JSON.parse(fs.readFileSync(filePath, "utf8"));
    moduleNode.metadata = cleanMetadata({
      ...moduleNode.metadata,
      package_name: pkg.name || "",
      package_type: pkg.type || "",
      scripts: Object.keys(pkg.scripts || {}).sort()
    });
    const depNames = Object.keys({
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
      ...(pkg.peerDependencies || {}),
      ...(pkg.optionalDependencies || {})
    }).sort();
    if (depNames.length) {
      const dependencyNode = addNode(context, {
        type: "infrastructure",
        role: "dependency-manifest",
        path: relPath,
        label: "npm dependencies",
        source: "package.json",
        metadata: { dependency_count: depNames.length, dependencies: depNames.slice(0, 40) }
      });
      addEdge(context, moduleNode.id, dependencyNode.id, "depends_on", "package.json");
    }
    for (const workspacePath of workspaceDirectories(context.cwd, pkg.workspaces)) {
      const workspaceNode = addNode(context, {
        type: "module",
        role: "workspace",
        path: workspacePath,
        label: path.basename(workspacePath),
        source: "package.json#workspaces"
      });
      addEdge(context, "project.root", workspaceNode.id, "contains", "package.json#workspaces");
    }
  } catch (error) {
    packageNode.metadata = cleanMetadata({ parse_error: error.message });
  }
}

function inspectPomXml(context, relPath) {
  const filePath = path.join(context.cwd, relPath);
  if (!fs.existsSync(filePath)) {
    return;
  }
  const pomNode = addNode(context, {
    type: "infrastructure",
    role: "maven-manifest",
    path: relPath,
    label: "pom.xml",
    source: "pom.xml"
  });
  addEdge(context, pomNode.id, "project.root", "configures", "pom.xml");
  const moduleNode = ensureRootModule(context, "Maven project");
  addEdge(context, "project.root", moduleNode.id, "contains", "pom.xml");
  const content = safeReadText(filePath);
  const modules = Array.from(content.matchAll(/<module>\s*([^<]+?)\s*<\/module>/g), (match) => normalizeRelativePath(match[1]));
  for (const modulePath of modules) {
    if (!isDirectory(path.join(context.cwd, modulePath))) {
      continue;
    }
    const child = addNode(context, {
      type: "module",
      role: "maven-module",
      path: modulePath,
      label: path.basename(modulePath),
      source: "pom.xml#modules"
    });
    addEdge(context, moduleNode.id, child.id, "contains", "pom.xml#modules");
  }
}

function inspectGradle(context, relPath) {
  const filePath = path.join(context.cwd, relPath);
  if (!fs.existsSync(filePath)) {
    return;
  }
  const gradleNode = addNode(context, {
    type: "infrastructure",
    role: relPath === "settings.gradle" ? "gradle-settings" : "gradle-build",
    path: relPath,
    label: relPath,
    source: relPath
  });
  addEdge(context, gradleNode.id, "project.root", "configures", relPath);
  const moduleNode = ensureRootModule(context, "Gradle project");
  addEdge(context, "project.root", moduleNode.id, "contains", relPath);
  if (relPath !== "settings.gradle") {
    return;
  }
  const content = safeReadText(filePath);
  const includeMatches = Array.from(content.matchAll(/include\s+([^\n]+)/g), (match) => match[1]);
  for (const raw of includeMatches) {
    for (const item of raw.split(",")) {
      const moduleName = item.replace(/['":]/g, "").trim();
      if (!moduleName) {
        continue;
      }
      const modulePath = normalizeRelativePath(moduleName.replace(/:/g, "/").replace(/^\/+/, ""));
      if (!isDirectory(path.join(context.cwd, modulePath))) {
        continue;
      }
      const child = addNode(context, {
        type: "module",
        role: "gradle-module",
        path: modulePath,
        label: path.basename(modulePath),
        source: "settings.gradle#include"
      });
      addEdge(context, moduleNode.id, child.id, "contains", "settings.gradle#include");
    }
  }
}

function inspectTopLevelDirectories(context) {
  for (const entry of safeReadDir(context.cwd)) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) {
      continue;
    }
    if (isIgnoredDirectory(entry.name, entry.name) || ASSET_DIR_NAMES.has(entry.name.toLowerCase())) {
      context.ignored.push(entry.name);
      continue;
    }
    const type = classifyDirectory(entry.name);
    const node = addNode(context, {
      type,
      role: `${type}-directory`,
      path: entry.name,
      label: entry.name,
      source: "top-level-directory"
    });
    addEdge(context, "project.root", node.id, "contains", "top-level-directory");
  }
}

function inspectFiles(context) {
  const files = collectFiles(context.cwd, { maxDepth: 7 });
  for (const relPath of files) {
    const classification = classifyFile(relPath, context.cwd);
    if (!classification) {
      continue;
    }
    if (classification.type !== "infrastructure") {
      if (context.counts[classification.type] >= TOP_LEVEL_LIMITS[classification.type]) {
        continue;
      }
      context.counts[classification.type] += 1;
    } else if (context.counts.infrastructure >= TOP_LEVEL_LIMITS.infrastructure) {
      continue;
    } else {
      context.counts.infrastructure += 1;
    }
    const node = addNode(context, {
      type: classification.type,
      role: classification.role,
      path: relPath,
      label: classification.label || labelForPath(relPath),
      source: classification.source,
      metadata: classification.metadata || {}
    });
    const container = ensureContainerForPath(context, relPath, classification.type);
    addEdge(context, container, node.id, "contains", classification.source);
    if (classification.type === "document") {
      addEdge(context, node.id, "project.root", "documents", classification.source);
    }
    if (classification.type === "infrastructure") {
      addEdge(context, node.id, "project.root", "configures", classification.source);
    }
    if (classification.type === "datastore") {
      addEdge(context, "project.root", node.id, "depends_on", classification.source);
    }
  }
}

function linkTestsToComponents(context) {
  const components = Array.from(context.nodeById.values()).filter((node) => node.type === "component");
  const tests = Array.from(context.nodeById.values()).filter((node) => node.type === "test" && node.path);
  for (const testNode of tests) {
    const target = bestComponentForTest(testNode, components);
    if (target) {
      addEdge(context, testNode.id, target.id, "tests", "test-file-name");
    }
  }
}

function addNode(context, input) {
  const type = input.type;
  if (!STRUCTURE_NODE_TYPES.has(type)) {
    throw new Error(`Unsupported structure node type: ${type}`);
  }
  const relPath = normalizeRelativePath(input.path || ".");
  const id = structureNodeId(type, input.role, relPath);
  const existing = context.nodeById.get(id);
  if (existing) {
    existing.metadata = cleanMetadata({
      ...(existing.metadata || {}),
      ...(input.metadata || {})
    });
    return existing;
  }
  const node = {
    id,
    type,
    role: input.role,
    label: input.label || labelForPath(relPath),
    path: relPath,
    source: input.source || "project-sync-scanner",
    readOnly: true,
    generated: true,
    metadata: cleanMetadata(input.metadata || {})
  };
  context.nodeById.set(id, node);
  context.nodeIdByPath.set(relPath, id);
  return node;
}

function addEdge(context, from, to, relation, source) {
  if (!STRUCTURE_EDGE_TYPES.has(relation) || from === to) {
    return;
  }
  if (!context.nodeById.has(from) || !context.nodeById.has(to)) {
    return;
  }
  const key = `${from}|${to}|${relation}|${source || ""}`;
  if (context.edgeKeys.has(key)) {
    return;
  }
  context.edgeKeys.add(key);
  context.edges.push({
    id: `structure-edge-${shortHash(key)}`,
    from,
    to,
    relation,
    source: source || "project-sync-scanner",
    readOnly: true,
    generated: true
  });
}

function ensureRootModule(context, label) {
  return addNode(context, {
    type: "module",
    role: "root",
    path: ".",
    label,
    source: "project-manifest"
  });
}

function ensureContainerForPath(context, relPath, type) {
  const normalized = normalizeRelativePath(relPath);
  const parts = normalized.split("/");
  if (parts.length === 1) {
    return "project.root";
  }
  const sourceRoot = sourceRootInfo(parts);
  const top = parts[0];
  if ((type === "component" || type === "test" || type === "infrastructure" || type === "datastore") && sourceRoot) {
    const modulePath = sourceRoot.index > 0 ? parts.slice(0, sourceRoot.index).join("/") : sourceRoot.path;
    const moduleId = context.nodeIdByPath.get(modulePath) || addNode(context, {
      type: "module",
      role: "source-directory",
      path: modulePath,
      label: modulePath === sourceRoot.path ? sourceRoot.path : path.posix.basename(modulePath),
      source: "source-root"
    }).id;
    if (parts.length > sourceRoot.index + 2) {
      const domainEnd = Math.max(sourceRoot.index + 2, parts.length - 1);
      const domainPath = parts.slice(0, domainEnd).join("/");
      const domain = addNode(context, {
        type: "domain",
        role: "source-domain",
        path: domainPath,
        label: parts[domainEnd - 1],
        source: "source-directory"
      });
      addEdge(context, moduleId, domain.id, "contains", "source-directory");
      return domain.id;
    }
    return moduleId;
  }
  const existing = context.nodeIdByPath.get(top);
  if (existing) {
    return existing;
  }
  const directoryType = classifyDirectory(top);
  const node = addNode(context, {
    type: directoryType,
    role: `${directoryType}-directory`,
    path: top,
    label: top,
    source: "top-level-directory"
  });
  addEdge(context, "project.root", node.id, "contains", "top-level-directory");
  return node.id;
}

function workspaceDirectories(cwd, workspaces) {
  const patterns = Array.isArray(workspaces)
    ? workspaces
    : Array.isArray(workspaces?.packages)
      ? workspaces.packages
      : [];
  const directories = [];
  for (const pattern of patterns) {
    const normalized = normalizeRelativePath(pattern);
    if (!normalized || normalized.includes("**")) {
      continue;
    }
    if (normalized.endsWith("/*")) {
      const base = normalized.slice(0, -2);
      for (const entry of safeReadDir(path.join(cwd, base))) {
        if (entry.isDirectory() && !isIgnoredDirectory(entry.name, `${base}/${entry.name}`)) {
          directories.push(normalizeRelativePath(`${base}/${entry.name}`));
        }
      }
      continue;
    }
    if (isDirectory(path.join(cwd, normalized))) {
      directories.push(normalized);
    }
  }
  return Array.from(new Set(directories)).sort();
}

function collectFiles(cwd, options = {}) {
  const maxDepth = options.maxDepth ?? 7;
  const files = [];
  const walk = (dir, relDir, depth) => {
    if (depth > maxDepth) {
      return;
    }
    for (const entry of safeReadDir(dir)) {
      const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (entry.isSymbolicLink() || isIgnoredDirectory(entry.name, relPath)) {
          continue;
        }
        walk(path.join(dir, entry.name), relPath, depth + 1);
        continue;
      }
      if (!entry.isFile() || isGeneratedOrBinaryFile(relPath)) {
        continue;
      }
      files.push(normalizeRelativePath(relPath));
    }
  };
  walk(cwd, "", 0);
  return files.sort();
}

function classifyDirectory(name) {
  const normalized = name.toLowerCase();
  if (["doc", "docs", "documentation"].includes(normalized)) {
    return "document";
  }
  if (["test", "tests", "__tests__"].includes(normalized)) {
    return "test";
  }
  if (["config", "configs", ".github", "infra", "infrastructure", "ops", "deploy", "deployment", "docker", "k8s", "kubernetes"].includes(normalized)) {
    return "infrastructure";
  }
  if (["data", "database", "datastore", "db", "migrations", "prisma"].includes(normalized)) {
    return "datastore";
  }
  return "module";
}

function classifyFile(relPath, cwd) {
  const normalized = normalizeRelativePath(relPath);
  const basename = path.posix.basename(normalized);
  const ext = path.posix.extname(normalized).toLowerCase();
  if (["package.json", "pom.xml", "build.gradle", "settings.gradle"].includes(basename)) {
    return { type: "infrastructure", role: manifestRole(basename), source: basename };
  }
  if (isTestPath(normalized)) {
    return semanticTestClassification(normalized, cwd);
  }
  if (DOCUMENT_EXTENSIONS.has(ext) && (isDocsPath(normalized) || basename.toLowerCase().startsWith("readme"))) {
    return { type: "document", role: "document-file", source: "document-file" };
  }
  if (isDatastorePath(normalized) || DATASTORE_EXTENSIONS.has(ext)) {
    return { type: "datastore", role: "datastore-file", source: "datastore-file" };
  }
  if (SOURCE_EXTENSIONS.has(ext) && isSourcePath(normalized)) {
    return semanticSourceClassification(normalized, cwd);
  }
  if (isInfrastructurePath(normalized) || basename === "Dockerfile" || CONFIG_EXTENSIONS.has(ext)) {
    return { type: "infrastructure", role: "config-file", source: "config-file" };
  }
  return null;
}

function semanticTestClassification(relPath, cwd) {
  const ext = path.posix.extname(relPath).toLowerCase();
  const framework = ext === ".java" ? "spring" : "node";
  return {
    type: "test",
    role: framework === "spring" ? "Test" : "test",
    source: "test-file",
    label: semanticLabelForPath(relPath),
    metadata: cleanMetadata({ framework })
  };
}

function semanticSourceClassification(relPath, cwd) {
  const ext = path.posix.extname(relPath).toLowerCase();
  const basename = path.posix.basename(relPath, ext);
  const lowerPath = relPath.toLowerCase();
  const lowerBase = basename.toLowerCase();
  const isJava = ext === ".java";
  const content = isJava ? safeReadText(path.join(cwd, relPath)).slice(0, 20000) : "";

  if (isJava) {
    if (/@(?:RestController|Controller)\b/.test(content) || lowerBase.endsWith("controller")) {
      return sourceRole("component", "Controller", "spring", relPath);
    }
    if (/@Service\b/.test(content) || lowerBase.endsWith("service")) {
      return sourceRole("component", "Service", "spring", relPath);
    }
    if (/@Repository\b/.test(content) || lowerBase.endsWith("repository")) {
      return sourceRole("component", "Repository", "spring", relPath);
    }
    if (/@Entity\b/.test(content) || lowerBase.endsWith("entity")) {
      return sourceRole("datastore", "Entity", "spring", relPath);
    }
    if (/@Configuration\b/.test(content) || lowerBase.endsWith("configuration") || lowerBase.endsWith("config")) {
      return sourceRole("infrastructure", "Configuration", "spring", relPath);
    }
    if (["application", "main"].includes(lowerBase)) {
      return sourceRole("component", "entrypoint", "spring", relPath);
    }
    return null;
  }

  if (/(^|\/)(routes?|router|api)(\/|$)/.test(lowerPath) || ["route", "routes", "router"].includes(lowerBase) || lowerBase.endsWith(".route")) {
    return sourceRole("component", "route", "node", relPath);
  }
  if (/(^|\/)controllers?(\/|$)/.test(lowerPath) || lowerBase.includes("controller")) {
    return sourceRole("component", "controller", "node", relPath);
  }
  if (/(^|\/)services?(\/|$)/.test(lowerPath) || lowerBase.includes("service")) {
    return sourceRole("component", "service", "node", relPath);
  }
  if (/(^|\/)(repositories?|repos?)(\/|$)/.test(lowerPath) || lowerBase.includes("repository") || lowerBase.endsWith("repo")) {
    return sourceRole("component", "repository", "node", relPath);
  }
  if (/(^|\/)config(s)?(\/|$)/.test(lowerPath) || lowerBase.includes("config")) {
    return sourceRole("infrastructure", "config", "node", relPath);
  }
  if (["app", "index", "main", "server"].includes(lowerBase)) {
    return sourceRole("component", "entrypoint", "node", relPath);
  }
  return null;
}

function sourceRole(type, role, framework, relPath) {
  return {
    type,
    role,
    source: `${framework}-${String(role).toLowerCase()}`,
    label: semanticLabelForPath(relPath),
    metadata: cleanMetadata({ framework, role })
  };
}

function manifestRole(basename) {
  if (basename === "package.json") {
    return "package-manifest";
  }
  if (basename === "pom.xml") {
    return "maven-manifest";
  }
  if (basename === "settings.gradle") {
    return "gradle-settings";
  }
  return "gradle-build";
}

function bestComponentForTest(testNode, components) {
  const base = comparableBaseName(testNode.path);
  return components.find((component) => comparableBaseName(component.path) === base)
    || components.find((component) => component.path && component.path.includes(base))
    || null;
}

function comparableBaseName(relPath) {
  return path.posix.basename(String(relPath || ""), path.posix.extname(String(relPath || "")))
    .replace(/\.(test|spec)$/i, "")
    .replace(/[-_.]test$/i, "")
    .toLowerCase();
}

function structureNodeId(type, role, relPath) {
  if (type === "project") {
    return "project.root";
  }
  if (type === "module" && relPath === ".") {
    return "module.root";
  }
  const base = relPath === "." ? role : relPath.replace(/\.[^.]+$/, "");
  return `${type}.${slugId(base || role)}`;
}

function sourceRootInfo(parts) {
  const index = parts.findIndex((part) => isSourceRoot(part));
  if (index === -1) {
    return null;
  }
  return {
    index,
    path: parts[index]
  };
}

function stateRevisionForGraph(graph) {
  const payload = {
    schema_version: graph.schema_version,
    graph_version: graph.graph_version,
    source: graph.source,
    project_id: graph.project_id || null,
    project_name: graph.project_name || "",
    nodes: graph.nodes.map((node) => stableObject(node)).sort(compareStable),
    edges: graph.edges.map((edge) => stableObject(edge)).sort(compareStable)
  };
  return `struct_${shortHash(JSON.stringify(payload), 24)}`;
}

function diffStructureGraphs(previousGraph, plannedGraph) {
  const previousNodes = new Map(asArray(previousGraph?.nodes).map((node) => [node.id, stableObject(node)]));
  const plannedNodes = new Map(asArray(plannedGraph?.nodes).map((node) => [node.id, stableObject(node)]));
  const previousEdges = new Map(asArray(previousGraph?.edges).map((edge) => [edge.id, stableObject(edge)]));
  const plannedEdges = new Map(asArray(plannedGraph?.edges).map((edge) => [edge.id, stableObject(edge)]));
  const addedNodes = [];
  const changedNodes = [];
  const removedNodes = [];
  const unchangedNodes = [];
  const addedEdges = [];
  const removedEdges = [];

  for (const [id, node] of plannedNodes) {
    if (!previousNodes.has(id)) {
      addedNodes.push(id);
      continue;
    }
    if (JSON.stringify(previousNodes.get(id)) === JSON.stringify(node)) {
      unchangedNodes.push(id);
    } else {
      changedNodes.push(id);
    }
  }
  for (const id of previousNodes.keys()) {
    if (!plannedNodes.has(id)) {
      removedNodes.push(id);
    }
  }
  for (const id of plannedEdges.keys()) {
    if (!previousEdges.has(id)) {
      addedEdges.push(id);
    }
  }
  for (const id of previousEdges.keys()) {
    if (!plannedEdges.has(id)) {
      removedEdges.push(id);
    }
  }
  return {
    added_nodes: addedNodes.sort(),
    changed_nodes: changedNodes.sort(),
    removed_nodes: removedNodes.sort(),
    added_edges: addedEdges.sort(),
    removed_edges: removedEdges.sort(),
    unchanged_nodes: unchangedNodes.sort(),
    counts: {
      added_nodes: addedNodes.length,
      changed_nodes: changedNodes.length,
      removed_nodes: removedNodes.length,
      added_edges: addedEdges.length,
      removed_edges: removedEdges.length,
      unchanged_nodes: unchangedNodes.length
    }
  };
}

function diffFields(diff) {
  return {
    added_nodes: diff.added_nodes,
    changed_nodes: diff.changed_nodes,
    removed_nodes: diff.removed_nodes,
    added_edges: diff.added_edges,
    removed_edges: diff.removed_edges,
    unchanged_nodes: diff.unchanged_nodes
  };
}

/**
 * @returns {import("./types.d.ts").StructureSummary}
 */
function summarizeStructureGraph(graph) {
  const nodesByType = {};
  const edgesByRelation = {};
  for (const node of graph.nodes || []) {
    nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
  }
  for (const edge of graph.edges || []) {
    edgesByRelation[edge.relation] = (edgesByRelation[edge.relation] || 0) + 1;
  }
  return {
    node_count: graph.nodes?.length || 0,
    edge_count: graph.edges?.length || 0,
    nodes_by_type: sortRecord(nodesByType),
    edges_by_relation: sortRecord(edgesByRelation),
    project_root_node: /** @type {"project.root"} */ ("project.root")
  };
}

/**
 * @returns {import("./types.d.ts").SyncStatusFile}
 */
function buildAppliedStatus({ cwd, plan, previousStatus, generatedAt }) {
  const existingIdentityRevision = previousStatus?.identity_built_from_revision || null;
  const identityCurrent = existingIdentityRevision && existingIdentityRevision === plan.state_revision;
  return {
    schema_version: STRUCTURE_GRAPH_SCHEMA_VERSION,
    status_version: STRUCTURE_STATUS_VERSION,
    generated_at: generatedAt,
    last_sync_at: generatedAt,
    project_id: plan.project.project_id,
    project_name: plan.project.project_name,
    state_revision: plan.state_revision,
    previous_revision: plan.previous_revision,
    current_revision: plan.state_revision,
    planned_revision: plan.state_revision,
    diff: plan.diff,
    ...diffFields(plan.diff),
    changed: /** @type {false} */ (false),
    freshness: {
      status: /** @type {"current"} */ ("current"),
      changed: false,
      reason: "Structure state matches the last applied sync."
    },
    structure_file: structureFiles(cwd).index,
    status_file: structureFiles(cwd).status,
    identity_built_from_revision: existingIdentityRevision,
    identity_status: identityCurrent ? /** @type {"current"} */ ("current") : /** @type {"stale"} */ ("stale"),
    identity_file: previousStatus?.identity_file || null,
    identity_summary_file: previousStatus?.identity_summary_file || null,
    identity_warning: identityCurrent ? null : "Identity has not been rebuilt from the latest structure revision.",
    readOnly: /** @type {false} */ (false),
    mutates: /** @type {true} */ (true)
  };
}

/**
 * @returns {import("./types.d.ts").SyncFreshness}
 */
function freshnessForRevision(previousRevision, currentRevision) {
  if (!previousRevision) {
    return {
      status: /** @type {"missing"} */ ("missing"),
      changed: true,
      reason: "No structure sync has been applied yet."
    };
  }
  if (previousRevision !== currentRevision) {
    return {
      status: /** @type {"stale"} */ ("stale"),
      changed: true,
      reason: "Repository structure differs from the last applied sync."
    };
  }
  return {
    status: /** @type {"current"} */ ("current"),
    changed: false,
    reason: "Repository structure matches the last applied sync."
  };
}

function identityStatusFor(status, currentRevision) {
  if (!status) {
    return "stale";
  }
  if (status.identity_status === "stale") {
    return "stale";
  }
  if (!status.identity_built_from_revision || status.identity_built_from_revision !== currentRevision) {
    return "stale";
  }
  return "current";
}

function structureFiles(cwd) {
  const paths = workspacePaths(cwd);
  return {
    index: normalizeRelativePath(path.relative(cwd, paths.structureIndex)),
    status: normalizeRelativePath(path.relative(cwd, paths.structureStatus))
  };
}

function formatProject(project) {
  return {
    project_id: project.project_id || null,
    project_name: project.project_name || ""
  };
}

function addDiagnostic(warnings, diagnostics, code, message, hint) {
  warnings.push(message);
  diagnostics.warnings.push({ code, message, hint });
}

function emptyDiagnostics() {
  return {
    errors: [],
    warnings: [],
    repairs: []
  };
}

function safeReadDir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function safeReadText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function isDirectory(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

function isIgnoredDirectory(name, relPath) {
  if (IGNORED_DIR_NAMES.has(name)) {
    return true;
  }
  if (ASSET_DIR_NAMES.has(String(name || "").toLowerCase())) {
    return true;
  }
  const parts = normalizeRelativePath(relPath).split("/");
  return parts.some((part) => GENERATED_DIR_NAMES.has(part));
}

function isGeneratedOrBinaryFile(relPath) {
  const normalized = normalizeRelativePath(relPath);
  const basename = path.posix.basename(normalized);
  const ext = path.posix.extname(normalized).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext) || ASSET_EXTENSIONS.has(ext)) {
    return true;
  }
  if (/\.min\.(?:js|css)$/.test(basename) || basename.endsWith(".map") || basename.endsWith("~") || /^\.(?:DS_Store|tmp|temp)/i.test(basename)) {
    return true;
  }
  if (basename.endsWith(".lock") || basename === "package-lock.json" || basename === "yarn.lock" || basename === "pnpm-lock.yaml") {
    return true;
  }
  return normalized.split("/").some((part) => GENERATED_DIR_NAMES.has(part));
}

function isSourceRoot(value) {
  return ["app", "apps", "lib", "packages", "server", "services", "src"].includes(value);
}

function isSourcePath(relPath) {
  const parts = relPath.split("/");
  return parts.some((part) => isSourceRoot(part));
}

function isDocsPath(relPath) {
  return relPath.split("/").some((part) => ["doc", "docs", "documentation"].includes(part.toLowerCase()));
}

function isTestPath(relPath) {
  const parts = relPath.split("/");
  const basename = path.posix.basename(relPath);
  return parts.some((part) => ["test", "tests", "__tests__"].includes(part.toLowerCase()))
    || /\.(test|spec)\.[A-Za-z0-9]+$/.test(basename)
    || /[-_.]test\.[A-Za-z0-9]+$/.test(basename);
}

function isInfrastructurePath(relPath) {
  const parts = relPath.split("/").map((part) => part.toLowerCase());
  return parts.some((part) => [".github", "config", "configs", "deploy", "deployment", "docker", "infra", "infrastructure", "k8s", "kubernetes", "ops"].includes(part));
}

function isDatastorePath(relPath) {
  const parts = relPath.split("/").map((part) => part.toLowerCase());
  return parts.some((part) => ["data", "database", "datastore", "db", "migrations", "prisma"].includes(part));
}

function labelForPath(relPath) {
  if (!relPath || relPath === ".") {
    return "Project";
  }
  return path.posix.basename(relPath);
}

function semanticLabelForPath(relPath) {
  const basename = path.posix.basename(relPath, path.posix.extname(relPath));
  return basename
    .replace(/\.(controller|service|repository|repo|route|routes|config|configuration|entity|test|spec)$/i, " $1")
    .replace(/[-_.]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim() || labelForPath(relPath);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function slugId(value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/[^a-z0-9가-힣_.-]+/gi, "-")
    .replace(/[_.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
  return slug || shortHash(value);
}

function shortHash(value, length = 12) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, length);
}

function normalizeRelativePath(value) {
  const normalized = String(value || ".").split(path.sep).join("/");
  return normalized.replace(/^\.\//, "") || ".";
}

function cleanMetadata(value) {
  return stableObject(value);
}

function stableObject(value) {
  if (Array.isArray(value)) {
    return value.map(stableObject);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined && item !== "")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableObject(item)])
  );
}

function sortRecord(value) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

function compareById(left, right) {
  return String(left.id).localeCompare(String(right.id));
}

function compareStable(left, right) {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}
