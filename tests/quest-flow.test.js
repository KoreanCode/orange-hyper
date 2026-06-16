import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { JSON_CONTRACT_VERSION, main } from "../src/cli/index.js";
import { generateCapsule } from "../src/core/capsule.js";
import { initWorkspace } from "../src/core/config.js";
import { stringifyFrontmatter } from "../src/core/frontmatter.js";
import { runDoctor } from "../src/core/doctor.js";
import {
  acceptMemoryDelta,
  listMemoryGraphNodes,
  proposeMemoryDelta,
  readMemoryDeltaProposalFile,
  rejectMemoryDelta
} from "../src/core/memory.js";
import { workspacePaths } from "../src/core/paths.js";
import { completeQuest, createQuest, listQuests, readQuestFile } from "../src/core/quest.js";

const ORANGE_BIN = new URL("../bin/orange.js", import.meta.url);

function tempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "orange-hyper-test-"));
}

test("init creates the v0.2 storage structure", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd, { projectName: "demo" });
  assert.ok(fs.existsSync(paths.config));
  assert.ok(fs.existsSync(paths.orangeGitignore));
  assert.ok(fs.existsSync(paths.activeQuests));
  assert.ok(fs.existsSync(paths.completedQuests));
  assert.ok(fs.existsSync(paths.pendingMemoryDeltaProposals));
  assert.ok(fs.existsSync(paths.acceptedMemoryDeltaProposals));
  assert.ok(fs.existsSync(paths.rejectedMemoryDeltaProposals));
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
  const payload = parseJsonOnly(raw);
  assertJsonEnvelope(payload, true, "quest.new");
  assert.match(payload.data.quest.id, /^quest_/);
  assert.equal(payload.data.quest.file, `.orange-hyper/quests/active/${payload.data.quest.id}.md`);
  assert.equal(payload.data.next.route, `orange route --quest ${payload.data.quest.id}`);
  assert.equal(payload.data.next.capsule, `orange capsule --quest ${payload.data.quest.id}`);
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
  const payload = parseJsonOnly(raw);
  assertJsonEnvelope(payload, true, "route.show");
  assert.equal(payload.data.trace.quest_id, created.id);
  assert.equal(payload.data.trace.contract.route, payload.data.contract.route);
  assert.equal(payload.data.contract.output_contract, created.data.output_contract);
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

test("capsule --json prints valid JSON without human-readable output", async () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const created = createQuest(cwd, "build selected JSON capsule", {
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  const { output, io } = captureIo();
  await main(["capsule", "--quest", created.id, "--json"], { cwd, io });
  const raw = output.join("");
  const payload = parseJsonOnly(raw);
  assertJsonEnvelope(payload, true, "capsule.build");
  assert.equal(payload.data.capsule.file, ".orange-hyper/capsules/current.md");
  assert.equal(payload.data.quest.id, created.id);
  assert.match(payload.data.capsule.content, /build selected JSON capsule/);
  assert.doesNotMatch(raw, /^Wrote /m);
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

test("remember propose list show accept and reject support JSON envelopes", async () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd);
  const first = createQuest(cwd, "remember a durable implementation decision", {
    layer: "L2",
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  completeQuest(cwd, first.id, {
    clock: new Date("2026-06-16T00:01:00.000Z"),
    evidence: ["npm test passed"]
  });

  const proposed = assertJsonCommand(
    runOrange(["remember", "propose", "--quest", first.id, "--json"], cwd),
    "remember.propose"
  );
  assert.equal(proposed.data.duplicated, false);
  assert.deepEqual(proposed.data.warnings, []);
  const proposalId = proposed.data.proposal.id;
  assert.equal(proposed.data.proposal.status, "pending");
  assert.equal(proposed.data.proposal.file, `.orange-hyper/proposals/memory-delta/pending/${proposalId}.md`);

  const listed = assertJsonCommand(runOrange(["remember", "list", "--json"], cwd), "remember.list");
  assert.equal(listed.data.proposals.length, 1);
  assert.equal(listed.data.proposals[0].id, proposalId);

  const shown = assertJsonCommand(runOrange(["remember", "show", proposalId, "--json"], cwd), "remember.show");
  assert.equal(shown.data.proposal.id, proposalId);
  assert.match(shown.data.proposal.body, /## Candidate Memory/);
  assert.match(shown.data.proposal.body, /## Suggested Node/);

  const accepted = assertJsonCommand(runOrange(["remember", "accept", proposalId, "--json"], cwd), "remember.accept");
  assert.equal(accepted.data.proposal.status, "accepted");
  assert.equal(accepted.data.node.source_proposal, proposalId);
  assert.equal(accepted.data.node.source_quest, first.id);
  assert.equal(accepted.data.node.node_type, "decision");
  assert.equal(accepted.data.node.origin, "memory-delta-proposal");
  assert.match(accepted.data.node.accepted_at, /^20\d\d-/);
  assert.match(accepted.data.node.source_proposal_hash, /^[a-f0-9]{64}$/);
  assert.equal(accepted.data.node.provenance.proposal_id, proposalId);
  assert.equal(accepted.data.node.provenance.source_proposal, proposalId);
  assert.equal(accepted.data.node.provenance.source_quest, first.id);
  assert.equal(accepted.data.node.provenance.node_type, "decision");
  assert.equal(accepted.data.node.provenance.origin, "memory-delta-proposal");
  assert.equal(accepted.data.node.provenance.accepted_at, accepted.data.node.accepted_at);
  assert.equal(accepted.data.node.provenance.source_proposal_hash, accepted.data.node.source_proposal_hash);
  assert.ok(fs.existsSync(path.join(paths.acceptedMemoryDeltaProposals, `${proposalId}.md`)));
  assert.equal(runOrange(["remember", "accept", proposalId, "--json"], cwd).status, 1);
  assert.equal(runOrange(["remember", "reject", proposalId, "--json"], cwd).status, 1);

  const second = createQuest(cwd, "remember a regression risk", {
    layer: "L2",
    clock: new Date("2026-06-16T00:02:00.000Z")
  });
  completeQuest(cwd, second.id, {
    clock: new Date("2026-06-16T00:03:00.000Z"),
    unverifiedReason: "Manual verification is not available in seed test"
  });
  const secondProposal = assertJsonCommand(
    runOrange(["remember", "propose", "--quest", second.id, "--json"], cwd),
    "remember.propose"
  ).data.proposal.id;
  const rejected = assertJsonCommand(runOrange(["remember", "reject", secondProposal, "--json"], cwd), "remember.reject");
  assert.equal(rejected.data.proposal.status, "rejected");
  assert.ok(fs.existsSync(path.join(paths.rejectedMemoryDeltaProposals, `${secondProposal}.md`)));
  assert.equal(listMemoryGraphNodes(cwd).some((node) => node.data.source_proposal === secondProposal), false);
  assert.equal(runOrange(["remember", "accept", secondProposal, "--json"], cwd).status, 1);
  assert.equal(runOrange(["remember", "reject", secondProposal, "--json"], cwd).status, 1);
});

test("remember propose is idempotent for matching pending candidate memory", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd);
  const quest = createQuest(cwd, "remember duplicate proposal policy", {
    layer: "L2",
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  completeQuest(cwd, quest.id, {
    clock: new Date("2026-06-16T00:01:00.000Z"),
    evidence: ["npm test passed"]
  });

  const first = assertJsonCommand(
    runOrange(["remember", "propose", "--quest", quest.id, "--json"], cwd),
    "remember.propose"
  );
  const second = assertJsonCommand(
    runOrange(["remember", "propose", "--quest", quest.id, "--json"], cwd),
    "remember.propose"
  );

  assert.equal(first.data.duplicated, false);
  assert.equal(second.data.duplicated, true);
  assert.equal(second.data.proposal.duplicated, true);
  assert.equal(second.data.proposal.id, first.data.proposal.id);
  assert.equal(second.data.proposal.file, first.data.proposal.file);
  assert.deepEqual(
    fs.readdirSync(paths.pendingMemoryDeltaProposals).filter((name) => name.endsWith(".md")),
    [`${first.data.proposal.id}.md`]
  );
});

test("remember list filters by status type and source quest in JSON mode", () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);

  const decisionQuest = createQuest(cwd, "remember adapter contract decision", {
    layer: "L2",
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  completeQuest(cwd, decisionQuest.id, {
    clock: new Date("2026-06-16T00:01:00.000Z"),
    evidence: ["npm test passed"]
  });
  const decisionProposal = assertJsonCommand(
    runOrange(["remember", "propose", "--quest", decisionQuest.id, "--json"], cwd),
    "remember.propose"
  ).data.proposal;
  assertJsonCommand(runOrange(["remember", "accept", decisionProposal.id, "--json"], cwd), "remember.accept");

  const riskQuest = createQuest(cwd, "remember regression risk failure", {
    layer: "L2",
    clock: new Date("2026-06-16T00:02:00.000Z")
  });
  completeQuest(cwd, riskQuest.id, {
    clock: new Date("2026-06-16T00:03:00.000Z"),
    evidence: ["npm test passed"]
  });
  const riskProposal = assertJsonCommand(
    runOrange(["remember", "propose", "--quest", riskQuest.id, "--json"], cwd),
    "remember.propose"
  ).data.proposal;

  const constraintQuest = createQuest(cwd, "remember JSON contract policy must stay stable", {
    layer: "L2",
    clock: new Date("2026-06-16T00:04:00.000Z")
  });
  completeQuest(cwd, constraintQuest.id, {
    clock: new Date("2026-06-16T00:05:00.000Z"),
    evidence: ["npm test passed"]
  });
  const constraintProposal = assertJsonCommand(
    runOrange(["remember", "propose", "--quest", constraintQuest.id, "--json"], cwd),
    "remember.propose"
  ).data.proposal;

  const pending = assertJsonCommand(runOrange(["remember", "list", "--status", "pending", "--json"], cwd), "remember.list");
  assert.equal(pending.data.filters.status, "pending");
  assert.deepEqual(pending.data.proposals.map((proposal) => proposal.status), ["pending", "pending"]);
  assert.deepEqual(new Set(pending.data.proposals.map((proposal) => proposal.id)), new Set([riskProposal.id, constraintProposal.id]));

  const decision = assertJsonCommand(runOrange(["remember", "list", "--type", "decision", "--json"], cwd), "remember.list");
  assert.equal(decision.data.filters.type, "decision");
  assert.deepEqual(decision.data.proposals.map((proposal) => proposal.id), [decisionProposal.id]);

  const questFiltered = assertJsonCommand(runOrange(["remember", "list", "--quest", riskQuest.id, "--json"], cwd), "remember.list");
  assert.equal(questFiltered.data.filters.quest, riskQuest.id);
  assert.deepEqual(questFiltered.data.proposals.map((proposal) => proposal.id), [riskProposal.id]);
});

test("remember propose requires completed L2+ quest with verification state", async () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const active = createQuest(cwd, "remember only after completion", {
    layer: "L2",
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  await assert.rejects(
    () => main(["remember", "propose", "--quest", active.id], { cwd, io: silentIo() }),
    /completed quests/
  );

  const small = createQuest(cwd, "fix one label typo", {
    layer: "L1",
    clock: new Date("2026-06-16T00:01:00.000Z")
  });
  completeQuest(cwd, small.id, {
    clock: new Date("2026-06-16T00:02:00.000Z"),
    evidence: ["manual check passed"]
  });
  await assert.rejects(
    () => main(["remember", "propose", "--quest", small.id], { cwd, io: silentIo() }),
    /disabled by default for L0\/L1/
  );
});

test("doctor catches memory proposal source quest and status problems", () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const created = createQuest(cwd, "remember source quest provenance", {
    layer: "L2",
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  completeQuest(cwd, created.id, {
    clock: new Date("2026-06-16T00:01:00.000Z"),
    evidence: ["node --test passed"]
  });
  const proposal = proposeMemoryDelta(cwd, created.id, {
    clock: new Date("2026-06-16T00:02:00.000Z")
  });
  fs.writeFileSync(
    proposal.filePath,
    stringifyFrontmatter(
      {
        ...proposal.data,
        source_quest: "quest_missing"
      },
      proposal.body
    )
  );
  const result = runDoctor(cwd);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /source_quest not found: quest_missing/);
});

test("memory proposal quality validation reports warnings and errors", () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const shortQuest = createQuest(cwd, "fix", {
    layer: "L2",
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  completeQuest(cwd, shortQuest.id, {
    clock: new Date("2026-06-16T00:01:00.000Z"),
    evidence: ["npm test passed"]
  });
  const proposed = assertJsonCommand(
    runOrange(["remember", "propose", "--quest", shortQuest.id, "--json"], cwd),
    "remember.propose"
  );
  assert.match(proposed.data.warnings.join("\n"), /Candidate Memory is very short or generic/);
  assert.equal(runDoctor(cwd).ok, true);
  assert.match(runDoctor(cwd).warnings.join("\n"), /Candidate Memory is very short or generic/);

  const proposal = readMemoryDeltaProposalFile(path.join(cwd, proposed.data.proposal.file));
  const brokenBody = [
    "# Broken Memory Delta Proposal",
    "",
    "## Candidate Memory",
    "",
    "",
    "## Why this should be remembered",
    "",
    "",
    "## Evidence",
    "",
    "- unrelated note",
    "",
    "## Suggested Node",
    "",
    "- Type: risk"
  ].join("\n");
  fs.writeFileSync(
    proposal.filePath,
    stringifyFrontmatter(
      {
        ...proposal.data,
        confidence: "urgent"
      },
      brokenBody
    )
  );

  const doctor = runDoctor(cwd);
  assert.equal(doctor.ok, false);
  assert.match(doctor.errors.join("\n"), /invalid confidence urgent/);
  assert.match(doctor.errors.join("\n"), /Candidate Memory is empty/);
  assert.match(doctor.errors.join("\n"), /Why this should be remembered is empty/);
  assert.match(doctor.errors.join("\n"), /Evidence must reference source quest or verification information/);
  assert.match(doctor.errors.join("\n"), /Suggested Node type risk conflicts with node_type decision/);
});

test("accept creates graph node provenance and reject does not create graph nodes", () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const acceptedQuest = createQuest(cwd, "remember accepted graph provenance", {
    layer: "L2",
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  completeQuest(cwd, acceptedQuest.id, {
    clock: new Date("2026-06-16T00:01:00.000Z"),
    evidence: ["npm test passed"]
  });
  const proposal = proposeMemoryDelta(cwd, acceptedQuest.id, {
    clock: new Date("2026-06-16T00:02:00.000Z")
  });
  const accepted = acceptMemoryDelta(cwd, proposal.data.id, {
    clock: new Date("2026-06-16T00:03:00.000Z")
  });
  assert.equal(accepted.node.data.source_proposal, proposal.data.id);
  assert.equal(accepted.node.data.source_quest, acceptedQuest.id);
  assert.equal(accepted.node.data.accepted_at, "2026-06-16T00:03:00.000Z");
  assert.equal(accepted.node.data.node_type, "decision");
  assert.equal(accepted.node.data.origin, "memory-delta-proposal");
  assert.match(accepted.node.data.source_proposal_hash, /^[a-f0-9]{64}$/);
  assert.equal(accepted.node.data.provenance.proposal_id, proposal.data.id);
  assert.equal(accepted.node.data.provenance.source_proposal, proposal.data.id);
  assert.equal(accepted.node.data.provenance.source_quest, acceptedQuest.id);
  assert.equal(accepted.node.data.provenance.accepted_at, "2026-06-16T00:03:00.000Z");
  assert.equal(accepted.node.data.provenance.node_type, "decision");
  assert.equal(accepted.node.data.provenance.origin, "memory-delta-proposal");
  assert.equal(accepted.node.data.provenance.source_proposal_hash, accepted.node.data.source_proposal_hash);

  const rejectedQuest = createQuest(cwd, "remember rejected proposal", {
    layer: "L2",
    clock: new Date("2026-06-16T00:04:00.000Z")
  });
  completeQuest(cwd, rejectedQuest.id, {
    clock: new Date("2026-06-16T00:05:00.000Z"),
    evidence: ["npm test passed"]
  });
  const rejectedProposal = proposeMemoryDelta(cwd, rejectedQuest.id, {
    clock: new Date("2026-06-16T00:06:00.000Z")
  });
  rejectMemoryDelta(cwd, rejectedProposal.data.id, {
    clock: new Date("2026-06-16T00:07:00.000Z")
  });
  assert.equal(listMemoryGraphNodes(cwd).some((node) => node.data.source_proposal === rejectedProposal.data.id), false);
  assert.equal(runDoctor(cwd).ok, true);
});

test("doctor catches accepted memory graph provenance mismatch", () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const quest = createQuest(cwd, "remember provenance mismatch detection", {
    layer: "L2",
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  completeQuest(cwd, quest.id, {
    clock: new Date("2026-06-16T00:01:00.000Z"),
    evidence: ["npm test passed"]
  });
  const proposal = proposeMemoryDelta(cwd, quest.id, {
    clock: new Date("2026-06-16T00:02:00.000Z")
  });
  const accepted = acceptMemoryDelta(cwd, proposal.data.id, {
    clock: new Date("2026-06-16T00:03:00.000Z")
  });
  fs.writeFileSync(
    accepted.node.filePath,
    stringifyFrontmatter(
      {
        ...accepted.node.data,
        source_quest: "quest_other",
        origin: "manual",
        provenance: {
          ...accepted.node.data.provenance,
          source_quest: "quest_other",
          origin: "manual"
        }
      },
      accepted.node.body
    )
  );

  const doctor = runDoctor(cwd);
  assert.equal(doctor.ok, false);
  assert.match(doctor.errors.join("\n"), /provenance does not match accepted proposal/);
  assert.match(doctor.errors.join("\n"), /origin provenance does not match memory-delta-proposal/);
});

test("doctor catches invalid graph index JSON after memory accept", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd);
  const created = createQuest(cwd, "remember graph index validity", {
    layer: "L2",
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  completeQuest(cwd, created.id, {
    clock: new Date("2026-06-16T00:01:00.000Z"),
    evidence: ["npm test passed"]
  });
  const proposal = proposeMemoryDelta(cwd, created.id, {
    clock: new Date("2026-06-16T00:02:00.000Z")
  });
  acceptMemoryDelta(cwd, proposal.data.id, {
    clock: new Date("2026-06-16T00:03:00.000Z")
  });
  fs.writeFileSync(paths.graphIndex, "{broken");
  const result = runDoctor(cwd);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /graph\/index\.json is not valid JSON/);
});

test("remember selectors reject path traversal", async () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const created = createQuest(cwd, "remember selector safety", {
    layer: "L2",
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  completeQuest(cwd, created.id, {
    clock: new Date("2026-06-16T00:01:00.000Z"),
    evidence: ["node --test passed"]
  });
  const proposal = proposeMemoryDelta(cwd, created.id, {
    clock: new Date("2026-06-16T00:02:00.000Z")
  });
  assert.ok(readMemoryDeltaProposalFile(proposal.filePath));
  for (const selector of ["../../package.json", "../README.md", "pending/../../bad"]) {
    await assert.rejects(() => main(["remember", "show", selector], { cwd, io: silentIo() }), /must be an id, not a path/);
    await assert.rejects(() => main(["remember", "accept", selector], { cwd, io: silentIo() }), /must be an id, not a path/);
    await assert.rejects(() => main(["remember", "reject", selector], { cwd, io: silentIo() }), /must be an id, not a path/);
  }
});

test("identity summary includes memory proposal and accepted node counts", async () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd, { projectName: "memory-identity-demo" });
  const pendingQuest = createQuest(cwd, "remember pending decision", {
    layer: "L2",
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  completeQuest(cwd, pendingQuest.id, {
    clock: new Date("2026-06-16T00:01:00.000Z"),
    evidence: ["npm test passed"]
  });
  proposeMemoryDelta(cwd, pendingQuest.id, {
    clock: new Date("2026-06-16T00:02:00.000Z")
  });

  const acceptedQuest = createQuest(cwd, "remember accepted decision", {
    layer: "L2",
    clock: new Date("2026-06-16T00:03:00.000Z")
  });
  completeQuest(cwd, acceptedQuest.id, {
    clock: new Date("2026-06-16T00:04:00.000Z"),
    evidence: ["npm test passed"]
  });
  const acceptedProposal = proposeMemoryDelta(cwd, acceptedQuest.id, {
    clock: new Date("2026-06-16T00:05:00.000Z")
  });
  acceptMemoryDelta(cwd, acceptedProposal.data.id, {
    clock: new Date("2026-06-16T00:06:00.000Z")
  });

  const rejectedQuest = createQuest(cwd, "remember rejected risk", {
    layer: "L2",
    clock: new Date("2026-06-16T00:07:00.000Z")
  });
  completeQuest(cwd, rejectedQuest.id, {
    clock: new Date("2026-06-16T00:08:00.000Z"),
    evidence: ["npm test passed"]
  });
  const rejectedProposal = proposeMemoryDelta(cwd, rejectedQuest.id, {
    clock: new Date("2026-06-16T00:09:00.000Z")
  });
  rejectMemoryDelta(cwd, rejectedProposal.data.id, {
    clock: new Date("2026-06-16T00:10:00.000Z")
  });

  const { output, io } = captureIo();
  await main(["identity", "build", "--json"], { cwd, io });
  const payload = parseJsonOnly(output.join(""));
  assertJsonEnvelope(payload, true, "identity.build");
  assert.equal(payload.data.summary.pendingMemoryProposals, 1);
  assert.equal(payload.data.summary.acceptedMemoryProposals, 1);
  assert.equal(payload.data.summary.rejectedMemoryProposals, 1);
  assert.equal(payload.data.summary.acceptedMemoryNodes, 1);
  assert.deepEqual(payload.data.summary.topProposalNodeTypes, [
    { nodeType: "decision", count: 2 },
    { nodeType: "risk", count: 1 }
  ]);
});

test("quest done --json prints completed quest information as valid JSON", async () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const created = createQuest(cwd, "complete through JSON mode", {
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  const evidencePath = path.join(cwd, "verification.txt");
  fs.writeFileSync(evidencePath, "npm test passed\n");
  const { output, io } = captureIo();
  await main(["quest", "done", created.id, "--evidence", "git diff --check passed", "--evidence-file", "verification.txt", "--json"], { cwd, io });
  const raw = output.join("");
  const payload = parseJsonOnly(raw);
  assertJsonEnvelope(payload, true, "quest.done");
  assert.equal(payload.data.quest.id, created.id);
  assert.equal(payload.data.quest.status, "completed");
  assert.equal(payload.data.quest.verification_status, "verified");
  assert.deepEqual(payload.data.quest.verification_evidence, ["git diff --check passed", "npm test passed"]);
  assert.doesNotMatch(raw, /^Completed /m);
  assert.doesNotMatch(raw, /^Moved to /m);
  assert.doesNotMatch(raw, /^Verification status:/m);
});

test("doctor --json prints ok true diagnostics as valid JSON", async () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const { output, io } = captureIo();
  await main(["doctor", "--json"], { cwd, io });
  const raw = output.join("");
  const payload = parseJsonOnly(raw);
  assertJsonEnvelope(payload, true, "doctor.run");
  assert.equal(payload.data.ok, true);
  assert.deepEqual(payload.data.errors, []);
  assert.doesNotMatch(raw, /^Orange doctor/m);
  assert.doesNotMatch(raw, /^No problems found\./m);
});

test("doctor --json prints ok false diagnostics and exits non-zero for invalid state", () => {
  const cwd = tempWorkspace();
  const paths = initWorkspace(cwd);
  fs.writeFileSync(path.join(paths.activeQuests, "broken.md"), "# Missing frontmatter\n");
  const result = runOrange(["doctor", "--json"], cwd);
  assert.equal(result.status, 2);
  assert.equal(result.stderr, "");
  const payload = parseJsonOnly(result.stdout);
  assertJsonEnvelope(payload, false, "doctor.run");
  assert.equal(payload.error.code, "DOCTOR_FAILED");
  assert.equal(payload.data.ok, false);
  assert.match(payload.data.errors.join("\n"), /Missing YAML frontmatter/);
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
  assert.match(html, /Memory proposals are active\./);
  assert.match(html, /Graph rendering is not active yet\./);
  assert.match(html, /Accepted memory nodes are candidate project memory\./);
});

test("identity build --json prints generated html path and summary", async () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd, { projectName: "identity-json-demo" });
  const created = createQuest(cwd, "build identity JSON summary", {
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  completeQuest(cwd, created.id, {
    clock: new Date("2026-06-16T00:01:00.000Z"),
    evidence: ["node --test passed"]
  });
  const { output, io } = captureIo();
  await main(["identity", "build", "--json"], { cwd, io });
  const raw = output.join("");
  const payload = parseJsonOnly(raw);
  assertJsonEnvelope(payload, true, "identity.build");
  assert.equal(payload.data.file, ".orange-hyper/identity/orange-hyper.html");
  assert.equal(payload.data.summary.projectName, "identity-json-demo");
  assert.equal(payload.data.summary.completedCount, 1);
  assert.equal(payload.data.summary.verifiedCount, 1);
  assert.deepEqual(payload.data.summary.statusMessages, [
    "Memory proposals are active.",
    "Graph rendering is not active yet.",
    "Accepted memory nodes are candidate project memory."
  ]);
  assert.doesNotMatch(raw, /^Wrote /m);
});

test("JSON mode failures print machine-readable errors and exit non-zero", () => {
  const cwd = tempWorkspace();
  initWorkspace(cwd);
  const created = createQuest(cwd, "fail completion without evidence", {
    clock: new Date("2026-06-16T00:00:00.000Z")
  });
  const result = runOrange(["quest", "done", created.id, "--json"], cwd);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  const payload = parseJsonOnly(result.stdout);
  assertJsonEnvelope(payload, false, "quest.done");
  assert.equal(payload.error.code, "USER_INPUT_ERROR");
  assert.match(payload.error.message, /requires --evidence or --unverified/);
});

test("all JSON success envelopes include contract version and dot command ids", () => {
  const cwd = tempWorkspace();
  assert.equal(runOrange(["init"], cwd).status, 0);

  const created = assertJsonCommand(
    runOrange(["quest", "new", "--json", "implement adapter contract freeze"], cwd),
    "quest.new"
  );
  const questId = created.data.quest.id;

  assertJsonCommand(runOrange(["route", "--quest", questId, "--json"], cwd), "route.show");
  assertJsonCommand(runOrange(["capsule", "--quest", questId, "--json"], cwd), "capsule.build");
  assertJsonCommand(
    runOrange(["quest", "done", questId, "--evidence", "npm test passed", "--json"], cwd),
    "quest.done"
  );
  const proposed = assertJsonCommand(runOrange(["remember", "propose", "--quest", questId, "--json"], cwd), "remember.propose");
  const proposalId = proposed.data.proposal.id;
  assertJsonCommand(runOrange(["remember", "list", "--json"], cwd), "remember.list");
  assertJsonCommand(runOrange(["remember", "show", proposalId, "--json"], cwd), "remember.show");
  assertJsonCommand(runOrange(["remember", "accept", proposalId, "--json"], cwd), "remember.accept");

  const rejectedQuest = assertJsonCommand(
    runOrange(["quest", "new", "--json", "remember rejected adapter contract risk"], cwd),
    "quest.new"
  ).data.quest.id;
  assertJsonCommand(
    runOrange(["quest", "done", rejectedQuest, "--evidence", "npm test passed", "--json"], cwd),
    "quest.done"
  );
  const rejectedProposal = assertJsonCommand(
    runOrange(["remember", "propose", "--quest", rejectedQuest, "--json"], cwd),
    "remember.propose"
  ).data.proposal.id;
  assertJsonCommand(runOrange(["remember", "reject", rejectedProposal, "--json"], cwd), "remember.reject");
  assertJsonCommand(runOrange(["doctor", "--json"], cwd), "doctor.run");
  assertJsonCommand(runOrange(["identity", "build", "--json"], cwd), "identity.build");
});

function silentIo() {
  return {
    stdout: { write: () => {} },
    stderr: { write: () => {} }
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
  assert.match(payload.command, /^[a-z0-9]+(?:\.[a-z0-9]+)+$/);
}

function runOrange(args, cwd) {
  return spawnSync(process.execPath, [ORANGE_BIN.pathname, ...args], {
    cwd,
    encoding: "utf8"
  });
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
