export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export type AdapterContractVersion = "0.1";

export type CommandId =
  | "activation.plan"
  | "activation.apply"
  | "activation.status"
  | "activation.remove"
  | "adapter.list"
  | "adapter.show"
  | "adapter.dryRun"
  | "binding.plan"
  | "binding.install"
  | "binding.status"
  | "binding.remove"
  | "capsule.build"
  | "doctor.run"
  | "environment.show"
  | "eval.snapshot"
  | "eval.report"
  | "eval.explain"
  | "graph.list"
  | "graph.show"
  | "graph.search"
  | "graph.rebuildIndex"
  | "growth.status"
  | "growth.suggest"
  | "growth.explain"
  | "hook.preview"
  | "hook.status"
  | "hook.runSessionStart"
  | "hook.runStop"
  | "identity.build"
  | "lifecycle.sessionStart"
  | "lifecycle.userPromptSubmit"
  | "lifecycle.postToolUse"
  | "lifecycle.stop"
  | "mcp.list"
  | "mcp.show"
  | "mcp.suggest"
  | "project.init"
  | "quest.done"
  | "quest.new"
  | "remember.accept"
  | "remember.list"
  | "remember.propose"
  | "remember.reject"
  | "remember.revise"
  | "remember.show"
  | "remember.validate"
  | "route.show"
  | "sync.plan"
  | "sync.apply"
  | "sync.status"
  | "unknown.command"
  | `${string}.unknown`;

export interface JsonEnvelope<TData = JsonValue> {
  ok: true;
  contract_version: AdapterContractVersion;
  command: CommandId;
  data: TData;
}

export interface JsonErrorEnvelope<TData = JsonValue> {
  ok: false;
  contract_version: AdapterContractVersion;
  command: CommandId;
  error: {
    code: string;
    message: string;
    hint: string;
  };
  data?: TData;
}

export interface AdapterSafetyFlags {
  direct_file_mutation: false;
  parses_human_output: false;
  requires_json_mode: true;
  auto_accept: false;
  auto_install: false;
  auto_unlock: false;
}

export type AdapterInputSource = "user" | "previous_step" | "project_state";

export interface AdapterStepInputRequirement {
  name: string;
  placeholder: string | null;
  input_source: AdapterInputSource;
  required: boolean;
  step_index: number;
  source_step_index?: number;
  source_output?: string;
}

export interface AdapterRecipeStep {
  step_index: number;
  command: string;
  why: string;
  required_input: string[];
  input_requirements: AdapterStepInputRequirement[];
  expected_json_command_id: CommandId | null;
  mutates_project_state: boolean;
  requires_user_approval: boolean;
  input_source: AdapterInputSource;
  condition: string;
}

export interface AdapterRecipe {
  id: string;
  title: string;
  purpose: string;
  when_to_use: string[];
  commands: AdapterRecipeStep[];
  required_inputs: string[];
  outputs: string[];
  safety_rules: string[];
  forbidden_actions: string[];
  expected_contract_version: AdapterContractVersion;
  safety_flags: AdapterSafetyFlags;
}

export interface AdapterDryRunResult {
  recipe_id: string;
  recipe_title: string;
  dry_run: true;
  executed: false;
  steps: AdapterRecipeStep[];
  commands: AdapterRecipeStep[];
  required_inputs: AdapterStepInputRequirement[];
  missing_inputs: AdapterStepInputRequirement[];
  safety_flags: AdapterSafetyFlags;
  expected_contract_version: AdapterContractVersion;
  next_user_decision: string;
  mutation_policy: string;
  adapter_rules: string[];
}

export interface ProjectIdentity {
  project_id: string;
  project_name: string;
}

export type RouteLayer = "L0" | "L1" | "L2" | "L3" | "L4";
export type ProcedureBudget = "P0" | "P1" | "P2" | "P3" | "P4";
export type ToolBudget = "T0" | "T1" | "T2" | "T3";
export type VerificationBudget = "V0" | "V1" | "V2" | "V3" | "V4";
export type DelegationBudget = "A0";
export type McpBudget = "M0";
export type MemoryBudget = "MB0" | "MB1" | "MB2" | "MB3" | "MB4";
export type OutputContract =
  | "answer"
  | "edit"
  | "implementation"
  | "review"
  | "audit"
  | "research"
  | "validation";
export type QuestPolicy = "not_recommended" | "recommended" | "required";

export interface RouteContract {
  route: string;
  layer: RouteLayer;
  procedure: ProcedureBudget;
  tool_budget: ToolBudget;
  verification: VerificationBudget;
  delegation: DelegationBudget;
  mcp: McpBudget;
  memory: MemoryBudget;
  output_contract: OutputContract;
  quest_policy: QuestPolicy;
  reason_summary: string;
}

export type QuestStatus = "active" | "completed";
export type QuestVerificationStatus = "pending" | "verified" | "unverified";

export interface OriginMetadata {
  generated_by?: string;
  generator_package?: string;
  generator_version?: string;
  source_repository?: string;
  official_package?: string;
}

export interface QuestFrontmatter extends OriginMetadata {
  schema_version: 1;
  project_id: string;
  project_name: string;
  id: string;
  title: string;
  status: QuestStatus;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  layer: RouteLayer;
  route: string;
  quest_policy: QuestPolicy;
  output_contract: OutputContract;
  scope_paths: string[];
  constraints: string[];
  unknowns: string[];
  expected_verification: string[];
  verification_status: QuestVerificationStatus;
  verification_evidence: string[];
  unverified_reason: string;
}

export interface MarkdownDocument<TData = JsonObject> {
  filePath: string;
  source: string;
  data: TData;
  body: string;
}

export interface QuestCreationResult {
  id: string;
  filePath: string;
  data: QuestFrontmatter;
  body: string;
  contract: RouteContract;
}

export type QuestCompletionResult = MarkdownDocument<QuestFrontmatter> & {
  completedPath: string;
};

export type MemoryProposalStatus = "pending" | "accepted" | "rejected";
export type MemoryNodeType = "decision" | "constraint" | "component" | "risk" | "verification";
export type MemoryConfidence = "low" | "medium" | "high";

export interface MemoryProposalFrontmatter extends OriginMetadata {
  schema_version: 1;
  project_id: string;
  project_name: string;
  id: string;
  status: MemoryProposalStatus;
  source_quest: string;
  node_type: MemoryNodeType;
  confidence: MemoryConfidence;
  created_at: string;
  updated_at: string;
  title?: string;
}

export interface MemoryProposalDocument extends MarkdownDocument<MemoryProposalFrontmatter> {
  statusDirectory?: MemoryProposalStatus;
  duplicated?: boolean;
  warnings?: string[];
}

export interface AcceptedMemoryNodeFrontmatter extends OriginMetadata {
  schema_version: 1;
  project_id: string;
  project_name: string;
  id: string;
  kind: MemoryNodeType;
  node_type: MemoryNodeType;
  status: "candidate";
  confidence: MemoryConfidence;
  created_at: string;
  updated_at: string;
  accepted_at: string;
  origin: "memory-delta-proposal";
  source_proposal: string;
  source_quest: string;
  source_path: string;
  scope_paths: string[];
  source_proposal_hash: string;
  title?: string;
  provenance: {
    project_id: string;
    project_name: string;
    proposal_id: string;
    source_proposal: string;
    source_quest: string;
    source_path: string;
    scope_paths: string[];
    accepted_at: string;
    node_type: MemoryNodeType;
    origin: "memory-delta-proposal";
    source_proposal_hash: string;
  };
}

export type AcceptedMemoryNodeDocument = MarkdownDocument<AcceptedMemoryNodeFrontmatter>;

export interface GraphIndexEntry extends OriginMetadata {
  id: string;
  file: string;
  project_id: string | null;
  project_name: string;
  node_type: MemoryNodeType;
  title: string;
  source_quest: string;
  source_proposal: string;
  source_path: string;
  scope_paths: string[];
  accepted_at: string;
  candidate_memory: string;
  summary: string;
  tags: string[];
  keywords: string[];
}

export interface GraphFilters {
  type: MemoryNodeType | null;
  source_quest: string | null;
  source_proposal: string | null;
}

export interface GraphNode extends GraphIndexEntry {
  graph_file: string;
  kind: string;
  status: string;
  confidence: string;
  origin: string;
  source_proposal_hash: string;
  updated_at: string;
  evidence: string;
  source_proposal_section: string;
  provenance: JsonObject;
  content: string;
  matches?: string[];
  score?: number;
}

export interface GraphListResult {
  project: ProjectIdentity;
  filters: GraphFilters;
  nodes: GraphNode[];
  warnings: string[];
}

export interface GraphShowResult {
  project: ProjectIdentity;
  node: GraphNode;
  warnings: string[];
}

export interface GraphSearchResult extends GraphListResult {
  query: string;
}

export type StructureNodeType =
  | "project"
  | "module"
  | "domain"
  | "component"
  | "test"
  | "document"
  | "infrastructure"
  | "datastore";

export type StructureEdgeType =
  | "contains"
  | "depends_on"
  | "tests"
  | "documents"
  | "configures";

export interface StructureNode {
  id: string;
  type: StructureNodeType;
  role: string;
  label: string;
  path: string;
  source: string;
  readOnly: true;
  generated: true;
  metadata: JsonObject;
}

export interface StructureEdge {
  id: string;
  from: string;
  to: string;
  relation: StructureEdgeType;
  source: string;
  readOnly: true;
  generated: true;
}

export interface StructureGraph extends OriginMetadata {
  schema_version: 1;
  graph_version: string;
  generated_at: string | null;
  state_revision: string | null;
  source: "project-sync-scanner";
  readOnly: true;
  generated: true;
  project_id: string | null;
  project_name: string;
  node_types: StructureNodeType[];
  edge_types: StructureEdgeType[];
  scanner: {
    mode: "minimal-project-structure";
    llm: false;
    ast: false;
    callGraph: false;
    graphEditing: false;
  };
  nodes: StructureNode[];
  edges: StructureEdge[];
  summary: StructureSummary;
  ignored: {
    directories: string[];
  };
}

export interface StructureSummary {
  node_count: number;
  edge_count: number;
  nodes_by_type: Record<string, number>;
  edges_by_relation: Record<string, number>;
  project_root_node: "project.root";
}

export interface StructureDiff {
  added_nodes: string[];
  changed_nodes: string[];
  removed_nodes: string[];
  added_edges: string[];
  removed_edges: string[];
  unchanged_nodes: string[];
  counts: {
    added_nodes: number;
    changed_nodes: number;
    removed_nodes: number;
    added_edges: number;
    removed_edges: number;
    unchanged_nodes: number;
  };
}

export interface SyncFreshness {
  status: "missing" | "current" | "stale";
  changed: boolean;
  reason: string;
}

export interface SyncPlanResult {
  schema_version: 1;
  plan_version: string;
  generated_at: string;
  readOnly: true;
  mutates: false;
  project: {
    project_id: string | null;
    project_name: string;
  };
  state_revision: string;
  previous_revision: string | null;
  current_revision: string | null;
  planned_revision: string;
  changed: boolean;
  freshness: SyncFreshness;
  diff: StructureDiff;
  added_nodes: string[];
  changed_nodes: string[];
  removed_nodes: string[];
  added_edges: string[];
  removed_edges: string[];
  unchanged_nodes: string[];
  files: {
    index: string;
    status: string;
  };
  graph: StructureGraph;
  summary: StructureSummary;
  ignored: JsonObject;
  writes: [];
}

export interface SyncApplyResult {
  schema_version: 1;
  apply_version: string;
  generated_at: string;
  readOnly: false;
  mutates: true;
  applied: true;
  project: SyncPlanResult["project"];
  state_revision: string;
  previous_revision: string | null;
  current_revision: string | null;
  planned_revision: string;
  changed: boolean;
  diff: StructureDiff;
  added_nodes: string[];
  changed_nodes: string[];
  removed_nodes: string[];
  added_edges: string[];
  removed_edges: string[];
  unchanged_nodes: string[];
  files: SyncPlanResult["files"];
  graph: StructureGraph;
  summary: StructureSummary;
  status: SyncStatusFile;
  warnings: string[];
  identity?: IdentityRefreshResult;
}

export interface SyncStatusFile {
  schema_version: 1;
  status_version: string;
  generated_at: string;
  last_sync_at: string;
  project_id: string | null;
  project_name: string;
  state_revision: string;
  previous_revision: string | null;
  current_revision: string | null;
  planned_revision: string;
  diff: StructureDiff;
  added_nodes: string[];
  changed_nodes: string[];
  removed_nodes: string[];
  added_edges: string[];
  removed_edges: string[];
  unchanged_nodes: string[];
  changed: false;
  freshness: SyncFreshness;
  structure_file: string;
  status_file: string;
  identity_built_from_revision: string | null;
  identity_status: "current" | "stale";
  identity_file: string | null;
  identity_summary_file: string | null;
  identity_warning: string | null;
  readOnly: false;
  mutates: true;
}

export interface SyncStatusResult {
  schema_version: 1;
  status_version: string;
  generated_at: string;
  readOnly: true;
  mutates: false;
  project: SyncPlanResult["project"];
  files: SyncPlanResult["files"];
  last_sync_at: string | null;
  state_revision: string | null;
  current_revision: string | null;
  planned_revision: string;
  changed: boolean;
  freshness: SyncFreshness;
  diff: StructureDiff;
  added_nodes: string[];
  changed_nodes: string[];
  removed_nodes: string[];
  added_edges: string[];
  removed_edges: string[];
  unchanged_nodes: string[];
  identity_built_from_revision: string | null;
  identity_status: "current" | "stale";
  identity_warning: string | null;
  summary: StructureSummary;
  status: SyncStatusFile | null;
}

export interface IdentityRefreshResult {
  status: "current" | "stale";
  file: string | null;
  summary_file: string | null;
  state_revision: string | null;
  identity_built_from_revision: string | null;
  warning: string | null;
}

export interface DoctorDiagnostic {
  code: string;
  message: string;
  hint: string;
}

export interface DoctorResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  checks: string[];
  repairs: string[];
  diagnostics: {
    errors: DoctorDiagnostic[];
    warnings: DoctorDiagnostic[];
    repairs: DoctorDiagnostic[];
  };
  project_boundary: {
    project_id: string | null;
    project_name: string | null;
    errors: string[];
    warnings: string[];
    repairs: string[];
    diagnostics: {
      errors: DoctorDiagnostic[];
      warnings: DoctorDiagnostic[];
      repairs: DoctorDiagnostic[];
    };
  };
}

export type HookEvent = "session-start" | "stop";
export type HookReportEvent = HookEvent | "preview" | "status";
export type HookWarningCode =
  | "HOOK_CAPSULE_MISSING"
  | "HOOK_CAPSULE_STALE"
  | "HOOK_COMPLETED_QUEST_VERIFICATION_ANOMALY"
  | "HOOK_CONFIG_UNREADABLE"
  | "HOOK_DOCTOR_NOT_OK"
  | "HOOK_DOCTOR_WARNINGS"
  | "HOOK_GRAPH_PROVENANCE_WARNING"
  | "HOOK_GRAPH_WARNING"
  | "HOOK_IDENTITY_SUMMARY_MISSING"
  | "HOOK_IDENTITY_SUMMARY_STALE"
  | "HOOK_ORANGE_ROOT_MISSING"
  | "HOOK_PENDING_PROPOSALS"
  | "HOOK_PROJECT_BOUNDARY_WARNING"
  | "HOOK_PROJECT_ID_MISSING";

export interface HookWarning {
  code: HookWarningCode | `HOOK_${string}`;
  message: string;
  hint: string;
}

export interface HookReportStatus {
  directory: string;
  defaultWrite: false;
  written: boolean;
  file: string | null;
}

export interface HookProjectSnapshot {
  initialized: boolean;
  project_id: string | null;
  project_name: string;
  projectIdExists: boolean;
  orangeRootExists?: boolean;
  configExists?: boolean;
}

export interface HookPreviewResult {
  previewAvailable: true;
  installed: false;
  readOnly: true;
  autoMutation: false;
  project: HookProjectSnapshot;
  checks: Array<{
    id: string;
    label: string;
    target: string;
    readOnly?: true;
    current?: boolean;
  }>;
  localReport: HookReportStatus;
  warnings: HookWarning[];
}

export interface HookStatusResult {
  previewAvailable: true;
  installed: boolean;
  readOnly: true;
  autoMutation: false;
  supportedEvents: HookEvent[];
  unsupportedEvents: string[];
  runtimeAvailable: boolean;
  runtimeSupportedEvents: string[];
  bindingInstalled: boolean;
  bindingStatus: string;
  activationStatus: string;
  lastHeartbeat: string | null;
  localReport: HookReportStatus;
  project: HookProjectSnapshot;
  warnings: HookWarning[];
}

export interface HookFreshnessSummary {
  path: string;
  exists: boolean;
  mtimeMs: number | null;
  latestSourceMtimeMs: number | null;
  latestSourcePath: string | null;
  stale: boolean;
  staleReason: string | null;
}

export interface HookRunResult {
  event: HookEvent;
  installed: false;
  readOnly: true;
  autoMutation: false;
  report: HookReportStatus;
  observations: JsonObject;
  warnings: HookWarning[];
  hints: string[];
}

export interface HookReportPayload extends OriginMetadata {
  schema_version: 1;
  report_kind: string;
  generated_at: string;
  project_id: string | null;
  project_name: string;
  event: HookReportEvent;
  readOnly: true;
  autoMutation: false;
  warnings: HookWarning[];
  summaries: {
    doctor: {
      ok: boolean;
      checkCount: number;
      errorCount: number;
      warningCount: number;
      repairCount: number;
      diagnosticCodes: string[];
    };
    graph: {
      acceptedMemoryNodeCount: number;
      warningCount: number;
      warnings: HookWarning[];
    };
    identity: HookFreshnessSummary & {
      generatedAt: string | null;
      acceptedMemoryNodes: number | null;
      projectBoundaryActive: boolean | null;
    };
    capsule: HookFreshnessSummary;
  };
  recommended_commands: string[];
}

export type McpTokenImpact = "low" | "medium" | "high";
export type McpSuggestionConfidence = "low" | "medium" | "high";

export interface McpCatalogEntry {
  id: string;
  name: string;
  category: string;
  use_cases: string[];
  useful_when: string[];
  risks: string[];
  token_impact: McpTokenImpact;
  install_hint: string;
  persistent_use_policy: string;
}

export interface McpProposalCard {
  tool: {
    id: string;
    name: string;
    category: string;
  };
  why_now: string;
  expected_benefit: string;
  scope: string;
  risk: string;
  token_impact: McpTokenImpact;
  install_command: string;
  use_once_or_persist: string;
  requires_user_approval: true;
  not_executed: true;
  config_mutation: false;
}

export interface McpSuggestion {
  mcp_id: string;
  score: number;
  confidence: McpSuggestionConfidence;
  matched_signals: Array<{
    signal: string;
    why: string;
  }>;
  why_now: string;
  requires_user_approval: true;
  tool: McpCatalogEntry;
  proposal: McpProposalCard;
}

export interface McpAdvisorResult {
  readOnly: true;
  autoInstall: false;
  autoRun: false;
  configMutation: false;
  projectMemoryMutation: false;
  source_quest_id: string | null;
  project: {
    project_id: string | null;
    project_name: string;
  };
  input: {
    query: string;
    quest: {
      id: string;
      title: string;
      status: QuestStatus;
      layer: RouteLayer;
      output_contract: OutputContract;
      verification_status: QuestVerificationStatus;
    } | null;
  };
  state: {
    doctor: JsonObject | null;
    graph: JsonObject | null;
    hook: JsonObject | null;
    warnings: string[];
  };
  no_suggestion_reason: string | null;
  suggested_next_step: string | null;
  suggestions: McpSuggestion[];
  proposal_cards: McpProposalCard[];
}

export type GrowthLevel = "seed" | "sprout" | "branch" | "canopy";
export type GrowthConfidence = "low" | "medium" | "high";

export interface GrowthEvidenceSource {
  quest_id: string | null;
  node_id: string | null;
  node_type: string | null;
  route_layer: string | null;
  hook_warning_code: string | null;
  mcp_signal_id: string | null;
}

export interface GrowthEvidenceItem {
  id: string;
  label: string;
  source: GrowthEvidenceSource;
  matched_signals: string[];
}

export interface GrowthBoundaryFlags {
  auto_role_creation: false;
  mcp_auto_install: false;
  mcp_auto_run: false;
  hook_policy_auto_change: false;
  subagent_auto_run: false;
  project_memory_auto_mutation: false;
  config_auto_mutation: false;
  graph_node_auto_creation: false;
  workflow_enforcement: false;
}

export interface GrowthStatus {
  readOnly: true;
  deterministic: true;
  autoUnlock: false;
  autoMutation: false;
  projectMemoryMutation: false;
  configMutation: false;
  project: {
    project_id: string | null;
    project_name: string;
  };
  project_id: string | null;
  project_name: string;
  acceptedMemoryNodes: number;
  nodeTypeDistribution: Record<string, number>;
  nodeTypeDiversity: number;
  dominantAcceptedNodeType: {
    nodeType: string;
    count: number;
  } | null;
  routeLayerDistribution: Record<string, number>;
  questLayerDistribution: Record<string, number>;
  questVerification: {
    completed: number;
    verified: number;
    unverified: number;
    verifiedRatio: number;
    unverifiedRatio: number;
  };
  pendingMemoryProposals: number;
  doctorOk: boolean;
  projectBoundaryActive: boolean;
  repeatedEvidenceCount: number;
  hookWarningSummary: {
    readOnly: true;
    hookRun: false;
    autoMutation: false;
    warningCount: number;
    warnings: HookWarning[];
    doctorWarningCount: number;
    doctorErrorCount: number;
    diagnosticCodes: string[];
    summary: string;
  };
  mcpAdvisorSignals: {
    readOnly: true;
    mcpCall: false;
    networkCall: false;
    autoInstall: false;
    autoRun: false;
    configMutation: false;
    projectMemoryMutation: false;
    signalCount: number;
    signals: string[];
    summary: string;
  };
  growthLevel: GrowthLevel;
  growthLevelReason: string;
  growthLevelDescription: string;
  growthLevelUnlocks: false;
  warnings: string[];
  boundaries: GrowthBoundaryFlags;
}

export interface GrowthCandidate {
  id: string;
  title: string;
  reason: string;
  score: number;
  evidence_count: number;
  matched_signals: string[];
  evidence: GrowthEvidenceItem[];
  confidence: GrowthConfidence;
  suggested_next_step: string;
  auto_unlock: false;
  requires_user_approval: true;
}

export interface GrowthSuggestionResult {
  readOnly: true;
  deterministic: true;
  llmCall: false;
  networkCall: false;
  mcpCall: false;
  autoUnlock: false;
  projectMemoryMutation: false;
  configMutation: false;
  project: {
    project_id: string | null;
    project_name: string;
  };
  growthLevel: GrowthLevel;
  status: GrowthStatus;
  candidates: GrowthCandidate[];
  no_candidate_reason: string | null;
  boundaries: GrowthBoundaryFlags;
}

export interface GrowthExplainResult {
  readOnly: true;
  deterministic: true;
  llmCall: false;
  networkCall: false;
  mcpCall: false;
  autoUnlock: false;
  projectMemoryMutation: false;
  configMutation: false;
  project: {
    project_id: string | null;
    project_name: string;
  };
  growthLevel: GrowthLevel;
  candidates: GrowthCandidate[];
  explanations: Array<{
    candidate_id: string;
    title: string;
    rule_id: string;
    reason: string;
    score: number;
    evidence_count: number;
    matched_signals: string[];
    evidence: GrowthEvidenceItem[];
    confidence: GrowthConfidence;
    why_suggested: string;
    auto_unlock: false;
    requires_user_approval: true;
  }>;
  rules: Array<{
    id: string;
    description: string;
    threshold: string;
  }>;
  no_candidate_reason: string | null;
  boundaries: GrowthBoundaryFlags;
}

export type EvalMetricStatus = "good" | "needs-attention" | "insufficient-data";

export interface EvalMetric {
  id: string;
  label: string;
  value: JsonValue;
  status: EvalMetricStatus;
  source: string;
  explanation: string;
  limitation: string;
  unavailable: boolean;
  unavailable_reason: string | null;
}

export interface EvalReportSection {
  title: string;
  status: EvalMetricStatus;
  reason: string;
  evidence_count: number;
  summary: string;
  items: string[];
  metrics: string[];
}

export interface EvalReportSummary {
  project_id: string | null;
  project_name: string;
  generated_at: string;
  report_mode: "local-only";
  total_sections: number;
  needs_attention_count: number;
  insufficient_data_count: number;
  no_telemetry: true;
  no_network: true;
  no_llm_judge: true;
}

export interface EvalUnavailableMetric {
  id: string;
  label: string;
  status: EvalMetricStatus;
  source: string;
  value: JsonValue;
  unavailable: true;
  unavailable_reason: string | null;
  limitation: string;
}

export interface EvalKnownGap {
  id: string;
  status: EvalMetricStatus;
  reason: string;
  source: string;
  limitation: string;
  future_target: string;
}

export interface EvalBoundaryFlags {
  local_only: true;
  external_telemetry: false;
  network_upload: false;
  api_call: false;
  llm_judge_call: false;
  mcp_call: false;
  hook_auto_run: false;
  subagent_run: false;
  auto_planner_loop: false;
  project_memory_auto_mutation: false;
  config_auto_mutation: false;
  quest_auto_creation: false;
  proposal_auto_creation: false;
  graph_auto_creation: false;
  token_savings_estimation: false;
  success_rate_improvement_claim: false;
}

export interface EvalLocalReportStatus {
  directory: string;
  defaultWrite: false;
  written: boolean;
  file: string | null;
  format?: "markdown";
}

export interface EvalSnapshot extends OriginMetadata {
  schema_version: 2;
  generated_at: string;
  readOnly: true;
  deterministic: true;
  localOnly: true;
  telemetry: false;
  networkCall: false;
  llmJudge: false;
  mcpCall: false;
  hookRun: false;
  autoMutation: false;
  projectMemoryMutation: false;
  configMutation: false;
  project: {
    project_id: string | null;
    project_name: string;
  };
  project_id: string | null;
  project_name: string;
  quests: {
    total: number;
    active: number;
    completed: number;
    verified: number;
    unverified: number;
    pendingVerification: number;
    status: EvalMetricStatus;
  };
  memoryProposals: {
    total: number;
    accepted: number;
    rejected: number;
    pending: number;
    status: EvalMetricStatus;
  };
  graph: {
    acceptedNodeCount: number;
    warningCount: number;
    warnings: string[];
    status: EvalMetricStatus;
  };
  doctor: {
    ok: boolean;
    checkCount: number;
    errorCount: number;
    warningCount: number;
    repairCount: number;
    projectBoundaryErrorCount: number;
    projectBoundaryWarningCount: number;
    diagnosticCodes: string[];
    status: EvalMetricStatus;
  };
  hookWarnings: {
    status: EvalMetricStatus;
    source: string;
    sourceFile: string | null;
    latestReportGeneratedAt: string | null;
    hookRun: false;
    warningCount: number;
    warnings: HookWarning[];
    summary: string;
  };
  mcpAdvisor: {
    status: EvalMetricStatus;
    available: boolean;
    catalogCount: number;
    signalCount: number;
    signals: string[];
    summary: string;
    readOnly: true;
    mcpCall: false;
    networkCall: false;
    autoInstall: false;
    autoRun: false;
    configMutation: false;
    projectMemoryMutation: false;
  };
  growth: {
    status: EvalMetricStatus;
    candidateCount: number;
    growthLevel: GrowthLevel;
    noCandidateReason: string | null;
    autoUnlock: false;
    projectMemoryMutation: false;
    configMutation: false;
    mcpCall: false;
    networkCall: false;
    llmCall: false;
    summary: string | null;
  };
  adapter: {
    status: EvalMetricStatus;
    recipeCount: number;
    recipeIds: string[];
    expectedContractVersion: AdapterContractVersion;
    dryRunOnly: true;
    summary: string;
  };
  identity: {
    status: EvalMetricStatus;
    summaryExists: boolean;
    htmlExists: boolean;
    summaryFile: string;
    htmlFile: string;
    generatedAt: string | null;
    acceptedMemoryNodes: number | null;
    projectBoundaryActive: boolean | null;
  };
  reportPolicy: EvalLocalReportStatus;
  boundaries: EvalBoundaryFlags;
  metrics: EvalMetric[];
  unavailableMetrics: EvalMetric[];
}

export interface EvalReport extends OriginMetadata {
  report_id: string;
  schema_version: 2;
  report_kind: "eval-report";
  generated_at: string;
  format: "markdown";
  readOnly: true;
  localOnly: true;
  local_only: true;
  telemetry: false;
  networkCall: false;
  network_upload: false;
  llmJudge: false;
  llm_judge: false;
  mcpCall: false;
  hookRun: false;
  autoMutation: false;
  projectMemoryMutation: false;
  configMutation: false;
  project: EvalSnapshot["project"];
  project_id: string | null;
  project_name: string;
  summary: EvalReportSummary;
  snapshot: EvalSnapshot;
  sections: EvalReportSection[];
  known_gaps: EvalKnownGap[];
  unavailable_metrics: EvalUnavailableMetric[];
  localReport: EvalLocalReportStatus;
  boundaries: EvalBoundaryFlags;
  markdown: string;
}

export interface EvalExplainResult extends OriginMetadata {
  schema_version: 2;
  generated_at: string;
  readOnly: true;
  deterministic: true;
  localOnly: true;
  telemetry: false;
  networkCall: false;
  llmJudge: false;
  mcpCall: false;
  hookRun: false;
  autoMutation: false;
  projectMemoryMutation: false;
  configMutation: false;
  project: EvalSnapshot["project"];
  project_id: string | null;
  project_name: string;
  metrics: Array<{
    id: string;
    label: string;
    status: EvalMetricStatus;
    value: JsonValue;
    source: string;
    explanation: string;
    limitation: string;
    unavailable: boolean;
    unavailable_reason: string | null;
  }>;
  boundaries: EvalBoundaryFlags;
  notes: string[];
}

export interface IdentitySourceGraphNode extends GraphIndexEntry {
  type: MemoryNodeType;
  label: string;
  generated_by: string;
  generator_package: string;
  generator_version: string;
  source_repository: string;
  official_package: string;
  candidate_memory_summary: string;
  degree: number;
  readOnly: true;
  source_path: string;
  scope_paths: string[];
  sourceOfTruth: true;
  displayOnly: false;
  derived: false;
  graphKind: "memory";
  mapping_status?: "mapped" | "unmapped" | "orphaned";
  mapped_structure_node_id?: string | null;
  mapped_structure_node_path?: string | null;
  mapping_reason?: string;
  mapping_candidates?: string[];
  kind?: string;
  confidence?: string;
  origin?: string;
  status?: string;
}

export interface IdentitySourceGraphEdge {
  id: string;
  from: string;
  to: string;
  relation: string;
  confidence: number | null;
  readOnly: true;
  sourceOfTruth: true;
  displayOnly: false;
  derived: false;
}

export type IdentityVisualNodeType =
  | "project"
  | "module"
  | "domain"
  | "component"
  | "test"
  | "document"
  | "infrastructure"
  | "datastore"
  | "memory"
  | "memoryCluster";

export interface IdentityVisualGraphNode {
  id: string;
  type: IdentityVisualNodeType;
  visualType: IdentityVisualNodeType;
  graphKind: string;
  label: string;
  color: string;
  displayOnly: boolean;
  derived: boolean;
  readOnly: true;
  sourceMemoryIds: string[];
  importance: number;
  degree: number;
  node_type?: MemoryNodeType;
  title?: string;
  project_id?: string | null;
  project_name?: string;
  candidate_memory?: string;
  candidate_memory_summary?: string;
  summary?: string;
  tags?: string[];
  keywords?: string[];
  concept?: string;
  category?: string;
  source_quest?: string;
  source_proposal?: string;
  source_path?: string;
  scope_paths?: string[];
  mapping_status?: "mapped" | "unmapped" | "orphaned";
  mapped_structure_node_id?: string | null;
  mapped_structure_node_path?: string | null;
  mapping_reason?: string;
  mapping_candidates?: string[];
  structurePath?: string;
  structureRole?: string;
  source?: string;
  layoutRole?: string;
  x?: number;
  y?: number;
  layoutCluster?: string;
  layoutClusterLabel?: string;
  layoutComputedAt?: "build-time";
}

export interface IdentityVisualGraphEdge {
  id: string;
  from: string;
  to: string;
  relation: string;
  source: string;
  strength: number;
  distance: number;
  displayOnly: boolean;
  derived: boolean;
  readOnly: true;
}

export interface IdentityGraph {
  schemaVersion: string;
  readOnly: true;
  editingSupported: false;
  displayOnly: true;
  source: "structure-plus-accepted-memory";
  project_id: string | null;
  project_name: string;
  seed: string;
  layout: "deterministic-seeded-force" | "deterministic-radial-cluster-v2";
  nodeTypeColors: Record<string, string>;
  nodes: IdentityVisualGraphNode[];
  edges: IdentityVisualGraphEdge[];
}

export interface MemoryMappingSummary {
  total: number;
  mapped: number;
  unmapped: number;
  orphaned: number;
  entries: Array<{
    memory_node_id: string;
    status: "mapped" | "unmapped" | "orphaned";
    structure_node_id: string | null;
    structure_node_path: string | null;
    candidates: string[];
    reason: string;
  }>;
}

export interface IdentitySummary extends OriginMetadata {
  project_id: string;
  project_name: string;
  projectId: string;
  projectName: string;
  generatedAt: string;
  activeCount: number;
  completedCount: number;
  verifiedCount: number;
  unverifiedCount: number;
  routeDistribution: Record<string, number>;
  pendingMemoryProposals: number;
  pendingMemoryProposalsWithWarnings: number;
  acceptedMemoryProposals: number;
  rejectedMemoryProposals: number;
  acceptedMemoryNodes: number;
  projectBoundaryActive: boolean;
  topProposalNodeTypes: Array<{ nodeType: string; count: number }>;
  structureGraph: StructureGraph;
  memoryGraph: IdentitySummary["sourceGraph"];
  identityGraph: IdentityGraph;
  memoryMapping: MemoryMappingSummary;
  memory_mapping: MemoryMappingSummary;
  graphPreview: {
    schemaVersion: string;
    readOnly: true;
    editingSupported: false;
    acceptedMemoryNodes: number;
    project_id: string | null;
    nodeTypeColors: Partial<Record<MemoryNodeType, string>>;
    nodeTypeDistribution: Partial<Record<MemoryNodeType, number>>;
    nodes: Array<GraphIndexEntry & {
      type: MemoryNodeType;
      label: string;
      candidate_memory_summary: string;
      degree: number;
      readOnly: true;
      kind?: string;
      confidence?: string;
      origin?: string;
      status?: string;
    }>;
    edges: Array<{
      id: string;
      from: string;
      to: string;
      relation: string;
      source: string;
      readOnly: true;
    }>;
    sourceLinks: Array<{
      node_id: string;
      node_type: MemoryNodeType;
      title: string;
      source_quest: string;
      source_proposal: string;
      source_path: string;
      scope_paths: string[];
      accepted_at: string;
    }>;
  };
  sourceGraph: {
    schemaVersion: string;
    readOnly: true;
    editingSupported: false;
    project_id: string | null;
    project_name: string;
    source: ".orange-hyper/graph";
    nodeBoundary: "accepted-memory-nodes-only";
    edgeBoundary: "persisted-accepted-memory-edges-only";
    nodeTypeColors: Partial<Record<MemoryNodeType, string>>;
    nodeTypeDistribution: Partial<Record<MemoryNodeType, number>>;
    acceptedMemoryNodes: number;
    memory_mapping?: MemoryMappingSummary;
    nodes: IdentitySourceGraphNode[];
    edges: IdentitySourceGraphEdge[];
  };
  visualGraph: {
    schemaVersion: string;
    readOnly: true;
    editingSupported: false;
    displayOnly: true;
    source: "identity-html-visual-only" | "structure-plus-accepted-memory";
    project_id: string | null;
    project_name: string;
    seed: string;
    layout: "deterministic-seeded-force" | "deterministic-radial-cluster-v2";
    nodeTypeColors: Record<string, string>;
    nodes: IdentityVisualGraphNode[];
    edges: IdentityVisualGraphEdge[];
  };
  growthPreview: {
    readOnly: true;
    autoUnlock: false;
    growthLevel: GrowthLevel;
    growthLevelReason: string;
    growthLevelDescription: string;
    acceptedMemoryNodes: number;
    nodeTypeDistribution: Record<string, number>;
    nodeTypeDiversity: number;
    dominantAcceptedNodeType: GrowthStatus["dominantAcceptedNodeType"];
    questVerification: GrowthStatus["questVerification"];
    pendingMemoryProposals: number;
    hookWarningCount: number;
    mcpAdvisorSignalCount: number;
    candidateCount: number;
    topCandidates: Array<{
      id: string;
      title: string;
      score: number;
      evidence_count: number;
      confidence: GrowthConfidence;
      suggested_next_step: string;
      auto_unlock: false;
      requires_user_approval: true;
    }>;
    growthConfidenceSummary: string;
    noAutomaticUnlocks: "No automatic unlocks";
    suggestedCommand: string;
    boundaries: GrowthBoundaryFlags;
  };
  graphWarnings: string[];
  state_revision: string | null;
  identity_built_from_revision: string | null;
  identity_status: "current" | "stale";
  structure_status: {
    last_sync_at: string | null;
    state_revision: string | null;
    identity_status: "current" | "stale";
  } | null;
  origin: OriginMetadata;
  statusMessages: string[];
}

export interface IdentityBuildResult {
  filePath: string;
  summaryFilePath: string;
  html: string;
  summary: IdentitySummary;
}

export interface MemoryProposalValidationResult {
  proposal: MemoryProposalDocument;
  validation: {
    errors: string[];
    warnings: string[];
  };
}

export interface MemoryProposalRevisionResult extends MemoryProposalValidationResult {
  revisions: string[];
}

export interface MemoryAcceptResult {
  proposal: MemoryProposalDocument;
  node: AcceptedMemoryNodeDocument;
}
