import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ORANGE_HYPER_VERSION } from "./origin.js";
import { nowIso } from "./time.js";
import {
  CODEX_HOST_BRIDGE_SCHEMA_VERSION,
  CODEX_MARKETPLACE_RELATIVE_PATH,
  CODEX_PLUGIN_FILES,
  CODEX_PLUGIN_NAME,
  CODEX_PLUGIN_RELATIVE_ROOT,
  CODEX_PLUGIN_VERSION
} from "../adapters/codex/pluginAssets.js";

export const BINDING_SCHEMA_VERSION = 1;
export const BINDING_SUPPORTED_HOSTS = new Set(["codex"]);
export const BINDING_SUPPORTED_SCOPES = new Set(["user"]);
export const REQUIRED_OPERATIONAL_EVENTS = ["SessionStart", "UserPromptSubmit", "Stop"];
export const DEFAULT_LIFECYCLE_FRESHNESS_WINDOW_MS = 24 * 60 * 60 * 1000;

export function bindingPlan(cwd = process.cwd(), options = {}) {
  const host = normalizeHost(options.host);
  const scope = normalizeScope(options.scope || "user");
  assertSupported(host, scope);
  return buildBindingResult(cwd, {
    host,
    scope,
    dryRun: true,
    applied: false,
    removed: false,
    clock: options.clock
  });
}

export function bindingInstall(cwd = process.cwd(), options = {}) {
  const host = normalizeHost(options.host);
  const scope = normalizeScope(options.scope || "user");
  assertSupported(host, scope);
  const paths = codexBindingPaths(options.env || process.env);
  const before = inspectUserBinding(options.env || process.env);
  writeUserBinding(paths, options);
  const migration = migrateLegacyProjectBinding(cwd);
  const result = buildBindingResult(cwd, {
    host,
    scope,
    dryRun: false,
    applied: true,
    removed: false,
    clock: options.clock
  });
  return {
    ...result,
    installed_user_scope_only: true,
    idempotent: before.binding_metadata_exists && before.plugin_source_exists && before.marketplace_entry_exists,
    migration,
    note: "Plugin install, enable, and hook review remain user-visible Codex actions unless Codex reports them explicitly."
  };
}

export function bindingStatus(cwd = process.cwd(), options = {}) {
  const host = normalizeHost(options.host);
  assertSupported(host, "user");
  return buildBindingResult(cwd, {
    host,
    scope: "user",
    dryRun: false,
    applied: false,
    removed: false,
    clock: options.clock
  });
}

export function bindingRemove(cwd = process.cwd(), options = {}) {
  const host = normalizeHost(options.host);
  const scope = normalizeScope(options.scope || "user");
  assertSupported(host, scope);
  const removed = [];
  const preserved = [];
  const paths = codexBindingPaths(options.env || process.env);
  const inspection = inspectUserBinding(options.env || process.env);

  if (inspection.ownership_verified) {
    for (const target of [paths.bindingJson, paths.marketplaceJson, paths.pluginRoot]) {
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
        removed.push(relativeUserPath(target, paths.userHome));
      }
    }
  } else {
    for (const target of [paths.bindingJson, paths.marketplaceJson, paths.pluginRoot]) {
      if (fs.existsSync(target)) {
        preserved.push(relativeUserPath(target, paths.userHome));
      }
    }
  }

  const result = buildBindingResult(cwd, {
    host,
    scope,
    dryRun: false,
    applied: false,
    removed: true,
    clock: options.clock
  });
  const removalStatus = bindingRemovalStatus(paths, inspection);
  const nextActions = [
    {
      kind: "codex_plugin_disable",
      description: "Open Codex /plugins and disable Orange Hyper if Codex still shows it as enabled."
    },
    {
      kind: "codex_plugin_uninstall",
      description: "Open Codex /plugins and uninstall Orange Hyper if Codex still shows it as installed."
    },
    {
      kind: "start_new_thread",
      description: "Start a new Codex thread after plugin disable or uninstall so hook state is not reused."
    },
    {
      kind: "binding_status_recheck",
      description: "Run `orange binding status --host codex --json` after the Codex-side change."
    }
  ];

  return {
    ...result,
    status: removalStatus.effective_status,
    effective_status: removalStatus.effective_status,
    restart_required: true,
    plugin_installation: removalStatus.installed_plugin_status,
    plugin_enabled: removalStatus.enabled_status,
    removal_status: removalStatus,
    removed_paths: removed.sort(),
    preserved_paths: preserved.sort(),
    removed_owned_state_only: true,
    project_activation_preserved: true,
    next_actions: nextActions,
    user_actions: nextActions
  };
}

export function buildBindingResult(cwd, options) {
  const env = options.env || process.env;
  const paths = codexBindingPaths(env);
  const user = inspectUserBinding(env);
  const legacy = inspectLegacyProjectBinding(cwd);
  const heartbeat = readProjectHeartbeat(cwd);
  const hookExecution = evaluateHookExecution(heartbeat, undefined, { clock: options.clock });
  const conflicts = [...user.conflicts, ...legacy.conflicts];
  const effectiveStatus = effectiveBindingStatus(user, hookExecution, conflicts);
  const plannedWrites = options.dryRun ? plannedBindingWrites(paths) : [];
  const plannedRemovals = options.dryRun ? plannedBindingRemovals(paths, user) : [];
  const externalCommands = [
    {
      command: `codex plugin marketplace add ${shellQuote(paths.bindingRoot)}`,
      executed: false,
      reason: "Orange prepares the local marketplace root but does not silently mutate Codex plugin installation, enablement, or hook trust."
    }
  ];
  return {
    host: options.host,
    scope: options.scope,
    dry_run: Boolean(options.dryRun),
    applied: Boolean(options.applied),
    removed: Boolean(options.removed),
    status: effectiveStatus,
    effective_status: effectiveStatus,
    codex_executable: findCodexExecutable(),
    orange_executable: findOrangeExecutable(),
    orange_version: ORANGE_HYPER_VERSION,
    plugin: {
      name: CODEX_PLUGIN_NAME,
      version: CODEX_PLUGIN_VERSION,
      availability: user.plugin_availability,
      source_path: paths.pluginRoot,
      source_exists: user.plugin_source_exists
    },
    binding_fingerprint: computeCodexBindingFingerprint(),
    user_data_path: paths.userHome,
    binding_root: paths.bindingRoot,
    binding_metadata: {
      path: paths.bindingJson,
      exists: user.binding_metadata_exists,
      ownership_verified: user.ownership_verified
    },
    marketplace: {
      status: user.marketplace_status,
      path: paths.marketplaceJson,
      entry_exists: user.marketplace_entry_exists,
      registered: user.marketplace_status === "registered"
    },
    plugin_installation: user.plugin_installation,
    plugin_enabled: user.plugin_enabled,
    hook_execution: hookExecution,
    legacy_project_local_binding: legacy,
    planned_writes: plannedWrites,
    removals: plannedRemovals,
    external_commands: externalCommands,
    conflicts,
    restart_required: effectiveStatus !== "operational",
    rollback_available: user.ownership_verified || user.marketplace_status === "registered",
    user_actions: userActionsForStatus(user, hookExecution)
  };
}

export function codexBindingPaths(env = process.env) {
  const userHome = path.resolve(env.ORANGE_HYPER_HOME || path.join(os.homedir(), ".orange-hyper"));
  const bindingRoot = path.join(userHome, "bindings", "codex");
  return {
    userHome,
    bindingRoot,
    marketplaceJson: path.join(bindingRoot, CODEX_MARKETPLACE_RELATIVE_PATH),
    pluginRoot: path.join(bindingRoot, "plugins", CODEX_PLUGIN_NAME),
    bindingJson: path.join(bindingRoot, "binding.json"),
    ownershipMarker: path.join(bindingRoot, "plugins", CODEX_PLUGIN_NAME, ".orange-hyper-owned.json")
  };
}

export function inspectUserBinding(env = process.env) {
  const paths = codexBindingPaths(env);
  const conflicts = [];
  const pluginManifest = path.join(paths.pluginRoot, ".codex-plugin", "plugin.json");
  const pluginSourceExists = fs.existsSync(pluginManifest);
  const ownershipVerified = isOwnedPluginBundle(paths.pluginRoot);
  if (fs.existsSync(paths.pluginRoot) && !ownershipVerified) {
    conflicts.push({
      path: paths.pluginRoot,
      reason: "Plugin source path exists but lacks the Orange ownership marker."
    });
  }

  let marketplaceStatus = "absent";
  let marketplaceEntryExists = false;
  if (fs.existsSync(paths.marketplaceJson)) {
    try {
      const marketplace = JSON.parse(fs.readFileSync(paths.marketplaceJson, "utf8"));
      marketplaceEntryExists = Array.isArray(marketplace.plugins)
        && marketplace.plugins.some((item) => item?.name === CODEX_PLUGIN_NAME);
      marketplaceStatus = marketplaceEntryExists ? "registered" : "absent";
    } catch {
      marketplaceStatus = "degraded";
      conflicts.push({
        path: paths.marketplaceJson,
        reason: "Marketplace JSON cannot be parsed."
      });
    }
  }

  return {
    binding_metadata_exists: fs.existsSync(paths.bindingJson),
    plugin_source_exists: pluginSourceExists,
    plugin_availability: pluginSourceExists && ownershipVerified ? "available" : pluginSourceExists ? "unknown" : "unavailable",
    marketplace_status: marketplaceStatus,
    marketplace_entry_exists: marketplaceEntryExists,
    plugin_installation: "unknown",
    plugin_enabled: "unknown",
    ownership_verified: ownershipVerified,
    conflicts
  };
}

export function inspectLegacyProjectBinding(cwd = process.cwd()) {
  const pluginRoot = path.join(cwd, CODEX_PLUGIN_RELATIVE_ROOT);
  const marketplacePath = path.join(cwd, CODEX_MARKETPLACE_RELATIVE_PATH);
  const pluginExists = fs.existsSync(path.join(pluginRoot, ".codex-plugin", "plugin.json"));
  const ownershipVerified = isOwnedPluginBundle(pluginRoot);
  const conflicts = [];
  if (fs.existsSync(pluginRoot) && !ownershipVerified) {
    conflicts.push({
      path: CODEX_PLUGIN_RELATIVE_ROOT,
      reason: "Legacy project-local plugin path exists but is not Orange-owned."
    });
  }
  let marketplaceEntryExists = false;
  if (fs.existsSync(marketplacePath)) {
    try {
      const marketplace = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));
      marketplaceEntryExists = Array.isArray(marketplace.plugins)
        && marketplace.plugins.some((item) => item?.name === CODEX_PLUGIN_NAME);
    } catch {
      conflicts.push({
        path: CODEX_MARKETPLACE_RELATIVE_PATH,
        reason: "Legacy marketplace JSON cannot be parsed."
      });
    }
  }
  return {
    detected: pluginExists || marketplaceEntryExists,
    plugin_exists: pluginExists,
    marketplace_entry_exists: marketplaceEntryExists,
    ownership_verified: ownershipVerified,
    plugin_root: CODEX_PLUGIN_RELATIVE_ROOT,
    marketplace: CODEX_MARKETPLACE_RELATIVE_PATH,
    conflicts
  };
}

export function evaluateHookExecution(heartbeat, currentFingerprint = computeCodexBindingFingerprint(), options = {}) {
  const freshnessWindowMs = Number.isFinite(options.freshnessWindowMs)
    ? Number(options.freshnessWindowMs)
    : DEFAULT_LIFECYCLE_FRESHNESS_WINDOW_MS;
  const nowMs = Date.parse(nowIso(options.clock));
  const base = {
    required_events: REQUIRED_OPERATIONAL_EVENTS,
    optional_events: ["PostToolUse"],
    current_fingerprint: currentFingerprint,
    freshness_window_ms: freshnessWindowMs,
    observed_orange_version: null,
    observed_plugin_version: null,
    session_key: null,
    session_start_at: null,
    latest_prompt_at: null,
    stop_at: null,
    complete_lifecycle_at: null,
    freshness_expires_at: null
  };
  if (!heartbeat) {
    return {
      ...base,
      status: "none",
      observed_required_events: [],
      missing_required_events: REQUIRED_OPERATIONAL_EVENTS,
      observed_fingerprint: null,
      last_event: null,
      last_observed_at: null,
      recent: emptyRecentEvents(),
      status_reason: "no_lifecycle_event"
    };
  }
  if (heartbeat.degraded || heartbeat.last_error_at) {
    return {
      ...base,
      status: "degraded",
      observed_required_events: [],
      missing_required_events: REQUIRED_OPERATIONAL_EVENTS,
      observed_fingerprint: heartbeat.binding_fingerprint || null,
      last_event: heartbeat.last_event || heartbeat.event || null,
      last_observed_at: heartbeat.observed_at || heartbeat.last_event_at || null,
      recent: recentEventsForRecord(heartbeat),
      status_reason: "lifecycle_error"
    };
  }
  const records = lifecycleRecordsFromHeartbeat(heartbeat);
  if (!records.length) {
    return {
      ...base,
      status: "none",
      observed_required_events: [],
      missing_required_events: REQUIRED_OPERATIONAL_EVENTS,
      observed_fingerprint: heartbeat.binding_fingerprint || null,
      last_event: heartbeat.last_event || heartbeat.event || null,
      last_observed_at: heartbeat.observed_at || heartbeat.last_event_at || null,
      recent: emptyRecentEvents(),
      status_reason: "no_lifecycle_event"
    };
  }
  const currentRecords = records.filter((record) => isCurrentLifecycleRecord(record, currentFingerprint));
  const bestCurrent = bestLifecycleRecord(currentRecords);
  const bestObserved = bestCurrent || bestLifecycleRecord(records) || heartbeat;
  const observedRequired = observedRequiredEvents(bestObserved);
  const completeCurrent = currentRecords.filter(hasCompleteLifecycle);
  const freshComplete = completeCurrent
    .filter((record) => isFreshCompleteLifecycle(record, nowMs, freshnessWindowMs))
    .sort((left, right) => Date.parse(right.complete_lifecycle_at) - Date.parse(left.complete_lifecycle_at))[0];
  let selected = bestObserved;
  let status = "none";
  let statusReason = "no_current_required_event";
  if (freshComplete) {
    status = "current";
    statusReason = "complete_lifecycle_fresh";
    selected = freshComplete;
  } else if (completeCurrent.length) {
    status = "stale";
    statusReason = "freshness_window_expired";
    selected = completeCurrent.sort((left, right) => Date.parse(right.complete_lifecycle_at) - Date.parse(left.complete_lifecycle_at))[0];
  } else if (observedRequired.length > 0 && bestCurrent) {
    status = "partial";
    statusReason = "required_events_missing";
    selected = bestCurrent;
  } else if (currentRecords.length) {
    status = "unknown";
    statusReason = "current_fingerprint_without_required_events";
    selected = bestCurrent || currentRecords[0];
  } else if (records.length) {
    status = "stale";
    statusReason = "fingerprint_or_version_mismatch";
    selected = bestObserved;
  }
  const selectedEvents = eventMapForRecord(selected);
  const selectedObservedRequired = observedRequiredEvents(selected);
  return {
    ...base,
    status,
    status_reason: statusReason,
    observed_required_events: selectedObservedRequired,
    missing_required_events: REQUIRED_OPERATIONAL_EVENTS.filter((event) => !selectedObservedRequired.includes(event)),
    optional_observed_events: selectedEvents.PostToolUse ? ["PostToolUse"] : [],
    observed_fingerprint: selected?.binding_fingerprint || heartbeat.binding_fingerprint || null,
    observed_orange_version: selected?.orange_version || heartbeat.orange_version || null,
    observed_plugin_version: selected?.plugin_version || heartbeat.plugin_version || null,
    session_key: selected?.session_key || null,
    session_start_at: selected?.session_start_at || null,
    latest_prompt_at: selected?.latest_prompt_at || null,
    stop_at: selected?.stop_at || null,
    complete_lifecycle_at: selected?.complete_lifecycle_at || null,
    freshness_expires_at: selected?.complete_lifecycle_at
      ? new Date(Date.parse(selected.complete_lifecycle_at) + freshnessWindowMs).toISOString()
      : null,
    last_event: heartbeat.last_event || heartbeat.event || null,
    last_observed_at: heartbeat.observed_at || heartbeat.last_event_at || selected?.observed_at || null,
    recent: {
      SessionStart: selectedEvents.SessionStart || null,
      UserPromptSubmit: selectedEvents.UserPromptSubmit || null,
      PostToolUse: selectedEvents.PostToolUse || null,
      Stop: selectedEvents.Stop || null
    }
  };
}

function lifecycleRecordsFromHeartbeat(heartbeat) {
  const records = [];
  if (heartbeat.sessions && typeof heartbeat.sessions === "object" && !Array.isArray(heartbeat.sessions)) {
    for (const record of Object.values(heartbeat.sessions)) {
      if (record && typeof record === "object") {
        records.push(record);
      }
    }
  }
  if (!records.length && (heartbeat.binding_fingerprint || heartbeat.events || heartbeat.session_start_at || heartbeat.latest_prompt_at || heartbeat.stop_at)) {
    records.push(heartbeat);
  }
  return records;
}

function isCurrentLifecycleRecord(record, currentFingerprint) {
  return record?.binding_fingerprint === currentFingerprint
    && record?.orange_version === ORANGE_HYPER_VERSION
    && record?.plugin_version === CODEX_PLUGIN_VERSION;
}

function bestLifecycleRecord(records) {
  return [...records].sort((left, right) => {
    const rightScore = observedRequiredEvents(right).length;
    const leftScore = observedRequiredEvents(left).length;
    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }
    return Date.parse(right?.observed_at || right?.complete_lifecycle_at || "1970-01-01T00:00:00.000Z")
      - Date.parse(left?.observed_at || left?.complete_lifecycle_at || "1970-01-01T00:00:00.000Z");
  })[0] || null;
}

function hasCompleteLifecycle(record) {
  return Boolean(record?.session_start_at && record?.latest_prompt_at && record?.stop_at && record?.complete_lifecycle_at);
}

function isFreshCompleteLifecycle(record, nowMs, freshnessWindowMs) {
  if (!hasCompleteLifecycle(record)) {
    return false;
  }
  const completeMs = Date.parse(record.complete_lifecycle_at);
  return Number.isFinite(completeMs) && completeMs <= nowMs && nowMs - completeMs <= freshnessWindowMs;
}

function observedRequiredEvents(record) {
  const events = eventMapForRecord(record);
  return REQUIRED_OPERATIONAL_EVENTS.filter((event) => Boolean(events[event]));
}

function eventMapForRecord(record) {
  return {
    ...(record?.events || {}),
    ...(record?.session_start_at ? { SessionStart: record.session_start_at } : {}),
    ...(record?.latest_prompt_at ? { UserPromptSubmit: record.latest_prompt_at } : {}),
    ...(record?.stop_at ? { Stop: record.stop_at } : {})
  };
}

function recentEventsForRecord(record) {
  const events = eventMapForRecord(record);
  return {
    SessionStart: events.SessionStart || null,
    UserPromptSubmit: events.UserPromptSubmit || null,
    PostToolUse: events.PostToolUse || null,
    Stop: events.Stop || null
  };
}

function emptyRecentEvents() {
  return {
    SessionStart: null,
    UserPromptSubmit: null,
    PostToolUse: null,
    Stop: null
  };
}

export function computeCodexBindingFingerprint(files = CODEX_PLUGIN_FILES) {
  const hash = crypto.createHash("sha256");
  hash.update(`${CODEX_HOST_BRIDGE_SCHEMA_VERSION}\n`);
  for (const key of Object.keys(files).sort()) {
    hash.update(`${key}\0`);
    hash.update(String(files[key]));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function findOrangeExecutable() {
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

function writeUserBinding(paths, options = {}) {
  if (fs.existsSync(paths.pluginRoot) && !isOwnedPluginBundle(paths.pluginRoot)) {
    throw bindingError("BINDING_PLUGIN_CONFLICT", `${paths.pluginRoot} exists but is not Orange-owned.`, "Move or review that plugin directory before running binding install.");
  }
  for (const [relative, contents] of Object.entries(CODEX_PLUGIN_FILES)) {
    const target = path.join(paths.pluginRoot, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    writeFileAtomic(target, contents);
    if (relative === "hooks/run-orange.sh") {
      fs.chmodSync(target, 0o755);
    }
  }
  writeJsonAtomic(paths.ownershipMarker, {
    owner: "orange-hyper",
    plugin: CODEX_PLUGIN_NAME,
    version: CODEX_PLUGIN_VERSION,
    scope: "user"
  });
  const marketplace = {
    name: "orange-hyper-user",
    interface: {
      displayName: "Orange Hyper"
    },
    plugins: [marketplaceEntry()]
  };
  writeJsonAtomic(paths.marketplaceJson, marketplace);
  writeJsonAtomic(paths.bindingJson, {
    schema_version: BINDING_SCHEMA_VERSION,
    owner: "orange-hyper",
    host: "codex",
    scope: "user",
    plugin: CODEX_PLUGIN_NAME,
    plugin_version: CODEX_PLUGIN_VERSION,
    orange_version: ORANGE_HYPER_VERSION,
    binding_fingerprint: computeCodexBindingFingerprint(),
    marketplace: paths.marketplaceJson,
    plugin_root: paths.pluginRoot,
    installed_at: nowIso(options.clock),
    manages_codex_plugin_cache: false,
    manages_codex_hook_trust: false
  });
}

function bindingRemovalStatus(paths, inspection) {
  return {
    source_removed: !fs.existsSync(paths.pluginRoot),
    source_previously_present: Boolean(inspection.plugin_source_exists),
    marketplace_removed: !fs.existsSync(paths.marketplaceJson),
    marketplace_previously_registered: Boolean(inspection.marketplace_entry_exists),
    metadata_removed: !fs.existsSync(paths.bindingJson),
    metadata_previously_present: Boolean(inspection.binding_metadata_exists),
    installed_plugin_status: "unknown",
    enabled_status: "unknown",
    effective_status: "pending_user_uninstall_or_disable",
    manages_codex_plugin_cache: false,
    manages_codex_enablement: false
  };
}

function migrateLegacyProjectBinding(cwd) {
  const legacy = inspectLegacyProjectBinding(cwd);
  if (!legacy.detected) {
    return {
      attempted: false,
      reason: "No legacy project-local binding detected.",
      removed_paths: [],
      preserved_paths: []
    };
  }
  const removed = [];
  const preserved = [];
  if (legacy.plugin_exists && legacy.ownership_verified) {
    const pluginRoot = path.join(cwd, CODEX_PLUGIN_RELATIVE_ROOT);
    fs.rmSync(pluginRoot, { recursive: true, force: true });
    removed.push(CODEX_PLUGIN_RELATIVE_ROOT);
  } else if (legacy.plugin_exists) {
    preserved.push(CODEX_PLUGIN_RELATIVE_ROOT);
  }
  const marketplaceResult = removeLegacyMarketplaceEntry(cwd);
  removed.push(...marketplaceResult.removed);
  preserved.push(...marketplaceResult.preserved);
  return {
    attempted: true,
    success: !preserved.length,
    removed_paths: removed.sort(),
    preserved_paths: preserved.sort(),
    recovery_action: preserved.length
      ? "Review preserved legacy artifacts manually; Orange removed only owned state."
      : null
  };
}

function removeLegacyMarketplaceEntry(cwd) {
  const marketplacePath = path.join(cwd, CODEX_MARKETPLACE_RELATIVE_PATH);
  if (!fs.existsSync(marketplacePath)) {
    return { removed: [], preserved: [] };
  }
  let marketplace;
  try {
    marketplace = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));
  } catch {
    return { removed: [], preserved: [CODEX_MARKETPLACE_RELATIVE_PATH] };
  }
  if (!Array.isArray(marketplace.plugins)) {
    return { removed: [], preserved: [CODEX_MARKETPLACE_RELATIVE_PATH] };
  }
  const before = marketplace.plugins.length;
  marketplace.plugins = marketplace.plugins.filter((item) => item?.name !== CODEX_PLUGIN_NAME);
  if (marketplace.plugins.length === before) {
    return { removed: [], preserved: [CODEX_MARKETPLACE_RELATIVE_PATH] };
  }
  writeJsonAtomic(marketplacePath, marketplace);
  return {
    removed: [`${CODEX_MARKETPLACE_RELATIVE_PATH}#${CODEX_PLUGIN_NAME}`],
    preserved: []
  };
}

function readProjectHeartbeat(cwd) {
  const filePath = path.join(cwd, ".orange-hyper", "local", "runtime", "heartbeat.json");
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {
      degraded: true,
      last_error_at: nowIso(),
      reason: "Project heartbeat JSON cannot be parsed."
    };
  }
}

function effectiveBindingStatus(user, hookExecution, conflicts) {
  if (conflicts.length || user.marketplace_status === "degraded") {
    return "degraded";
  }
  if (hookExecution.status === "current") {
    return "operational";
  }
  if (hookExecution.status === "stale") {
    return "stale";
  }
  if (user.marketplace_status === "absent" && user.plugin_availability === "unavailable") {
    return "absent";
  }
  if (user.plugin_installation !== "installed") {
    return "pending_install";
  }
  if (user.plugin_enabled !== "enabled") {
    return "pending_enable";
  }
  if (hookExecution.status === "none" || hookExecution.status === "partial") {
    return "pending_review_or_restart";
  }
  return "unknown";
}

function userActionsForStatus(user, hookExecution) {
  const actions = [];
  if (user.marketplace_status !== "registered") {
    actions.push({
      kind: "register_marketplace",
      description: "Run `orange binding install --host codex --scope user --json`, then add the local marketplace in Codex if the app does not discover it automatically."
    });
  }
  actions.push({
    kind: "install_plugin",
    description: "Open Codex /plugins, find Orange Hyper from the registered marketplace, and install it."
  });
  actions.push({
    kind: "enable_plugin",
    description: "Enable the Orange Hyper plugin in Codex if it is installed but disabled."
  });
  if (hookExecution.status !== "current") {
    actions.push({
      kind: "review_hooks",
      description: "Open Codex /hooks and review the current Orange hook definitions after plugin changes."
    });
    actions.push({
      kind: "restart_or_new_thread",
      description: "Start a new Codex thread after marketplace, plugin, enable, or hook review changes."
    });
  }
  return actions;
}

function plannedBindingWrites(paths) {
  return [
    { action: "write_user_plugin_source", path: paths.pluginRoot },
    { action: "write_user_marketplace", path: paths.marketplaceJson },
    { action: "write_binding_metadata", path: paths.bindingJson }
  ];
}

function plannedBindingRemovals(paths, inspection) {
  if (!inspection.ownership_verified) {
    return [];
  }
  return [
    { action: "remove_owned_user_plugin_source", path: paths.pluginRoot },
    { action: "remove_owned_user_marketplace", path: paths.marketplaceJson },
    { action: "remove_owned_binding_metadata", path: paths.bindingJson }
  ];
}

function marketplaceEntry() {
  return {
    name: CODEX_PLUGIN_NAME,
    source: {
      source: "local",
      path: `./plugins/${CODEX_PLUGIN_NAME}`
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

function findCodexExecutable() {
  return findOnPath(process.platform === "win32" ? ["codex.exe", "codex.cmd", "codex"] : ["codex"]);
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
  return String(scope || "user").toLowerCase();
}

function assertSupported(host, scope) {
  if (!BINDING_SUPPORTED_HOSTS.has(host)) {
    throw bindingError("BINDING_UNSUPPORTED_HOST", `Unsupported binding host: ${host}`, "This release supports `--host codex` only.");
  }
  if (!BINDING_SUPPORTED_SCOPES.has(scope)) {
    throw bindingError("BINDING_UNSUPPORTED_SCOPE", `Unsupported binding scope: ${scope}`, "This release supports `--scope user` only.");
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

function relativeUserPath(filePath, userHome) {
  return path.relative(userHome, filePath).split(path.sep).join("/");
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function bindingError(code, message, hint) {
  return Object.assign(new Error(message), {
    orangeCode: code,
    orangeHint: hint
  });
}
