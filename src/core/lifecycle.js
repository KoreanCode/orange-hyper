import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { generateCapsule } from "./capsule.js";
import { isInitialized } from "./config.js";
import { runDoctor } from "./doctor.js";
import { listGraphNodes } from "./graph.js";
import { proposeMemoryDelta } from "./memory.js";
import { workspacePaths } from "./paths.js";
import { completeQuest, createQuest, findQuest } from "./quest.js";
import { appendRouteTrace, buildRouteContract, formatRouteLine } from "./route.js";
import { slugify } from "./text.js";
import { nowIso } from "./time.js";
import { hasActivationPolicy, readActivationPolicy, recordHeartbeat } from "./activation.js";

export const LIFECYCLE_SUPPORTED_EVENTS = new Set([
  "session-start",
  "user-prompt-submit",
  "post-tool-use",
  "stop"
]);

const MAX_CONTEXT_CHARS = 3200;
const MAX_SUMMARY_CHARS = 900;
const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{12,}\b/g,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  /\b(?:token|api[_-]?key|password|secret)\s*[:=]\s*["']?[^"'\s]+/gi
];

export function runLifecycleEvent(cwd = process.cwd(), event, input = {}, options = {}) {
  if (!LIFECYCLE_SUPPORTED_EVENTS.has(event)) {
    throw lifecycleError("LIFECYCLE_UNSUPPORTED_EVENT", `Unsupported lifecycle event: ${event}`, "Use session-start, user-prompt-submit, post-tool-use, or stop.");
  }
  const normalizedInput = normalizeInput(input, event);
  if (!isLifecycleActivated(cwd, normalizedInput.host)) {
    return inactiveResult(cwd, event, normalizedInput);
  }
  if (!isInitialized(cwd)) {
    return degradedResult(cwd, event, normalizedInput, "Project has activation policy but is not initialized.");
  }
  const heartbeat = recordHeartbeat(cwd, eventNameForCodex(event), normalizedInput, options);
  switch (event) {
    case "session-start":
      return lifecycleSessionStart(cwd, normalizedInput, heartbeat, options);
    case "user-prompt-submit":
      return lifecycleUserPromptSubmit(cwd, normalizedInput, heartbeat, options);
    case "post-tool-use":
      return lifecyclePostToolUse(cwd, normalizedInput, heartbeat, options);
    case "stop":
      return lifecycleStop(cwd, normalizedInput, heartbeat, options);
    default:
      return degradedResult(cwd, event, normalizedInput, "Unsupported lifecycle event.");
  }
}

function lifecycleSessionStart(cwd, input, heartbeat, options) {
  const context = buildSessionContext(cwd, input);
  return {
    event: "session-start",
    host: input.host,
    active: true,
    noop: false,
    degraded: false,
    heartbeat,
    additional_context: context.text,
    context,
    warnings: context.warnings,
    system_message: context.warnings.length ? "Orange Hyper lifecycle context loaded with warnings." : null
  };
}

function lifecycleUserPromptSubmit(cwd, input, heartbeat, options) {
  const prompt = redact(String(input.prompt || ""));
  const turnKey = idempotencyKey(cwd, input, "UserPromptSubmit");
  const existing = readTurn(cwd, turnKey);
  if (existing?.processed) {
    return {
      ...existing.result,
      duplicate: true,
      heartbeat
    };
  }
  if (isL5Prompt(prompt)) {
    const result = {
      event: "user-prompt-submit",
      host: input.host,
      active: true,
      noop: false,
      degraded: false,
      blocked: true,
      block_reason: "Orange L5 autonomous loop requires explicit opt-in and is not entered automatically.",
      route: {
        layer: "L5",
        route: "L5/P5/T5/V5/A4/M4/MB4+",
        quest_policy: "explicit_opt_in_required"
      },
      quest: null,
      capsule: null,
      additional_context: "",
      warnings: []
    };
    writeTurn(cwd, turnKey, input, result, {
      processed: true,
      layer: "L5",
      verification: "V5",
      intent_signature: normalizedIntentSignature(prompt),
      scope_signature: scopeSignatureFor(prompt),
      continuity: { action: "none", confidence: "high" }
    });
    return { ...result, heartbeat };
  }
  const contract = buildRouteContract(prompt);
  const baseResult = {
    event: "user-prompt-submit",
    host: input.host,
    active: true,
    noop: false,
    degraded: false,
    blocked: false,
    block_reason: null,
    route: contract,
    quest: null,
    capsule: null,
    additional_context: "",
    warnings: []
  };
  if (contract.layer === "L0" || contract.layer === "L1") {
    const context = contract.layer === "L1"
      ? compactContext([
          "Orange Hyper route: L1 small task.",
          "Keep the change narrow and use a touched-surface sanity check if files are edited."
        ].join("\n"))
      : "";
    const result = {
      ...baseResult,
      additional_context: context
    };
    writeTurn(cwd, turnKey, input, result, {
      processed: true,
      layer: contract.layer,
      verification: contract.verification,
      intent_signature: normalizedIntentSignature(prompt),
      scope_signature: scopeSignatureFor(prompt),
      continuity: { action: "none", confidence: "high" }
    });
    return { ...result, heartbeat };
  }
  if (contract.layer === "L4") {
    const result = {
      ...baseResult,
      blocked: true,
      block_reason: "Orange routed this as L4 high-risk work. Confirm the risky/destructive/security-sensitive action before continuing.",
      additional_context: compactContext([
        "Orange Hyper route: L4 high-risk request.",
        formatRouteLine(contract),
        "Pause for explicit user confirmation before destructive, security, payment, auth, migration, production, or external side-effect work."
      ].join("\n"))
    };
    appendRouteTrace(cwd, prompt, contract, { clock: options.clock });
    writeTurn(cwd, turnKey, input, result, {
      processed: true,
      layer: contract.layer,
      verification: contract.verification,
      intent_signature: normalizedIntentSignature(prompt),
      scope_signature: scopeSignatureFor(prompt),
      continuity: { action: "none", confidence: "high" }
    });
    return { ...result, heartbeat };
  }

  const intentSignature = normalizedIntentSignature(prompt);
  const scopeSignature = scopeSignatureFor(prompt);
  const continuity = resolveQuestContinuity(cwd, input, {
    intentSignature,
    scopeSignature,
    prompt
  });
  const questId = continuity.action === "continue_existing"
    ? continuity.quest_id
    : `quest_${shortHash(turnKey)}_${slugify(prompt).slice(0, 48) || "codex-turn"}`;
  const existingQuest = findQuestOrNull(cwd, questId);
  const quest = existingQuest || createQuest(cwd, prompt, {
    id: questId,
    title: makeLifecycleTitle(prompt),
    layer: contract.layer,
    outputContract: contract.output_contract,
    expectedVerification: expectedVerificationFor(contract),
    clock: options.clock
  });
  if (!existingQuest) {
    appendRouteTrace(cwd, prompt, contract, { questId: quest.data.id, clock: options.clock });
  }
  const capsule = generateCapsule(cwd, quest.data.id, { clock: options.clock });
  const memory = smallMemorySlice(cwd, contract);
  const context = compactContext([
    `Orange Hyper route: ${contract.layer}.`,
    formatRouteLine(contract),
    `Quest: ${quest.data.id}`,
    `Verification expected: ${contract.verification}`,
    "Use Orange Kernel commands for Orange state. Do not edit `.orange-hyper` directly.",
    memory.length ? `Relevant accepted memory:\n${memory.map((item) => `- ${item}`).join("\n")}` : "Relevant accepted memory: none selected.",
    "Pending Memory Proposals are review candidates only; do not auto-accept."
  ].join("\n"));
  const result = {
    ...baseResult,
    quest: {
      id: quest.data.id,
      file: path.relative(cwd, quest.filePath),
      created: !existingQuest,
      continued: continuity.action === "continue_existing",
      status: quest.data.status,
      verification_status: quest.data.verification_status
    },
    continuity,
    capsule: {
      file: path.relative(cwd, capsule.filePath),
      created: true
    },
    memory_slice_count: memory.length,
    additional_context: context
  };
  writeTurn(cwd, turnKey, input, result, {
    processed: true,
    quest_id: quest.data.id,
    layer: contract.layer,
    verification: contract.verification,
    intent_signature: intentSignature,
    scope_signature: scopeSignature,
    continuity,
    durable_candidate_detected: hasDurableCandidate(prompt)
  });
  writeSessionState(cwd, input, {
    current_turn: {
      turn_key: hashedTurnKey(input),
      quest_id: quest.data.id,
      intent_signature: intentSignature,
      scope_signature: continuity.scope_signature || scopeSignature,
      continuity_confidence: continuity.confidence
    },
    recent_quest_id: quest.data.id
  });
  return { ...result, heartbeat };
}

function lifecyclePostToolUse(cwd, input, heartbeat, options) {
  const toolUseId = safeString(input.tool_use_id) || shortHash(idempotencyKey(cwd, input, "PostToolUse"));
  const evidenceKey = idempotencyKey(cwd, { ...input, tool_use_id: toolUseId }, "PostToolUse");
  const evidencePath = evidenceFilePath(cwd, evidenceKey);
  if (fs.existsSync(evidencePath)) {
    const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
    return {
      event: "post-tool-use",
      host: input.host,
      active: true,
      noop: false,
      degraded: false,
      duplicate: true,
      evidence,
      additional_context: evidence.feedback_context || "",
      heartbeat,
      warnings: []
    };
  }
  const evidence = buildToolEvidence(cwd, input, options);
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  writeJsonAtomic(evidencePath, evidence);
  const additional = evidence.evidence_kind === "verification" && evidence.passed
    ? `Orange recorded verification evidence candidate: ${evidence.summary}`
    : evidence.evidence_kind === "verification"
      ? `Orange recorded failed verification attempt; it is not success evidence: ${evidence.summary}`
      : evidence.feedback_context || "";
  evidence.feedback_context = additional;
  writeJsonAtomic(evidencePath, evidence);
  return {
    event: "post-tool-use",
    host: input.host,
    active: true,
    noop: false,
    degraded: false,
    duplicate: false,
    evidence,
    additional_context: additional,
    heartbeat,
    warnings: []
  };
}

function lifecycleStop(cwd, input, heartbeat, options) {
  const turnKey = idempotencyKey(cwd, input, "UserPromptSubmit");
  const turn = readTurn(cwd, turnKey);
  if (!turn?.quest_id) {
    return {
      event: "stop",
      host: input.host,
      active: true,
      noop: true,
      degraded: false,
      reason: "No active Orange Quest for this turn.",
      continuation_required: false,
      completed: false,
      heartbeat,
      warnings: []
    };
  }
  const layer = turn.layer || turn.result?.route?.layer || "L0";
  const verification = turn.verification || turn.result?.route?.verification || "V0";
  const evidence = evidenceForTurn(cwd, input).filter((item) => item.evidence_kind === "verification" && item.passed);
  const needsEvidence = layerNumber(layer) >= 2;
  const alreadyContinued = Boolean(input.stop_hook_active || turn.continuation_requested);
  if (needsEvidence && !evidence.length && !alreadyContinued) {
    const reason = `Orange가 현재 turn에서 verification evidence를 관찰하지 못했습니다. 현재 Quest는 ${verification} 검증이 필요합니다. 변경 범위에 해당하는 테스트, 빌드, 린트 또는 동등한 검증 명령을 실행하고 결과를 기록한 뒤 다시 완료하십시오.`;
    writeTurn(cwd, turnKey, input, turn.result, {
      ...turn,
      continuation_requested: true,
      continuation_reason: reason
    });
    return {
      event: "stop",
      host: input.host,
      active: true,
      noop: false,
      degraded: false,
      quest: { id: turn.quest_id },
      continuation_required: true,
      continuation_reason: reason,
      completed: false,
      heartbeat,
      warnings: []
    };
  }
  const explicitUnverifiedReason = extractExplicitUnverifiedReason(input.last_assistant_message);
  if (needsEvidence && !evidence.length && !explicitUnverifiedReason) {
    const reason = "Orange가 현재 turn에서 verification evidence를 관찰하지 못했고, 명시적인 미검증 사유도 확인하지 못했습니다. Quest는 incomplete 상태로 유지됩니다.";
    writeTurn(cwd, turnKey, input, turn.result, {
      ...turn,
      incomplete: true,
      incomplete_reason: reason
    });
    return {
      event: "stop",
      host: input.host,
      active: true,
      noop: false,
      degraded: false,
      quest: { id: turn.quest_id },
      continuation_required: false,
      completed: false,
      incomplete: true,
      reason,
      additional_context: reason,
      heartbeat,
      warnings: []
    };
  }

  const completion = completeQuestIfNeeded(cwd, turn.quest_id, {
    evidence: evidence.map(formatEvidenceForQuest),
    unverifiedReason: needsEvidence && !evidence.length
      ? explicitUnverifiedReason
      : "",
    clock: options.clock
  });
  const episode = writeEpisode(cwd, input, turn, completion, evidence, options);
  const proposal = maybeCreatePendingProposal(cwd, turn, completion, evidence);
  return {
    event: "stop",
    host: input.host,
    active: true,
    noop: false,
    degraded: false,
    quest: {
      id: turn.quest_id,
      completed: true,
      verification_status: completion.data?.verification_status || null
    },
    continuation_required: false,
    completed: true,
    evidence: evidence.map((item) => ({
      id: item.id,
      summary: item.summary,
      command: item.command,
      passed: item.passed
    })),
    episode,
    pending_memory_proposal: proposal,
    heartbeat,
    warnings: []
  };
}

function isLifecycleActivated(cwd, host) {
  return hasActivationPolicy(cwd, host);
}

function inactiveResult(cwd, event, input) {
  return {
    event,
    host: input.host || "codex",
    active: false,
    noop: true,
    degraded: false,
    reason: "Orange activation policy is missing for this project.",
    additional_context: "",
    warnings: []
  };
}

function degradedResult(cwd, event, input, reason) {
  return {
    event,
    host: input.host || "codex",
    active: false,
    noop: true,
    degraded: true,
    reason,
    additional_context: "",
    warnings: [{ code: "LIFECYCLE_DEGRADED", message: reason }]
  };
}

function buildSessionContext(cwd, input) {
  const warnings = [];
  const lines = [
    "Orange Hyper is active for this project.",
    "Strong attachment, adaptive ceremony.",
    "Use Orange Kernel commands for Orange state transitions; do not edit `.orange-hyper` directly."
  ];
  if (input.cwd && path.resolve(input.cwd) !== path.resolve(cwd)) {
    warnings.push({ code: "PROJECT_BOUNDARY_MISMATCH", message: "Hook cwd differs from process cwd." });
    lines.push(`Warning: hook cwd differs from process cwd (${redact(String(input.cwd))}).`);
  }
  try {
    const doctor = runDoctor(cwd);
    lines.push(`Doctor quick summary: ok=${doctor.ok}; errors=${doctor.errors.length}; warnings=${doctor.warnings.length}.`);
  } catch (error) {
    warnings.push({ code: "DOCTOR_UNAVAILABLE", message: error.message });
  }
  const activePolicy = readActivationPolicy(cwd);
  if (activePolicy?.policy?.automatic) {
    lines.push(`Activation mode: ${activePolicy.mode || "adaptive"}; Quest from ${activePolicy.policy.automatic.quest_from || "L2"}.`);
  }
  const memory = smallMemorySlice(cwd, { memory: "MB2" });
  if (memory.length) {
    lines.push("Accepted memory slice:");
    for (const item of memory.slice(0, 3)) {
      lines.push(`- ${item}`);
    }
  } else {
    lines.push("Accepted memory slice: none selected.");
  }
  return {
    max_chars: MAX_CONTEXT_CHARS,
    truncated: lines.join("\n").length > MAX_CONTEXT_CHARS,
    text: compactContext(lines.join("\n")),
    warnings
  };
}

function smallMemorySlice(cwd, contract) {
  try {
    const max = contract.memory === "MB3" ? 5 : 3;
    const result = listGraphNodes(cwd, {});
    return result.nodes.slice(0, max).map((node) => {
      const title = node.title || node.summary || node.id;
      return `${node.node_type}: ${redact(title).slice(0, 160)}`;
    });
  } catch {
    return [];
  }
}

function buildToolEvidence(cwd, input, options) {
  const now = nowIso(options.clock);
  const toolName = safeString(input.tool_name) || "unknown";
  const toolInput = input.tool_input && typeof input.tool_input === "object" ? input.tool_input : {};
  const toolResponse = input.tool_response && typeof input.tool_response === "object" ? input.tool_response : {};
  const command = safeString(toolInput.command || toolInput.cmd || toolInput.description) || "";
  const exitStatus = exitStatusFromResponse(toolResponse);
  const passed = exitStatus === 0;
  const isVerification = toolName === "Bash" && isVerificationCommand(command);
  const touchedPaths = toolName === "apply_patch" ? parsePatchTouchedPaths(command) : [];
  const summary = summarizeToolResponse(command, toolResponse, {
    isVerification,
    passed,
    toolName
  });
  return {
    schema_version: 1,
    id: `evidence_${shortHash(JSON.stringify([hashedSessionKey(input), hashedTurnKey(input), input.tool_use_id, now]))}`,
    created_at: now,
    host: input.host,
    session_key: hashedSessionKey(input),
    turn_key: hashedTurnKey(input),
    tool_use_key: safeString(input.tool_use_id) ? shortHash(safeString(input.tool_use_id)) : null,
    tool_name: toolName,
    evidence_kind: isVerification ? "verification" : toolName === "apply_patch" ? "changed_paths" : "observation",
    command: redact(command).slice(0, 500),
    exit_status: exitStatus,
    passed: isVerification ? passed : false,
    success_evidence: isVerification && passed,
    summary,
    output_summary: boundedOutputSummary(toolResponse),
    touched_paths: touchedPaths,
    raw_output_stored: false,
    secret_redaction_applied: true,
    feedback_context: ""
  };
}

function summarizeToolResponse(command, response, options) {
  const commandLabel = command ? redact(command).slice(0, 160) : options.toolName;
  if (options.isVerification) {
    return `${options.passed ? "passed" : "failed"}: ${commandLabel}`;
  }
  if (options.toolName === "apply_patch") {
    return "apply_patch touched paths recorded; full patch was not stored.";
  }
  return `${options.toolName} result summarized; raw output was not stored.`;
}

function boundedOutputSummary(response) {
  const stdout = safeString(response.stdout || response.output || response.text || "");
  const stderr = safeString(response.stderr || "");
  const joined = [stdout, stderr].filter(Boolean).join("\n");
  return redact(joined).replace(/\s+/g, " ").trim().slice(0, MAX_SUMMARY_CHARS);
}

function exitStatusFromResponse(response) {
  for (const key of ["exit_code", "exitCode", "status", "code"]) {
    if (Number.isInteger(response[key])) {
      return response[key];
    }
  }
  if (response.ok === true) {
    return 0;
  }
  if (response.ok === false) {
    return 1;
  }
  return null;
}

function isVerificationCommand(command) {
  return /\b(npm|pnpm|yarn|node|bun|deno|cargo|go|pytest|python|ruff|eslint|tsc|vitest|jest|mocha|make)\b/i.test(command)
    && /\b(test|check|typecheck|lint|build|verify|coverage|--test)\b/i.test(command);
}

function parsePatchTouchedPaths(command) {
  const paths = [];
  const source = String(command || "");
  const patterns = [
    /^\*\*\* Add File:\s+(.+)$/gm,
    /^\*\*\* Update File:\s+(.+)$/gm,
    /^\*\*\* Delete File:\s+(.+)$/gm
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source))) {
      const normalized = normalizeRelativePath(match[1]);
      if (normalized) {
        paths.push(normalized);
      }
    }
  }
  return [...new Set(paths)].slice(0, 40);
}

function normalizeRelativePath(value) {
  const clean = String(value || "").trim().replace(/^["']|["']$/g, "");
  if (!clean || path.isAbsolute(clean)) {
    return null;
  }
  const normalized = path.normalize(clean);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    return null;
  }
  return normalized.split(path.sep).join("/");
}

function evidenceForTurn(cwd, input) {
  const paths = workspacePaths(cwd);
  if (!fs.existsSync(paths.runtimeEvidence)) {
    return [];
  }
  const sessionKey = hashedSessionKey(input);
  const turnKey = hashedTurnKey(input);
  return fs.readdirSync(paths.runtimeEvidence)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(paths.runtimeEvidence, name), "utf8"));
      } catch {
        return null;
      }
    })
    .filter((item) => item && item.session_key === sessionKey && item.turn_key === turnKey);
}

function completeQuestIfNeeded(cwd, questId, options) {
  const quest = findQuestOrNull(cwd, questId);
  if (!quest) {
    return { data: { id: questId, status: "missing", verification_status: null }, already_completed: false };
  }
  if (quest.data.status === "completed") {
    return { ...quest, already_completed: true };
  }
  if (options.evidence.length) {
    return completeQuest(cwd, questId, {
      evidence: options.evidence,
      clock: options.clock
    });
  }
  return completeQuest(cwd, questId, {
    unverifiedReason: options.unverifiedReason || "Verification evidence was unavailable.",
    clock: options.clock
  });
}

function maybeCreatePendingProposal(cwd, turn, completion, evidence) {
  const layer = completion.data?.layer || turn.layer;
  if (layerNumber(layer) < 2 || !turn.durable_candidate_detected) {
    return {
      created: false,
      reason: "No durable decision, constraint, risk, or verification candidate detected."
    };
  }
  try {
    const proposal = proposeMemoryDelta(cwd, completion.data.id);
    return {
      created: !proposal.duplicated,
      duplicated: Boolean(proposal.duplicated),
      id: proposal.data.id,
      file: path.relative(cwd, proposal.filePath),
      status: proposal.data.status,
      auto_accepted: false
    };
  } catch (error) {
    return {
      created: false,
      reason: error.message,
      auto_accepted: false
    };
  }
}

function writeEpisode(cwd, input, turn, completion, evidence, options) {
  const paths = workspacePaths(cwd);
  fs.mkdirSync(paths.episodes, { recursive: true });
  const id = `episode_${shortHash(idempotencyKey(cwd, input, "episode"))}`;
  const filePath = path.join(paths.episodes, `${id}.json`);
  const episode = {
    schema_version: 1,
    id,
    created_at: nowIso(options.clock),
    host: input.host,
    session_key: hashedSessionKey(input),
    turn_key: hashedTurnKey(input),
    quest_id: completion.data?.id || turn.quest_id,
    verification_status: completion.data?.verification_status || null,
    evidence_count: evidence.length,
    durable_memory_auto_accepted: false,
    raw_transcript_stored: false,
    raw_tool_output_stored: false
  };
  if (!fs.existsSync(filePath)) {
    writeJsonAtomic(filePath, episode);
  }
  return {
    id,
    file: path.relative(cwd, filePath)
  };
}

function formatEvidenceForQuest(item) {
  return `${item.summary} (${item.command || item.tool_name})`;
}

function expectedVerificationFor(contract) {
  if (contract.verification === "V2") {
    return ["Run the narrowest targeted test, build, lint, or equivalent verification for touched files."];
  }
  if (contract.verification === "V3") {
    return ["Reproduce or investigate first, then run a targeted regression check."];
  }
  return [`Satisfy ${contract.verification} before completion.`];
}

function hasDurableCandidate(text) {
  return /\b(decision|constraint|risk|verification|policy|contract|architecture|migration|remember|durable|memory)\b/i.test(text)
    || /결정|제약|위험|검증|정책|계약|아키텍처|기억|메모리/.test(text);
}

function normalizedIntentSignature(text) {
  const normalized = String(text || "")
    .toLowerCase()
    .replace(/[`"'.,:;!?()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return shortHash(normalized.split(" ").slice(0, 24).join(" "));
}

function scopeSignatureFor(text) {
  const source = String(text || "").toLowerCase();
  const pathMatches = [...source.matchAll(/\b(?:src|lib|app|docs|tests|fixtures|scripts)\/[a-z0-9._/-]+/g)]
    .map((match) => match[0].split("/").slice(0, 3).join("/"));
  if (pathMatches.length) {
    return shortHash(pathMatches.sort().join("|"));
  }
  const components = [
    "activation",
    "binding",
    "lifecycle",
    "quest",
    "memory",
    "verification",
    "adapter",
    "hook",
    "windows",
    "standalone",
    "sea",
    "docs",
    "readme",
    "test",
    "auth",
    "search",
    "api",
    "ui",
    "database"
  ].filter((word) => source.includes(word));
  const korean = [
    ["활성화", "activation"],
    ["바인딩", "binding"],
    ["라이프사이클", "lifecycle"],
    ["퀘스트", "quest"],
    ["메모리", "memory"],
    ["검증", "verification"],
    ["어댑터", "adapter"],
    ["훅", "hook"],
    ["문서", "docs"],
    ["윈도우", "windows"]
  ].filter(([word]) => source.includes(word)).map(([, key]) => key);
  const all = [...new Set([...components, ...korean])].sort();
  return all.length ? shortHash(all.join("|")) : "general";
}

function isExplicitFollowUp(text) {
  return /\b(follow[- ]?up|continue|same task|same work|that task|previous task|above task|also|add tests|fix it|update it|keep going)\b/i.test(text)
    || /이어서|계속|방금|위 작업|이전 작업|같은 작업|마저|추가로|그 작업|그것|테스트도|수정해|고쳐/.test(text);
}

function isExplicitNewWork(text) {
  return /\b(new task|separate task|unrelated|different task|start over|instead)\b/i.test(text)
    || /별도|다른 작업|새 작업|새로운 작업|무관한/.test(text);
}

function extractExplicitUnverifiedReason(text) {
  const source = String(text || "").trim();
  if (!source) {
    return "";
  }
  const matchesReason = /\b(not run|not verified|unverified|could not run|unable to run|skipped tests|tests not run|without verification)\b/i.test(source)
    || /검증.*못|테스트.*못|실행.*못|미검증|검증하지 못|테스트를 실행하지 않|검증 생략/.test(source);
  if (!matchesReason) {
    return "";
  }
  return redact(source).replace(/\s+/g, " ").slice(0, 500);
}

function isL5Prompt(text) {
  return /\b(L5|raid mode|autonomous loop|long-running loop|full autonomous planner)\b/i.test(text)
    || /자율\s*루프|레이드\s*모드/.test(text);
}

function makeLifecycleTitle(prompt) {
  const title = prompt.replace(/\s+/g, " ").trim().slice(0, 80);
  return title || "Codex lifecycle turn";
}

function findQuestOrNull(cwd, selector) {
  try {
    return findQuest(cwd, selector);
  } catch {
    return null;
  }
}

function resolveQuestContinuity(cwd, input, context) {
  const state = readSessionState(cwd, input);
  const currentQuestId = state?.current_turn?.quest_id || state?.recent_quest_ids?.[0] || null;
  const currentQuest = currentQuestId ? findQuestOrNull(cwd, currentQuestId) : null;
  if (!currentQuest || currentQuest.data.status !== "active") {
    return {
      action: "create_new",
      confidence: "high",
      quest_id: null,
      reason: "No active Quest is linked to this session."
    };
  }
  const previousScope = state?.current_turn?.scope_signature || "general";
  if (isExplicitNewWork(context.prompt)) {
    return {
      action: "create_new",
      confidence: "high",
      quest_id: null,
      reason: "Prompt indicates a separate task."
    };
  }
  if (isExplicitFollowUp(context.prompt)) {
    return {
      action: "continue_existing",
      confidence: "high",
      quest_id: currentQuestId,
      scope_signature: previousScope,
      reason: "Prompt is an explicit follow-up in the same session."
    };
  }
  if (previousScope !== "general" && context.scopeSignature !== "general" && previousScope === context.scopeSignature) {
    return {
      action: "continue_existing",
      confidence: "medium",
      quest_id: currentQuestId,
      scope_signature: previousScope,
      reason: "Prompt scope matches the active Quest scope."
    };
  }
  if (previousScope !== "general" && context.scopeSignature !== "general" && previousScope !== context.scopeSignature) {
    return {
      action: "create_new",
      confidence: "medium",
      quest_id: null,
      reason: "Prompt scope differs from the active Quest scope."
    };
  }
  return {
    action: "continue_existing",
    confidence: "low",
    quest_id: currentQuestId,
    scope_signature: previousScope,
    reason: "Prompt is ambiguous, so Orange keeps continuity with the active Quest."
  };
}

function readSessionState(cwd, input) {
  const filePath = sessionFilePath(cwd, input);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeSessionState(cwd, input, update) {
  const filePath = sessionFilePath(cwd, input);
  const before = readSessionState(cwd, input) || {
    schema_version: 1,
    host: input.host,
    session_key: hashedSessionKey(input),
    recent_quest_ids: []
  };
  const recent = [
    update.recent_quest_id,
    ...(before.recent_quest_ids || [])
  ].filter(Boolean);
  const next = {
    ...before,
    current_turn: update.current_turn,
    recent_quest_ids: [...new Set(recent)].slice(0, 8),
    updated_at: nowIso()
  };
  writeJsonAtomic(filePath, next);
}

function sessionFilePath(cwd, input) {
  const paths = workspacePaths(cwd);
  return path.join(paths.runtimeSessions, `${safeFileName(hashedSessionKey(input))}.json`);
}

function readTurn(cwd, key) {
  const filePath = turnFilePath(cwd, key);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeTurn(cwd, key, input, result, extra = {}) {
  const filePath = turnFilePath(cwd, key);
  const before = readTurn(cwd, key) || {};
  const next = {
    ...before,
    ...extra,
    schema_version: 1,
    idempotency_key: key,
    host: input.host,
    session_key: hashedSessionKey(input),
    turn_key: hashedTurnKey(input),
    updated_at: nowIso(),
    result
  };
  writeJsonAtomic(filePath, next);
}

function turnFilePath(cwd, key) {
  const paths = workspacePaths(cwd);
  return path.join(paths.runtimeTurns, `${safeFileName(key)}.json`);
}

function evidenceFilePath(cwd, key) {
  const paths = workspacePaths(cwd);
  return path.join(paths.runtimeEvidence, `${safeFileName(key)}.json`);
}

function idempotencyKey(cwd, input, eventName) {
  const project = path.resolve(cwd);
  const raw = [
    project,
    input.host || "codex",
    safeString(input.session_id) || "session",
    safeString(input.turn_id) || "turn",
    eventName,
    safeString(input.tool_use_id) || ""
  ].join("\u0000");
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function hashedSessionKey(input) {
  return shortHash(`session:${safeString(input.session_id) || "unknown-session"}`);
}

function hashedTurnKey(input) {
  return shortHash(`turn:${safeString(input.session_id) || "unknown-session"}:${safeString(input.turn_id) || "unknown-turn"}`);
}

function shortHash(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 12);
}

function safeFileName(value) {
  return shortHash(value);
}

function normalizeInput(input, event) {
  const normalized = input && typeof input === "object" ? { ...input } : {};
  normalized.host = safeString(normalized.host) || "codex";
  normalized.hook_event_name = safeString(normalized.hook_event_name) || eventNameForCodex(event);
  normalized.session_id = safeString(normalized.session_id) || "unknown-session";
  normalized.turn_id = safeString(normalized.turn_id) || (event === "session-start" ? null : "unknown-turn");
  return normalized;
}

function eventNameForCodex(event) {
  const map = {
    "session-start": "SessionStart",
    "user-prompt-submit": "UserPromptSubmit",
    "post-tool-use": "PostToolUse",
    stop: "Stop"
  };
  return map[event] || event;
}

function layerNumber(layer) {
  const match = String(layer || "").match(/^L(\d)$/);
  return match ? Number(match[1]) : 0;
}

function compactContext(text) {
  const redacted = redact(text);
  if (redacted.length <= MAX_CONTEXT_CHARS) {
    return redacted;
  }
  return `${redacted.slice(0, MAX_CONTEXT_CHARS - 80).trimEnd()}\n[Orange context truncated to ${MAX_CONTEXT_CHARS} chars]`;
}

function redact(value) {
  let text = String(value || "");
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, "[REDACTED]");
  }
  return text;
}

function safeString(value) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(tempPath, filePath);
}

function lifecycleError(code, message, hint) {
  return Object.assign(new Error(message), {
    orangeCode: code,
    orangeHint: hint
  });
}
