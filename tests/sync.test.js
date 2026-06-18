import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { initWorkspace } from "../src/core/config.js";
import { acceptMemoryDelta, proposeMemoryDelta } from "../src/core/memory.js";
import { workspacePaths } from "../src/core/paths.js";
import { completeQuest, createQuest } from "../src/core/quest.js";

const ORANGE_BIN = new URL("../bin/orange.js", import.meta.url);

function tempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "orange-sync-test-"));
}

test("init supports JSON output for project bootstrap", () => {
  const cwd = tempWorkspace();

  const payload = assertJsonCommand(runOrange(["init", "--json"], cwd), "project.init");

  assert.equal(payload.data.initialized, true);
  assert.equal(payload.data.already_initialized, false);
  assert.equal(payload.data.idempotent, true);
  assert.match(payload.data.project_id, /^project_/);
  assert.equal(payload.data.project_name, path.basename(cwd));
  assert.equal(payload.data.root, ".orange-hyper");
  assert.ok(payload.data.created_paths.includes(".orange-hyper/config.json"));
  assert.deepEqual(payload.data.preserved_paths, []);
  assert.equal(payload.data.files.root, ".orange-hyper");
  assert.equal(payload.data.files.config, ".orange-hyper/config.json");
  assert.equal(payload.data.project.project_name, path.basename(cwd));
  assert.match(payload.data.project.project_id, /^project_/);
  assert.equal(fs.existsSync(workspacePaths(cwd).root), true);
});

test("init JSON re-run is a no-op that preserves existing project state", () => {
  const cwd = tempWorkspace();
  assertJsonCommand(runOrange(["init", "--json"], cwd), "project.init");
  const paths = workspacePaths(cwd);
  const configBefore = fs.readFileSync(paths.config, "utf8");
  fs.writeFileSync(path.join(paths.completedQuests, "manual.md"), "---\nid: manual\n---\n");
  const payload = assertJsonCommand(runOrange(["init", "--json"], cwd), "project.init");

  assert.equal(payload.data.initialized, true);
  assert.equal(payload.data.already_initialized, true);
  assert.deepEqual(payload.data.created_paths, []);
  assert.ok(payload.data.preserved_paths.includes(".orange-hyper/config.json"));
  assert.ok(payload.data.preserved_paths.includes(".orange-hyper/graph/index.json"));
  assert.equal(fs.readFileSync(paths.config, "utf8"), configBefore);
  assert.equal(fs.existsSync(path.join(paths.completedQuests, "manual.md")), true);
});

test("sync plan is read-only and does not write structure state", () => {
  const cwd = fixtureProject();
  initWorkspace(cwd, { projectName: "sync-plan-read-only" });
  const before = snapshotOrangeFiles(cwd);

  const payload = assertJsonCommand(runOrange(["sync", "plan", "--json"], cwd), "sync.plan");

  assert.equal(payload.data.readOnly, true);
  assert.equal(payload.data.mutates, false);
  assert.equal(payload.data.writes.length, 0);
  assert.equal(payload.data.current_revision, null);
  assert.equal(payload.data.planned_revision, payload.data.state_revision);
  assert.ok(payload.data.added_nodes.includes("project.root"));
  assert.equal(payload.data.graph.nodes.some((node) => node.id === "project.root"), true);
  assert.equal(fs.existsSync(workspacePaths(cwd).structureIndex), false);
  assert.deepEqual(snapshotOrangeFiles(cwd), before);
});

test("sync apply creates deterministic Structure Graph state and refreshes Identity HTML", () => {
  const cwd = fixtureProject();
  const paths = initWorkspace(cwd, { projectName: "sync-apply-demo" });

  const first = assertJsonCommand(runOrange(["sync", "apply", "--json"], cwd), "sync.apply");
  assert.equal(first.data.applied, true);
  assert.equal(first.data.files.index, ".orange-hyper/structure/index.json");
  assert.equal(first.data.files.status, ".orange-hyper/structure/status.json");
  assert.equal(first.data.identity.status, "current");
  assert.equal(first.data.current_revision, null);
  assert.equal(first.data.planned_revision, first.data.state_revision);
  assert.ok(first.data.added_nodes.length > 0);
  assert.equal(fs.existsSync(paths.structureIndex), true);
  assert.equal(fs.existsSync(paths.structureStatus), true);
  assert.equal(fs.existsSync(paths.identityHtml), true);

  const index = JSON.parse(fs.readFileSync(paths.structureIndex, "utf8"));
  const status = JSON.parse(fs.readFileSync(paths.structureStatus, "utf8"));
  assert.equal(index.state_revision, first.data.state_revision);
  assert.equal(status.state_revision, first.data.state_revision);
  assert.equal(status.identity_status, "current");
  assert.equal(status.identity_built_from_revision, first.data.state_revision);
  assert.equal(index.nodes.some((node) => node.id === "project.root" && node.type === "project"), true);
  assert.equal(index.nodes.some((node) => node.id === "module.backend"), true);
  assert.equal(index.nodes.some((node) => node.id === "domain.backend-src-user"), true);
  assert.equal(index.nodes.some((node) => node.id === "component.backend-src-user-user-service" && node.role === "service"), true);
  assert.equal(index.nodes.some((node) => node.id.includes("node_modules")), false);
  assert.equal(index.nodes.some((node) => node.path?.startsWith("dist")), false);
  assert.equal(index.edges.some((edge) => edge.relation === "contains"), true);
  assert.equal(index.edges.some((edge) => edge.relation === "tests"), true);
  assert.equal(index.edges.some((edge) => edge.relation === "documents"), true);
  assert.equal(index.edges.some((edge) => edge.relation === "configures"), true);

  const nodeIds = index.nodes.map((node) => node.id);
  const second = assertJsonCommand(runOrange(["sync", "apply", "--json"], cwd), "sync.apply");
  const secondIndex = JSON.parse(fs.readFileSync(paths.structureIndex, "utf8"));
  assert.deepEqual(secondIndex.nodes.map((node) => node.id), nodeIds);
  assert.equal(second.data.state_revision, first.data.state_revision);
  assert.equal(second.data.added_nodes.length, 0);
  assert.equal(second.data.changed_nodes.length, 0);
  assert.equal(second.data.removed_nodes.length, 0);
  assert.equal(second.data.added_edges.length, 0);
  assert.equal(second.data.removed_edges.length, 0);
  assert.equal(second.data.unchanged_nodes.length, nodeIds.length);

  const syncStatus = assertJsonCommand(runOrange(["sync", "status", "--json"], cwd), "sync.status");
  assert.equal(syncStatus.data.changed, false);
  assert.equal(syncStatus.data.freshness.status, "current");
  assert.equal(syncStatus.data.identity_status, "current");
  assert.equal(syncStatus.data.added_nodes.length, 0);
  assert.equal(syncStatus.data.changed_nodes.length, 0);
  assert.equal(syncStatus.data.removed_nodes.length, 0);
  assert.equal(syncStatus.data.added_edges.length, 0);
  assert.equal(syncStatus.data.removed_edges.length, 0);
});

test("sync status detects freshness changes without mutating state", () => {
  const cwd = fixtureProject();
  initWorkspace(cwd, { projectName: "sync-status-demo" });
  assertJsonCommand(runOrange(["sync", "apply", "--json"], cwd), "sync.apply");
  const before = snapshotOrangeFiles(cwd);

  fs.mkdirSync(path.join(cwd, "src", "user"), { recursive: true });
  fs.writeFileSync(path.join(cwd, "src", "user", "profile-service.js"), "export const profile = true;\n");
  const status = assertJsonCommand(runOrange(["sync", "status", "--json"], cwd), "sync.status");

  assert.equal(status.data.readOnly, true);
  assert.equal(status.data.changed, true);
  assert.equal(status.data.freshness.status, "stale");
  assert.ok(status.data.added_nodes.includes("component.src-user-profile-service"));
  assert.deepEqual(snapshotOrangeFiles(cwd), before);
});

test("sync plan reports added and removed semantic nodes before apply", () => {
  const cwd = fixtureProject();
  initWorkspace(cwd, { projectName: "sync-diff-demo" });
  assertJsonCommand(runOrange(["sync", "apply", "--json"], cwd), "sync.apply");

  fs.unlinkSync(path.join(cwd, "backend", "src", "user", "user-service.js"));
  fs.writeFileSync(path.join(cwd, "backend", "src", "user", "user-controller.js"), "export function userController() { return true; }\n");
  const plan = assertJsonCommand(runOrange(["sync", "plan", "--json"], cwd), "sync.plan");

  assert.equal(plan.data.changed, true);
  assert.ok(plan.data.removed_nodes.includes("component.backend-src-user-user-service"));
  assert.ok(plan.data.added_nodes.includes("component.backend-src-user-user-controller"));
  assert.notEqual(plan.data.current_revision, plan.data.planned_revision);

  const apply = assertJsonCommand(runOrange(["sync", "apply", "--json"], cwd), "sync.apply");
  assert.ok(apply.data.removed_nodes.includes("component.backend-src-user-user-service"));
  assert.ok(apply.data.added_nodes.includes("component.backend-src-user-user-controller"));
  const index = JSON.parse(fs.readFileSync(workspacePaths(cwd).structureIndex, "utf8"));
  assert.equal(index.nodes.some((node) => node.id === "component.backend-src-user-user-service"), false);
  assert.equal(index.nodes.some((node) => node.id === "component.backend-src-user-user-controller"), true);
});

test("Node fixture produces role-based structure rather than a flat source file list", () => {
  const cwd = nodeFixtureProject();
  initWorkspace(cwd, { projectName: "node-structure-demo" });
  const plan = assertJsonCommand(runOrange(["sync", "plan", "--json"], cwd), "sync.plan");
  const nodes = plan.data.graph.nodes;

  assertStructureRole(nodes, "component.src-routes-users", "route");
  assertStructureRole(nodes, "component.src-controllers-user-controller", "controller");
  assertStructureRole(nodes, "component.src-services-user-service", "service");
  assertStructureRole(nodes, "component.src-repositories-user-repository", "repository");
  assertStructureRole(nodes, "infrastructure.src-config-database-config", "config");
  assertStructureRole(nodes, "test.tests-user-service-test", "test");
  assert.equal(nodes.some((node) => node.path === "src/utils/format.js"), false);
  assert.equal(nodes.some((node) => node.path === "package-lock.json"), false);
  assert.equal(nodes.some((node) => node.path?.startsWith("assets")), false);
});

test("Spring fixture produces role-based structure nodes", () => {
  const cwd = springFixtureProject();
  initWorkspace(cwd, { projectName: "spring-structure-demo" });
  const plan = assertJsonCommand(runOrange(["sync", "plan", "--json"], cwd), "sync.plan");
  const nodes = plan.data.graph.nodes;

  assertStructureRole(nodes, "component.src-main-java-com-example-user-usercontroller", "Controller");
  assertStructureRole(nodes, "component.src-main-java-com-example-user-userservice", "Service");
  assertStructureRole(nodes, "component.src-main-java-com-example-user-userrepository", "Repository");
  assertStructureRole(nodes, "datastore.src-main-java-com-example-user-user", "Entity");
  assertStructureRole(nodes, "infrastructure.src-main-java-com-example-config-appconfig", "Configuration");
  assertStructureRole(nodes, "test.src-test-java-com-example-user-userservicetest", "Test");
  assert.equal(nodes.some((node) => node.path?.startsWith("target")), false);
});

test("sync preserves accepted memory and marks vanished structure links as orphaned", () => {
  const cwd = fixtureProject();
  const paths = initWorkspace(cwd, { projectName: "memory-overlay-demo" });
  assertJsonCommand(runOrange(["sync", "apply", "--json"], cwd), "sync.apply");
  createAcceptedMemory(cwd, "remember service shape", ["backend/src/user/user-service.js"]);
  createAcceptedMemory(cwd, "remember project convention", []);
  const acceptedBefore = snapshotAcceptedMemory(cwd);

  assertJsonCommand(runOrange(["identity", "build", "--json"], cwd), "identity.build");
  let summary = JSON.parse(fs.readFileSync(paths.identitySummaryJson, "utf8"));
  assert.equal(summary.memory_mapping.mapped, 1);
  assert.equal(summary.memory_mapping.unmapped, 1);
  assert.equal(summary.memory_mapping.orphaned, 0);

  fs.unlinkSync(path.join(cwd, "backend", "src", "user", "user-service.js"));
  const apply = assertJsonCommand(runOrange(["sync", "apply", "--json"], cwd), "sync.apply");
  assert.equal(apply.data.removed_nodes.includes("component.backend-src-user-user-service"), true);
  assert.deepEqual(snapshotAcceptedMemory(cwd), acceptedBefore);

  summary = JSON.parse(fs.readFileSync(paths.identitySummaryJson, "utf8"));
  assert.equal(summary.memory_mapping.mapped, 0);
  assert.equal(summary.memory_mapping.unmapped, 1);
  assert.equal(summary.memory_mapping.orphaned, 1);
  assert.ok(summary.memoryGraph.nodes.some((node) => node.mapping_status === "orphaned"));
  assert.ok(summary.identityGraph.nodes.some((node) => node.id === "orphaned-memory"));
});

test("identity refresh failure keeps structure state and reports stale diagnostics", () => {
  const cwd = fixtureProject();
  const paths = initWorkspace(cwd, { projectName: "identity-stale-demo" });
  fs.writeFileSync(paths.identity, "not a directory\n");

  const apply = assertJsonCommand(runOrange(["sync", "apply", "--json"], cwd), "sync.apply");
  assert.equal(apply.data.applied, true);
  assert.equal(apply.data.identity.status, "stale");
  assert.match(apply.data.identity.warning, /EEXIST|ENOTDIR|not a directory/);
  assert.equal(fs.existsSync(paths.structureIndex), true);
  assert.equal(fs.existsSync(paths.structureStatus), true);

  const doctor = assertJsonCommand(runOrange(["doctor", "--json"], cwd), "doctor.run");
  assert.equal(doctor.data.diagnostics.warnings.some((item) => item.code === "IDENTITY_BUILD_FAILED"), true);
  const diagnostic = doctor.data.diagnostics.warnings.find((item) => item.code === "IDENTITY_BUILD_FAILED");
  assert.match(diagnostic.message, /identity build failed/);
  assert.match(diagnostic.hint, /orange identity build --json/);
});

function fixtureProject() {
  const cwd = tempWorkspace();
  fs.mkdirSync(path.join(cwd, "backend", "src", "user"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "backend", "test"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "docs"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "config"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "node_modules", "ignored"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "dist"), { recursive: true });
  fs.writeFileSync(path.join(cwd, "package.json"), JSON.stringify({
    name: "fixture",
    workspaces: ["backend"],
    dependencies: { express: "^5.0.0" }
  }, null, 2));
  fs.writeFileSync(path.join(cwd, "backend", "package.json"), JSON.stringify({ name: "backend" }, null, 2));
  fs.writeFileSync(path.join(cwd, "backend", "src", "user", "user-service.js"), "export function userService() { return true; }\n");
  fs.writeFileSync(path.join(cwd, "backend", "test", "user-service.test.js"), "import '../src/user/user-service.js';\n");
  fs.writeFileSync(path.join(cwd, "docs", "architecture.md"), "# Architecture\n");
  fs.writeFileSync(path.join(cwd, "config", "app.yaml"), "name: fixture\n");
  fs.writeFileSync(path.join(cwd, "node_modules", "ignored", "ignored.js"), "ignored\n");
  fs.writeFileSync(path.join(cwd, "dist", "generated.js"), "ignored\n");
  return cwd;
}

function nodeFixtureProject() {
  const cwd = tempWorkspace();
  fs.mkdirSync(path.join(cwd, "src", "routes"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "src", "controllers"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "src", "services"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "src", "repositories"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "src", "config"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "src", "utils"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "tests"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "assets"), { recursive: true });
  fs.writeFileSync(path.join(cwd, "package.json"), JSON.stringify({ name: "node-fixture", type: "module" }, null, 2));
  fs.writeFileSync(path.join(cwd, "package-lock.json"), "{}\n");
  fs.writeFileSync(path.join(cwd, "src", "routes", "users.js"), "export const usersRoute = true;\n");
  fs.writeFileSync(path.join(cwd, "src", "controllers", "user-controller.js"), "export const userController = true;\n");
  fs.writeFileSync(path.join(cwd, "src", "services", "user-service.js"), "export const userService = true;\n");
  fs.writeFileSync(path.join(cwd, "src", "repositories", "user-repository.js"), "export const userRepository = true;\n");
  fs.writeFileSync(path.join(cwd, "src", "config", "database-config.js"), "export const databaseConfig = true;\n");
  fs.writeFileSync(path.join(cwd, "src", "utils", "format.js"), "export const format = true;\n");
  fs.writeFileSync(path.join(cwd, "tests", "user-service.test.js"), "import '../src/services/user-service.js';\n");
  fs.writeFileSync(path.join(cwd, "assets", "logo.svg"), "<svg />\n");
  return cwd;
}

function springFixtureProject() {
  const cwd = tempWorkspace();
  fs.mkdirSync(path.join(cwd, "src", "main", "java", "com", "example", "user"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "src", "main", "java", "com", "example", "config"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "src", "test", "java", "com", "example", "user"), { recursive: true });
  fs.mkdirSync(path.join(cwd, "target", "classes"), { recursive: true });
  fs.writeFileSync(path.join(cwd, "pom.xml"), "<project><modelVersion>4.0.0</modelVersion></project>\n");
  fs.writeFileSync(path.join(cwd, "src", "main", "java", "com", "example", "user", "UserController.java"), "@RestController\nclass UserController {}\n");
  fs.writeFileSync(path.join(cwd, "src", "main", "java", "com", "example", "user", "UserService.java"), "@Service\nclass UserService {}\n");
  fs.writeFileSync(path.join(cwd, "src", "main", "java", "com", "example", "user", "UserRepository.java"), "@Repository\ninterface UserRepository {}\n");
  fs.writeFileSync(path.join(cwd, "src", "main", "java", "com", "example", "user", "User.java"), "@Entity\nclass User {}\n");
  fs.writeFileSync(path.join(cwd, "src", "main", "java", "com", "example", "config", "AppConfig.java"), "@Configuration\nclass AppConfig {}\n");
  fs.writeFileSync(path.join(cwd, "src", "test", "java", "com", "example", "user", "UserServiceTest.java"), "class UserServiceTest {}\n");
  fs.writeFileSync(path.join(cwd, "target", "classes", "Ignored.class"), "ignored\n");
  return cwd;
}

function createAcceptedMemory(cwd, title, paths) {
  const quest = createQuest(cwd, title, {
    layer: "L2",
    paths,
    expectedVerification: ["sync overlay checked"]
  });
  completeQuest(cwd, quest.id, {
    evidence: ["sync overlay checked"]
  });
  const proposal = proposeMemoryDelta(cwd, quest.id, {
    nodeType: "decision"
  });
  return acceptMemoryDelta(cwd, proposal.data.id);
}

function snapshotAcceptedMemory(cwd) {
  const root = workspacePaths(cwd).acceptedMemoryDeltaProposals;
  const graphRoot = workspacePaths(cwd).graphNodes;
  const entries = {};
  for (const filePath of [...filesUnder(root), ...filesUnder(graphRoot)]) {
    const relative = path.relative(cwd, filePath).split(path.sep).join("/");
    entries[relative] = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  }
  return entries;
}

function assertStructureRole(nodes, id, role) {
  const node = nodes.find((item) => item.id === id);
  assert.ok(node, `missing structure node ${id}`);
  assert.equal(node.role, role);
}

function snapshotOrangeFiles(cwd) {
  const root = workspacePaths(cwd).root;
  const entries = {};
  for (const filePath of filesUnder(root)) {
    const relative = path.relative(cwd, filePath).split(path.sep).join("/");
    entries[relative] = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  }
  return entries;
}

function filesUnder(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return filesUnder(filePath);
    }
    return entry.isFile() ? [filePath] : [];
  }).sort();
}

function runOrange(args, cwd) {
  return spawnSync(process.execPath, [ORANGE_BIN.pathname, ...args], {
    cwd,
    encoding: "utf8"
  });
}

function assertJsonCommand(result, command) {
  assert.equal(result.status, 0, `${command}: ${result.stderr || result.stdout}`);
  assert.equal(result.stderr, "", command);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.command, command);
  return payload;
}
