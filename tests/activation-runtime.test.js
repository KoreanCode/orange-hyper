import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ORANGE_BIN = new URL("../bin/orange.js", import.meta.url);

function tempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "orange-activation-runtime-"));
}

function runOrange(args, cwd, options = {}) {
  return spawnSync(process.execPath, [ORANGE_BIN.pathname, ...args], {
    cwd,
    input: options.input,
    encoding: "utf8"
  });
}

function json(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function command(result, commandId) {
  const payload = json(result);
  assert.equal(payload.ok, true);
  assert.equal(payload.contract_version, "0.1");
  assert.equal(payload.command, commandId);
  return payload;
}

function host(cwd, event, input) {
  return json(runOrange(["host", "codex", "hook", event], cwd, {
    input: JSON.stringify(input)
  }));
}

function apply(cwd) {
  return command(runOrange(["activate", "apply", "--host", "codex", "--scope", "project", "--json"], cwd), "activation.apply");
}

function status(cwd) {
  return command(runOrange(["activate", "status", "--host", "codex", "--json"], cwd), "activation.status");
}

function countFiles(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => !name.startsWith(".")).length : 0;
}

test("activate plan is read-only and does not report installed binary as active", () => {
  const cwd = tempWorkspace();
  const before = fs.readdirSync(cwd);
  const payload = command(runOrange(["activate", "plan", "--host", "codex", "--scope", "project", "--json"], cwd), "activation.plan");

  assert.equal(payload.data.dry_run, true);
  assert.equal(payload.data.project_initialized, false);
  assert.equal(payload.data.installed.orange_binary, true);
  assert.equal(payload.data.status, "inactive");
  assert.equal(payload.data.lifecycle.active, false);
  assert.equal(payload.data.binding.trusted, false);
  assert.deepEqual(fs.readdirSync(cwd), before);
});

test("activate apply is idempotent, preserves unrelated marketplace entries, and stays pending before heartbeat", () => {
  const cwd = tempWorkspace();
  const marketplaceDir = path.join(cwd, ".agents", "plugins");
  fs.mkdirSync(marketplaceDir, { recursive: true });
  fs.writeFileSync(path.join(marketplaceDir, "marketplace.json"), `${JSON.stringify({
    name: "local-repo",
    plugins: [
      {
        name: "other-plugin",
        source: { source: "local", path: "./plugins/other-plugin" },
        policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
        category: "Productivity"
      }
    ]
  }, null, 2)}\n`);

  const first = apply(cwd);
  const second = apply(cwd);
  const current = status(cwd);
  const marketplace = JSON.parse(fs.readFileSync(path.join(marketplaceDir, "marketplace.json"), "utf8"));

  assert.equal(first.data.initialized_by_apply, true);
  assert.equal(second.data.initialized_by_apply, false);
  assert.equal(current.data.status, "pending_trust");
  assert.equal(current.data.lifecycle.active, false);
  assert.equal(current.data.binding.available, true);
  assert.equal(current.data.binding.trusted, false);
  assert.deepEqual(marketplace.plugins.map((item) => item.name).sort(), ["orange-hyper-codex", "other-plugin"]);
});

test("activate remove deletes only Orange-owned activation and binding state", () => {
  const cwd = tempWorkspace();
  apply(cwd);
  const marketplacePath = path.join(cwd, ".agents", "plugins", "marketplace.json");
  const marketplace = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));
  marketplace.plugins.push({
    name: "other-plugin",
    source: { source: "local", path: "./plugins/other-plugin" },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    category: "Productivity"
  });
  fs.writeFileSync(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`);

  const removed = command(runOrange(["activate", "remove", "--host", "codex", "--scope", "project", "--json"], cwd), "activation.remove");
  const afterMarketplace = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));

  assert.equal(fs.existsSync(path.join(cwd, ".orange-hyper", "local", "activation.json")), false);
  assert.equal(fs.existsSync(path.join(cwd, ".agents", "plugins", "orange-hyper-codex")), false);
  assert.deepEqual(afterMarketplace.plugins.map((item) => item.name), ["other-plugin"]);
  assert.ok(removed.data.removed_owned_state_only);
});

test("inactive project host hooks no-op without creating Orange state", () => {
  const cwd = tempWorkspace();
  const output = host(cwd, "session-start", {
    session_id: "s1",
    cwd,
    hook_event_name: "SessionStart",
    model: "gpt-5",
    source: "startup",
    permission_mode: "default"
  });

  assert.equal(output.continue, true);
  assert.equal(output.hookSpecificOutput.hookEventName, "SessionStart");
  assert.equal(output.hookSpecificOutput.additionalContext, "");
  assert.equal(fs.existsSync(path.join(cwd, ".orange-hyper")), false);
});

test("SessionStart writes heartbeat and bounded context only after activation", () => {
  const cwd = tempWorkspace();
  apply(cwd);
  const output = host(cwd, "session-start", {
    session_id: "s1",
    cwd,
    hook_event_name: "SessionStart",
    model: "gpt-5",
    source: "startup",
    permission_mode: "default"
  });
  const current = status(cwd);

  assert.equal(output.hookSpecificOutput.hookEventName, "SessionStart");
  assert.match(output.hookSpecificOutput.additionalContext, /Orange Hyper is active/);
  assert.ok(output.hookSpecificOutput.additionalContext.length <= 3200);
  assert.doesNotMatch(output.hookSpecificOutput.additionalContext, /## Candidate Memory/);
  assert.equal(current.data.status, "active");
  assert.equal(current.data.lifecycle.last_event, "SessionStart");
});

test("UserPromptSubmit keeps L0/L1 light, creates L2 Quest/Capsule once, and blocks L4/L5", () => {
  const cwd = tempWorkspace();
  apply(cwd);

  host(cwd, "user-prompt-submit", {
    session_id: "s1",
    turn_id: "l0",
    cwd,
    hook_event_name: "UserPromptSubmit",
    prompt: "What is this project?",
    model: "gpt-5",
    permission_mode: "default"
  });
  host(cwd, "user-prompt-submit", {
    session_id: "s1",
    turn_id: "l1",
    cwd,
    hook_event_name: "UserPromptSubmit",
    prompt: "Fix typo label copy",
    model: "gpt-5",
    permission_mode: "default"
  });
  assert.equal(countFiles(path.join(cwd, ".orange-hyper", "quests", "active")), 0);

  const l2 = host(cwd, "user-prompt-submit", {
    session_id: "s1",
    turn_id: "l2",
    cwd,
    hook_event_name: "UserPromptSubmit",
    prompt: "Implement bounded parser behavior",
    model: "gpt-5",
    permission_mode: "default"
  });
  host(cwd, "user-prompt-submit", {
    session_id: "s1",
    turn_id: "l2",
    cwd,
    hook_event_name: "UserPromptSubmit",
    prompt: "Implement bounded parser behavior",
    model: "gpt-5",
    permission_mode: "default"
  });
  assert.match(l2.hookSpecificOutput.additionalContext, /Orange route: L2/);
  assert.equal(countFiles(path.join(cwd, ".orange-hyper", "quests", "active")), 1);
  assert.equal(fs.existsSync(path.join(cwd, ".orange-hyper", "capsules", "current.md")), true);

  const l4 = host(cwd, "user-prompt-submit", {
    session_id: "s1",
    turn_id: "l4",
    cwd,
    hook_event_name: "UserPromptSubmit",
    prompt: "Delete production auth data migration",
    model: "gpt-5",
    permission_mode: "default"
  });
  const l5 = host(cwd, "user-prompt-submit", {
    session_id: "s1",
    turn_id: "l5",
    cwd,
    hook_event_name: "UserPromptSubmit",
    prompt: "Run L5 raid mode autonomous loop",
    model: "gpt-5",
    permission_mode: "default"
  });
  assert.equal(l4.decision, "block");
  assert.match(l4.reason, /L4/);
  assert.equal(l5.decision, "block");
  assert.match(l5.reason, /L5/);
});

test("PostToolUse records bounded evidence, redacts secrets, and is idempotent", () => {
  const cwd = tempWorkspace();
  apply(cwd);
  host(cwd, "user-prompt-submit", {
    session_id: "s1",
    turn_id: "t1",
    cwd,
    hook_event_name: "UserPromptSubmit",
    prompt: "Implement durable memory policy decision handling",
    model: "gpt-5",
    permission_mode: "default"
  });

  const passed = host(cwd, "post-tool-use", {
    session_id: "s1",
    turn_id: "t1",
    cwd,
    hook_event_name: "PostToolUse",
    tool_name: "Bash",
    tool_use_id: "tool-pass",
    tool_input: { command: "npm test" },
    tool_response: { exit_code: 0, stdout: `passed ${"x".repeat(1200)} sk-abcdef1234567890` }
  });
  host(cwd, "post-tool-use", {
    session_id: "s1",
    turn_id: "t1",
    cwd,
    hook_event_name: "PostToolUse",
    tool_name: "Bash",
    tool_use_id: "tool-pass",
    tool_input: { command: "npm test" },
    tool_response: { exit_code: 0, stdout: "duplicate" }
  });
  const failed = host(cwd, "post-tool-use", {
    session_id: "s1",
    turn_id: "t1",
    cwd,
    hook_event_name: "PostToolUse",
    tool_name: "Bash",
    tool_use_id: "tool-fail",
    tool_input: { command: "npm test" },
    tool_response: { exit_code: 1, stdout: "failed" }
  });
  const patch = host(cwd, "post-tool-use", {
    session_id: "s1",
    turn_id: "t1",
    cwd,
    hook_event_name: "PostToolUse",
    tool_name: "apply_patch",
    tool_use_id: "tool-patch",
    tool_input: { command: "*** Begin Patch\n*** Update File: src/app.js\n@@\n*** End Patch\n" },
    tool_response: { ok: true }
  });

  const evidenceDir = path.join(cwd, ".orange-hyper", "local", "runtime", "evidence");
  const evidence = fs.readdirSync(evidenceDir).map((name) => JSON.parse(fs.readFileSync(path.join(evidenceDir, name), "utf8")));
  assert.equal(countFiles(evidenceDir), 3);
  assert.match(passed.hookSpecificOutput.additionalContext, /verification evidence candidate/);
  assert.match(failed.hookSpecificOutput.additionalContext, /failed verification attempt/);
  assert.deepEqual(patch.hookSpecificOutput.additionalContext, "");
  assert.ok(evidence.some((item) => item.success_evidence === true));
  assert.ok(evidence.some((item) => item.evidence_kind === "verification" && item.passed === false && item.success_evidence === false));
  assert.ok(evidence.some((item) => item.touched_paths?.includes("src/app.js")));
  assert.equal(evidence.some((item) => /sk-abcdef/.test(JSON.stringify(item))), false);
  assert.ok(evidence.every((item) => item.raw_output_stored === false));
  assert.ok(evidence.every((item) => String(item.output_summary || "").length <= 900));
});

test("Stop continues once for missing verification, then records unverified completion", () => {
  const cwd = tempWorkspace();
  apply(cwd);
  host(cwd, "user-prompt-submit", {
    session_id: "s1",
    turn_id: "t1",
    cwd,
    hook_event_name: "UserPromptSubmit",
    prompt: "Implement bounded parser behavior",
    model: "gpt-5",
    permission_mode: "default"
  });

  const first = host(cwd, "stop", {
    session_id: "s1",
    turn_id: "t1",
    cwd,
    hook_event_name: "Stop",
    stop_hook_active: false,
    last_assistant_message: "done"
  });
  const second = host(cwd, "stop", {
    session_id: "s1",
    turn_id: "t1",
    cwd,
    hook_event_name: "Stop",
    stop_hook_active: true,
    last_assistant_message: "done"
  });
  const completedDir = path.join(cwd, ".orange-hyper", "quests", "completed");
  const completed = fs.readFileSync(path.join(completedDir, fs.readdirSync(completedDir)[0]), "utf8");

  assert.equal(first.decision, "block");
  assert.match(first.reason, /V2/);
  assert.equal(second.continue, true);
  assert.match(completed, /verification_status: unverified/);
  assert.match(completed, /unverified_reason:/);
});

test("Stop completes verified Quest and creates only quality-gated pending proposals", () => {
  const cwd = tempWorkspace();
  apply(cwd);
  host(cwd, "user-prompt-submit", {
    session_id: "s1",
    turn_id: "generic",
    cwd,
    hook_event_name: "UserPromptSubmit",
    prompt: "Implement bounded parser behavior",
    model: "gpt-5",
    permission_mode: "default"
  });
  host(cwd, "post-tool-use", {
    session_id: "s1",
    turn_id: "generic",
    cwd,
    hook_event_name: "PostToolUse",
    tool_name: "Bash",
    tool_use_id: "tool-generic",
    tool_input: { command: "npm test" },
    tool_response: { exit_code: 0, stdout: "passed" }
  });
  host(cwd, "stop", {
    session_id: "s1",
    turn_id: "generic",
    cwd,
    hook_event_name: "Stop",
    stop_hook_active: false,
    last_assistant_message: "done"
  });
  assert.equal(countFiles(path.join(cwd, ".orange-hyper", "proposals", "memory-delta", "pending")), 0);

  host(cwd, "user-prompt-submit", {
    session_id: "s1",
    turn_id: "durable",
    cwd,
    hook_event_name: "UserPromptSubmit",
    prompt: "Implement durable memory policy decision handling",
    model: "gpt-5",
    permission_mode: "default"
  });
  host(cwd, "post-tool-use", {
    session_id: "s1",
    turn_id: "durable",
    cwd,
    hook_event_name: "PostToolUse",
    tool_name: "Bash",
    tool_use_id: "tool-durable",
    tool_input: { command: "npm test" },
    tool_response: { exit_code: 0, stdout: "passed" }
  });
  host(cwd, "stop", {
    session_id: "s1",
    turn_id: "durable",
    cwd,
    hook_event_name: "Stop",
    stop_hook_active: false,
    last_assistant_message: "done"
  });

  assert.equal(countFiles(path.join(cwd, ".orange-hyper", "quests", "completed")), 2);
  assert.equal(countFiles(path.join(cwd, ".orange-hyper", "proposals", "memory-delta", "pending")), 1);
  assert.equal(countFiles(path.join(cwd, ".orange-hyper", "proposals", "memory-delta", "accepted")), 0);
  assert.equal(countFiles(path.join(cwd, ".orange-hyper", "graph", "nodes", "decision")), 0);
});
