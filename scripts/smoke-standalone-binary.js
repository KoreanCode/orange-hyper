#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
const binary = path.resolve(args.binary || "");

if (!binary || !fs.existsSync(binary)) {
  throw new Error(`Standalone binary does not exist: ${binary}`);
}

const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "orange-standalone-smoke-"));
fs.mkdirSync(path.join(cwd, "src"), { recursive: true });
fs.writeFileSync(path.join(cwd, "src", "service.py"), "def service():\n    return True\n");
fs.writeFileSync(path.join(cwd, "README.md"), "# Standalone smoke\n");

const env = minimalEnv(cwd);

run(["--version"]);
run(["--help"]);
assertJson(run(["env", "--json"]), "environment.show", (payload) => {
  if (payload.data.distribution !== "standalone") {
    throw new Error(`Expected standalone distribution, got ${payload.data.distribution}`);
  }
  if (payload.data.node_runtime_embedded !== true) {
    throw new Error("Expected embedded Node runtime.");
  }
});
assertJson(run(["init", "--json"]), "project.init");
assertJson(run(["sync", "plan", "--json"]), "sync.plan");
assertJson(run(["sync", "apply", "--json"]), "sync.apply");
assertJson(run(["sync", "status", "--json"]), "sync.status");
assertJson(run(["identity", "build", "--json"]), "identity.build");
assertJson(run(["doctor", "--json"]), "doctor.run");

for (const name of ["package.json", "package-lock.json", "node_modules"]) {
  const target = path.join(cwd, name);
  if (fs.existsSync(target)) {
    throw new Error(`${name} should not be created in standalone smoke.`);
  }
}

if (!fs.existsSync(path.join(cwd, ".orange-hyper"))) {
  throw new Error(".orange-hyper should be created in standalone smoke.");
}

console.log(`Standalone smoke OK: ${binary}`);
console.log(`Smoke project: ${cwd}`);

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      throw new Error(`Unexpected argument: ${value}`);
    }
    const key = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`--${key} requires a value.`);
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function run(commandArgs) {
  const result = spawnSync(binary, commandArgs, {
    cwd,
    env,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${binary} ${commandArgs.join(" ")}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
  return result.stdout;
}

function assertJson(raw, command, inspect = null) {
  const payload = JSON.parse(raw);
  if (payload.ok !== true) {
    throw new Error(`${command} did not return ok=true.`);
  }
  if (payload.contract_version !== "0.1") {
    throw new Error(`${command} changed contract_version: ${payload.contract_version}`);
  }
  if (payload.command !== command) {
    throw new Error(`Expected command ${command}, got ${payload.command}`);
  }
  if (inspect) {
    inspect(payload);
  }
  return payload;
}

function minimalEnv(home) {
  const env = {
    PATH: "",
    HOME: home,
    TMPDIR: os.tmpdir(),
    TEMP: os.tmpdir(),
    TMP: os.tmpdir()
  };
  for (const key of ["SystemRoot", "WINDIR", "ComSpec", "PATHEXT"]) {
    if (process.env[key]) {
      env[key] = process.env[key];
    }
  }
  return env;
}
