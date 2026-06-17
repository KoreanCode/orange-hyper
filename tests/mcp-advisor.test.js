import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { JSON_CONTRACT_VERSION, main } from "../src/cli/index.js";
import { initWorkspace, readConfig } from "../src/core/config.js";
import { workspacePaths } from "../src/core/paths.js";
import { completeQuest, createQuest } from "../src/core/quest.js";

const ORANGE_BIN = new URL("../bin/orange.js", import.meta.url);

function tempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "orange-mcp-test-"));
}

test("mcp list supports human and JSON output", async () => {
  const cwd = tempWorkspace();
  const { output, io } = captureIo();
  await main(["mcp", "list"], { cwd, io });
  const human = output.join("");
  assert.match(human, /Orange MCP catalog/);
  assert.match(human, /context7/);
  assert.match(human, /github/);
  assert.match(human, /sentry/);
  assert.match(human, /linear/);
  assert.match(human, /does not install, run, or configure MCP servers/);

  const payload = assertJsonCommand(runOrange(["mcp", "list", "--json"], cwd), "mcp.list");
  assert.equal(payload.data.catalog.count, 4);
  assert.deepEqual(
    payload.data.catalog.entries.map((entry) => entry.id),
    ["context7", "github", "sentry", "linear"]
  );
  for (const entry of payload.data.catalog.entries) {
    assertCatalogEntry(entry);
  }
});

test("mcp show supports human and JSON output", async () => {
  const cwd = tempWorkspace();
  const { output, io } = captureIo();
  await main(["mcp", "show", "context7"], { cwd, io });
  const human = output.join("");
  assert.match(human, /MCP: context7 \(Context7\)/);
  assert.match(human, /Use cases:/);
  assert.match(human, /Install hint:/);
  assert.match(human, /requires explicit user approval/);

  const payload = assertJsonCommand(runOrange(["mcp", "show", "context7", "--json"], cwd), "mcp.show");
  assert.equal(payload.data.tool.id, "context7");
  assert.equal(payload.data.tool.name, "Context7");
  assertCatalogEntry(payload.data.tool);
});

test("mcp suggest --query returns a read-only proposal card without installing", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd);
  const beforeConfig = fs.readFileSync(paths.config, "utf8");
  const beforeMemory = snapshotOrangeFiles(cwd);

  const payload = assertJsonCommand(
    runOrange(["mcp", "suggest", "--query", "Spring Security 최신 문서 확인이 필요해", "--json"], cwd),
    "mcp.suggest"
  );

  assert.equal(payload.data.readOnly, true);
  assert.equal(payload.data.autoInstall, false);
  assert.equal(payload.data.autoRun, false);
  assert.equal(payload.data.configMutation, false);
  assert.equal(payload.data.projectMemoryMutation, false);
  assert.equal(payload.data.source_quest_id, null);
  assert.equal(payload.data.project.project_id, readConfig(cwd).project_id);
  assert.equal(payload.data.input.query, "Spring Security 최신 문서 확인이 필요해");
  assert.equal(payload.data.no_suggestion_reason, null);
  assert.equal(payload.data.suggested_next_step, null);
  assert.equal(payload.data.suggestions[0].mcp_id, "context7");
  assertSuggestion(payload.data.suggestions[0]);
  assert.equal(payload.data.proposal_cards[0].tool.id, "context7");
  assertProposalCard(payload.data.proposal_cards[0]);
  assert.equal(payload.data.proposal_cards[0].requires_user_approval, true);
  assert.match(payload.data.proposal_cards[0].install_command, /^codex mcp add context7/);

  assert.equal(fs.readFileSync(paths.config, "utf8"), beforeConfig);
  assert.deepEqual(snapshotOrangeFiles(cwd), beforeMemory);
  assert.equal(fs.existsSync(path.join(paths.root, "mcp")), false);
});

test("mcp suggest --query matches context7 English documentation signals", () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);

  const payload = assertJsonCommand(
    runOrange(["mcp", "suggest", "--query", "Need latest React API documentation before migration", "--json"], cwd),
    "mcp.suggest"
  );

  assert.equal(payload.data.suggestions[0].mcp_id, "context7");
  assertSuggestion(payload.data.suggestions[0]);
  assert.ok(payload.data.suggestions[0].matched_signals.length >= 2);
});

test("mcp suggest returns no suggestion when signal is insufficient", async () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);

  const payload = assertJsonCommand(
    runOrange(["mcp", "suggest", "--query", "No tool needed, just explain this concept", "--json"], cwd),
    "mcp.suggest"
  );

  assert.deepEqual(payload.data.suggestions, []);
  assert.deepEqual(payload.data.proposal_cards, []);
  assert.equal(typeof payload.data.no_suggestion_reason, "string");
  assert.match(payload.data.no_suggestion_reason, /No deterministic MCP catalog signal/);
  assert.equal(typeof payload.data.suggested_next_step, "string");

  const { output, io } = captureIo();
  await main(["mcp", "suggest", "--query", "No tool needed, just explain this concept"], { cwd, io });
  const human = output.join("");
  assert.match(human, /현재 MCP 제안 없음/);
  assert.match(human, /Suggested next step:/);
});

test("mcp suggest ranks multiple suggestions deterministically", () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const args = ["mcp", "suggest", "--query", "GitHub PR 이슈와 Sentry 에러를 같이 보고 싶어", "--json"];

  const first = assertJsonCommand(runOrange(args, cwd), "mcp.suggest");
  const second = assertJsonCommand(runOrange(args, cwd), "mcp.suggest");

  assert.deepEqual(
    first.data.suggestions.map((suggestion) => suggestion.mcp_id),
    second.data.suggestions.map((suggestion) => suggestion.mcp_id)
  );
  assert.deepEqual(
    first.data.suggestions.map((suggestion) => suggestion.mcp_id),
    ["github", "sentry"]
  );
  assert.ok(first.data.suggestions[0].score >= first.data.suggestions[1].score);
  for (const suggestion of first.data.suggestions) {
    assertSuggestion(suggestion);
  }
});

test("mcp suggest --quest reads completed quest context without writing project memory", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd);
  const quest = createQuest(cwd, "Review GitHub PR issue context before changing the repository", {
    layer: "L2",
    expectedVerification: ["confirm linked PR discussion"]
  });
  const completed = completeQuest(cwd, quest.id, {
    evidence: ["test setup completed quest for MCP Advisor source id"]
  });
  const beforeConfig = fs.readFileSync(paths.config, "utf8");
  const beforeMemory = snapshotOrangeFiles(cwd);

  const payload = assertJsonCommand(
    runOrange(["mcp", "suggest", "--quest", completed.data.id, "--json"], cwd),
    "mcp.suggest"
  );

  assert.equal(payload.data.input.quest.id, quest.id);
  assert.equal(payload.data.input.quest.title, quest.data.title);
  assert.equal(payload.data.input.quest.status, "completed");
  assert.equal(payload.data.source_quest_id, quest.id);
  assert.equal(payload.data.proposal_cards[0].tool.id, "github");
  assert.equal(payload.data.suggestions[0].mcp_id, "github");
  assertSuggestion(payload.data.suggestions[0]);
  assertProposalCard(payload.data.proposal_cards[0]);
  assert.equal(payload.data.proposal_cards[0].requires_user_approval, true);

  assert.equal(fs.readFileSync(paths.config, "utf8"), beforeConfig);
  assert.deepEqual(snapshotOrangeFiles(cwd), beforeMemory);
});

test("mcp show unknown id fails with a JSON error envelope", () => {
  const cwd = tempWorkspace();
  const result = runOrange(["mcp", "show", "unknown-mcp", "--json"], cwd);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  const payload = parseJsonOnly(result.stdout);
  assertJsonEnvelope(payload, false, "mcp.show");
  assert.equal(payload.error.code, "MCP_UNKNOWN_ID");
  assert.match(payload.error.message, /Unknown MCP id: unknown-mcp/);
});

function assertCatalogEntry(entry) {
  assert.equal(typeof entry.id, "string");
  assert.equal(typeof entry.name, "string");
  assert.equal(typeof entry.category, "string");
  assert.ok(Array.isArray(entry.use_cases));
  assert.ok(Array.isArray(entry.useful_when));
  assert.ok(Array.isArray(entry.risks));
  assert.match(entry.token_impact, /^(low|medium|high)$/);
  assert.equal(typeof entry.install_hint, "string");
  assert.equal(typeof entry.persistent_use_policy, "string");
}

function assertProposalCard(card) {
  assert.deepEqual(Object.keys(card).sort(), [
    "config_mutation",
    "expected_benefit",
    "install_command",
    "not_executed",
    "requires_user_approval",
    "risk",
    "scope",
    "token_impact",
    "tool",
    "use_once_or_persist",
    "why_now"
  ]);
  assert.deepEqual(Object.keys(card.tool).sort(), ["category", "id", "name"]);
  assert.equal(typeof card.why_now, "string");
  assert.equal(typeof card.expected_benefit, "string");
  assert.equal(typeof card.scope, "string");
  assert.equal(typeof card.risk, "string");
  assert.match(card.token_impact, /^(low|medium|high)$/);
  assert.equal(typeof card.install_command, "string");
  assert.equal(typeof card.use_once_or_persist, "string");
  assert.equal(card.requires_user_approval, true);
  assert.equal(card.not_executed, true);
  assert.equal(card.config_mutation, false);
}

function assertSuggestion(suggestion) {
  assert.equal(typeof suggestion.mcp_id, "string");
  assert.equal(typeof suggestion.score, "number");
  assert.ok(suggestion.score > 0);
  assert.match(suggestion.confidence, /^(low|medium|high)$/);
  assert.ok(Array.isArray(suggestion.matched_signals));
  assert.ok(suggestion.matched_signals.length > 0);
  for (const signal of suggestion.matched_signals) {
    assert.equal(typeof signal.signal, "string");
    assert.equal(typeof signal.why, "string");
  }
  assert.equal(typeof suggestion.why_now, "string");
  assert.equal(suggestion.requires_user_approval, true);
  assertCatalogEntry(suggestion.tool);
  assertProposalCard(suggestion.proposal);
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
