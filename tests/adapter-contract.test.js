import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { JSON_CONTRACT_VERSION, main } from "../src/cli/index.js";
import { initWorkspace } from "../src/core/config.js";
import { workspacePaths } from "../src/core/paths.js";

const ORANGE_BIN = new URL("../bin/orange.js", import.meta.url);
const EXPECTED_RECIPE_IDS = [
  "quest-capture",
  "work-complete-to-memory",
  "project-status",
  "project-sync",
  "hook-check",
  "mcp-advice"
];

const EXPECTED_STEP_CONTRACTS = {
  "quest-capture": [
    ["orange quest new \"<request>\" --title \"<title>\" --layer <L0-L4> --json", "quest.new", true, true]
  ],
  "work-complete-to-memory": [
    ["orange quest done <quest-id> --evidence \"<evidence>\" --json", "quest.done", true, true],
    ["orange remember propose --quest <quest-id> --json", "remember.propose", true, true],
    ["orange remember show <proposal-id> --json", "remember.show", false, false],
    ["orange remember validate <proposal-id> --json", "remember.validate", false, false],
    ["orange remember accept <proposal-id> --json", "remember.accept", true, true]
  ],
  "project-status": [
    ["orange doctor --json", "doctor.run", false, false],
    ["orange graph list --json", "graph.list", false, false],
    ["orange growth status --json", "growth.status", false, false],
    ["orange identity build --json", "identity.build", true, true]
  ],
  "project-sync": [
    ["orange init --json", "project.init", true, true],
    ["orange sync plan --json", "sync.plan", false, false],
    ["orange sync apply --json", "sync.apply", true, true],
    ["orange sync status --json", "sync.status", false, false]
  ],
  "hook-check": [
    ["orange hook preview --json", "hook.preview", false, false],
    ["orange hook status --json", "hook.status", false, false],
    ["orange hook run session-start --json", "hook.runSessionStart", false, false],
    ["orange hook run stop --json", "hook.runStop", false, false]
  ],
  "mcp-advice": [
    ["orange mcp suggest --query \"<query>\" --json", "mcp.suggest", false, false],
    ["orange mcp suggest --quest <quest-id> --json", "mcp.suggest", false, false]
  ]
};

function tempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "orange-adapter-test-"));
}

test("adapter list supports human and JSON output", async () => {
  const cwd = tempWorkspace();
  const { output, io } = captureIo();
  await main(["adapter", "list"], { cwd, io });
  const human = output.join("");
  assert.match(human, /Orange adapter recipes/);
  assert.match(human, /quest-capture/);
  assert.match(human, /work-complete-to-memory/);
  assert.match(human, /Adapter boundary: call Orange CLI --json only/);

  const payload = assertJsonCommand(runOrange(["adapter", "list", "--json"], cwd), "adapter.list");
  assert.equal(payload.data.count, EXPECTED_RECIPE_IDS.length);
  assert.deepEqual(
    payload.data.recipes.map((recipe) => recipe.id),
    EXPECTED_RECIPE_IDS
  );
  for (const recipe of payload.data.recipes) {
    assertRecipe(recipe);
  }
});

test("adapter show supports human and JSON output", async () => {
  const cwd = tempWorkspace();
  const { output, io } = captureIo();
  await main(["adapter", "show", "quest-capture"], { cwd, io });
  const human = output.join("");
  assert.match(human, /Adapter recipe: quest-capture/);
  assert.match(human, /Expected contract version: 0\.1/);
  assert.match(human, /Requires JSON mode: yes/);
  assert.match(human, /Expected JSON command id: quest\.new/);

  const payload = assertJsonCommand(runOrange(["adapter", "show", "quest-capture", "--json"], cwd), "adapter.show");
  assert.equal(payload.data.recipe.id, "quest-capture");
  assertRecipe(payload.data.recipe);
  assert.equal(payload.data.recipe.commands[0].expected_json_command_id, "quest.new");
});

test("adapter dry-run supports human and JSON output", async () => {
  const cwd = tempWorkspace();
  const { output, io } = captureIo();
  await main(["adapter", "dry-run", "project-status"], { cwd, io });
  const human = output.join("");
  assert.match(human, /Adapter dry-run: project-status/);
  assert.match(human, /Executed commands: no/);
  assert.match(human, /orange doctor --json/);
  assert.match(human, /orange identity build --json/);

  const payload = assertJsonCommand(runOrange(["adapter", "dry-run", "project-status", "--json"], cwd), "adapter.dryRun");
  assert.equal(payload.data.dry_run, true);
  assert.equal(payload.data.executed, false);
  assert.equal(payload.data.recipe_id, "project-status");
  assert.equal(payload.data.expected_contract_version, JSON_CONTRACT_VERSION);
  assert.equal(payload.data.steps.length, 4);
  assert.equal(payload.data.commands.length, 4);
  assert.deepEqual(payload.data.steps, payload.data.commands);
  assert.ok(payload.data.commands.some((step) => step.expected_json_command_id === "identity.build"));
  assert.ok(Array.isArray(payload.data.required_inputs));
  assert.ok(Array.isArray(payload.data.missing_inputs));
  assert.ok(payload.data.missing_inputs.some((input) => input.name === "explicit_identity_refresh_approval"));
  assert.match(payload.data.next_user_decision, /identity build mutates generated state/);
  assertSafetyFlags(payload.data.safety_flags);
});

test("adapter show unknown recipe fails with a JSON error envelope", () => {
  const cwd = tempWorkspace();
  const result = runOrange(["adapter", "show", "unknown-recipe", "--json"], cwd);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  const payload = parseJsonOnly(result.stdout);
  assertJsonEnvelope(payload, false, "adapter.show");
  assert.equal(payload.error.code, "ADAPTER_UNKNOWN_RECIPE");
  assert.match(payload.error.message, /Unknown adapter recipe: unknown-recipe/);
});

test("adapter dry-run does not modify .orange-hyper", () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const before = snapshotOrangeFiles(cwd);

  const payload = assertJsonCommand(runOrange(["adapter", "dry-run", "project-status", "--json"], cwd), "adapter.dryRun");
  assert.equal(payload.data.executed, false);
  assert.deepEqual(snapshotOrangeFiles(cwd), before);
});

test("adapter recipe steps declare expected JSON command ids", () => {
  const cwd = tempWorkspace();
  const payload = assertJsonCommand(runOrange(["adapter", "list", "--json"], cwd), "adapter.list");
  for (const recipe of payload.data.recipes) {
    assert.ok(recipe.commands.length > 0);
    for (const command of recipe.commands) {
      assert.match(command.command, / --json(?:$| )/);
      assert.equal(typeof command.expected_json_command_id, "string");
      assert.match(command.expected_json_command_id, /^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)+$/);
    }
  }
});

test("adapter recipe steps match the actual CLI command contract", () => {
  const cwd = tempWorkspace();
  const payload = assertJsonCommand(runOrange(["adapter", "list", "--json"], cwd), "adapter.list");
  for (const recipe of payload.data.recipes) {
    assert.deepEqual(
      recipe.commands.map((command) => [
        command.command,
        command.expected_json_command_id,
        command.mutates_project_state,
        command.requires_user_approval
      ]),
      EXPECTED_STEP_CONTRACTS[recipe.id]
    );
  }
});

test("adapter dry-run returns missing inputs and next user decision", () => {
  const cwd = tempWorkspace();
  const payload = assertJsonCommand(runOrange(["adapter", "dry-run", "work-complete-to-memory", "--json"], cwd), "adapter.dryRun");

  assert.deepEqual(
    payload.data.missing_inputs.map((input) => [input.name, input.input_source, input.step_index]),
    [
      ["quest_id", "user", 1],
      ["evidence", "user", 1],
      ["explicit_accept_approval", "user", 5]
    ]
  );
  assert.equal(payload.data.missing_inputs.some((input) => input.name === "proposal_id"), false);
  assert.match(payload.data.next_user_decision, /step 5 memory accept/);
});

test("adapter placeholders distinguish user, previous step, and project state sources", () => {
  const cwd = tempWorkspace();
  const questCapture = assertJsonCommand(runOrange(["adapter", "dry-run", "quest-capture", "--json"], cwd), "adapter.dryRun");
  const requestInput = questCapture.data.steps[0].input_requirements.find((input) => input.name === "request");
  assert.equal(requestInput.placeholder, "<request>");
  assert.equal(requestInput.input_source, "user");

  const memory = assertJsonCommand(runOrange(["adapter", "dry-run", "work-complete-to-memory", "--json"], cwd), "adapter.dryRun");
  const proposalInput = memory.data.steps[2].input_requirements.find((input) => input.name === "proposal_id");
  assert.equal(proposalInput.placeholder, "<proposal-id>");
  assert.equal(proposalInput.input_source, "previous_step");
  assert.equal(proposalInput.source_step_index, 2);
  assert.equal(proposalInput.source_output, "proposal.id");

  const mcp = assertJsonCommand(runOrange(["adapter", "dry-run", "mcp-advice", "--json"], cwd), "adapter.dryRun");
  const questInput = mcp.data.steps[1].input_requirements.find((input) => input.name === "quest_id");
  assert.equal(questInput.placeholder, "<quest-id>");
  assert.equal(questInput.input_source, "project_state");
});

test("mutating recipe commands require approval and read-only commands do not", () => {
  const cwd = tempWorkspace();
  const payload = assertJsonCommand(runOrange(["adapter", "list", "--json"], cwd), "adapter.list");
  for (const recipe of payload.data.recipes) {
    for (const command of recipe.commands) {
      if (command.mutates_project_state) {
        assert.equal(command.requires_user_approval, true, command.command);
      } else {
        assert.equal(command.requires_user_approval, false, command.command);
      }
    }
  }
});

test("adapter recipe placeholders are declared as input requirements", () => {
  const cwd = tempWorkspace();
  const payload = assertJsonCommand(runOrange(["adapter", "list", "--json"], cwd), "adapter.list");
  for (const recipe of payload.data.recipes) {
    for (const command of recipe.commands) {
      const placeholders = command.command.match(/<[^>]+>/g) || [];
      const declared = command.input_requirements.map((input) => input.placeholder).filter(Boolean);
      for (const placeholder of placeholders) {
        assert.ok(declared.includes(placeholder), `${command.command} should declare ${placeholder}`);
      }
    }
  }
});

test("adapter safety flags are present on every recipe", () => {
  const cwd = tempWorkspace();
  const payload = assertJsonCommand(runOrange(["adapter", "list", "--json"], cwd), "adapter.list");
  for (const recipe of payload.data.recipes) {
    assertSafetyFlags(recipe.safety_flags);
  }
});

test("adapter recipes do not require human output parsing", () => {
  const cwd = tempWorkspace();
  const payload = assertJsonCommand(runOrange(["adapter", "list", "--json"], cwd), "adapter.list");
  for (const recipe of payload.data.recipes) {
    assert.equal(recipe.safety_flags.parses_human_output, false);
    assert.equal(recipe.safety_flags.requires_json_mode, true);
    assert.ok(recipe.safety_rules.some((rule) => /json/i.test(rule)));
  }
});

function assertRecipe(recipe) {
  assert.equal(typeof recipe.id, "string");
  assert.equal(typeof recipe.title, "string");
  assert.equal(typeof recipe.purpose, "string");
  assert.ok(Array.isArray(recipe.when_to_use));
  assert.ok(Array.isArray(recipe.commands));
  assert.ok(Array.isArray(recipe.required_inputs));
  assert.ok(Array.isArray(recipe.outputs));
  assert.ok(Array.isArray(recipe.safety_rules));
  assert.ok(Array.isArray(recipe.forbidden_actions));
  assert.equal(recipe.expected_contract_version, JSON_CONTRACT_VERSION);
  assertSafetyFlags(recipe.safety_flags);
  for (const command of recipe.commands) {
    assert.equal(typeof command.command, "string");
    assert.equal(typeof command.why, "string");
    assert.equal(typeof command.step_index, "number");
    assert.ok(Array.isArray(command.required_input));
    assert.ok(Array.isArray(command.input_requirements));
    assert.equal(typeof command.expected_json_command_id, "string");
    assert.equal(typeof command.mutates_project_state, "boolean");
    assert.equal(typeof command.requires_user_approval, "boolean");
    for (const input of command.input_requirements) {
      assert.equal(typeof input.name, "string");
      assert.ok(["user", "previous_step", "project_state"].includes(input.input_source));
      assert.equal(input.step_index, command.step_index);
      assert.equal(typeof input.required, "boolean");
    }
  }
}

function assertSafetyFlags(flags) {
  assert.deepEqual(Object.keys(flags).sort(), [
    "auto_accept",
    "auto_install",
    "auto_unlock",
    "direct_file_mutation",
    "parses_human_output",
    "requires_json_mode"
  ]);
  assert.equal(flags.direct_file_mutation, false);
  assert.equal(flags.parses_human_output, false);
  assert.equal(flags.requires_json_mode, true);
  assert.equal(flags.auto_accept, false);
  assert.equal(flags.auto_install, false);
  assert.equal(flags.auto_unlock, false);
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

function captureIo() {
  const output = [];
  return {
    output,
    io: {
      stdout: { write: (chunk) => output.push(chunk) },
      stderr: { write: () => {} }
    }
  };
}

function parseJsonOnly(raw) {
  assert.equal(raw.trimStart().startsWith("{"), true);
  assert.equal(raw.trimEnd().endsWith("}"), true);
  return JSON.parse(raw);
}

function assertJsonCommand(result, command) {
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  const payload = parseJsonOnly(result.stdout);
  assertJsonEnvelope(payload, true, command);
  return payload;
}

function assertJsonEnvelope(payload, ok, command) {
  assert.equal(payload.ok, ok);
  assert.equal(payload.contract_version, JSON_CONTRACT_VERSION);
  assert.equal(payload.command, command);
  assert.match(payload.command, /^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)+$/);
}

function runOrange(args, cwd) {
  return spawnSync(process.execPath, [ORANGE_BIN.pathname, ...args], {
    cwd,
    encoding: "utf8"
  });
}
