import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { isInitialized } from "./config.js";
import { ORANGE_HYPER_VERSION } from "./origin.js";
import { workspacePaths } from "./paths.js";
import { nowIso } from "./time.js";
import {
  bindingStatus,
  computeCodexBindingFingerprint,
  evaluateHookExecution,
  findOrangeExecutable
} from "./binding.js";
import { CODEX_PLUGIN_VERSION } from "../adapters/codex/pluginAssets.js";

export const ACTIVATION_SCHEMA_VERSION = 1;
export const ACTIVATION_SUPPORTED_HOSTS = new Set(["codex"]);
export const ACTIVATION_SUPPORTED_SCOPES = new Set(["project"]);

export const DEFAULT_ACTIVATION_POLICY = {
  automatic: {
    project_init: true,
    route: true,
    quest_from: "L2",
    capsule: true,
    working_memory: true,
    verification_evidence_capture: true,
    quest_completion: true,
    pending_memory_proposal: true,
    growth_evidence: true
  },
  approval_required: {
    memory_accept: true,
    mcp_install: true,
    persistent_mcp: true,
    skill_materialization: true,
    agent_materialization: true,
    write_capable_agent: true,
    external_side_effect: true,
    destructive_operation: true,
    raid_mode: true
  }
};

export function activationPlan(cwd = process.cwd(), options = {}) {
  const host = normalizeHost(options.host);
  const scope = normalizeScope(options.scope || "project");
  assertSupported(host, scope);
  return buildActivationResult(cwd, {
    host,
    scope,
    dryRun: true,
    applied: false
  });
}

export function activationApply(cwd = process.cwd(), options = {}) {
  const host = normalizeHost(options.host);
  const scope = normalizeScope(options.scope || "project");
  assertSupported(host, scope);
  const activatedAt = nowIso(options.clock);
  const paths = workspacePaths(cwd);
  fs.mkdirSync(paths.local, { recursive: true });
  fs.mkdirSync(paths.runtime, { recursive: true });
  fs.mkdirSync(paths.episodes, { recursive: true });
  const activation = {
    schema_version: ACTIVATION_SCHEMA_VERSION,
    host,
    scope,
    mode: "adaptive",
    status: "waiting_for_host_binding",
    activated_at: activatedAt,
    updated_at: activatedAt,
    package_version: ORANGE_HYPER_VERSION,
    host_binding: {
      host,
      scope: "user",
      required: true,
      installed_by_activation: false,
      binding_fingerprint: computeCodexBindingFingerprint()
    },
    policy: DEFAULT_ACTIVATION_POLICY
  };
  writeJsonAtomic(paths.activation, activation);
  return {
    ...buildActivationResult(cwd, {
      host,
      scope,
      dryRun: false,
      applied: true
    }),
    initialized_by_apply: false,
    host_binding_installed_by_apply: false
  };
}

export function activationStatus(cwd = process.cwd(), options = {}) {
  const host = normalizeHost(options.host);
  assertSupported(host, "project");
  return buildActivationResult(cwd, {
    host,
    scope: "project",
    dryRun: false,
    applied: false
  });
}

export function activationRemove(cwd = process.cwd(), options = {}) {
  const host = normalizeHost(options.host);
  const scope = normalizeScope(options.scope || "project");
  assertSupported(host, scope);
  const removed = [];
  const preserved = [];
  const paths = workspacePaths(cwd);
  if (fs.existsSync(paths.activation)) {
    fs.rmSync(paths.activation);
    removed.push(path.relative(cwd, paths.activation));
  }
  if (fs.existsSync(paths.runtime)) {
    fs.rmSync(paths.runtime, { recursive: true, force: true });
    removed.push(path.relative(cwd, paths.runtime));
  }
  if (fs.existsSync(paths.episodes)) {
    fs.rmSync(paths.episodes, { recursive: true, force: true });
    removed.push(path.relative(cwd, paths.episodes));
  }
  preserved.push(".orange-hyper/quests/");
  preserved.push(".orange-hyper/proposals/");
  preserved.push(".orange-hyper/graph/");
  return {
    ...buildActivationResult(cwd, {
      host,
      scope,
      dryRun: false,
      applied: false
    }),
    removed_paths: removed.sort(),
    preserved_paths: preserved.sort(),
    removed_project_activation_only: true,
    user_binding_preserved: true
  };
}

export function readActivationPolicy(cwd = process.cwd()) {
  const paths = workspacePaths(cwd);
  if (!fs.existsSync(paths.activation)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(paths.activation, "utf8"));
  } catch {
    return null;
  }
}

export function hasActivationPolicy(cwd = process.cwd(), host = "codex") {
  const policy = readActivationPolicy(cwd);
  return Boolean(policy && policy.host === host && policy.scope === "project");
}

export function readHeartbeat(cwd = process.cwd()) {
  const paths = workspacePaths(cwd);
  if (!fs.existsSync(paths.runtimeHeartbeat)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(paths.runtimeHeartbeat, "utf8"));
  } catch {
    return null;
  }
}

export function recordHeartbeat(cwd = process.cwd(), eventName, input = {}, options = {}) {
  const paths = workspacePaths(cwd);
  fs.mkdirSync(paths.runtime, { recursive: true });
  fs.mkdirSync(paths.runtimeEvents, { recursive: true });
  const now = nowIso(options.clock);
  const bindingFingerprint = computeCodexBindingFingerprint();
  const sessionKey = hashKey(["session", safeString(input.session_id) || "unknown-session"]);
  const turnKey = safeString(input.turn_id)
    ? hashKey(["turn", safeString(input.session_id) || "unknown-session", safeString(input.turn_id)])
    : null;
  const before = readHeartbeat(cwd) || {
    schema_version: 3,
    host: "codex",
    first_event_at: now,
    sessions: {}
  };
  const normalizedEvent = String(eventName || "unknown");
  const previousSessions = before.sessions && typeof before.sessions === "object" && !Array.isArray(before.sessions)
    ? before.sessions
    : {};
  const sessionRecord = updateLifecycleSession(previousSessions[sessionKey], {
    event: normalizedEvent,
    now,
    bindingFingerprint,
    sessionKey
  });
  const next = {
    ...before,
    schema_version: 3,
    host: String(input.host || before.host || "codex"),
    event: normalizedEvent,
    plugin_version: CODEX_PLUGIN_VERSION,
    orange_version: ORANGE_HYPER_VERSION,
    binding_fingerprint: bindingFingerprint,
    session_key: sessionKey,
    turn_key: turnKey,
    observed_at: now,
    first_event_at: before.first_event_at || now,
    last_event: normalizedEvent,
    last_event_at: now,
    last_session_key: sessionKey,
    last_turn_key: turnKey,
    session_start_at: sessionRecord.session_start_at,
    latest_prompt_at: sessionRecord.latest_prompt_at,
    stop_at: sessionRecord.stop_at,
    complete_lifecycle_at: sessionRecord.complete_lifecycle_at,
    events: sessionRecord.events,
    sessions: trimSessionRecords({
      ...previousSessions,
      [sessionKey]: sessionRecord
    })
  };
  writeJsonAtomic(paths.runtimeHeartbeat, next);
  writeJsonAtomic(path.join(paths.runtimeEvents, `${now.replace(/[:.]/g, "-")}-${normalizedEvent}.json`), {
    schema_version: 3,
    host: next.host,
    event: normalizedEvent,
    plugin_version: next.plugin_version,
    orange_version: next.orange_version,
    binding_fingerprint: bindingFingerprint,
    session_key: sessionKey,
    turn_key: turnKey,
    session_start_at: sessionRecord.session_start_at,
    latest_prompt_at: sessionRecord.latest_prompt_at,
    stop_at: sessionRecord.stop_at,
    complete_lifecycle_at: sessionRecord.complete_lifecycle_at,
    observed_at: now
  });
  return next;
}

function buildActivationResult(cwd, options) {
  const { host, scope, dryRun, applied } = options;
  const paths = workspacePaths(cwd);
  const initialized = isInitialized(cwd);
  const policy = readActivationPolicy(cwd);
  const heartbeat = readHeartbeat(cwd);
  const binding = bindingStatus(cwd, { host, clock: options.clock });
  const hookExecution = evaluateHookExecution(heartbeat, undefined, { clock: options.clock });
  const active = Boolean(policy && hookExecution.status === "current");
  const activationStatusValue = active
    ? "active"
    : policy
      ? "waiting_for_host_binding"
      : initialized
        ? "inactive"
        : "inactive";
  const plannedChanges = dryRun ? plannedProjectChanges(cwd, initialized, binding) : [];
  const projectLocal = [
    ".orange-hyper/local/activation.json",
    ".orange-hyper/local/runtime/",
    ".orange-hyper/local/episodes/"
  ];
  const userActions = active ? [] : binding.user_actions;
  return {
    host,
    scope,
    dry_run: Boolean(dryRun),
    applied: Boolean(applied),
    status: activationStatusValue,
    project_activated: Boolean(policy),
    effective_status: activationStatusValue,
    installed: {
      orange_binary: Boolean(findOrangeExecutable()),
      executable: findOrangeExecutable()
    },
    initialized,
    project_initialized: initialized,
    project_root: cwd,
    activation_policy: policy ? {
      exists: true,
      file: path.relative(cwd, paths.activation),
      status: policy.status || "waiting_for_host_binding",
      mode: policy.mode || "adaptive",
      activated_at: policy.activated_at || null,
      policy: policy.policy || DEFAULT_ACTIVATION_POLICY
    } : {
      exists: false,
      file: path.relative(cwd, paths.activation),
      status: "missing",
      mode: null,
      activated_at: null,
      policy: DEFAULT_ACTIVATION_POLICY
    },
    binding: {
      host,
      name: binding.plugin.name,
      version: binding.plugin.version,
      fingerprint: binding.binding_fingerprint,
      marketplace: binding.marketplace,
      plugin_availability: binding.plugin.availability,
      plugin_installation: binding.plugin_installation,
      plugin_enabled: binding.plugin_enabled,
      hook_execution: binding.hook_execution,
      effective_status: binding.effective_status
    },
    lifecycle: {
      active,
      hook_execution: hookExecution.status,
      last_heartbeat: heartbeat?.last_event_at || null,
      last_event: heartbeat?.last_event || null,
      last_session_key: heartbeat?.last_session_key || heartbeat?.session_key || null,
      last_turn_key: heartbeat?.last_turn_key || heartbeat?.turn_key || null,
      freshness_window_ms: hookExecution.freshness_window_ms,
      complete_lifecycle_at: hookExecution.complete_lifecycle_at || null,
      freshness_expires_at: hookExecution.freshness_expires_at || null,
      session_start_at: hookExecution.session_start_at || null,
      latest_prompt_at: hookExecution.latest_prompt_at || null,
      stop_at: hookExecution.stop_at || null,
      status_reason: hookExecution.status_reason || null,
      recent: {
        SessionStart: hookExecution.recent?.SessionStart || null,
        UserPromptSubmit: hookExecution.recent?.UserPromptSubmit || null,
        PostToolUse: hookExecution.recent?.PostToolUse || null,
        Stop: hookExecution.recent?.Stop || null
      }
    },
    hook_trust: {
      status: "unknown",
      trusted: false,
      verification_surface: "codex-hook-review-not-machine-readable"
    },
    degraded_reason: policy && hookExecution.status !== "current"
      ? "Project activation exists, but Orange has not observed current-fingerprint SessionStart, UserPromptSubmit, and Stop lifecycle events yet."
      : null,
    planned_changes: plannedChanges,
    external_user_scope_planned_paths: [],
    project_local_planned_paths: projectLocal,
    requires_restart: !active,
    requires_user_action: userActions,
    conflicts: binding.conflicts,
    rollback_available: true
  };
}

function plannedProjectChanges(cwd, initialized, binding) {
  const changes = [];
  changes.push({ action: "write_activation_policy", path: ".orange-hyper/local/activation.json" });
  changes.push({ action: "prepare_project_runtime", path: ".orange-hyper/local/runtime/" });
  changes.push({ action: "prepare_project_episodes", path: ".orange-hyper/local/episodes/" });
  return changes.map((change) => ({ ...change, absolute_path: path.join(cwd, change.path) }));
}

function normalizeHost(host) {
  return String(host || "codex").toLowerCase();
}

function normalizeScope(scope) {
  return String(scope || "project").toLowerCase();
}

function assertSupported(host, scope) {
  if (!ACTIVATION_SUPPORTED_HOSTS.has(host)) {
    throw activationError("ACTIVATION_UNSUPPORTED_HOST", `Unsupported activation host: ${host}`, "This release supports `--host codex` only.");
  }
  if (!ACTIVATION_SUPPORTED_SCOPES.has(scope)) {
    throw activationError("ACTIVATION_UNSUPPORTED_SCOPE", `Unsupported activation scope: ${scope}`, "This release supports `--scope project` only.");
  }
}

function writeJsonAtomic(filePath, value) {
  writeFileAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeFileAtomic(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tempPath, contents);
  fs.renameSync(tempPath, filePath);
}

function activationError(code, message, hint) {
  return Object.assign(new Error(message), {
    orangeCode: code,
    orangeHint: hint
  });
}

function safeString(value) {
  return typeof value === "string" ? value : value == null ? null : String(value);
}

function hashKey(parts) {
  return crypto.createHash("sha256").update(parts.join("\u0000")).digest("hex");
}

function updateLifecycleSession(previous, options) {
  const events = {
    ...(previous?.events || {}),
    [options.event]: options.now
  };
  const sessionStartAt = options.event === "SessionStart"
    ? previous?.session_start_at || options.now
    : previous?.session_start_at || null;
  const latestPromptAt = options.event === "UserPromptSubmit"
    ? options.now
    : previous?.latest_prompt_at || null;
  const stopAt = options.event === "Stop"
    ? options.now
    : previous?.stop_at || null;
  const completeLifecycleAt = sessionStartAt && latestPromptAt && stopAt && Date.parse(stopAt) >= Date.parse(latestPromptAt)
    ? options.now
    : previous?.complete_lifecycle_at || null;
  return {
    binding_fingerprint: options.bindingFingerprint,
    orange_version: ORANGE_HYPER_VERSION,
    plugin_version: CODEX_PLUGIN_VERSION,
    session_key: options.sessionKey,
    session_start_at: sessionStartAt,
    latest_prompt_at: latestPromptAt,
    stop_at: stopAt,
    complete_lifecycle_at: completeLifecycleAt,
    observed_at: options.now,
    events
  };
}

function trimSessionRecords(sessions) {
  return Object.fromEntries(
    Object.entries(sessions)
      .sort(([, left], [, right]) => String(right?.observed_at || "").localeCompare(String(left?.observed_at || "")))
      .slice(0, 20)
  );
}
