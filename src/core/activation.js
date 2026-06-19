import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { initWorkspace, isInitialized } from "./config.js";
import { ORANGE_HYPER_VERSION } from "./origin.js";
import { workspacePaths } from "./paths.js";
import { nowIso } from "./time.js";
import {
  CODEX_MARKETPLACE_RELATIVE_PATH,
  CODEX_PLUGIN_FILES,
  CODEX_PLUGIN_NAME,
  CODEX_PLUGIN_RELATIVE_ROOT,
  CODEX_PLUGIN_VERSION
} from "../adapters/codex/pluginAssets.js";

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
  const beforeInitialized = isInitialized(cwd);
  if (!beforeInitialized) {
    initWorkspace(cwd);
  }
  const materialized = materializeCodexBinding(cwd);
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
    status: "pending_trust",
    activated_at: activatedAt,
    updated_at: activatedAt,
    package_version: ORANGE_HYPER_VERSION,
    binding: {
      name: CODEX_PLUGIN_NAME,
      version: CODEX_PLUGIN_VERSION,
      plugin_root: CODEX_PLUGIN_RELATIVE_ROOT,
      marketplace: CODEX_MARKETPLACE_RELATIVE_PATH,
      materialized: true,
      installed_by_codex: false,
      trust_confirmed: false
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
    initialized_by_apply: !beforeInitialized,
    materialized
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
  const marketplaceResult = removeMarketplaceEntry(cwd);
  removed.push(...marketplaceResult.removed);
  preserved.push(...marketplaceResult.preserved);
  const pluginResult = removeOwnedPluginBundle(cwd);
  removed.push(...pluginResult.removed);
  preserved.push(...pluginResult.preserved);
  return {
    ...buildActivationResult(cwd, {
      host,
      scope,
      dryRun: false,
      applied: false
    }),
    removed_paths: removed.sort(),
    preserved_paths: preserved.sort(),
    removed_owned_state_only: true
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
  const now = nowIso(options.clock);
  const before = readHeartbeat(cwd) || {
    schema_version: 1,
    host: "codex",
    first_event_at: now,
    events: {}
  };
  const normalizedEvent = String(eventName || "unknown");
  const next = {
    ...before,
    schema_version: 1,
    host: String(input.host || before.host || "codex"),
    first_event_at: before.first_event_at || now,
    last_event: normalizedEvent,
    last_event_at: now,
    last_session_id: safeString(input.session_id),
    last_turn_id: safeString(input.turn_id),
    events: {
      ...(before.events || {}),
      [normalizedEvent]: now
    }
  };
  writeJsonAtomic(paths.runtimeHeartbeat, next);
  return next;
}

function buildActivationResult(cwd, options) {
  const { host, scope, dryRun, applied } = options;
  const paths = workspacePaths(cwd);
  const initialized = isInitialized(cwd);
  const policy = readActivationPolicy(cwd);
  const heartbeat = readHeartbeat(cwd);
  const binding = inspectCodexBinding(cwd);
  const hookTrustStatus = heartbeat?.last_event_at ? "trusted" : policy ? "pending" : "unknown";
  const active = Boolean(policy && heartbeat?.last_event_at);
  const activationStatusValue = active
    ? "active"
    : policy
      ? "pending_trust"
      : initialized
        ? "inactive"
        : "inactive";
  const plannedChanges = dryRun ? plannedProjectChanges(cwd, initialized, binding) : [];
  const projectLocal = [
    ".orange-hyper/local/activation.json",
    ".orange-hyper/local/runtime/",
    ".orange-hyper/local/episodes/",
    CODEX_PLUGIN_RELATIVE_ROOT,
    CODEX_MARKETPLACE_RELATIVE_PATH
  ];
  const userActions = active ? [] : [
    {
      kind: binding.marketplace_exists ? "install_or_enable_plugin" : "restart_and_install_plugin",
      description: "Open Codex Plugins, select the project marketplace, and install or enable Orange Hyper Codex."
    },
    {
      kind: "trust_hooks",
      description: "Review and trust the Orange Hyper plugin hooks in Codex with /hooks."
    }
  ];
  return {
    host,
    scope,
    dry_run: Boolean(dryRun),
    applied: Boolean(applied),
    status: activationStatusValue,
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
      status: policy.status || "pending_trust",
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
      name: CODEX_PLUGIN_NAME,
      version: CODEX_PLUGIN_VERSION,
      available: binding.plugin_exists && binding.marketplace_exists,
      installed: false,
      enabled: false,
      trusted: hookTrustStatus === "trusted",
      trust_status: hookTrustStatus,
      status: active ? "active" : policy ? "pending_trust" : binding.marketplace_exists ? "binding_installed" : "inactive",
      plugin_root: CODEX_PLUGIN_RELATIVE_ROOT,
      marketplace: CODEX_MARKETPLACE_RELATIVE_PATH,
      plugin_exists: binding.plugin_exists,
      marketplace_exists: binding.marketplace_exists,
      marketplace_entry_exists: binding.marketplace_entry_exists,
      ownership_verified: binding.ownership_verified
    },
    lifecycle: {
      active,
      last_heartbeat: heartbeat?.last_event_at || null,
      last_event: heartbeat?.last_event || null,
      last_session_id: heartbeat?.last_session_id || null,
      last_turn_id: heartbeat?.last_turn_id || null,
      recent: {
        SessionStart: heartbeat?.events?.SessionStart || null,
        UserPromptSubmit: heartbeat?.events?.UserPromptSubmit || null,
        PostToolUse: heartbeat?.events?.PostToolUse || null,
        Stop: heartbeat?.events?.Stop || null
      }
    },
    hook_trust: {
      status: hookTrustStatus,
      trusted: hookTrustStatus === "trusted",
      verification_surface: heartbeat?.last_event_at ? "lifecycle-heartbeat" : "unavailable"
    },
    degraded_reason: policy && !heartbeat?.last_event_at
      ? "Codex hook trust or plugin installation has not produced a lifecycle heartbeat yet."
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
  if (!initialized) {
    changes.push({ action: "initialize_project", path: ".orange-hyper/" });
  }
  changes.push({ action: "write_activation_policy", path: ".orange-hyper/local/activation.json" });
  changes.push({ action: binding.plugin_exists ? "update_owned_plugin_bundle" : "create_plugin_bundle", path: CODEX_PLUGIN_RELATIVE_ROOT });
  changes.push({ action: binding.marketplace_exists ? "merge_marketplace_entry" : "create_marketplace", path: CODEX_MARKETPLACE_RELATIVE_PATH });
  return changes.map((change) => ({ ...change, absolute_path: path.join(cwd, change.path) }));
}

function materializeCodexBinding(cwd) {
  const pluginRoot = path.join(cwd, CODEX_PLUGIN_RELATIVE_ROOT);
  const markerPath = path.join(pluginRoot, ".orange-hyper-owned.json");
  const existed = fs.existsSync(pluginRoot);
  if (existed && !isOwnedPluginBundle(pluginRoot)) {
    throw activationError("ACTIVATION_BINDING_CONFLICT", `${CODEX_PLUGIN_RELATIVE_ROOT} exists but is not Orange-owned.`, "Move or review that plugin directory before running activation apply.");
  }
  for (const [relative, contents] of Object.entries(CODEX_PLUGIN_FILES)) {
    const target = path.join(pluginRoot, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    writeFileAtomic(target, contents);
    if (relative === "hooks/run-orange.sh") {
      fs.chmodSync(target, 0o755);
    }
  }
  writeJsonAtomic(markerPath, {
    owner: "orange-hyper",
    plugin: CODEX_PLUGIN_NAME,
    version: CODEX_PLUGIN_VERSION
  });
  const marketplace = mergeMarketplaceEntry(cwd);
  return {
    plugin_root: CODEX_PLUGIN_RELATIVE_ROOT,
    plugin_created: !existed,
    marketplace
  };
}

function inspectCodexBinding(cwd) {
  const pluginRoot = path.join(cwd, CODEX_PLUGIN_RELATIVE_ROOT);
  const marketplacePath = path.join(cwd, CODEX_MARKETPLACE_RELATIVE_PATH);
  const pluginExists = fs.existsSync(path.join(pluginRoot, ".codex-plugin", "plugin.json"));
  const ownershipVerified = isOwnedPluginBundle(pluginRoot);
  const conflicts = [];
  if (fs.existsSync(pluginRoot) && !ownershipVerified) {
    conflicts.push({
      path: CODEX_PLUGIN_RELATIVE_ROOT,
      reason: "Path exists but does not contain Orange ownership marker."
    });
  }
  let marketplaceExists = fs.existsSync(marketplacePath);
  let marketplaceEntryExists = false;
  if (marketplaceExists) {
    try {
      const marketplace = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));
      marketplaceEntryExists = Array.isArray(marketplace.plugins)
        && marketplace.plugins.some((item) => item?.name === CODEX_PLUGIN_NAME);
    } catch {
      conflicts.push({
        path: CODEX_MARKETPLACE_RELATIVE_PATH,
        reason: "Marketplace JSON cannot be parsed losslessly."
      });
    }
  }
  return {
    plugin_exists: pluginExists,
    ownership_verified: ownershipVerified,
    marketplace_exists: marketplaceExists,
    marketplace_entry_exists: marketplaceEntryExists,
    conflicts
  };
}

function mergeMarketplaceEntry(cwd) {
  const marketplacePath = path.join(cwd, CODEX_MARKETPLACE_RELATIVE_PATH);
  fs.mkdirSync(path.dirname(marketplacePath), { recursive: true });
  const beforeExists = fs.existsSync(marketplacePath);
  const marketplace = beforeExists
    ? readMarketplace(marketplacePath)
    : { name: "orange-hyper-project", plugins: [] };
  if (!Array.isArray(marketplace.plugins)) {
    throw activationError("ACTIVATION_MARKETPLACE_CONFLICT", "Codex marketplace must contain a plugins array.", "Fix the marketplace file or remove it before retrying activation apply.");
  }
  const entry = marketplaceEntry();
  const index = marketplace.plugins.findIndex((item) => item?.name === CODEX_PLUGIN_NAME);
  const changed = index === -1 || JSON.stringify(marketplace.plugins[index]) !== JSON.stringify(entry);
  if (index === -1) {
    marketplace.plugins.push(entry);
  } else {
    marketplace.plugins[index] = {
      ...marketplace.plugins[index],
      ...entry
    };
  }
  if (!marketplace.name) {
    marketplace.name = "orange-hyper-project";
  }
  writeJsonAtomic(marketplacePath, marketplace);
  return {
    path: CODEX_MARKETPLACE_RELATIVE_PATH,
    created: !beforeExists,
    changed
  };
}

function removeMarketplaceEntry(cwd) {
  const marketplacePath = path.join(cwd, CODEX_MARKETPLACE_RELATIVE_PATH);
  if (!fs.existsSync(marketplacePath)) {
    return { removed: [], preserved: [] };
  }
  const marketplace = readMarketplace(marketplacePath);
  if (!Array.isArray(marketplace.plugins)) {
    return { removed: [], preserved: [CODEX_MARKETPLACE_RELATIVE_PATH] };
  }
  const beforeCount = marketplace.plugins.length;
  marketplace.plugins = marketplace.plugins.filter((item) => item?.name !== CODEX_PLUGIN_NAME);
  if (marketplace.plugins.length === beforeCount) {
    return { removed: [], preserved: [CODEX_MARKETPLACE_RELATIVE_PATH] };
  }
  writeJsonAtomic(marketplacePath, marketplace);
  return {
    removed: [`${CODEX_MARKETPLACE_RELATIVE_PATH}#${CODEX_PLUGIN_NAME}`],
    preserved: marketplace.plugins.length ? [CODEX_MARKETPLACE_RELATIVE_PATH] : []
  };
}

function removeOwnedPluginBundle(cwd) {
  const pluginRoot = path.join(cwd, CODEX_PLUGIN_RELATIVE_ROOT);
  if (!fs.existsSync(pluginRoot)) {
    return { removed: [], preserved: [] };
  }
  if (!isOwnedPluginBundle(pluginRoot)) {
    return { removed: [], preserved: [CODEX_PLUGIN_RELATIVE_ROOT] };
  }
  fs.rmSync(pluginRoot, { recursive: true, force: true });
  return { removed: [CODEX_PLUGIN_RELATIVE_ROOT], preserved: [] };
}

function marketplaceEntry() {
  return {
    name: CODEX_PLUGIN_NAME,
    source: {
      source: "local",
      path: `./${CODEX_PLUGIN_RELATIVE_ROOT}`
    },
    policy: {
      installation: "AVAILABLE",
      authentication: "ON_INSTALL"
    },
    category: "Developer Tools",
    interface: {
      displayName: "Orange Hyper",
      shortDescription: "Lifecycle route, memory, and verification binding for activated projects."
    }
  };
}

function readMarketplace(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw activationError("ACTIVATION_MARKETPLACE_UNREADABLE", `Could not parse ${CODEX_MARKETPLACE_RELATIVE_PATH}: ${error.message}`, "Fix invalid marketplace JSON before retrying activation apply.");
  }
}

function isOwnedPluginBundle(pluginRoot) {
  const markerPath = path.join(pluginRoot, ".orange-hyper-owned.json");
  if (!fs.existsSync(markerPath)) {
    return false;
  }
  try {
    const marker = JSON.parse(fs.readFileSync(markerPath, "utf8"));
    return marker.owner === "orange-hyper" && marker.plugin === CODEX_PLUGIN_NAME;
  } catch {
    return false;
  }
}

function findOrangeExecutable() {
  if (process.env.ORANGE_HYPER_BIN && executableExists(process.env.ORANGE_HYPER_BIN)) {
    return process.env.ORANGE_HYPER_BIN;
  }
  const pathCandidate = findOnPath(process.platform === "win32" ? ["orange.exe", "orange.cmd", "orange"] : ["orange"]);
  if (pathCandidate) {
    return pathCandidate;
  }
  const userLocal = process.platform === "win32"
    ? path.join(process.env.LOCALAPPDATA || "", "OrangeHyper", "bin", "orange.exe")
    : path.join(os.homedir(), ".local", "bin", "orange");
  if (userLocal && executableExists(userLocal)) {
    return userLocal;
  }
  if (process.argv[1] && fs.existsSync(process.argv[1])) {
    return path.resolve(process.argv[1]);
  }
  return null;
}

function findOnPath(names) {
  const parts = String(process.env.PATH || "").split(path.delimiter).filter(Boolean);
  for (const dir of parts) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      if (executableExists(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

function executableExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
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
