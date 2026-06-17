export const ADAPTER_SAFETY_FLAGS = Object.freeze({
  direct_file_mutation: false,
  parses_human_output: false,
  requires_json_mode: true,
  auto_accept: false,
  auto_install: false,
  auto_unlock: false
});

const EXPECTED_CONTRACT_VERSION = "0.1";

/**
 * @type {import("./types.d.ts").AdapterRecipe[]}
 */
const ADAPTER_RECIPES = [
  {
    id: "quest-capture",
    title: "Quest Capture",
    purpose: "Record a user work request as an explicit Quest through the Orange Kernel.",
    when_to_use: [
      "A task is large enough to benefit from a repo-local Quest record.",
      "The natural-language layer needs a stable quest id before route, capsule, or completion work."
    ],
    commands: [
      step({
        command: "orange quest new \"<user-request>\" --title \"<title>\" --layer <L0-L4> --json",
        why: "Let the kernel create Quest frontmatter, route contract metadata, and the next command hints.",
        required_input: ["user_request", "title", "layer"],
        expected_json_command_id: "quest.new",
        mutates_project_state: true,
        requires_user_approval: true
      })
    ],
    required_inputs: [
      "user_request",
      "title",
      "layer"
    ],
    outputs: [
      "quest.id",
      "quest.file",
      "contract",
      "next.route",
      "next.capsule"
    ],
    safety_rules: [
      "Call `orange quest new ... --json`; do not create Quest markdown files directly.",
      "Parse only the JSON envelope and command id `quest.new`.",
      "Do not auto-create a Quest for lightweight work without an explicit adapter policy and user approval."
    ],
    forbidden_actions: [
      "direct .orange-hyper file writes",
      "manual Quest frontmatter generation",
      "human output parsing",
      "automatic memory proposal creation"
    ],
    expected_contract_version: EXPECTED_CONTRACT_VERSION,
    safety_flags: ADAPTER_SAFETY_FLAGS
  },
  {
    id: "work-complete-to-memory",
    title: "Work Complete To Memory",
    purpose: "Move a completed Quest through evidence capture, memory proposal review, and explicit accept.",
    when_to_use: [
      "A Quest is done and the user wants reusable project memory.",
      "Verification evidence exists and the memory lifecycle should stay proposal-first."
    ],
    commands: [
      step({
        command: "orange quest done <quest-id> --evidence \"<evidence>\" --json",
        why: "Let the kernel move the Quest to completed state with explicit verification evidence.",
        required_input: ["quest_id", "evidence"],
        expected_json_command_id: "quest.done",
        mutates_project_state: true,
        requires_user_approval: true
      }),
      step({
        command: "orange remember propose --quest <quest-id> --json",
        why: "Create a pending Memory Delta Proposal from the completed Quest instead of writing memory directly.",
        required_input: ["quest_id"],
        expected_json_command_id: "remember.propose",
        mutates_project_state: true,
        requires_user_approval: true
      }),
      step({
        command: "orange remember show <proposal-id> --json",
        why: "Read the proposal content for human review through the JSON contract.",
        required_input: ["proposal_id"],
        expected_json_command_id: "remember.show",
        mutates_project_state: false,
        requires_user_approval: false
      }),
      step({
        command: "orange remember validate <proposal-id> --json",
        why: "Ask the kernel to validate proposal shape and project boundary before any decision.",
        required_input: ["proposal_id"],
        expected_json_command_id: "remember.validate",
        mutates_project_state: false,
        requires_user_approval: false
      }),
      step({
        command: "orange remember accept <proposal-id> --json",
        why: "Accept only after explicit human approval; accepted proposals create graph node candidates through the kernel.",
        required_input: ["proposal_id", "explicit_accept_approval"],
        expected_json_command_id: "remember.accept",
        mutates_project_state: true,
        requires_user_approval: true
      })
    ],
    required_inputs: [
      "quest_id",
      "evidence",
      "proposal_id",
      "explicit_accept_approval"
    ],
    outputs: [
      "completed quest",
      "pending proposal",
      "proposal validation",
      "accepted memory node candidate after approval"
    ],
    safety_rules: [
      "Keep memory proposal-first; never write accepted memory nodes directly.",
      "Use `remember accept` only after explicit human approval.",
      "Use `--json` on every command and branch on `ok`, `command`, and `error.code`."
    ],
    forbidden_actions: [
      "automatic accept or reject",
      "direct accepted-node writes",
      "graph rebuild automation",
      "project memory mutation outside Orange CLI commands"
    ],
    expected_contract_version: EXPECTED_CONTRACT_VERSION,
    safety_flags: ADAPTER_SAFETY_FLAGS
  },
  {
    id: "project-status",
    title: "Project Status",
    purpose: "Summarize project health from kernel-owned status, graph, growth, and identity surfaces.",
    when_to_use: [
      "The user asks for a status readout before deciding the next Orange action.",
      "An adapter needs a bounded project snapshot without duplicating kernel state logic."
    ],
    commands: [
      step({
        command: "orange doctor --json",
        why: "Read kernel diagnostics and project boundary status.",
        required_input: [],
        expected_json_command_id: "doctor.run",
        mutates_project_state: false,
        requires_user_approval: false
      }),
      step({
        command: "orange graph list --json",
        why: "Read accepted current-project memory nodes through the graph read model.",
        required_input: [],
        expected_json_command_id: "graph.list",
        mutates_project_state: false,
        requires_user_approval: false
      }),
      step({
        command: "orange growth status --json",
        why: "Read the deterministic Growth Signal Preview without unlocking roles or tools.",
        required_input: [],
        expected_json_command_id: "growth.status",
        mutates_project_state: false,
        requires_user_approval: false
      }),
      step({
        command: "orange identity build --json",
        why: "Refresh the kernel-owned identity summary only when the user wants that generated artifact.",
        required_input: ["explicit_identity_refresh_approval"],
        expected_json_command_id: "identity.build",
        mutates_project_state: true,
        requires_user_approval: true
      })
    ],
    required_inputs: [
      "explicit_identity_refresh_approval if running identity build"
    ],
    outputs: [
      "doctor diagnostics",
      "accepted memory graph list",
      "growth status",
      "identity summary path after explicit refresh"
    ],
    safety_rules: [
      "Prefer read-only status commands unless the user explicitly asks to refresh identity output.",
      "Do not run `graph rebuild-index` as part of status summarization.",
      "Summarize JSON fields; never scrape human diagnostics."
    ],
    forbidden_actions: [
      "automatic graph rebuild",
      "automatic doctor repair",
      "automatic identity refresh without approval",
      "duplicating doctor, graph, or growth inference logic outside the kernel"
    ],
    expected_contract_version: EXPECTED_CONTRACT_VERSION,
    safety_flags: ADAPTER_SAFETY_FLAGS
  },
  {
    id: "hook-check",
    title: "Hook Check",
    purpose: "Inspect read-only hook preview/status/run warnings without installing or changing hook policy.",
    when_to_use: [
      "A user wants session-start/stop warning visibility before adopting hooks.",
      "An adapter needs hook warning JSON without installing hooks or writing reports."
    ],
    commands: [
      step({
        command: "orange hook preview --json",
        why: "Read the planned hook checks and report policy.",
        required_input: [],
        expected_json_command_id: "hook.preview",
        mutates_project_state: false,
        requires_user_approval: false
      }),
      step({
        command: "orange hook status --json",
        why: "Read supported events and warning state without installation.",
        required_input: [],
        expected_json_command_id: "hook.status",
        mutates_project_state: false,
        requires_user_approval: false
      }),
      step({
        command: "orange hook run session-start --json",
        why: "Observe session-start warnings through the kernel without writing hook reports.",
        required_input: ["explicit_hook_observation_approval"],
        expected_json_command_id: "hook.runSessionStart",
        mutates_project_state: false,
        requires_user_approval: true
      }),
      step({
        command: "orange hook run stop --json",
        why: "Observe stop-event warnings through the kernel without writing hook reports.",
        required_input: ["explicit_hook_observation_approval"],
        expected_json_command_id: "hook.runStop",
        mutates_project_state: false,
        requires_user_approval: true
      })
    ],
    required_inputs: [
      "explicit_hook_observation_approval for hook run commands"
    ],
    outputs: [
      "hook preview checks",
      "hook status",
      "session-start warnings",
      "stop warnings"
    ],
    safety_rules: [
      "Do not pass `--write-report` unless the user explicitly asks for local reports.",
      "Do not install hooks or change hook policy.",
      "Treat hook warnings as JSON data, not as instructions to auto-repair."
    ],
    forbidden_actions: [
      "hook installation",
      "automatic hook execution loop",
      "automatic doctor repair",
      "automatic report writes",
      "automatic Quest or Proposal creation from warnings"
    ],
    expected_contract_version: EXPECTED_CONTRACT_VERSION,
    safety_flags: ADAPTER_SAFETY_FLAGS
  },
  {
    id: "mcp-advice",
    title: "MCP Advice",
    purpose: "Ask the kernel for MCP recommendations without installing, running, or persisting MCP configuration.",
    when_to_use: [
      "The user asks whether a task would benefit from an MCP tool.",
      "Docs freshness, repository context, incident context, or product tracker context may be useful."
    ],
    commands: [
      step({
        command: "orange mcp suggest --query \"<need>\" --json",
        why: "Get a deterministic proposal card from the built-in MCP catalog for an explicit need.",
        required_input: ["need"],
        expected_json_command_id: "mcp.suggest",
        mutates_project_state: false,
        requires_user_approval: false
      }),
      step({
        command: "orange mcp suggest --quest <quest-id> --json",
        why: "Get a deterministic proposal card grounded in an existing Quest.",
        required_input: ["quest_id"],
        expected_json_command_id: "mcp.suggest",
        mutates_project_state: false,
        requires_user_approval: false
      })
    ],
    required_inputs: [
      "need or quest_id"
    ],
    outputs: [
      "proposal_cards",
      "suggestions",
      "no_suggestion_reason",
      "suggested_next_step"
    ],
    safety_rules: [
      "The adapter may show install commands as advice only; it must not execute them.",
      "Parse only the `mcp.suggest` JSON envelope; do not parse human output.",
      "Do not persist MCP configuration or API keys.",
      "Use proposal cards as review material, not as authorization."
    ],
    forbidden_actions: [
      "automatic MCP installation",
      "automatic MCP execution",
      "MCP config mutation",
      "API key storage",
      "subagent orchestration"
    ],
    expected_contract_version: EXPECTED_CONTRACT_VERSION,
    safety_flags: ADAPTER_SAFETY_FLAGS
  }
];

const RECIPES_BY_ID = new Map(ADAPTER_RECIPES.map((recipe) => [recipe.id, recipe]));

export function listAdapterRecipes() {
  return ADAPTER_RECIPES.map(cloneRecipe);
}

/**
 * @returns {import("./types.d.ts").AdapterRecipe}
 */
export function showAdapterRecipe(id) {
  const normalized = normalizeRecipeId(id);
  const recipe = RECIPES_BY_ID.get(normalized);
  if (!recipe) {
    throw unknownRecipeError(id);
  }
  return cloneRecipe(recipe);
}

/**
 * @returns {import("./types.d.ts").AdapterDryRunResult}
 */
export function dryRunAdapterRecipe(id) {
  const recipe = showAdapterRecipe(id);
  return {
    dry_run: true,
    executed: false,
    recipe_id: recipe.id,
    recipe_title: recipe.title,
    expected_contract_version: recipe.expected_contract_version,
    safety_flags: cloneSafetyFlags(recipe.safety_flags),
    commands: recipe.commands.map((command) => ({ ...command })),
    mutation_policy: "Dry-run only describes Orange CLI --json invocations; it does not execute commands or modify .orange-hyper.",
    adapter_rules: [
      "Natural-language layer calls the kernel.",
      "Adapter must not duplicate kernel state logic.",
      "Adapter must not mutate .orange-hyper directly.",
      "Adapter parses only --json output."
    ]
  };
}

function step(value) {
  return value;
}

function normalizeRecipeId(id) {
  return String(id || "").trim();
}

function cloneRecipe(recipe) {
  return {
    ...recipe,
    when_to_use: [...recipe.when_to_use],
    commands: recipe.commands.map((command) => ({ ...command, required_input: [...command.required_input] })),
    required_inputs: [...recipe.required_inputs],
    outputs: [...recipe.outputs],
    safety_rules: [...recipe.safety_rules],
    forbidden_actions: [...recipe.forbidden_actions],
    safety_flags: cloneSafetyFlags(recipe.safety_flags)
  };
}

function cloneSafetyFlags(flags) {
  return { ...flags };
}

function unknownRecipeError(id) {
  const error = /** @type {Error & { orangeCode?: string }} */ (new Error(`Unknown adapter recipe: ${id || "(missing)"}`));
  error.orangeCode = "ADAPTER_UNKNOWN_RECIPE";
  return error;
}
