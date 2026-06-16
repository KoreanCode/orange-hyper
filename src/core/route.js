import fs from "node:fs";
import { nowIso, timestampForId } from "./time.js";
import { workspacePaths } from "./paths.js";

const LAYER_MAP = {
  L0: { procedure: "P0", tool_budget: "T0", verification: "V0", delegation: "A0", mcp: "M0", memory: "MB0" },
  L1: { procedure: "P1", tool_budget: "T2", verification: "V1", delegation: "A0", mcp: "M0", memory: "MB1" },
  L2: { procedure: "P2", tool_budget: "T2", verification: "V2", delegation: "A0", mcp: "M0", memory: "MB2" },
  L3: { procedure: "P3", tool_budget: "T2", verification: "V3", delegation: "A0", mcp: "M0", memory: "MB3" },
  L4: { procedure: "P4", tool_budget: "T3", verification: "V4", delegation: "A0", mcp: "M0", memory: "MB4" }
};

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

export function questPolicyForLayer(layer) {
  if (layer === "L0" || layer === "L1") {
    return "not_recommended";
  }
  if (layer === "L2") {
    return "recommended";
  }
  return "required";
}

export function inferOutputContract(rawRequest) {
  const text = String(rawRequest).toLowerCase();
  if (includesAny(text, ["review", "리뷰", "검토", "find issues", "code review"])) {
    return "review";
  }
  if (includesAny(text, ["audit", "감사", "전수조사", "threat", "security scan"])) {
    return "audit";
  }
  if (includesAny(text, ["investigate", "debug", "원인", "분석", "why failing", "failure cause"])) {
    return "validation";
  }
  if (includesAny(text, ["research", "조사", "찾아봐", "look up"])) {
    return "research";
  }
  if (includesAny(text, ["validate", "verify", "검증", "확인해줘"])) {
    return "validation";
  }
  if (
    text.includes("?") ||
    includesAny(text, ["why", "what is", "explain", "어떻게", "왜 ", "뭐야", "설명"])
  ) {
    return "answer";
  }
  if (includesAny(text, ["fix", "고쳐", "수정", "바꿔", "change", "rename", "문구"])) {
    return "edit";
  }
  return "implementation";
}

export function inferLayer(rawRequest, outputContract = inferOutputContract(rawRequest)) {
  const text = String(rawRequest).toLowerCase();

  if (includesAny(text, ["delete data", "drop table", "migration", "마이그레이션", "결제", "payment", "auth", "인증", "권한", "security", "보안", "destructive", "production"])) {
    return "L4";
  }
  if (includesAny(text, ["unknown cause", "원인", "debug", "investigate", "분석", "architecture", "아키텍처", "redesign", "전체", "대규모", "multi-component", "철저", "audit", "감사"])) {
    return "L3";
  }
  if (outputContract === "review" || outputContract === "audit") {
    return "L3";
  }
  if (outputContract === "answer" || outputContract === "research") {
    return "L0";
  }
  if (includesAny(text, ["typo", "label", "문구", "색상", "버튼", "css", "copy"])) {
    return "L1";
  }
  return "L2";
}

export function buildRouteContract(rawRequest, options = {}) {
  const outputContract = options.outputContract || inferOutputContract(rawRequest);
  const layer = options.layer || inferLayer(rawRequest, outputContract);
  const mapped = LAYER_MAP[layer];
  if (!mapped) {
    throw new Error(`Unsupported layer: ${layer}`);
  }
  const quest_policy = questPolicyForLayer(layer);
  const contract = {
    route: `${layer}/${mapped.procedure}/${mapped.tool_budget}/${mapped.verification}/${mapped.delegation}/${mapped.mcp}/${mapped.memory}`,
    layer,
    procedure: mapped.procedure,
    tool_budget: mapped.tool_budget,
    verification: mapped.verification,
    delegation: mapped.delegation,
    mcp: mapped.mcp,
    memory: mapped.memory,
    output_contract: outputContract,
    quest_policy,
    reason_summary: reasonSummary(layer, outputContract, quest_policy)
  };
  return contract;
}

function reasonSummary(layer, outputContract, questPolicy) {
  if (layer === "L0") {
    return "direct answer or source-light response; quest is not created by default";
  }
  if (layer === "L1") {
    return "small local task with touched-surface verification; quest is not created by default";
  }
  if (layer === "L2") {
    return `bounded ${outputContract} work with targeted verification; quest is ${questPolicy}`;
  }
  if (layer === "L3") {
    return `multi-step or uncertain ${outputContract} work with stronger verification; quest is required`;
  }
  return `high-risk or broad ${outputContract} work requiring staged verification; quest is required`;
}

export function formatRouteLine(contract) {
  return `Orange route: ${contract.layer} · ${contract.procedure} · ${contract.tool_budget} · ${contract.verification} · ${contract.delegation} · ${contract.mcp} · ${contract.memory}`;
}

export function validateRouteContract(contract) {
  const errors = [];
  if (!contract || typeof contract !== "object") {
    return ["route contract must be an object"];
  }
  for (const field of ["route", "layer", "procedure", "tool_budget", "verification", "delegation", "mcp", "memory", "output_contract", "quest_policy"]) {
    if (!contract[field]) {
      errors.push(`route contract missing ${field}`);
    }
  }
  if (contract.layer && !LAYER_MAP[contract.layer]) {
    errors.push(`unsupported layer ${contract.layer}`);
  }
  return errors;
}

export function appendRouteTrace(cwd, rawRequest, contract, options = {}) {
  const paths = workspacePaths(cwd);
  const created_at = nowIso(options.clock);
  const trace = {
    trace_id: `route_${timestampForId(options.clock)}`,
    created_at,
    input: rawRequest,
    quest_id: options.questId || null,
    contract
  };
  fs.appendFileSync(paths.routeTrace, `${JSON.stringify(trace)}\n`);
  return trace;
}
