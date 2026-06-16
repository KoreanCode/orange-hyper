import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { main } from "../src/cli/index.js";
import { generateCapsule } from "../src/core/capsule.js";
import { initWorkspace } from "../src/core/config.js";
import { stringifyFrontmatter } from "../src/core/frontmatter.js";
import { runDoctor } from "../src/core/doctor.js";
import { workspacePaths } from "../src/core/paths.js";
import { completeQuest, createQuest, listQuests, readQuestFile } from "../src/core/quest.js";

function tempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "orange-hyper-test-"));
}

test("init creates the v0.1 storage structure", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd, { projectName: "demo" });
  assert.ok(fs.existsSync(paths.config));
  assert.ok(fs.existsSync(paths.orangeGitignore));
  assert.ok(fs.existsSync(paths.activeQuests));
  assert.ok(fs.existsSync(paths.completedQuests));
  assert.ok(fs.existsSync(paths.currentCapsule));
  assert.ok(fs.existsSync(paths.routeTrace));
  assert.equal(fs.readFileSync(paths.orangeGitignore, "utf8"), "capsules/\ntraces/\nproposals/\nidentity/\nlocal/\n");
});

test("init is idempotent and preserves existing quest and trace files", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd);
  const created = createQuest(cwd, "keep this quest", {
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  fs.appendFileSync(paths.routeTrace, `${JSON.stringify({ trace_id: "route_keep", contract: { route: "L2/P2/T2/V2/A0/M0/MB2" } })}\n`);
  initWorkspace(cwd);
  assert.ok(fs.existsSync(created.filePath));
  assert.match(fs.readFileSync(paths.routeTrace, "utf8"), /route_keep/);
});

test("quest lifecycle writes markdown frontmatter, capsule, completion evidence, and doctor passes", () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);

  const created = createQuest(cwd, "implement the route contract formatter", {
    clock: new Date("2026-06-16T00:00:00.000Z"),
    expectedVerification: ["node --test"]
  });
  assert.ok(fs.readFileSync(created.filePath, "utf8").startsWith("---\n"));
  assert.equal(listQuests(cwd, "active").length, 1);

  const capsule = generateCapsule(cwd, created.id, {
    clock: new Date("2026-06-16T00:01:00.000Z")
  });
  assert.match(capsule.content, /Orange Hyper Current Capsule/);
  assert.ok(fs.existsSync(workspacePaths(cwd).currentCapsule));

  const completed = completeQuest(cwd, created.id, {
    clock: new Date("2026-06-16T00:02:00.000Z"),
    evidence: ["node --test passed"]
  });
  assert.equal(completed.data.status, "completed");
  assert.equal(completed.data.verification_status, "verified");
  assert.equal(listQuests(cwd, "active").length, 0);
  assert.equal(listQuests(cwd, "completed").length, 1);

  const doctor = runDoctor(cwd);
  assert.deepEqual(doctor.errors, []);
  assert.equal(doctor.ok, true);
});

test("quest completion requires evidence or unverified reason", () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const created = createQuest(cwd, "implement a bounded feature", {
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  assert.throws(() => completeQuest(cwd, created.id), /requires --evidence or --unverified/);
});

test("completed quest cannot be completed twice", () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const created = createQuest(cwd, "ship a small hardening fix", {
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  completeQuest(cwd, created.id, {
    clock: new Date("2026-06-16T00:01:00.000Z"),
    unverifiedReason: "Manual verification is not available in seed test"
  });
  assert.throws(
    () => completeQuest(cwd, created.id, { unverifiedReason: "again" }),
    /already completed/
  );
});

test("unverified completion records unverified status and reason", () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const created = createQuest(cwd, "document unverified completion", {
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  const completed = completeQuest(cwd, created.id, {
    clock: new Date("2026-06-16T00:01:00.000Z"),
    unverifiedReason: "Manual verification is not available in seed test"
  });
  assert.equal(completed.data.status, "completed");
  assert.equal(completed.data.verification_status, "unverified");
  assert.equal(completed.data.unverified_reason, "Manual verification is not available in seed test");
});

test("quest done merges inline evidence and evidence-file into verified completion", async () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const created = createQuest(cwd, "complete with evidence file", {
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  const evidencePath = path.join(cwd, "verification.txt");
  fs.writeFileSync(evidencePath, "npm test passed\nCLI smoke passed\n");
  await main(["quest", "done", created.id, "--evidence", "git diff --check passed", "--evidence-file", "verification.txt"], {
    cwd,
    io: silentIo()
  });
  const completed = listQuests(cwd, "completed")[0];
  assert.equal(completed.data.status, "completed");
  assert.equal(completed.data.verification_status, "verified");
  assert.deepEqual(completed.data.verification_evidence, ["git diff --check passed", "npm test passed\nCLI smoke passed"]);
});

test("quest done rejects evidence and unverified together", async () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const created = createQuest(cwd, "reject conflicting completion state", {
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  await assert.rejects(
    () => main(["quest", "done", created.id, "--evidence", "npm test passed", "--unverified", "not checked"], { cwd, io: silentIo() }),
    /cannot combine verification evidence with --unverified/
  );
});

test("route --quest preserves the quest layer unless explicitly overridden", async () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const created = createQuest(cwd, "implement a multi-step capsule feature", {
    layer: "L3",
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  const output = [];
  const io = {
    stdout: { write: (chunk) => output.push(chunk) },
    stderr: { write: () => {} }
  };
  await main(["route", "--quest", created.id], { cwd, io });
  assert.match(output.join(""), /Orange route: L3/);
});

test("quest new prints quest id as its own line and next kernel commands", async () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const { output, io } = captureIo();
  await main(["quest", "new", "implement seed kernel output hardening"], { cwd, io });
  const quest = listQuests(cwd, "active")[0];
  const lines = output.join("").trimEnd().split(/\r?\n/);
  assert.equal(lines[0], `Created quest: ${quest.data.id}`);
  assert.equal(lines[1], `File: .orange-hyper/quests/active/${quest.data.id}.md`);
  assert.ok(lines.includes("Next:"));
  assert.ok(lines.includes(`  orange route --quest ${quest.data.id}`));
  assert.ok(lines.includes(`  orange capsule --quest ${quest.data.id}`));
});

test("quest new --json prints valid JSON without human-readable output", async () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const { output, io } = captureIo();
  await main(["quest", "new", "--json", "implement JSON quest creation output"], { cwd, io });
  const raw = output.join("");
  const payload = JSON.parse(raw);
  assert.match(payload.quest.id, /^quest_/);
  assert.equal(payload.quest.file, `.orange-hyper/quests/active/${payload.quest.id}.md`);
  assert.equal(payload.next.route, `orange route --quest ${payload.quest.id}`);
  assert.equal(payload.next.capsule, `orange capsule --quest ${payload.quest.id}`);
  assert.doesNotMatch(raw, /Created quest:/);
  assert.doesNotMatch(raw, /Next:/);
  assert.doesNotMatch(raw, /Orange route:/);
});

test("route --json prints valid JSON without human-readable output", async () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const created = createQuest(cwd, "implement route JSON output", {
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  const { output, io } = captureIo();
  await main(["route", "--quest", created.id, "--json"], { cwd, io });
  const raw = output.join("");
  const payload = JSON.parse(raw);
  assert.equal(payload.trace.quest_id, created.id);
  assert.equal(payload.trace.contract.route, payload.contract.route);
  assert.equal(payload.contract.output_contract, created.data.output_contract);
  assert.doesNotMatch(raw, /Output contract:/);
  assert.doesNotMatch(raw, /Quest policy:/);
  assert.doesNotMatch(raw, /Trace:/);
});

test("route trace lines are JSON parseable", async () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd);
  const created = createQuest(cwd, "implement route trace hardening", {
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  await main(["route", "--quest", created.id], { cwd, io: silentIo() });
  const lines = fs.readFileSync(paths.routeTrace, "utf8").split(/\r?\n/).filter(Boolean);
  assert.ok(lines.length > 0);
  for (const line of lines) {
    assert.doesNotThrow(() => JSON.parse(line));
  }
});

test("capsule --quest writes current.md for the selected quest", async () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd);
  const created = createQuest(cwd, "build selected capsule", {
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  await main(["capsule", "--quest", created.id], { cwd, io: silentIo() });
  const content = fs.readFileSync(paths.currentCapsule, "utf8");
  assert.match(content, /build selected capsule/);
});

test("capsule without quests fails clearly", async () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  await assert.rejects(
    () => main(["capsule"], { cwd, io: silentIo() }),
    /No active quest found/
  );
});

test("path traversal selectors fail for quest-reading commands", async () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  createQuest(cwd, "safe quest", {
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  const badSelectors = ["../../package.json", "../README.md", "quests/../../package.json"];
  for (const selector of badSelectors) {
    await assert.rejects(() => main(["quest", "show", selector], { cwd, io: silentIo() }), /Quest path must stay inside/);
    await assert.rejects(() => main(["route", "--quest", selector], { cwd, io: silentIo() }), /Quest path must stay inside/);
    await assert.rejects(() => main(["capsule", "--quest", selector], { cwd, io: silentIo() }), /Quest path must stay inside/);
    await assert.rejects(
      () => main(["quest", "done", selector, "--unverified", "not checked"], { cwd, io: silentIo() }),
      /Quest path must stay inside/
    );
  }
});

test("frontmatter subset handles colons quotes Korean empty arrays and lists", () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const created = createQuest(cwd, '회원가입 정책: "재가입"을 바꿔줘', {
    title: "Policy: signup",
    constraints: ["한글 제약", "quote: keep it"],
    unknowns: ["탈퇴 상태 필드 확인"],
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  const quest = readQuestFile(created.filePath);
  assert.equal(quest.data.title, "Policy: signup");
  assert.equal(quest.data.scope_paths.length, 0);
  assert.deepEqual(quest.data.constraints, ["한글 제약", "quote: keep it"]);
  assert.deepEqual(quest.data.unknowns, ["탈퇴 상태 필드 확인"]);
  assert.match(quest.body, /"재가입"/);
});

test("doctor catches broken frontmatter", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd);
  fs.writeFileSync(path.join(paths.activeQuests, "broken.md"), "# Missing frontmatter\n");
  const result = runDoctor(cwd);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /Missing YAML frontmatter/);
});

test("doctor catches completed quests without verification information", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd);
  fs.writeFileSync(
    path.join(paths.completedQuests, "bad.md"),
    stringifyFrontmatter(
      {
        schema_version: 1,
        id: "quest_bad",
        title: "Bad quest",
        status: "completed",
        created_at: "2026-06-16T00:00:00.000Z",
        updated_at: "2026-06-16T00:00:00.000Z",
        layer: "L2",
        route: "L2/P2/T2/V2/A0/M0/MB2",
        quest_policy: "recommended",
        output_contract: "implementation",
        scope_paths: [],
        constraints: [],
        unknowns: [],
        expected_verification: [],
        verification_status: "pending",
        verification_evidence: [],
        unverified_reason: ""
      },
      "# Bad quest"
    )
  );
  const result = runDoctor(cwd);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /must be verified or unverified/);
  assert.match(result.errors.join("\n"), /needs verification evidence or unverified reason/);
});

test("L0/L1 quest new creates quest but prints not_recommended warning", async () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const output = [];
  await main(["quest", "new", "왜 Service에 트랜잭션이 있어야 해?"], {
    cwd,
    io: {
      stdout: { write: (chunk) => output.push(chunk) },
      stderr: { write: () => {} }
    }
  });
  assert.equal(listQuests(cwd, "active").length, 1);
  const joined = output.join("");
  assert.match(joined, /Quest policy: not_recommended/);
  assert.match(joined, /A Quest was created because you explicitly requested quest new/);
});

test("identity build writes generated placeholder html", async () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd, { projectName: "identity-demo" });
  const created = createQuest(cwd, "build identity placeholder", {
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  completeQuest(cwd, created.id, {
    clock: new Date("2026-06-16T00:01:00.000Z"),
    evidence: ["node --test passed"]
  });
  await main(["identity", "build"], { cwd, io: silentIo() });
  const html = fs.readFileSync(paths.identityHtml, "utf8");
  assert.match(html, /identity-demo/);
  assert.match(html, /Level: Seed/);
  assert.match(html, /Memory graph is not active yet/);
});

function silentIo() {
  return {
    stdout: { write: () => {} },
    stderr: { write: () => {} }
  };
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
