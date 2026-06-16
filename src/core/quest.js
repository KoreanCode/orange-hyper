import fs from "node:fs";
import path from "node:path";
import { requireInitialized, requireProjectIdentity } from "./config.js";
import { splitFrontmatter, stringifyFrontmatter } from "./frontmatter.js";
import { originMetadata } from "./origin.js";
import { workspacePaths } from "./paths.js";
import { buildRouteContract, formatRouteLine, validateRouteContract } from "./route.js";
import { asArray, makeTitle, slugify } from "./text.js";
import { nowIso, timestampForId } from "./time.js";

export const QUEST_SCHEMA_VERSION = 1;
export const QUEST_STATUSES = new Set(["active", "completed"]);
const ACTIVE_VERIFICATION_STATUSES = new Set(["pending"]);
const COMPLETED_VERIFICATION_STATUSES = new Set(["verified", "unverified"]);

/**
 * @returns {import("./types.d.ts").QuestCreationResult}
 */
export function createQuest(cwd, rawRequest, options = {}) {
  requireInitialized(cwd);
  const project = requireProjectIdentity(cwd);
  if (!rawRequest || !String(rawRequest).trim()) {
    throw new Error("Quest request is required.");
  }

  const created_at = nowIso(options.clock);
  const title = options.title || makeTitle(rawRequest);
  const contract = buildRouteContract(rawRequest, {
    layer: options.layer,
    outputContract: options.outputContract
  });
  const id = options.id || `quest_${timestampForId(options.clock)}_${slugify(title)}`;
  const data = /** @type {import("./types.d.ts").QuestFrontmatter} */ ({
    schema_version: /** @type {1} */ (QUEST_SCHEMA_VERSION),
    ...originMetadata(),
    project_id: project.project_id,
    project_name: project.project_name,
    id,
    title,
    status: "active",
    created_at,
    updated_at: created_at,
    layer: contract.layer,
    route: contract.route,
    quest_policy: contract.quest_policy,
    output_contract: contract.output_contract,
    scope_paths: asArray(options.paths),
    constraints: asArray(options.constraints),
    unknowns: asArray(options.unknowns),
    expected_verification: asArray(options.expectedVerification),
    verification_status: "pending",
    verification_evidence: [],
    unverified_reason: ""
  });

  const body = [
    `# ${title}`,
    "",
    "## Request",
    "",
    String(rawRequest).trim(),
    "",
    "## Route Contract",
    "",
    formatRouteLine(contract),
    "",
    `- Quest policy: ${contract.quest_policy}`,
    `- Reason: ${contract.reason_summary}`,
    "",
    "## Scope",
    "",
    data.scope_paths.length ? data.scope_paths.map((item) => `- ${item}`).join("\n") : "- Not specified yet.",
    "",
    "## Constraints",
    "",
    data.constraints.length ? data.constraints.map((item) => `- ${item}`).join("\n") : "- Not specified yet.",
    "",
    "## Verification Plan",
    "",
    data.expected_verification.length ? data.expected_verification.map((item) => `- ${item}`).join("\n") : "- Decide the narrowest honest check before completion.",
    "",
    "## Notes",
    "",
    "- This Quest is an editable intent capsule, not a SPEC."
  ].join("\n");

  const paths = workspacePaths(cwd);
  const filePath = path.join(paths.activeQuests, `${id}.md`);
  fs.writeFileSync(filePath, stringifyFrontmatter(data, body));
  return { id, filePath, data, body, contract };
}

/**
 * @returns {import("./types.d.ts").MarkdownDocument<import("./types.d.ts").QuestFrontmatter>}
 */
export function readQuestFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const parsed = splitFrontmatter(source);
  return /** @type {import("./types.d.ts").MarkdownDocument<import("./types.d.ts").QuestFrontmatter>} */ ({ filePath, source, ...parsed });
}

export function questFiles(cwd, status = "active") {
  const paths = workspacePaths(cwd);
  const dirs = [];
  if (status === "active" || status === "all") {
    dirs.push(paths.activeQuests);
  }
  if (status === "completed" || status === "all") {
    dirs.push(paths.completedQuests);
  }
  return dirs.flatMap((dir) => {
    if (!fs.existsSync(dir)) {
      return [];
    }
    return fs
      .readdirSync(dir)
      .filter((name) => name.endsWith(".md"))
      .map((name) => path.join(dir, name));
  });
}

export function listQuests(cwd, status = "active") {
  return questFiles(cwd, status)
    .map(readQuestFile)
    .sort((a, b) => String(b.data.created_at).localeCompare(String(a.data.created_at)));
}

export function findQuest(cwd, selector) {
  if (!selector) {
    const active = listQuests(cwd, "active");
    if (active.length === 0) {
      throw new Error("No active quest found.");
    }
    return active[0];
  }

  if (looksLikePath(selector)) {
    const direct = resolveQuestSelectorPath(cwd, selector);
    if (!fs.existsSync(direct)) {
      throw new Error(`Quest not found: ${selector}`);
    }
    return readQuestFile(direct);
  }

  const candidates = listQuests(cwd, "all");
  const found = candidates.find((quest) => {
    const base = path.basename(quest.filePath, ".md");
    return quest.data.id === selector || base === selector || base.startsWith(selector);
  });
  if (!found) {
    throw new Error(`Quest not found: ${selector}`);
  }
  return found;
}

function looksLikePath(selector) {
  return selector.includes("/") || selector.includes("\\") || selector.endsWith(".md");
}

function resolveQuestSelectorPath(cwd, selector) {
  const paths = workspacePaths(cwd);
  const resolved = path.resolve(cwd, selector);
  const activeRoot = path.resolve(paths.activeQuests);
  const completedRoot = path.resolve(paths.completedQuests);
  if (!isInside(resolved, activeRoot) && !isInside(resolved, completedRoot)) {
    throw new Error("Quest path must stay inside .orange-hyper/quests.");
  }
  if (!resolved.endsWith(".md")) {
    throw new Error("Quest path must point to a Markdown quest file.");
  }
  return resolved;
}

function isInside(target, parent) {
  const relative = path.relative(parent, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function validateQuestDocument(quest, expectedStatus) {
  const data = quest.data || quest;
  const errors = [];
  for (const field of ["schema_version", "id", "title", "status", "created_at", "updated_at", "layer", "route", "quest_policy", "output_contract", "verification_status"]) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      errors.push(`quest ${data.id || "(unknown)"} missing ${field}`);
    }
  }
  if (data.schema_version !== QUEST_SCHEMA_VERSION) {
    errors.push(`quest ${data.id || "(unknown)"} has unsupported schema_version ${data.schema_version}`);
  }
  if (!QUEST_STATUSES.has(data.status)) {
    errors.push(`quest ${data.id || "(unknown)"} has invalid status ${data.status}`);
  }
  if (data.status === "active" && !ACTIVE_VERIFICATION_STATUSES.has(data.verification_status)) {
    errors.push(`active quest ${data.id || "(unknown)"} must have pending verification_status`);
  }
  if (expectedStatus && data.status !== expectedStatus) {
    errors.push(`quest ${data.id || "(unknown)"} is in ${expectedStatus} directory but status is ${data.status}`);
  }
  const [layer, procedure, tool, verification, delegation, mcp, memory] = String(data.route || "").split("/");
  errors.push(
    ...validateRouteContract({
      route: data.route,
      layer: data.layer || layer,
      procedure,
      tool_budget: tool,
      verification,
      delegation,
      mcp,
      memory,
      output_contract: data.output_contract,
      quest_policy: data.quest_policy
    })
  );
  if (data.layer && layer && data.layer !== layer) {
    errors.push(`quest ${data.id} layer does not match route`);
  }
  if (data.status === "completed") {
    const evidence = asArray(data.verification_evidence).filter(Boolean);
    if (!COMPLETED_VERIFICATION_STATUSES.has(data.verification_status)) {
      errors.push(`completed quest ${data.id} must be verified or unverified`);
    }
    if (data.verification_status === "verified" && !evidence.length) {
      errors.push(`verified quest ${data.id} needs verification evidence`);
    }
    if (data.verification_status === "unverified" && !data.unverified_reason) {
      errors.push(`unverified quest ${data.id} needs unverified reason`);
    }
    if (!evidence.length && !data.unverified_reason) {
      errors.push(`completed quest ${data.id} needs verification evidence or unverified reason`);
    }
  }
  return errors;
}

/**
 * @returns {import("./types.d.ts").QuestCompletionResult}
 */
export function completeQuest(cwd, selector, options = {}) {
  requireInitialized(cwd);
  const project = requireProjectIdentity(cwd);
  const evidence = asArray(options.evidence).filter(Boolean);
  const unverifiedReason = options.unverifiedReason || "";
  if (!evidence.length && !unverifiedReason) {
    throw new Error("Completion requires --evidence or --unverified.");
  }
  if (evidence.length && unverifiedReason) {
    throw new Error("Completion cannot combine verification evidence with --unverified.");
  }

  const quest = findQuest(cwd, selector);
  if (quest.data.project_id && quest.data.project_id !== project.project_id) {
    throw new Error(`Quest ${quest.data.id} belongs to project_id ${quest.data.project_id}, not current project_id ${project.project_id}`);
  }
  if (quest.data.status === "completed") {
    throw new Error(`Quest is already completed: ${quest.data.id}`);
  }

  const completed_at = nowIso(options.clock);
  const verificationStatus = evidence.length ? "verified" : "unverified";
  const data = {
    ...quest.data,
    status: "completed",
    updated_at: completed_at,
    completed_at,
    verification_status: verificationStatus,
    verification_evidence: evidence,
    unverified_reason: unverifiedReason
  };

  const completionBody = [
    quest.body.trimEnd(),
    "",
    "## Completion",
    "",
    `- Completed at: ${completed_at}`,
    `- Verification status: ${verificationStatus}`,
    evidence.length ? evidence.map((item) => `- Evidence: ${item}`).join("\n") : `- Unverified reason: ${unverifiedReason}`
  ].join("\n");

  const paths = workspacePaths(cwd);
  const completedPath = path.join(paths.completedQuests, path.basename(quest.filePath));
  fs.writeFileSync(completedPath, stringifyFrontmatter(data, completionBody));
  fs.unlinkSync(quest.filePath);
  return { ...readQuestFile(completedPath), completedPath };
}
