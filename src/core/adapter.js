export const ADAPTER_SAFETY_FLAGS = Object.freeze({
  direct_file_mutation: false,
  parses_human_output: false,
  requires_json_mode: true,
  auto_accept: false,
  auto_install: false,
  auto_unlock: false
});

const EXPECTED_CONTRACT_VERSION = "0.1";

const INPUT_SOURCE = Object.freeze({
  USER: "user",
  PREVIOUS_STEP: "previous_step",
  PROJECT_STATE: "project_state"
});

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
        command: "orange quest new \"<request>\" --title \"<title>\" --layer <L0-L4> --json",
        why: "Let the kernel create Quest frontmatter, route contract metadata, and the next command hints.",
        required_input: ["request", "title", "layer"],
        input_requirements: [
          input({ name: "request", placeholder: "<request>", input_source: INPUT_SOURCE.USER }),
          input({ name: "title", placeholder: "<title>", input_source: INPUT_SOURCE.USER }),
          input({ name: "layer", placeholder: "<L0-L4>", input_source: INPUT_SOURCE.USER })
        ],
        expected_json_command_id: "quest.new",
        mutates_project_state: true,
        requires_user_approval: true
      })
    ],
    required_inputs: [
      "request",
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
        input_requirements: [
          input({ name: "quest_id", placeholder: "<quest-id>", input_source: INPUT_SOURCE.USER }),
          input({ name: "evidence", placeholder: "<evidence>", input_source: INPUT_SOURCE.USER })
        ],
        expected_json_command_id: "quest.done",
        mutates_project_state: true,
        requires_user_approval: true
      }),
      step({
        command: "orange remember propose --quest <quest-id> --json",
        why: "Create a pending Memory Delta Proposal from the completed Quest instead of writing memory directly.",
        required_input: ["quest_id"],
        input_requirements: [
          input({
            name: "quest_id",
            placeholder: "<quest-id>",
            input_source: INPUT_SOURCE.PREVIOUS_STEP,
            source_step_index: 1,
            source_output: "quest.id"
          })
        ],
        expected_json_command_id: "remember.propose",
        mutates_project_state: true,
        requires_user_approval: true
      }),
      step({
        command: "orange remember show <proposal-id> --json",
        why: "Read the proposal content for human review through the JSON contract.",
        required_input: ["proposal_id"],
        input_requirements: [
          input({
            name: "proposal_id",
            placeholder: "<proposal-id>",
            input_source: INPUT_SOURCE.PREVIOUS_STEP,
            source_step_index: 2,
            source_output: "proposal.id"
          })
        ],
        expected_json_command_id: "remember.show",
        mutates_project_state: false,
        requires_user_approval: false
      }),
      step({
        command: "orange remember validate <proposal-id> --json",
        why: "Ask the kernel to validate proposal shape and project boundary before any decision.",
        required_input: ["proposal_id"],
        input_requirements: [
          input({
            name: "proposal_id",
            placeholder: "<proposal-id>",
            input_source: INPUT_SOURCE.PREVIOUS_STEP,
            source_step_index: 2,
            source_output: "proposal.id"
          })
        ],
        expected_json_command_id: "remember.validate",
        mutates_project_state: false,
        requires_user_approval: false
      }),
      step({
        command: "orange remember accept <proposal-id> --json",
        why: "Accept only after explicit human approval; accepted proposals create graph node candidates through the kernel.",
        required_input: ["proposal_id", "explicit_accept_approval"],
        input_requirements: [
          input({
            name: "proposal_id",
            placeholder: "<proposal-id>",
            input_source: INPUT_SOURCE.PREVIOUS_STEP,
            source_step_index: 2,
            source_output: "proposal.id"
          }),
          input({ name: "explicit_accept_approval", placeholder: null, input_source: INPUT_SOURCE.USER })
        ],
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
        input_requirements: [
          input({ name: "explicit_identity_refresh_approval", placeholder: null, input_source: INPUT_SOURCE.USER })
        ],
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
    id: "project-sync",
    title: "Project Sync",
    purpose: "Scan an existing repository into generated Structure Graph state and refresh Identity HTML through the Orange Kernel.",
    when_to_use: [
      "The user asks to set up Orange Hyper for an existing project and sync the current structure.",
      "An adapter needs repository structure in Identity HTML without creating Quest, Proposal, or Memory state."
    ],
    commands: [
      step({
        command: "orange init --json",
        why: "Idempotently create the Orange Hyper workspace before scanning an existing project.",
        required_input: ["explicit_project_init_approval"],
        input_requirements: [
          input({ name: "explicit_project_init_approval", placeholder: null, input_source: INPUT_SOURCE.USER })
        ],
        expected_json_command_id: "project.init",
        mutates_project_state: true,
        requires_user_approval: true,
        input_source: INPUT_SOURCE.USER,
        condition: "Run first. If the project is already initialized, `project.init` must return a no-op JSON result without overwriting existing config, Quest, Proposal, or Graph state."
      }),
      step({
        command: "orange sync plan --json",
        why: "Preview the deterministic project structure scan without writing files.",
        required_input: [],
        expected_json_command_id: "sync.plan",
        mutates_project_state: false,
        requires_user_approval: false,
        input_source: INPUT_SOURCE.PREVIOUS_STEP,
        condition: "Run only after `project.init` returns ok; this step is read-only and provides the diff the user should review."
      }),
      step({
        command: "user approval: approve generated structure sync",
        why: "Let the user approve the planned generated Structure Graph changes before any write.",
        required_input: ["explicit_sync_approval"],
        input_requirements: [
          input({ name: "explicit_sync_approval", placeholder: null, input_source: INPUT_SOURCE.USER })
        ],
        expected_json_command_id: null,
        mutates_project_state: false,
        requires_user_approval: true,
        input_source: INPUT_SOURCE.USER,
        condition: "Required after `sync.plan` and before `sync.apply`; this is an adapter/user gate, not an Orange CLI command."
      }),
      step({
        command: "orange sync apply --json",
        why: "Write only generated structure state and refresh Identity HTML from the new revision.",
        required_input: ["explicit_sync_approval"],
        input_requirements: [
          input({
            name: "explicit_sync_approval",
            placeholder: null,
            input_source: INPUT_SOURCE.PREVIOUS_STEP,
            source_step_index: 3,
            source_output: "approved"
          })
        ],
        expected_json_command_id: "sync.apply",
        mutates_project_state: true,
        requires_user_approval: true,
        input_source: INPUT_SOURCE.PREVIOUS_STEP,
        condition: "Run only after user approval. It writes generated structure state, preserves accepted memory, and attempts Identity HTML refresh."
      }),
      step({
        command: "orange sync status --json",
        why: "Read last sync, freshness, changed state, and identity freshness.",
        required_input: [],
        expected_json_command_id: "sync.status",
        mutates_project_state: false,
        requires_user_approval: false,
        input_source: INPUT_SOURCE.PREVIOUS_STEP,
        condition: "Run after `sync.apply` to verify the applied revision, diff, and identity freshness."
      })
    ],
    required_inputs: [
      "explicit_project_init_approval before init",
      "explicit_sync_approval between plan and apply"
    ],
    outputs: [
      ".orange-hyper/",
      "sync plan",
      ".orange-hyper/structure/index.json",
      ".orange-hyper/structure/status.json",
      "identity refresh status",
      "sync freshness status"
    ],
    safety_rules: [
      "`init` is idempotent and must run through `orange init --json`, not direct file writes.",
      "Use `sync plan` first when the user wants a preview; it must remain read-only.",
      "`sync apply` writes generated structure state only.",
      "Do not create Quest, Proposal, accepted Memory, hooks, MCP config, or graph edits during sync.",
      "Parse only `project.init` and `sync.*` JSON envelopes."
    ],
    forbidden_actions: [
      "Quest creation during sync",
      "Memory Proposal creation during sync",
      "Memory Proposal auto accept",
      "MCP, hook, or subagent execution",
      "AST/call graph generation",
      "graph editing"
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
        required_input: [],
        input_requirements: [],
        expected_json_command_id: "hook.runSessionStart",
        mutates_project_state: false,
        requires_user_approval: false
      }),
      step({
        command: "orange hook run stop --json",
        why: "Observe stop-event warnings through the kernel without writing hook reports.",
        required_input: [],
        input_requirements: [],
        expected_json_command_id: "hook.runStop",
        mutates_project_state: false,
        requires_user_approval: false
      })
    ],
    required_inputs: [],
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
        command: "orange mcp suggest --query \"<query>\" --json",
        why: "Get a deterministic proposal card from the built-in MCP catalog for an explicit need.",
        required_input: ["query"],
        input_requirements: [
          input({ name: "query", placeholder: "<query>", input_source: INPUT_SOURCE.USER })
        ],
        expected_json_command_id: "mcp.suggest",
        mutates_project_state: false,
        requires_user_approval: false
      }),
      step({
        command: "orange mcp suggest --quest <quest-id> --json",
        why: "Get a deterministic proposal card grounded in an existing Quest.",
        required_input: ["quest_id"],
        input_requirements: [
          input({ name: "quest_id", placeholder: "<quest-id>", input_source: INPUT_SOURCE.PROJECT_STATE })
        ],
        expected_json_command_id: "mcp.suggest",
        mutates_project_state: false,
        requires_user_approval: false
      })
    ],
    required_inputs: [
      "query or quest_id"
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
].map(withStepIndexes);

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
  const steps = recipe.commands.map(cloneStep);
  const requiredInputs = collectRequiredInputs(steps);
  const missingInputs = collectMissingInputs(requiredInputs);
  return {
    recipe_id: recipe.id,
    recipe_title: recipe.title,
    dry_run: true,
    executed: false,
    steps,
    commands: steps.map(cloneStep),
    required_inputs: requiredInputs,
    missing_inputs: missingInputs,
    safety_flags: cloneSafetyFlags(recipe.safety_flags),
    expected_contract_version: recipe.expected_contract_version,
    next_user_decision: buildNextUserDecision(recipe.id, missingInputs),
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
  return {
    input_source: inferStepInputSource(value),
    condition: "Run when the recipe reaches this step and its required inputs are available.",
    ...value
  };
}

function input(value) {
  return {
    placeholder: null,
    required: true,
    ...value
  };
}

function withStepIndexes(recipe) {
  return {
    ...recipe,
    commands: recipe.commands.map((command, index) => {
      const stepIndex = index + 1;
      const inputRequirements = command.input_requirements || [];
      return {
        ...command,
        step_index: stepIndex,
        input_requirements: inputRequirements.map((requirement) => ({
          ...requirement,
          step_index: stepIndex
        }))
      };
    })
  };
}

function normalizeRecipeId(id) {
  return String(id || "").trim();
}

function cloneRecipe(recipe) {
  return {
    ...recipe,
    when_to_use: [...recipe.when_to_use],
    commands: recipe.commands.map(cloneStep),
    required_inputs: [...recipe.required_inputs],
    outputs: [...recipe.outputs],
    safety_rules: [...recipe.safety_rules],
    forbidden_actions: [...recipe.forbidden_actions],
    safety_flags: cloneSafetyFlags(recipe.safety_flags)
  };
}

function cloneStep(command) {
  return {
    ...command,
    required_input: [...command.required_input],
    input_requirements: command.input_requirements.map((requirement) => ({ ...requirement }))
  };
}

function cloneSafetyFlags(flags) {
  return { ...flags };
}

function collectRequiredInputs(steps) {
  return steps.flatMap((command) => command.input_requirements.map((requirement) => ({ ...requirement })));
}

function collectMissingInputs(requiredInputs) {
  return requiredInputs
    .filter((requirement) => requirement.required && requirement.input_source !== INPUT_SOURCE.PREVIOUS_STEP)
    .map((requirement) => ({ ...requirement }));
}

function inferStepInputSource(value) {
  const sources = (value.input_requirements || []).map((requirement) => requirement.input_source).filter(Boolean);
  if (sources.includes(INPUT_SOURCE.USER)) {
    return INPUT_SOURCE.USER;
  }
  if (sources.includes(INPUT_SOURCE.PREVIOUS_STEP)) {
    return INPUT_SOURCE.PREVIOUS_STEP;
  }
  if (sources.includes(INPUT_SOURCE.PROJECT_STATE)) {
    return INPUT_SOURCE.PROJECT_STATE;
  }
  return INPUT_SOURCE.PROJECT_STATE;
}

function buildNextUserDecision(recipeId, missingInputs) {
  if (recipeId === "quest-capture") {
    return "Ask whether to create a Quest, then collect request, title, and layer before running step 1.";
  }
  if (recipeId === "work-complete-to-memory") {
    return "Ask for quest completion approval and evidence before step 1; ask again before the step 5 memory accept.";
  }
  if (recipeId === "project-status") {
    return "Run read-only steps 1-3 if status is requested; ask before step 4 because identity build mutates generated state.";
  }
  if (recipeId === "project-sync") {
    return "Run project.init and the read-only sync plan first; ask for explicit approval at step 3 before sync apply writes generated structure state.";
  }
  if (recipeId === "hook-check") {
    return "No extra approval is required for the read-only hook checks; do not add --write-report unless the user asks for a local report.";
  }
  if (recipeId === "mcp-advice") {
    return "Choose either a user query for step 1 or an existing quest id from project state for step 2; present advice only.";
  }
  const userInputs = missingInputs.filter((requirement) => requirement.input_source === INPUT_SOURCE.USER);
  if (userInputs.length) {
    return `Collect ${userInputs.map((requirement) => requirement.name).join(", ")} before executing this recipe.`;
  }
  return "No user decision is required before read-only execution; dry-run itself executed nothing.";
}

function unknownRecipeError(id) {
  const availableRecipes = Array.from(RECIPES_BY_ID.keys()).join(", ");
  const error = /** @type {Error & { orangeCode?: string, orangeHint?: string }} */ (
    new Error(`Unknown adapter recipe: ${id || "(missing)"}. Available recipes: ${availableRecipes}.`)
  );
  error.orangeCode = "ADAPTER_UNKNOWN_RECIPE";
  error.orangeHint = "Run `orange adapter list` to inspect recipe ids, then rerun `orange adapter show <recipe-id>` or `orange adapter dry-run <recipe-id>`.";
  return error;
}
