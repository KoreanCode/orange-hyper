# Adapter Layer

Orange Hyper v0.7.0 stabilizes the Adapter Invocation Contract recipe quality
surface.

This is not a Codex adapter runtime, Claude adapter runtime, MCP bridge,
subagent orchestrator, or auto planner. It is the first contract that tells a
natural-language layer, skill layer, or agent adapter how to call the Orange
Kernel safely.

Activation Runtime v0.1 is the first limited runtime track. It does not replace
the Adapter Invocation Contract. `activate` and `lifecycle` commands still use
the Adapter JSON envelope, while `host codex hook ...` returns Codex-native hook
JSON for Codex itself.

The core principle:

```text
Natural-language layer calls the kernel.
It must not duplicate kernel state logic.
It must not mutate .orange-hyper directly.
```

## Purpose

The Adapter Layer documents command recipes that an adapter can follow when it
needs to capture a Quest, complete work into memory, summarize project status,
sync generated project structure, check hook warnings, or ask for MCP advice.

The recipes do not execute automatically. The v0.7 stable surface exposes:

```bash
orange adapter list
orange adapter show <recipe-id>
orange adapter dry-run <recipe-id>
```

Each command supports `--json` and uses the same Adapter JSON Contract envelope:

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "adapter.list",
  "data": {}
}
```

## Kernel Control Plane

The `orange` CLI is the kernel control plane. It owns Quest creation, Quest
completion, route traces, capsule generation, Memory Delta Proposal transitions,
Doctor validation, graph read models, Project Sync structure state, growth
previews, hook observations, MCP advice, and identity output.

Adapters must call Orange CLI commands. They must not create, edit, move, or
delete files under `.orange-hyper/` directly.

Adapters must parse only `--json` output. Human-readable output is display text
for people and is not a stable machine interface.

Host bindings must also avoid duplicating Kernel state logic. The Codex bridge
maps hook input/output only; Route, Quest, evidence, Stop verification, working
episode, and pending proposal behavior live in the lifecycle Kernel.

## Install Policy For AI/Adapters

Adapters should discover Orange before trying to install it:

```bash
orange --version
orange env --json
```

If `orange` is missing, the adapter should propose standalone binary
installation and wait for user approval. The installer must use a user-local
location and must not mutate the current project.

Forbidden default install actions:

```bash
npm init -y
npm install -D orange-hyper
```

The npm path is allowed only when the user explicitly asks for it. If npm
fallback is used for a temporary check, specify `orange-hyper@beta` or an exact
version such as `orange-hyper@1.1.0-beta.2`.

After install or PATH confirmation, the adapter should use `orange init --json`
and then the `project-sync` recipe when the user wants generated structure and
Identity output. It must not create or modify project `package.json`,
`package-lock.json`, or `node_modules`.

For supported host activation, the adapter should prefer:

```bash
orange binding plan --host codex --scope user --json
orange binding install --host codex --scope user --json
orange binding status --host codex --json
orange activate plan --host codex --scope project --json
orange activate apply --host codex --scope project --json
orange activate status --host codex --json
```

Binding is user-scoped and activation is repo-scoped. Marketplace registration
is not plugin installation; plugin source is not plugin enablement; one
heartbeat is not operational lifecycle health. When Codex state cannot be
confirmed, keep it as `unknown`. `status` must not report `active` until the
project is activated and required current-fingerprint lifecycle events are
observed.

## Boundary Flags

Every built-in recipe carries these safety flags:

```json
{
  "direct_file_mutation": false,
  "parses_human_output": false,
  "requires_json_mode": true,
  "auto_accept": false,
  "auto_install": false,
  "auto_unlock": false
}
```

These flags are part of the recipe metadata. They are not runtime permissions
and they do not authorize automation.

## Recipe Schema

Each recipe includes:

- `id`
- `title`
- `purpose`
- `when_to_use`
- `commands`
- `required_inputs`
- `outputs`
- `safety_rules`
- `forbidden_actions`
- `expected_contract_version`
- `safety_flags`

Each command step includes:

- `step_index`
- `command`
- `why`
- `required_input`
- `input_requirements`
- `expected_json_command_id`
- `mutates_project_state`
- `requires_user_approval`

Each `input_requirements` entry includes:

- `name`
- `placeholder`
- `input_source`: `user`, `previous_step`, or `project_state`
- `required`
- `step_index`
- `source_step_index` and `source_output` when the value comes from an earlier
  recipe step

## Recipe Quality Standard

Built-in recipes must stay aligned with the actual Orange CLI JSON command
contract:

- every command string must use a real CLI invocation and include `--json`;
- every step must declare the JSON command id that the CLI returns;
- placeholders such as `<request>`, `<quest-id>`, `<proposal-id>`, and
  `<query>` must appear in `input_requirements`;
- placeholders must say whether the value comes from the user, a previous step,
  or project state;
- mutating commands must set `mutates_project_state: true` and
  `requires_user_approval: true`;
- non-mutating read commands must keep both flags false;
- recipe safety flags must keep direct `.orange-hyper` mutation and human
  output parsing disabled.

`orange adapter dry-run <recipe-id>` prints this sequence without executing any
state command. Dry-run does not modify `.orange-hyper`. Dry-run JSON includes
`recipe_id`, `dry_run: true`, `executed: false`, `steps`, `required_inputs`,
`missing_inputs`, `safety_flags`, `expected_contract_version`, and
`next_user_decision`.

## Built-in Recipes

### `quest-capture`

Use this when a user request should become a repo-local Quest.

Command sequence:

| Command | JSON command id | Mutates state | User approval |
| --- | --- | --- | --- |
| `orange quest new "<request>" --title "<title>" --layer <L0-L4> --json` | `quest.new` | yes | yes |

Safety notes:

- The adapter must not create Quest markdown files directly.
- The adapter must parse only the `quest.new` JSON envelope.
- The adapter must not auto-create Quests for lightweight work without an
  explicit adapter policy and user approval.

### `work-complete-to-memory`

Use this when completed work should move through the proposal-first memory
lifecycle.

Command sequence:

| Command | JSON command id | Mutates state | User approval |
| --- | --- | --- | --- |
| `orange quest done <quest-id> --evidence "<evidence>" --json` | `quest.done` | yes | yes |
| `orange remember propose --quest <quest-id> --json` | `remember.propose` | yes | yes |
| `orange remember show <proposal-id> --json` | `remember.show` | no | no |
| `orange remember validate <proposal-id> --json` | `remember.validate` | no | no |
| `orange remember accept <proposal-id> --json` | `remember.accept` | yes | yes |

Safety notes:

- `remember accept` appears in the recipe only as an explicit approval step.
- The adapter must not auto-accept or auto-reject proposals.
- The adapter must not write accepted memory nodes directly.
- The adapter must not run graph rebuilds automatically.

### `project-status`

Use this when an adapter needs a bounded project status readout without
duplicating Doctor, Graph, Growth, or Identity logic.

Command sequence:

| Command | JSON command id | Mutates state | User approval |
| --- | --- | --- | --- |
| `orange doctor --json` | `doctor.run` | no | no |
| `orange graph list --json` | `graph.list` | no | no |
| `orange growth status --json` | `growth.status` | no | no |
| `orange identity build --json` | `identity.build` | yes | yes |

Safety notes:

- `identity build` refreshes a generated kernel artifact, so an adapter should
  run it only when the user explicitly wants an identity refresh.
- The adapter must not run `orange doctor --repair-project-id` automatically.
- The adapter must not run `orange graph rebuild-index` automatically.
- The adapter should summarize JSON fields instead of reimplementing the
  underlying status logic.

### `project-sync`

Use this when the user asks an AI to set up Orange Hyper for an existing repo
and sync the current project structure.

Step sequence:

| Step | Command or gate | JSON command id | Input source | Condition | Mutates state | User approval |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `orange init --json` | `project.init` | `user` | Run first. Already-initialized projects return a no-op JSON result and preserve existing config, Quest, Proposal, and Graph state. | yes | yes |
| 2 | `orange sync plan --json` | `sync.plan` | `previous_step` | Run after `project.init`; read the diff fields before writing. | no | no |
| 3 | user approval: approve generated structure sync | none | `user` | Required after plan and before apply. This is not an Orange CLI command. | no | yes |
| 4 | `orange sync apply --json` | `sync.apply` | `previous_step` | Run only after approval; writes generated structure state and refreshes Identity HTML. | yes | yes |
| 5 | `orange sync status --json` | `sync.status` | `previous_step` | Verify applied revision, diff, and identity freshness. | no | no |

Safety notes:

- `init` is idempotent and must run through `orange init --json`, not direct
  file writes.
- `sync plan` is read-only and writes nothing. It exposes `added_nodes`,
  `changed_nodes`, `removed_nodes`, `added_edges`, `removed_edges`,
  `unchanged_nodes`, `current_revision`, and `planned_revision`.
- `sync apply` writes only generated structure state and refreshes Identity HTML.
- Sync must not create Quest, Proposal, accepted Memory, hooks, MCP config, or
  graph edits.
- The adapter should parse `project.init` and `sync.*` JSON fields instead of scanning
  `.orange-hyper/structure/` directly.

### `hook-check`

Use this when an adapter needs hook warning visibility without installing hooks
or changing hook policy.

Command sequence:

| Command | JSON command id | Mutates state | User approval |
| --- | --- | --- | --- |
| `orange hook preview --json` | `hook.preview` | no | no |
| `orange hook status --json` | `hook.status` | no | no |
| `orange hook run session-start --json` | `hook.runSessionStart` | no | no |
| `orange hook run stop --json` | `hook.runStop` | no | no |

Safety notes:

- The recipe intentionally omits `--write-report`.
- Hook warnings are data for the user, not instructions to auto-repair state.
- The adapter must not install hooks, start a hook loop, create Quests from hook
  warnings, create proposals from hook warnings, or change hook policy.

### `mcp-advice`

Use this when an adapter needs MCP recommendations without installing or running
MCP tools.

Command sequence:

| Command | JSON command id | Mutates state | User approval |
| --- | --- | --- | --- |
| `orange mcp suggest --query "<query>" --json` | `mcp.suggest` | no | no |
| `orange mcp suggest --quest <quest-id> --json` | `mcp.suggest` | no | no |

Safety notes:

- MCP proposal cards are advice only.
- The adapter must not execute install commands.
- The adapter must not persist MCP configuration or API keys.
- The adapter must not run MCP tools or subagents automatically.

## Not Included In v0.7 Stable

v0.7.0 intentionally does not include:

- Codex-specific adapter automatic installation
- Claude-specific adapter automatic installation
- actual adapter runtime
- automatic Quest creation
- automatic memory proposal creation
- automatic accept or reject
- automatic graph rebuild
- automatic hook execution
- MCP automatic installation or execution
- subagent orchestration
- `.orange-hyper` direct file mutation
- auto planner or auto execution loop

The stable surface is complete when adapters can inspect recipes, read the JSON
contract, dry-run the command sequence they would call later, and see which
inputs are missing before any state-changing command is considered.
