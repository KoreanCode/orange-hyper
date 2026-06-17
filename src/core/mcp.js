import { readProjectIdentity, requireInitialized } from "./config.js";
import { runDoctor } from "./doctor.js";
import { listGraphNodes } from "./graph.js";
import { hookStatus } from "./hook.js";
import { findQuest } from "./quest.js";

/**
 * @type {import("./types.d.ts").McpCatalogEntry[]}
 */
export const MCP_CATALOG = [
  {
    id: "context7",
    name: "Context7",
    category: "documentation",
    use_cases: [
      "version-specific library documentation lookup",
      "framework API freshness checks",
      "migration or deprecation review"
    ],
    useful_when: [
      "framework/library freshness matters",
      "the task depends on current API examples",
      "hallucinated or stale library usage would be costly"
    ],
    risks: [
      "external documentation context can increase prompt size",
      "documentation results still need user/model review before code changes"
    ],
    token_impact: "medium",
    install_hint: "codex mcp add context7 -- npx -y @upstash/context7-mcp",
    persistent_use_policy: "Use once by default. Persist only after repeated docs-freshness work and explicit user approval."
  },
  {
    id: "github",
    name: "GitHub",
    category: "repository",
    use_cases: [
      "issue and pull request context",
      "repository discussion or review context",
      "linked commit or branch investigation"
    ],
    useful_when: [
      "repo issue/PR context matters",
      "the task references external GitHub threads",
      "review comments or issue decisions are needed"
    ],
    risks: [
      "repository metadata may include private discussion or user data",
      "credentials must stay in the MCP client or provider, not Orange Hyper memory"
    ],
    token_impact: "medium",
    install_hint: "codex mcp add github -- <github-mcp-server-command>",
    persistent_use_policy: "Use once for a specific issue or PR. Persist only for repositories where the user explicitly approves ongoing access."
  },
  {
    id: "sentry",
    name: "Sentry",
    category: "observability",
    use_cases: [
      "runtime error and incident context",
      "stack trace and release health investigation",
      "production regression triage"
    ],
    useful_when: [
      "runtime incident/error context exists",
      "stack traces or event samples would change the fix",
      "production release health matters"
    ],
    risks: [
      "incident data can include sensitive runtime details",
      "high-volume traces can consume many tokens"
    ],
    token_impact: "high",
    install_hint: "codex mcp add sentry -- <sentry-mcp-server-command>",
    persistent_use_policy: "Use once for a bounded incident. Persist only after explicit approval for a specific project and read-only scope."
  },
  {
    id: "linear",
    name: "Linear",
    category: "product",
    use_cases: [
      "product issue and work item context",
      "roadmap or backlog clarification",
      "task tracking and acceptance criteria lookup"
    ],
    useful_when: [
      "product/task tracking context is needed",
      "acceptance criteria live outside the repo",
      "work item state changes the implementation scope"
    ],
    risks: [
      "work items may include private roadmap or customer context",
      "task tracker context should not be copied into project memory wholesale"
    ],
    token_impact: "medium",
    install_hint: "codex mcp add linear -- <linear-mcp-server-command>",
    persistent_use_policy: "Use once for a specific work item. Persist only after repeated product-tracking work and explicit user approval."
  }
];

const CATALOG_BY_ID = new Map(MCP_CATALOG.map((entry) => [entry.id, entry]));

const MATCHERS = {
  context7: [
    {
      pattern: /\b(api|breaking|deprecat(?:e|ed|ion)?|docs?|documentation|framework|fresh|latest|librar(?:y|ies)?|migration|version)\b/i,
      signal: "framework_or_library_freshness",
      why: "Framework or library freshness appears important.",
      weight: 25
    },
    {
      pattern: /Spring(?:\s+Security)?|React|Next\.?js|Vue|Svelte|Django|Rails|FastAPI|Kubernetes|Terraform/i,
      signal: "known_framework_or_library",
      why: "The request names a framework, library, or platform where version-specific docs can matter.",
      weight: 25
    },
    {
      pattern: /최신|문서|버전|라이브러리|프레임워크|framework|마이그레이션|사용법|API/i,
      signal: "korean_docs_or_version_request",
      why: "The request asks for latest docs, versions, or API usage.",
      weight: 25
    }
  ],
  github: [
    {
      pattern: /\b(github|issue|pr|pull request|repo|repository|review comment|commit|branch)\b/i,
      signal: "repo_issue_or_pr_context",
      why: "Repository issue, PR, commit, or review context appears relevant.",
      weight: 25
    },
    {
      pattern: /이슈|풀리퀘스트|리뷰\s*코멘트|레포|저장소|브랜치|커밋/i,
      signal: "korean_repo_context",
      why: "The request mentions issue, PR, repository, branch, or commit context.",
      weight: 25
    }
  ],
  sentry: [
    {
      pattern: /\b(crash|error|exception|incident|production|runtime|sentry|stack ?trace|traceback)\b/i,
      signal: "runtime_incident_or_error",
      why: "Runtime error or incident context appears relevant.",
      weight: 25
    },
    {
      pattern: /장애|인시던트|런타임|프로덕션|스택\s*트레이스|예외|에러|오류/i,
      signal: "korean_runtime_incident",
      why: "The request mentions runtime errors, incidents, or stack traces.",
      weight: 25
    }
  ],
  linear: [
    {
      pattern: /\b(acceptance criteria|backlog|linear|product|roadmap|task|task tracking|ticket|work item)\b/i,
      signal: "product_task_tracking",
      why: "Product work item or task tracking context appears relevant.",
      weight: 25
    },
    {
      pattern: /리니어|티켓|작업\s*항목|프로덕트|제품|기획|로드맵|백로그|요구사항|인수\s*조건/i,
      signal: "korean_product_tracking",
      why: "The request mentions product, ticket, roadmap, or acceptance-criteria context.",
      weight: 25
    }
  ]
};

const NO_SUGGESTION_REASON = "No deterministic MCP catalog signal matched the query or Quest context strongly enough for a proposal.";
const NO_SUGGESTION_NEXT_STEP = "Continue without MCP, or rerun with a specific documentation, repository, incident, or product-tracker need.";

const PROPOSAL_DEFAULTS = {
  context7: {
    expected_benefit: "Version-specific documentation can reduce stale API assumptions before code changes.",
    scope: "read-only documentation lookup for the named framework, library, or API",
    risk: "External docs context may add tokens and should be summarized before use.",
    use_once_or_persist: "use_once"
  },
  github: {
    expected_benefit: "Issue, PR, and repository context can ground the task in the current upstream discussion.",
    scope: "read-only lookup for the specific issue, PR, repository, branch, or review thread",
    risk: "Repository context can include private discussion; do not copy it into project memory without a separate proposal.",
    use_once_or_persist: "use_once"
  },
  sentry: {
    expected_benefit: "Runtime event context can connect the fix to real stack traces, releases, and affected paths.",
    scope: "read-only incident or error lookup for the specific runtime problem",
    risk: "Incident payloads can include sensitive runtime details and high token volume.",
    use_once_or_persist: "use_once"
  },
  linear: {
    expected_benefit: "Work item context can clarify product scope, acceptance criteria, and priority.",
    scope: "read-only lookup for the specific Linear issue or product work item",
    risk: "Product tracker context can include private roadmap or customer details.",
    use_once_or_persist: "use_once"
  }
};

export function listMcpCatalog() {
  return MCP_CATALOG.map(cloneEntry);
}

/**
 * @returns {import("./types.d.ts").McpCatalogEntry}
 */
export function showMcpCatalogEntry(id) {
  const normalized = normalizeMcpId(id);
  const entry = CATALOG_BY_ID.get(normalized);
  if (!entry) {
    throw unknownMcpIdError(id);
  }
  return cloneEntry(entry);
}

/**
 * @returns {import("./types.d.ts").McpAdvisorResult}
 */
export function suggestMcp(cwd = process.cwd(), options = {}) {
  requireInitialized(cwd);
  const query = String(options.query || "").trim();
  const quest = options.quest ? findQuest(cwd, options.quest) : null;
  const questText = quest ? textFromQuest(quest) : "";
  if (!query && !questText) {
    throw new Error("MCP suggest requires --query <text> or --quest <quest-id>.");
  }

  const project = safeProject(cwd);
  const state = readAdvisorState(cwd);
  const inputText = [query, questText].filter(Boolean).join("\n");
  const ranked = MCP_CATALOG
    .map((entry, index) => scoreEntry(entry, inputText, index))
    .filter((item) => item.score > 0)
    .sort((left, right) =>
      right.score - left.score ||
      left.catalog_index - right.catalog_index ||
      left.entry.id.localeCompare(right.entry.id)
    );
  const suggestions = ranked.map((item) => suggestionFromScore(item.entry, item.score, item.confidence, item.matched_signals));
  const noSuggestion = suggestions.length === 0;

  return {
    readOnly: true,
    autoInstall: false,
    autoRun: false,
    configMutation: false,
    projectMemoryMutation: false,
    source_quest_id: quest ? quest.data.id : null,
    project,
    input: {
      query,
      quest: quest ? {
        id: quest.data.id,
        title: quest.data.title,
        status: quest.data.status,
        layer: quest.data.layer,
        output_contract: quest.data.output_contract,
        verification_status: quest.data.verification_status
      } : null
    },
    state,
    no_suggestion_reason: noSuggestion ? NO_SUGGESTION_REASON : null,
    suggested_next_step: noSuggestion ? NO_SUGGESTION_NEXT_STEP : null,
    suggestions,
    proposal_cards: suggestions.map((suggestion) => suggestion.proposal)
  };
}

function normalizeMcpId(id) {
  const normalized = String(id || "").trim().toLowerCase();
  if (!normalized) {
    throw new Error("MCP id is required.");
  }
  return normalized;
}

function unknownMcpIdError(id) {
  const error = /** @type {Error & { orangeCode?: string }} */ (new Error(`Unknown MCP id: ${id}. Known MCP ids: ${MCP_CATALOG.map((entry) => entry.id).join(", ")}.`));
  error.orangeCode = "MCP_UNKNOWN_ID";
  return error;
}

/**
 * @param {import("./types.d.ts").McpCatalogEntry} entry
 * @returns {import("./types.d.ts").McpCatalogEntry}
 */
function cloneEntry(entry) {
  return {
    ...entry,
    use_cases: [...entry.use_cases],
    useful_when: [...entry.useful_when],
    risks: [...entry.risks]
  };
}

function textFromQuest(quest) {
  const data = quest.data || {};
  const request = extractMarkdownSection(quest.body || "", "Request");
  const notes = extractMarkdownSection(quest.body || "", "Notes");
  return [
    data.title,
    request,
    ...(Array.isArray(data.constraints) ? data.constraints : []),
    notes
  ].filter(Boolean).join("\n");
}

function extractMarkdownSection(body, heading) {
  const lines = String(body || "").split(/\r?\n/);
  const normalized = String(heading || "").trim().toLowerCase();
  const start = lines.findIndex((line) => {
    const match = line.match(/^##\s+(.+?)\s*$/);
    return match && match[1].trim().toLowerCase() === normalized;
  });
  if (start === -1) {
    return "";
  }
  const collected = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s+/.test(line)) {
      break;
    }
    collected.push(line);
  }
  return collected.join("\n").trim();
}

function safeProject(cwd) {
  try {
    const project = readProjectIdentity(cwd);
    return {
      project_id: project.project_id || null,
      project_name: project.project_name || ""
    };
  } catch {
    return {
      project_id: null,
      project_name: ""
    };
  }
}

function readAdvisorState(cwd) {
  const warnings = [];
  const doctor = safeRead("doctor", warnings, () => {
    const result = runDoctor(cwd);
    return {
      ok: result.ok,
      checkCount: result.checks.length,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      projectBoundaryErrorCount: result.project_boundary.errors.length,
      projectBoundaryWarningCount: result.project_boundary.warnings.length,
      diagnosticCodes: [
        ...result.diagnostics.errors,
        ...result.diagnostics.warnings
      ].map((item) => item.code)
    };
  });
  const graph = safeRead("graph", warnings, () => {
    const result = listGraphNodes(cwd);
    return {
      acceptedMemoryNodeCount: result.nodes.length,
      warningCount: result.warnings.length,
      warnings: result.warnings
    };
  });
  const hook = safeRead("hook", warnings, () => {
    const result = hookStatus(cwd);
    return {
      previewAvailable: result.previewAvailable,
      installed: result.installed,
      readOnly: result.readOnly,
      autoMutation: result.autoMutation,
      supportedEvents: result.supportedEvents,
      warningCount: result.warnings.length
    };
  });
  return {
    doctor,
    graph,
    hook,
    warnings
  };
}

function safeRead(label, warnings, read) {
  try {
    return read();
  } catch (error) {
    warnings.push(`${label} state could not be read: ${error.message}`);
    return null;
  }
}

function scoreEntry(entry, text, catalogIndex) {
  const matchers = MATCHERS[entry.id] || [];
  const matched = [];
  for (const matcher of matchers) {
    if (matcher.pattern.test(text)) {
      matched.push({
        signal: matcher.signal,
        why: matcher.why
      });
    }
  }
  const score = matched.reduce((total, match) => {
    const matcher = matchers.find((item) => item.signal === match.signal);
    return total + (matcher?.weight || 0);
  }, 0);
  return {
    entry,
    catalog_index: catalogIndex,
    score,
    confidence: confidenceForScore(score),
    matched_signals: matched
  };
}

/**
 * @param {import("./types.d.ts").McpCatalogEntry} entry
 * @returns {import("./types.d.ts").McpSuggestion}
 */
function suggestionFromScore(entry, score, confidence, matchedSignals) {
  const whyNow = matchedSignals[0]?.why || entry.useful_when[0];
  return {
    mcp_id: entry.id,
    score,
    confidence,
    matched_signals: matchedSignals,
    why_now: whyNow,
    requires_user_approval: true,
    tool: cloneEntry(entry),
    proposal: proposalCardFor(entry, whyNow)
  };
}

function confidenceForScore(score) {
  if (score >= 75) {
    return "high";
  }
  if (score >= 50) {
    return "medium";
  }
  return "low";
}

/**
 * @param {import("./types.d.ts").McpCatalogEntry} entry
 * @returns {import("./types.d.ts").McpProposalCard}
 */
function proposalCardFor(entry, whyNow) {
  const defaults = PROPOSAL_DEFAULTS[entry.id];
  return {
    tool: {
      id: entry.id,
      name: entry.name,
      category: entry.category
    },
    why_now: whyNow,
    expected_benefit: defaults.expected_benefit,
    scope: defaults.scope,
    risk: defaults.risk,
    token_impact: entry.token_impact,
    install_command: entry.install_hint,
    use_once_or_persist: defaults.use_once_or_persist,
    requires_user_approval: true,
    not_executed: true,
    config_mutation: false
  };
}
