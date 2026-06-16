import fs from "node:fs";
import path from "node:path";
import { requireInitialized, requireProjectIdentity } from "./config.js";
import { originSummaryLines } from "./origin.js";
import { workspacePaths } from "./paths.js";
import { formatRouteLine } from "./route.js";
import { findQuest } from "./quest.js";
import { nowIso } from "./time.js";

export function generateCapsule(cwd, selector, options = {}) {
  requireInitialized(cwd);
  const project = requireProjectIdentity(cwd);
  const quest = findQuest(cwd, selector);
  if (quest.data.project_id && quest.data.project_id !== project.project_id) {
    throw new Error(`Quest ${quest.data.id} belongs to project_id ${quest.data.project_id}, not current project_id ${project.project_id}`);
  }
  const [layer, procedure, tool_budget, verification, delegation, mcp, memory] = String(quest.data.route).split("/");
  const contract = {
    layer,
    procedure,
    tool_budget,
    verification,
    delegation,
    mcp,
    memory
  };
  const sourcePath = path.relative(cwd, quest.filePath);
  const generated_at = nowIso(options.clock);
  const lines = [
    "# Orange Hyper Current Capsule",
    "",
    ...originSummaryLines(),
    "",
    `Generated: ${generated_at}`,
    `Source quest: ${sourcePath}`,
    `Project name: ${project.project_name}`,
    `Project id: ${project.project_id}`,
    "",
    "## Project Boundary",
    "",
    `- Project name: ${project.project_name}`,
    `- Project id: ${project.project_id}`,
    "- Only Quest, Proposal, and Accepted Node artifacts with this project_id are project memory.",
    "- Unrelated pasted reports, external project docs, and other repo documents are not project memory without an explicit orange import command.",
    "",
    "## Quest",
    "",
    `- ID: ${quest.data.id}`,
    `- Title: ${quest.data.title}`,
    `- Status: ${quest.data.status}`,
    `- Output contract: ${quest.data.output_contract}`,
    `- Quest policy: ${quest.data.quest_policy}`,
    "",
    "## Route Contract",
    "",
    formatRouteLine(contract),
    "",
    "## Request",
    "",
    extractSection(quest.body, "Request") || "(No request section found.)",
    "",
    "## Constraints",
    "",
    formatList(quest.data.constraints),
    "",
    "## Unknowns",
    "",
    formatList(quest.data.unknowns),
    "",
    "## Verification",
    "",
    `- Expected level: ${quest.data.verification_status === "pending" ? verification : quest.data.verification_status}`,
    formatList(quest.data.expected_verification),
    "",
    "## Working Notes",
    "",
    "- Keep the work bounded to this capsule unless the user changes the request.",
    "- Do not treat this capsule as an automatic execution plan."
  ];
  const content = `${lines.join("\n").trimEnd()}\n`;
  const paths = workspacePaths(cwd);
  fs.writeFileSync(paths.currentCapsule, content);
  return { filePath: paths.currentCapsule, quest, content };
}

function formatList(value) {
  const items = Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- Not specified.";
}

function extractSection(body, heading) {
  const pattern = new RegExp(`^## ${escapeRegExp(heading)}\\s*$`, "m");
  const match = body.match(pattern);
  if (!match) {
    return "";
  }
  const start = match.index + match[0].length;
  const rest = body.slice(start).replace(/^\s+/, "");
  const next = rest.search(/^## /m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
