export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export type AdapterContractVersion = "0.1";

export type CommandId =
  | "capsule.build"
  | "doctor.run"
  | "graph.list"
  | "graph.show"
  | "graph.search"
  | "graph.rebuildIndex"
  | "hook.preview"
  | "hook.status"
  | "hook.runSessionStart"
  | "hook.runStop"
  | "identity.build"
  | "mcp.list"
  | "mcp.show"
  | "mcp.suggest"
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
  source_proposal_hash: string;
  title?: string;
  provenance: {
    project_id: string;
    project_name: string;
    proposal_id: string;
    source_proposal: string;
    source_quest: string;
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
  installed: false;
  readOnly: true;
  autoMutation: false;
  supportedEvents: HookEvent[];
  unsupportedEvents: string[];
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
}

export interface McpSuggestion {
  mcp_id: string;
  score: number;
  matched_signals: Array<{
    signal: string;
    why: string;
  }>;
  tool: McpCatalogEntry;
  proposal: McpProposalCard;
}

export interface McpAdvisorResult {
  readOnly: true;
  autoInstall: false;
  autoRun: false;
  configMutation: false;
  projectMemoryMutation: false;
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
  suggestions: McpSuggestion[];
  proposal_cards: McpProposalCard[];
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
  graphPreview: {
    readOnly: true;
    editingSupported: false;
    acceptedMemoryNodes: number;
    nodeTypeDistribution: Partial<Record<MemoryNodeType, number>>;
    nodes: Array<GraphIndexEntry & {
      kind?: string;
      confidence?: string;
      origin?: string;
      status?: string;
    }>;
    sourceLinks: Array<{
      node_id: string;
      node_type: MemoryNodeType;
      title: string;
      source_quest: string;
      source_proposal: string;
      accepted_at: string;
    }>;
  };
  graphWarnings: string[];
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
