import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveReleaseMetadata } from "../scripts/resolve-release-metadata.js";

const ROOT = process.cwd();
const ORANGE_BIN = new URL("../bin/orange.js", import.meta.url);
const README_FILES = ["README.md", "README.en.md", "README.zh-CN.md", "README.ja.md"];
const EXPECTED_README_VERSION = "1.1-doc.11";
const ISSUE_FORM_FILES = [
  ".github/ISSUE_TEMPLATE/beta-bug.yml",
  ".github/ISSUE_TEMPLATE/beta-feedback.yml"
];

test("release metadata marks alpha, beta, and rc tags as GitHub prereleases", () => {
  assert.deepEqual(resolveReleaseMetadata("v1.1.0"), {
    release_tag: "v1.1.0",
    version: "1.1.0",
    npm_tag: "latest",
    is_prerelease: false
  });
  assert.deepEqual(resolveReleaseMetadata("v1.1.0-alpha.8"), {
    release_tag: "v1.1.0-alpha.8",
    version: "1.1.0-alpha.8",
    npm_tag: "alpha",
    is_prerelease: true
  });
  assert.deepEqual(resolveReleaseMetadata("v1.1.0-beta.1"), {
    release_tag: "v1.1.0-beta.1",
    version: "1.1.0-beta.1",
    npm_tag: "beta",
    is_prerelease: true
  });
  assert.deepEqual(resolveReleaseMetadata("v1.1.0-rc.1"), {
    release_tag: "v1.1.0-rc.1",
    version: "1.1.0-rc.1",
    npm_tag: "rc",
    is_prerelease: true
  });
});

test("closed beta docs are linked from all READMEs and expose gate boundaries", () => {
  for (const file of README_FILES) {
    const source = read(file);
    assert.match(source, new RegExp(`README version:\\s*\`${escapeRegExp(EXPECTED_README_VERSION)}\``), file);
    assert.match(source, /docs\/28_CLOSED_BETA_PROGRAM\.md/, file);
    assert.match(source, /docs\/29_BETA_TEST_CHECKLIST\.md/, file);
  }

  const program = read("docs/28_CLOSED_BETA_PROGRAM.md");
  assert.match(program, /Closed Beta status: `open`/);
  assert.match(program, /Primary validated:/);
  assert.match(program, /Exploratory:/);
  assert.match(program, /Do not use this beta in production-critical/);
  assert.match(program, /orange binding plan --host codex --scope user --json/);
  assert.match(program, /orange activate status --host codex --json/);
  assert.match(program, /raw prompts?/i);
  assert.match(program, /Do not measure or infer:/);
  assert.match(program, /v1\.1\.0-beta\.1/);

  const checklist = read("docs/29_BETA_TEST_CHECKLIST.md");
  const scenarioRows = checklist
    .split(/\r?\n/)
    .filter((line) => /^\| \d+ \|/.test(line));
  assert.equal(scenarioRows.length, 21);
  assert.match(checklist, /pass/);
  assert.match(checklist, /fail/);
  assert.match(checklist, /blocked/);
  assert.match(checklist, /not applicable/);
  assert.match(checklist, /not verified/);
  assert.match(checklist, /No `package\.json`, `package-lock\.json`, or `node_modules` was created/);
});

test("closed beta issue forms are valid JSON-compatible YAML with privacy confirmation", () => {
  for (const file of ISSUE_FORM_FILES) {
    const form = JSON.parse(read(file));
    assert.equal(typeof form.name, "string", file);
    assert.ok(Array.isArray(form.body), file);
    const privacy = form.body.find((item) => item.id === "privacy_confirmation");
    assert.ok(privacy, `${file} should include a privacy confirmation checkbox`);
    assert.equal(privacy.type, "checkboxes");
    const text = JSON.stringify(form);
    assert.match(text, /raw prompts/i);
    assert.match(text, /raw transcripts/i);
    assert.match(text, /credentials/i);
    assert.match(text, /tokens/i);
    assert.match(text, /secrets/i);
    assert.match(text, /private absolute paths/i);
  }
});

test("safe diagnostic fixture excludes raw prompt, private path, and secret-looking values", () => {
  const fixture = JSON.parse(read("fixtures/beta-diagnostics/sanitized-json-evidence.json"));
  const text = JSON.stringify(fixture);
  assert.doesNotMatch(text, /raw[_ -]?prompt/i);
  assert.doesNotMatch(text, /raw[_ -]?transcript/i);
  assert.doesNotMatch(text, /\/Users\/[A-Za-z0-9_.-]+/);
  assert.doesNotMatch(text, /[A-Za-z]:\\\\Users\\\\/);
  assert.doesNotMatch(text, /(?:api[_-]?key|secret|token|credential)["':= ]+[A-Za-z0-9_./+=-]{8,}/i);
  assert.doesNotMatch(text, /\b[A-Za-z0-9_-]{32,}\b/);
});

test("closed beta activation path does not create project npm files", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "orange-beta-non-node-"));
  fs.writeFileSync(path.join(cwd, "README.md"), "# Closed beta non-Node fixture\n");
  fs.mkdirSync(path.join(cwd, "src"));
  fs.writeFileSync(path.join(cwd, "src", "main.py"), "print('ok')\n");
  const env = {
    ...process.env,
    ORANGE_HYPER_HOME: fs.mkdtempSync(path.join(os.tmpdir(), "orange-beta-home-"))
  };

  assertJsonCommand(runOrange(["activate", "plan", "--host", "codex", "--scope", "project", "--json"], cwd, env), "activation.plan");
  assertJsonCommand(runOrange(["activate", "apply", "--host", "codex", "--scope", "project", "--json"], cwd, env), "activation.apply");
  assertJsonCommand(runOrange(["activate", "status", "--host", "codex", "--json"], cwd, env), "activation.status");

  for (const name of ["package.json", "package-lock.json", "node_modules"]) {
    assert.equal(fs.existsSync(path.join(cwd, name)), false, `${name} should not be created`);
  }
});

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function runOrange(args, cwd, env) {
  return spawnSync(process.execPath, [ORANGE_BIN.pathname, ...args], {
    cwd,
    env,
    encoding: "utf8"
  });
}

function assertJsonCommand(result, command) {
  assert.equal(result.status, 0, `${command}: ${result.stderr || result.stdout}`);
  assert.equal(result.stderr, "", command);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true, command);
  assert.equal(payload.contract_version, "0.1", command);
  assert.equal(payload.command, command);
  return payload;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
