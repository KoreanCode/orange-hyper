import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CODEX_PLUGIN_FILES, CODEX_PLUGIN_VERSION } from "../src/adapters/codex/pluginAssets.js";
import { computeCodexBindingFingerprint, evaluateHookExecution } from "../src/core/binding.js";
import { ORANGE_HYPER_VERSION } from "../src/core/origin.js";

const ORANGE_BIN = new URL("../bin/orange.js", import.meta.url);

function tempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "orange-activation-runtime-"));
}

function runOrange(args, cwd, options = {}) {
  return spawnSync(process.execPath, [ORANGE_BIN.pathname, ...args], {
    cwd,
    input: options.input,
    env: {
      ...process.env,
      ...(options.env || {})
    },
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

function binding(cwd, subcommand, options = {}) {
  const args = ["binding", subcommand, "--host", "codex", "--json"];
  if (subcommand !== "status") {
    args.splice(4, 0, "--scope", "user");
  }
  return command(runOrange(args, cwd, options), `binding.${subcommand}`);
}

function countFiles(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => !name.startsWith(".")).length : 0;
}

function relativeFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }
  const found = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
      } else {
        found.push(path.relative(root, full).split(path.sep).join("/"));
      }
    }
  };
  visit(root);
  return found.sort();
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
  assert.equal(payload.data.binding.plugin_installation, "unknown");
  assert.equal(payload.data.binding.plugin_enabled, "unknown");
  assert.equal(payload.data.binding.hook_execution.status, "none");
  assert.deepEqual(fs.readdirSync(cwd), before);
});

test("binding plan is read-only and binding install writes only user-scope state", () => {
  const cwd = tempWorkspace();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "orange-binding-home-"));
  const env = { ORANGE_HYPER_HOME: home };
  const before = fs.readdirSync(cwd);

  const plan = binding(cwd, "plan", { env });
  assert.equal(plan.data.dry_run, true);
  assert.equal(plan.data.marketplace.status, "absent");
  assert.deepEqual(fs.readdirSync(cwd), before);

  const installed = binding(cwd, "install", { env });
  const secondInstall = binding(cwd, "install", { env });
  const current = binding(cwd, "status", { env });
  assert.equal(installed.data.installed_user_scope_only, true);
  assert.equal(secondInstall.data.idempotent, true);
  assert.equal(current.data.marketplace.status, "registered");
  assert.equal(current.data.plugin.availability, "available");
  assert.equal(current.data.plugin_installation, "unknown");
  assert.equal(current.data.plugin_enabled, "unknown");
  assert.equal(fs.existsSync(path.join(home, "bindings", "codex", ".agents", "plugins", "marketplace.json")), true);
  assert.equal(fs.existsSync(path.join(home, "bindings", "codex", "plugins", "orange-hyper-codex", ".codex-plugin", "plugin.json")), true);
  assert.equal(fs.existsSync(path.join(cwd, ".agents")), false);
});

test("binding install migrates only Orange-owned legacy project binding", () => {
  const cwd = tempWorkspace();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "orange-binding-home-"));
  const env = { ORANGE_HYPER_HOME: home };
  const legacyRoot = path.join(cwd, ".agents", "plugins", "orange-hyper-codex");
  fs.mkdirSync(path.join(legacyRoot, ".codex-plugin"), { recursive: true });
  fs.writeFileSync(path.join(legacyRoot, ".codex-plugin", "plugin.json"), "{}\n");
  fs.writeFileSync(path.join(legacyRoot, ".orange-hyper-owned.json"), JSON.stringify({
    owner: "orange-hyper",
    plugin: "orange-hyper-codex"
  }));
  const marketplacePath = path.join(cwd, ".agents", "plugins", "marketplace.json");
  fs.writeFileSync(marketplacePath, `${JSON.stringify({
    name: "local-repo",
    plugins: [
      { name: "orange-hyper-codex", source: { source: "local", path: "./plugins/orange-hyper-codex" } },
      { name: "other-plugin", source: { source: "local", path: "./plugins/other-plugin" } }
    ]
  }, null, 2)}\n`);

  const installed = binding(cwd, "install", { env });
  const marketplace = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));

  assert.equal(installed.data.migration.attempted, true);
  assert.equal(installed.data.migration.success, true);
  assert.equal(fs.existsSync(legacyRoot), false);
  assert.deepEqual(marketplace.plugins.map((item) => item.name), ["other-plugin"]);
});

test("binding remove preserves project activation and accepted memory", () => {
  const cwd = tempWorkspace();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "orange-binding-home-"));
  const env = { ORANGE_HYPER_HOME: home };
  binding(cwd, "install", { env });
  apply(cwd);
  const acceptedDir = path.join(cwd, ".orange-hyper", "proposals", "memory-delta", "accepted");
  fs.mkdirSync(acceptedDir, { recursive: true });
  fs.writeFileSync(path.join(acceptedDir, "keep.md"), "accepted memory\n");

  const removed = binding(cwd, "remove", { env });
  const secondRemove = binding(cwd, "remove", { env });

  assert.equal(removed.data.project_activation_preserved, true);
  assert.equal(removed.data.effective_status, "pending_user_uninstall_or_disable");
  assert.equal(removed.data.removal_status.source_removed, true);
  assert.equal(removed.data.removal_status.marketplace_removed, true);
  assert.equal(removed.data.removal_status.metadata_removed, true);
  assert.equal(removed.data.removal_status.installed_plugin_status, "unknown");
  assert.equal(removed.data.removal_status.enabled_status, "unknown");
  assert.deepEqual(removed.data.next_actions.map((item) => item.kind), [
    "codex_plugin_disable",
    "codex_plugin_uninstall",
    "start_new_thread",
    "binding_status_recheck"
  ]);
  assert.equal(secondRemove.data.effective_status, "pending_user_uninstall_or_disable");
  assert.deepEqual(secondRemove.data.removed_paths, []);
  assert.equal(fs.existsSync(path.join(home, "bindings", "codex", "binding.json")), false);
  assert.equal(fs.existsSync(path.join(cwd, ".orange-hyper", "local", "activation.json")), true);
  assert.equal(fs.existsSync(path.join(acceptedDir, "keep.md")), true);
});

test("activate apply is idempotent, preserves unrelated marketplace entries, and waits for current lifecycle", () => {
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

  assert.equal(first.data.initialized_by_apply, false);
  assert.equal(first.data.host_binding_installed_by_apply, false);
  assert.equal(second.data.initialized_by_apply, false);
  assert.equal(current.data.status, "waiting_for_host_binding");
  assert.equal(current.data.lifecycle.active, false);
  assert.equal(current.data.binding.plugin_installation, "unknown");
  assert.equal(current.data.binding.hook_execution.status, "none");
  assert.deepEqual(marketplace.plugins.map((item) => item.name), ["other-plugin"]);
});

test("activate apply writes only activation-local runtime state in a fresh repository", () => {
  const cwd = tempWorkspace();
  apply(cwd);

  assert.deepEqual(relativeFiles(path.join(cwd, ".orange-hyper")), [
    "local/activation.json"
  ]);
  assert.equal(fs.existsSync(path.join(cwd, ".orange-hyper", "config.json")), false);
  assert.equal(fs.existsSync(path.join(cwd, ".orange-hyper", "capsules")), false);
  assert.equal(fs.existsSync(path.join(cwd, ".orange-hyper", "graph")), false);
  assert.equal(fs.existsSync(path.join(cwd, ".orange-hyper", "traces")), false);
});

test("activate remove deletes only project-local activation and runtime state", () => {
  const cwd = tempWorkspace();
  apply(cwd);
  const acceptedDir = path.join(cwd, ".orange-hyper", "proposals", "memory-delta", "accepted");
  fs.mkdirSync(acceptedDir, { recursive: true });
  fs.writeFileSync(path.join(acceptedDir, "keep.md"), "accepted memory\n");

  const removed = command(runOrange(["activate", "remove", "--host", "codex", "--scope", "project", "--json"], cwd), "activation.remove");

  assert.equal(fs.existsSync(path.join(cwd, ".orange-hyper", "local", "activation.json")), false);
  assert.equal(fs.existsSync(path.join(cwd, ".orange-hyper", "local", "runtime")), false);
  assert.equal(fs.existsSync(path.join(acceptedDir, "keep.md")), true);
  assert.equal(fs.existsSync(path.join(cwd, ".agents")), false);
  assert.ok(removed.data.removed_project_activation_only);
  assert.ok(removed.data.user_binding_preserved);
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

test("lifecycle heartbeat requires all required current-fingerprint events before active", () => {
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
  const partial = status(cwd);

  assert.equal(output.hookSpecificOutput.hookEventName, "SessionStart");
  assert.match(output.hookSpecificOutput.additionalContext, /Orange Hyper is active/);
  assert.ok(output.hookSpecificOutput.additionalContext.length <= 3200);
  assert.doesNotMatch(output.hookSpecificOutput.additionalContext, /## Candidate Memory/);
  assert.equal(partial.data.status, "waiting_for_host_binding");
  assert.equal(partial.data.lifecycle.hook_execution, "partial");
  assert.equal(partial.data.lifecycle.last_event, "SessionStart");

  host(cwd, "user-prompt-submit", {
    session_id: "s1",
    turn_id: "required",
    cwd,
    hook_event_name: "UserPromptSubmit",
    prompt: "Implement lifecycle binding behavior",
    model: "gpt-5",
    permission_mode: "default"
  });
  host(cwd, "post-tool-use", {
    session_id: "s1",
    turn_id: "required",
    cwd,
    hook_event_name: "PostToolUse",
    tool_name: "Bash",
    tool_use_id: "tool-required",
    tool_input: { command: "npm test" },
    tool_response: { exit_code: 0, stdout: "passed" }
  });
  host(cwd, "stop", {
    session_id: "s1",
    turn_id: "required",
    cwd,
    hook_event_name: "Stop",
    stop_hook_active: false,
    last_assistant_message: "done"
  });
  const current = status(cwd);
  assert.equal(current.data.status, "active");
  assert.equal(current.data.lifecycle.hook_execution, "current");
  assert.equal(current.data.lifecycle.freshness_window_ms, 24 * 60 * 60 * 1000);
  assert.ok(current.data.lifecycle.complete_lifecycle_at);
});

test("required lifecycle events from different sessions do not combine into current", () => {
  const cwd = tempWorkspace();
  apply(cwd);
  host(cwd, "session-start", {
    session_id: "s1",
    cwd,
    hook_event_name: "SessionStart",
    model: "gpt-5",
    source: "startup",
    permission_mode: "default"
  });
  host(cwd, "user-prompt-submit", {
    session_id: "s2",
    turn_id: "t1",
    cwd,
    hook_event_name: "UserPromptSubmit",
    prompt: "Implement binding status behavior",
    model: "gpt-5",
    permission_mode: "default"
  });
  host(cwd, "stop", {
    session_id: "s3",
    turn_id: "t1",
    cwd,
    hook_event_name: "Stop",
    stop_hook_active: false,
    last_assistant_message: "done"
  });

  const partial = status(cwd);
  assert.equal(partial.data.status, "waiting_for_host_binding");
  assert.equal(partial.data.lifecycle.active, false);
  assert.equal(partial.data.lifecycle.hook_execution, "partial");
  assert.notEqual(partial.data.lifecycle.complete_lifecycle_at, partial.data.lifecycle.last_heartbeat);
});

test("complete lifecycle freshness expires deterministically with clock injection", () => {
  const fingerprint = computeCodexBindingFingerprint();
  const heartbeat = {
    schema_version: 3,
    host: "codex",
    event: "Stop",
    last_event: "Stop",
    observed_at: "2026-06-19T00:02:00.000Z",
    binding_fingerprint: fingerprint,
    orange_version: ORANGE_HYPER_VERSION,
    plugin_version: CODEX_PLUGIN_VERSION,
    sessions: {
      hashed_session: {
        binding_fingerprint: fingerprint,
        orange_version: ORANGE_HYPER_VERSION,
        plugin_version: CODEX_PLUGIN_VERSION,
        session_key: "hashed_session",
        session_start_at: "2026-06-19T00:00:00.000Z",
        latest_prompt_at: "2026-06-19T00:01:00.000Z",
        stop_at: "2026-06-19T00:02:00.000Z",
        complete_lifecycle_at: "2026-06-19T00:02:00.000Z",
        observed_at: "2026-06-19T00:02:00.000Z",
        events: {
          SessionStart: "2026-06-19T00:00:00.000Z",
          UserPromptSubmit: "2026-06-19T00:01:00.000Z",
          Stop: "2026-06-19T00:02:00.000Z"
        }
      }
    }
  };

  const fresh = evaluateHookExecution(heartbeat, fingerprint, {
    clock: new Date("2026-06-19T23:59:00.000Z")
  });
  const stale = evaluateHookExecution(heartbeat, fingerprint, {
    clock: new Date("2026-06-20T00:03:00.000Z")
  });

  assert.equal(fresh.status, "current");
  assert.equal(fresh.freshness_expires_at, "2026-06-20T00:02:00.000Z");
  assert.equal(stale.status, "stale");
  assert.equal(stale.status_reason, "freshness_window_expired");
});

test("PostToolUse is optional for current hook execution and previous fingerprint is stale", () => {
  const cwd = tempWorkspace();
  apply(cwd);
  host(cwd, "session-start", {
    session_id: "s1",
    cwd,
    hook_event_name: "SessionStart",
    model: "gpt-5",
    source: "startup",
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
  host(cwd, "stop", {
    session_id: "s1",
    turn_id: "l1",
    cwd,
    hook_event_name: "Stop",
    stop_hook_active: false,
    last_assistant_message: "done"
  });
  const current = status(cwd);
  assert.equal(current.data.status, "active");
  assert.equal(current.data.lifecycle.hook_execution, "current");
  assert.equal(current.data.lifecycle.recent.PostToolUse, null);

  const heartbeatPath = path.join(cwd, ".orange-hyper", "local", "runtime", "heartbeat.json");
  const heartbeat = JSON.parse(fs.readFileSync(heartbeatPath, "utf8"));
  heartbeat.binding_fingerprint = "previous-fingerprint";
  for (const session of Object.values(heartbeat.sessions || {})) {
    session.binding_fingerprint = "previous-fingerprint";
  }
  fs.writeFileSync(heartbeatPath, `${JSON.stringify(heartbeat, null, 2)}\n`);
  const stale = status(cwd);
  assert.equal(stale.data.status, "waiting_for_host_binding");
  assert.equal(stale.data.lifecycle.active, false);
  assert.equal(stale.data.lifecycle.hook_execution, "stale");
  assert.equal(stale.data.binding.hook_execution.status, "stale");
});

test("Codex hook bundle includes Windows launchers with safe JSON behavior", () => {
  const hooks = JSON.parse(CODEX_PLUGIN_FILES["hooks/hooks.json"]);
  for (const eventName of ["SessionStart", "UserPromptSubmit", "PostToolUse", "Stop"]) {
    const commandHook = hooks.hooks[eventName][0].hooks[0];
    assert.match(commandHook.command, /\$PLUGIN_ROOT\/hooks\/run-orange\.sh/);
    assert.match(commandHook.commandWindows, /\$env:PLUGIN_ROOT\\hooks\\run-orange\.ps1/);
    assert.match(commandHook.commandWindows, /powershell -NoProfile -ExecutionPolicy Bypass -File/);
  }
  const psTemplate = CODEX_PLUGIN_FILES["hooks/run-orange.ps1"];
  const shTemplate = CODEX_PLUGIN_FILES["hooks/run-orange.sh"];
  assert.notEqual(psTemplate.charCodeAt(0), 0xfeff);
  assert.match(psTemplate, /UTF8Encoding\]::new\(\$false\)/);
  assert.match(psTemplate, /ConvertTo-Json -Depth 8 -Compress/);
  assert.match(psTemplate, /ORANGE_HYPER_BIN/);
  assert.match(psTemplate, /orange\.exe/);
  assert.match(shTemplate, /ORANGE_HYPER_BIN/);
  assert.match(shTemplate, /printf '\{"continue":true/);
  assert.equal(fs.readFileSync(path.join(process.cwd(), "adapters", "codex", "plugin", "hooks", "run-orange.ps1"))[0], 112);
});

test("Codex POSIX hook launcher executes the candidate ORANGE_HYPER_BIN", () => {
  const cwd = tempWorkspace();
  const fakeBin = path.join(cwd, "candidate-orange");
  fs.writeFileSync(fakeBin, [
    "#!/usr/bin/env sh",
    "printf '%s\\n' '{\"continue\":true,\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":\"candidate-bin\"}}'"
  ].join("\n"));
  fs.chmodSync(fakeBin, 0o755);

  const launched = spawnSync("sh", [
    path.join(process.cwd(), "adapters", "codex", "plugin", "hooks", "run-orange.sh"),
    "session-start"
  ], {
    cwd,
    env: {
      ...process.env,
      ORANGE_HYPER_BIN: fakeBin,
      PATH: "/usr/bin:/bin"
    },
    input: "{}",
    encoding: "utf8"
  });

  assert.equal(launched.status, 0, launched.stderr);
  assert.deepEqual(JSON.parse(launched.stdout), {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: "candidate-bin"
    }
  });
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

test("Codex lifecycle artifacts do not store raw prompt text", () => {
  const cwd = tempWorkspace();
  apply(cwd);
  const sentinel = "rawprompt-sentinel-991";

  host(cwd, "user-prompt-submit", {
    session_id: "s1",
    turn_id: "sentinel",
    cwd,
    hook_event_name: "UserPromptSubmit",
    prompt: `Implement bounded parser behavior ${sentinel}`,
    model: "gpt-5",
    permission_mode: "default"
  });

  const contents = relativeFiles(path.join(cwd, ".orange-hyper"))
    .map((name) => fs.readFileSync(path.join(cwd, ".orange-hyper", name), "utf8"))
    .join("\n");
  assert.equal(contents.includes(sentinel), false);
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
  assert.ok(evidence.every((item) => item.session_key && item.turn_key));
  assert.ok(evidence.every((item) => !("session_id" in item) && !("turn_id" in item)));
  assert.equal(evidence.some((item) => /sk-abcdef/.test(JSON.stringify(item))), false);
  assert.ok(evidence.every((item) => item.raw_output_stored === false));
  assert.ok(evidence.every((item) => String(item.output_summary || "").length <= 900));
});

test("Stop continues once for missing verification and keeps Quest incomplete without explicit reason", () => {
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
  assert.equal(first.decision, "block");
  assert.match(first.reason, /verification evidence를 관찰하지 못했습니다/);
  assert.equal(second.continue, true);
  assert.equal(second.hookSpecificOutput.hookEventName, "Stop");
  assert.match(second.hookSpecificOutput.additionalContext, /Quest는 incomplete 상태/);
  assert.equal(countFiles(path.join(cwd, ".orange-hyper", "quests", "completed")), 0);
  assert.equal(countFiles(path.join(cwd, ".orange-hyper", "quests", "active")), 1);
});

test("Stop records unverified completion only with explicit reason", () => {
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

  host(cwd, "stop", {
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
    last_assistant_message: "Tests not run because the fixture runner is unavailable."
  });
  const completedDir = path.join(cwd, ".orange-hyper", "quests", "completed");
  const completed = fs.readFileSync(path.join(completedDir, fs.readdirSync(completedDir)[0]), "utf8");

  assert.equal(second.continue, true);
  assert.match(completed, /verification_status: unverified/);
  assert.match(completed, /Tests not run because the fixture runner is unavailable/);
});

test("follow-up continues current Quest, different component creates new Quest, and L1 Stop is isolated", () => {
  const cwd = tempWorkspace();
  apply(cwd);

  const first = host(cwd, "user-prompt-submit", {
    session_id: "s1",
    turn_id: "t1",
    cwd,
    hook_event_name: "UserPromptSubmit",
    prompt: "Implement binding status behavior",
    model: "gpt-5",
    permission_mode: "default"
  });
  const followUp = host(cwd, "user-prompt-submit", {
    session_id: "s1",
    turn_id: "t2",
    cwd,
    hook_event_name: "UserPromptSubmit",
    prompt: "계속해서 테스트도 추가해줘",
    model: "gpt-5",
    permission_mode: "default"
  });
  host(cwd, "user-prompt-submit", {
    session_id: "s1",
    turn_id: "typo",
    cwd,
    hook_event_name: "UserPromptSubmit",
    prompt: "Fix typo label copy",
    model: "gpt-5",
    permission_mode: "default"
  });
  const l1Stop = host(cwd, "stop", {
    session_id: "s1",
    turn_id: "typo",
    cwd,
    hook_event_name: "Stop",
    stop_hook_active: false,
    last_assistant_message: "done"
  });
  const other = host(cwd, "user-prompt-submit", {
    session_id: "s1",
    turn_id: "t3",
    cwd,
    hook_event_name: "UserPromptSubmit",
    prompt: "Implement search ranking behavior",
    model: "gpt-5",
    permission_mode: "default"
  });

  assert.equal(first.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.equal(followUp.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.equal(followUp.hookSpecificOutput.additionalContext.includes(first.hookSpecificOutput.additionalContext.match(/Quest: (quest_[^\n]+)/)[1]), true);
  assert.equal(l1Stop.continue, true);
  assert.equal(countFiles(path.join(cwd, ".orange-hyper", "quests", "completed")), 0);
  assert.equal(other.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.equal(countFiles(path.join(cwd, ".orange-hyper", "quests", "active")), 2);
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
