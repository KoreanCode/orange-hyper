import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { initWorkspace } from "../src/core/config.js";
import { workspacePaths } from "../src/core/paths.js";

const ORANGE_BIN = new URL("../bin/orange.js", import.meta.url);

function tempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "orange-sync-test-"));
}

test("init supports JSON output for project bootstrap", () => {
  const cwd = tempWorkspace();

  const payload = assertJsonCommand(runOrange(["init", "--json"], cwd), "project.init");

  assert.equal(payload.data.initialized, true);
  assert.equal(payload.data.idempotent, true);
  assert.equal(payload.data.files.root, ".orange-hyper");
  assert.equal(payload.data.files.config, ".orange-hyper/config.json");
  assert.equal(payload.data.project.project_name, path.basename(cwd));
  assert.match(payload.data.project.project_id, /^project_/);
  assert.equal(fs.existsSync(workspacePaths(cwd).root), true);
});

test("sync plan is read-only and does not write structure state", () => {
  const cwd = fixtureProject();
  initWorkspace(cwd, { projectName: "sync-plan-read-only" });
  const before = snapshotOrangeFiles(cwd);

  const payload = assertJsonCommand(runOrange(["sync", "plan", "--json"], cwd), "sync.plan");

  assert.equal(payload.data.readOnly, true);
  assert.equal(payload.data.mutates, false);
  assert.equal(payload.data.writes.length, 0);
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

  const syncStatus = assertJsonCommand(runOrange(["sync", "status", "--json"], cwd), "sync.status");
  assert.equal(syncStatus.data.changed, false);
  assert.equal(syncStatus.data.freshness.status, "current");
  assert.equal(syncStatus.data.identity_status, "current");
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
  assert.deepEqual(snapshotOrangeFiles(cwd), before);
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
