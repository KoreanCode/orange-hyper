# Adapter Contract

Orange Hyper v1.0.0-alpha.1 is a stabilization polish release for the v0.1 through
v0.8 surfaces: Seed Kernel, Memory Proposal, Memory Graph Usability, read-only
Identity Graph Preview, Minimal Hook Preview, read-only MCP Advisor, read-only
Growth Signal Preview, Adapter Invocation Contract, and local-only Eval and
Reports. The `orange` CLI is the kernel control plane, not the final end-user UX.

Human-readable output exists for people who run commands directly. Skills,
agents, natural-language adapters, and other integration layers must parse only
`--json` output. They must not scrape human-readable text.

Adapters must not directly modify files under `.orange-hyper/`. They should call
`orange` commands and let the kernel own state transitions, validation, route
trace writes, capsule generation, quest completion, and identity output. A
natural-language workflow may translate user intent into kernel commands, but it
must not copy or reimplement kernel state logic.

## CLI Invocation

The npm package name is `orange-hyper`; the primary CLI command is `orange`.
The package also provides an `orange-hyper` compatibility alias that points to
the same `bin/orange.js` entrypoint.

Recommended npx usage should pin the package explicitly and invoke the command
name explicitly:

```bash
npx -y --package orange-hyper@latest orange --help
npx -y --package orange-hyper@latest orange-hyper --help
```

Adapters should prefer `orange` as the primary command name. The `orange-hyper`
alias exists for compatibility and smoke checks.

## JSON Envelope

Successful JSON output uses this envelope:

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "quest.new",
  "data": {}
}
```

Structured failures use this envelope:

```json
{
  "ok": false,
  "contract_version": "0.1",
  "command": "quest.done",
  "error": {
    "code": "USER_INPUT_ERROR",
    "message": "Completion requires --evidence or --unverified.",
    "hint": "Run `orange --help` for command usage, or rerun without --json for human-readable diagnostics."
  }
}
```

`contract_version` is the adapter-facing JSON contract version.
v1.0.0-alpha.1 keeps `"0.1"` intentionally: the package version changed, but
the adapter envelope did not. The contract version appears in both success and
failure envelopes.

`command` uses dot notation. The Seed Kernel command ids are:

- `quest.new`
- `adapter.list`
- `adapter.show`
- `adapter.dryRun`
- `eval.snapshot`
- `eval.report`
- `eval.explain`
- `route.show`
- `capsule.build`
- `quest.done`
- `remember.propose`
- `remember.list`
- `remember.show`
- `remember.validate`
- `remember.revise`
- `remember.accept`
- `remember.reject`
- `graph.list`
- `graph.show`
- `graph.search`
- `graph.rebuildIndex`
- `growth.status`
- `growth.suggest`
- `growth.explain`
- `hook.preview`
- `hook.status`
- `hook.runSessionStart`
- `hook.runStop`
- `mcp.list`
- `mcp.show`
- `mcp.suggest`
- `doctor.run`
- `identity.build`

Unknown JSON-mode failures still use a dot-shaped command id such as
`unknown.command` or `<command>.unknown`.

## Project Boundary Contract

v0.2.x records a stable random `project_id` and human-readable `project_name` in
`.orange-hyper/config.json`. Shared config must not store an absolute local root
path. New Quest, Memory Delta Proposal, Accepted Memory Node, Capsule boundary,
and Identity summary JSON output include the current project identity.

Adapters must treat only artifacts whose `project_id` matches the current config
as project memory. Unrelated pasted reports, external project docs, and other
repo documents are not memory unless a future explicit `orange` import command
exists. v0.2.x intentionally does not support `remember propose --from-file`,
external report import, or automatic clipboard/pasted-report memory proposals.

`doctor --json` includes project boundary warnings/errors in the existing JSON
envelope. Missing `project_id` on legacy artifacts is a warning; an explicit
different `project_id` is an error. `orange doctor --repair-project-id` may fill
missing legacy project identity fields with the current config values, but it
must not overwrite a different existing `project_id`.

## stdout/stderr Policy

- `--json` success: stdout JSON, stderr empty, exit 0.
- `--json` failure: stdout JSON error envelope, stderr empty, exit non-zero.
- Human success: stdout human output, exit 0.
- Human failure: stderr human error, exit non-zero.

Adapters should read stdout as JSON only in `--json` mode. Human-readable
diagnostics are reserved for non-JSON command usage.

Hook preview commands are warning-first. If `orange hook run ... --json`
observes missing project state, stale reports, or doctor diagnostics, it still
returns a success envelope unless the hook command itself is invalid. Adapters
should inspect `data.warnings` and `data.hints` instead of treating warning
observations as state-changing failures.

Hook warnings are stable `{ code, message, hint }` objects. `code` values use
the `HOOK_` prefix, such as `HOOK_PROJECT_ID_MISSING`,
`HOOK_IDENTITY_SUMMARY_MISSING`, `HOOK_CAPSULE_STALE`,
`HOOK_PENDING_PROPOSALS`, `HOOK_DOCTOR_NOT_OK`, and
`HOOK_GRAPH_PROVENANCE_WARNING`. Adapters should branch on `code` and present
`message` plus `hint`; hooks do not perform the hinted command automatically.

MCP Advisor commands are read-only. `orange mcp suggest --json` may read Quest,
Graph, Doctor, and Hook state, but it must return proposal cards only. It must
not install MCP servers, run MCP tools, write MCP config, store API keys, create
Quest/Proposal/Graph state, write hook reports, or persist project memory.

Growth Signal Preview commands are read-only. `orange growth status --json`,
`orange growth suggest --json`, and `orange growth explain --json` may read
Quest, Route, accepted Memory Graph, Hook warning, Doctor, and
documentation/API freshness-shaped MCP advisor signals. They must not create
roles, install or run MCPs, change hook policy, run subagents, start a planner
loop, create graph nodes, mutate config, or write project memory. Growth
candidates must keep `auto_unlock: false` and
`requires_user_approval: true`. Candidate ranking is deterministic by
descending `score`, then candidate id order for ties.

Adapter recipe commands are contract-only. `orange adapter list --json`,
`orange adapter show <recipe-id> --json`, and
`orange adapter dry-run <recipe-id> --json` expose built-in command recipes for
natural-language and skill layers. They do not execute the recipe commands and
must not modify `.orange-hyper`. Every recipe declares safety flags:
`direct_file_mutation: false`, `parses_human_output: false`,
`requires_json_mode: true`, `auto_accept: false`, `auto_install: false`, and
`auto_unlock: false`.

Dry-run output is the adapter-facing execution plan. It includes `steps`,
structured `required_inputs`, `missing_inputs`, and `next_user_decision` so an
adapter can distinguish user placeholders from previous-step outputs and
project-state values before it considers running any real command.

Eval and Reports commands are local-only. `orange eval snapshot --json`,
`orange eval report --json`, and `orange eval explain --json` read existing
`.orange-hyper` project state and return conservative count/warning signals.
They must not upload telemetry, call APIs, call LLM judges, run MCP tools, run
hook events automatically, start subagents, create Quest/Proposal/Graph state,
repair doctor findings, or mutate project memory/config.

`orange eval report --write-report` is the only eval write path. It writes a
Markdown report only under `.orange-hyper/evals/reports/`. `--write-report`
does not accept a path or value.

## Command Examples

### `adapter list --json`

```bash
orange adapter list --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "adapter.list",
  "data": {
    "count": 5,
    "recipes": [
      {
        "id": "quest-capture",
        "title": "Quest Capture",
        "purpose": "Record a user work request as an explicit Quest through the Orange Kernel.",
        "when_to_use": [
          "A task is large enough to benefit from a repo-local Quest record."
        ],
        "commands": [
          {
            "step_index": 1,
            "command": "orange quest new \"<request>\" --title \"<title>\" --layer <L0-L4> --json",
            "why": "Let the kernel create Quest frontmatter, route contract metadata, and the next command hints.",
            "required_input": ["request", "title", "layer"],
            "input_requirements": [
              {
                "name": "request",
                "placeholder": "<request>",
                "input_source": "user",
                "required": true,
                "step_index": 1
              },
              {
                "name": "title",
                "placeholder": "<title>",
                "input_source": "user",
                "required": true,
                "step_index": 1
              },
              {
                "name": "layer",
                "placeholder": "<L0-L4>",
                "input_source": "user",
                "required": true,
                "step_index": 1
              }
            ],
            "expected_json_command_id": "quest.new",
            "mutates_project_state": true,
            "requires_user_approval": true
          }
        ],
        "required_inputs": ["request", "title", "layer"],
        "outputs": ["quest.id", "quest.file", "contract", "next.route", "next.capsule"],
        "safety_rules": [
          "Call `orange quest new ... --json`; do not create Quest markdown files directly."
        ],
        "forbidden_actions": [
          "direct .orange-hyper file writes",
          "human output parsing"
        ],
        "expected_contract_version": "0.1",
        "safety_flags": {
          "direct_file_mutation": false,
          "parses_human_output": false,
          "requires_json_mode": true,
          "auto_accept": false,
          "auto_install": false,
          "auto_unlock": false
        }
      }
    ]
  }
}
```

The actual `recipes` array contains all built-in recipes:
`quest-capture`, `work-complete-to-memory`, `project-status`, `hook-check`, and
`mcp-advice`.

### `adapter show --json`

```bash
orange adapter show hook-check --json
```

The example below is abridged to highlight the command-step contract; actual
output includes the full recipe fields listed in `docs/20_ADAPTER_LAYER.md`.

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "adapter.show",
  "data": {
    "recipe": {
      "id": "hook-check",
      "title": "Hook Check",
      "commands": [
        {
          "step_index": 1,
          "command": "orange hook preview --json",
          "why": "Read the planned hook checks and report policy.",
          "required_input": [],
          "input_requirements": [],
          "expected_json_command_id": "hook.preview",
          "mutates_project_state": false,
          "requires_user_approval": false
        },
        {
          "step_index": 4,
          "command": "orange hook run stop --json",
          "why": "Observe stop-event warnings through the kernel without writing hook reports.",
          "required_input": [],
          "input_requirements": [],
          "expected_json_command_id": "hook.runStop",
          "mutates_project_state": false,
          "requires_user_approval": false
        }
      ],
      "expected_contract_version": "0.1",
      "safety_flags": {
        "direct_file_mutation": false,
        "parses_human_output": false,
        "requires_json_mode": true,
        "auto_accept": false,
        "auto_install": false,
        "auto_unlock": false
      }
    }
  }
}
```

### `adapter dry-run --json`

```bash
orange adapter dry-run project-status --json
```

The example below is abridged; actual output includes the full project-status
sequence: `doctor.run`, `graph.list`, `growth.status`, and `identity.build`.

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "adapter.dryRun",
  "data": {
    "recipe_id": "project-status",
    "recipe_title": "Project Status",
    "dry_run": true,
    "executed": false,
    "steps": [
      {
        "step_index": 1,
        "command": "orange doctor --json",
        "why": "Read kernel diagnostics and project boundary status.",
        "required_input": [],
        "input_requirements": [],
        "expected_json_command_id": "doctor.run",
        "mutates_project_state": false,
        "requires_user_approval": false
      },
      {
        "step_index": 4,
        "command": "orange identity build --json",
        "why": "Refresh the kernel-owned identity summary only when the user wants that generated artifact.",
        "required_input": ["explicit_identity_refresh_approval"],
        "input_requirements": [
          {
            "name": "explicit_identity_refresh_approval",
            "placeholder": null,
            "input_source": "user",
            "required": true,
            "step_index": 4
          }
        ],
        "expected_json_command_id": "identity.build",
        "mutates_project_state": true,
        "requires_user_approval": true
      }
    ],
    "required_inputs": [
      {
        "name": "explicit_identity_refresh_approval",
        "placeholder": null,
        "input_source": "user",
        "required": true,
        "step_index": 4
      }
    ],
    "missing_inputs": [
      {
        "name": "explicit_identity_refresh_approval",
        "placeholder": null,
        "input_source": "user",
        "required": true,
        "step_index": 4
      }
    ],
    "safety_flags": {
      "direct_file_mutation": false,
      "parses_human_output": false,
      "requires_json_mode": true,
      "auto_accept": false,
      "auto_install": false,
      "auto_unlock": false
    },
    "expected_contract_version": "0.1",
    "next_user_decision": "Run read-only steps 1-3 if status is requested; ask before step 4 because identity build mutates generated state.",
    "mutation_policy": "Dry-run only describes Orange CLI --json invocations; it does not execute commands or modify .orange-hyper.",
    "adapter_rules": [
      "Natural-language layer calls the kernel.",
      "Adapter must not duplicate kernel state logic.",
      "Adapter must not mutate .orange-hyper directly.",
      "Adapter parses only --json output."
    ]
  }
}
```

Actual dry-run output also includes a `commands` alias with the same entries as
`steps` for v0.7 dry-run compatibility.

### `eval snapshot --json`

```bash
orange eval snapshot --json
```

The eval examples are abridged for readability, but every shown field name and
boundary value matches the implementation.

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "eval.snapshot",
  "data": {
    "schema_version": 2,
    "generated_at": "2026-06-18T01:02:03.000Z",
    "readOnly": true,
    "deterministic": true,
    "localOnly": true,
    "telemetry": false,
    "networkCall": false,
    "llmJudge": false,
    "mcpCall": false,
    "hookRun": false,
    "autoMutation": false,
    "projectMemoryMutation": false,
    "configMutation": false,
    "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
    "project_name": "orange-hyper",
    "project": {
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper"
    },
    "quests": {
      "total": 4,
      "completed": 4,
      "verified": 4,
      "unverified": 0
    },
    "memoryProposals": {
      "total": 3,
      "accepted": 2,
      "rejected": 0,
      "pending": 1
    },
    "graph": {
      "acceptedNodeCount": 2,
      "warningCount": 0
    },
    "doctor": {
      "ok": true,
      "errorCount": 0,
      "warningCount": 0
    },
    "hookWarnings": {
      "source": "local-hook-report",
      "hookRun": false,
      "warningCount": 1
    },
    "mcpAdvisor": {
      "available": true,
      "catalogCount": 4,
      "signalCount": 0,
      "mcpCall": false
    },
    "growth": {
      "candidateCount": 1,
      "growthLevel": "sprout",
      "autoUnlock": false
    },
    "adapter": {
      "recipeCount": 5,
      "expectedContractVersion": "0.1"
    },
    "identity": {
      "summaryExists": true,
      "htmlExists": true
    },
    "unavailableMetrics": [
      {
        "id": "token.savings",
        "label": "Token savings",
        "status": "insufficient-data",
        "source": "unavailable",
        "value": null,
        "unavailable": true,
        "unavailable_reason": "token counts are not collected"
      }
    ],
    "boundaries": {
      "local_only": true,
      "external_telemetry": false,
      "network_upload": false,
      "api_call": false,
      "llm_judge_call": false,
      "mcp_call": false,
      "hook_auto_run": false,
      "subagent_run": false,
      "auto_planner_loop": false,
      "project_memory_auto_mutation": false,
      "config_auto_mutation": false,
      "quest_auto_creation": false,
      "proposal_auto_creation": false,
      "graph_auto_creation": false,
      "token_savings_estimation": false,
      "success_rate_improvement_claim": false
    }
  }
}
```

### `eval report --json`

```bash
orange eval report --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "eval.report",
  "data": {
    "report_id": "eval-report-20260618T010203000Z",
    "schema_version": 2,
    "report_kind": "eval-report",
    "generated_at": "2026-06-18T01:02:03.000Z",
    "format": "markdown",
    "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
    "project_name": "orange-hyper",
    "localOnly": true,
    "local_only": true,
    "telemetry": false,
    "networkCall": false,
    "network_upload": false,
    "llmJudge": false,
    "llm_judge": false,
    "mcpCall": false,
    "hookRun": false,
    "autoMutation": false,
    "projectMemoryMutation": false,
    "configMutation": false,
    "boundaries": {
      "local_only": true,
      "external_telemetry": false,
      "network_upload": false,
      "api_call": false,
      "llm_judge_call": false,
      "mcp_call": false,
      "hook_auto_run": false,
      "subagent_run": false,
      "auto_planner_loop": false,
      "project_memory_auto_mutation": false,
      "config_auto_mutation": false,
      "quest_auto_creation": false,
      "proposal_auto_creation": false,
      "graph_auto_creation": false,
      "token_savings_estimation": false,
      "success_rate_improvement_claim": false
    },
    "summary": {
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper",
      "generated_at": "2026-06-18T01:02:03.000Z",
      "report_mode": "local-only",
      "total_sections": 11,
      "needs_attention_count": 1,
      "insufficient_data_count": 2,
      "no_telemetry": true,
      "no_network": true,
      "no_llm_judge": true
    },
    "localReport": {
      "directory": ".orange-hyper/evals/reports",
      "defaultWrite": false,
      "written": false,
      "file": null,
      "format": "markdown"
    },
    "sections": [
      {
        "title": "Project Summary",
        "status": "good",
        "reason": "Project identity exists and local project signals can be summarized.",
        "evidence_count": 4,
        "metrics": ["project.identity", "quest.count", "graph.accepted_nodes", "adapter.recipes"]
      },
      {
        "title": "Known Gaps",
        "status": "insufficient-data",
        "reason": "These metrics and integrations are intentionally unavailable rather than estimated or auto-generated.",
        "evidence_count": 0,
        "metrics": ["token.savings", "success_rate.improvement"]
      }
    ],
    "known_gaps": [
      {
        "id": "token.savings",
        "status": "insufficient-data",
        "reason": "Token counts are not collected by the local-only Eval and Reports stable surface.",
        "source": "unavailable",
        "limitation": "Do not estimate token savings without explicit token usage collection.",
        "future_target": "An opt-in usage dataset would be required before reporting token savings."
      }
    ],
    "unavailable_metrics": [
      {
        "id": "token.savings",
        "label": "Token savings",
        "status": "insufficient-data",
        "source": "unavailable",
        "value": null,
        "unavailable": true,
        "unavailable_reason": "token counts are not collected",
        "limitation": "No token usage collection exists in this local-only eval surface, so savings must remain unavailable."
      }
    ],
    "markdown": "# Orange Eval Report\n..."
  }
}
```

With explicit report writing:

```bash
orange eval report --write-report --json
```

`data.localReport.written` is `true`, and `data.localReport.file` points under
`.orange-hyper/evals/reports/`. `--write-report` does not accept a path or
value; eval reports are local/generated artifacts, not project memory.

### `eval explain --json`

```bash
orange eval explain --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "eval.explain",
  "data": {
    "schema_version": 2,
    "generated_at": "2026-06-18T01:02:03.000Z",
    "localOnly": true,
    "telemetry": false,
    "networkCall": false,
    "llmJudge": false,
    "hookRun": false,
    "projectMemoryMutation": false,
    "configMutation": false,
    "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
    "project_name": "orange-hyper",
    "boundaries": {
      "local_only": true,
      "external_telemetry": false,
      "network_upload": false,
      "api_call": false,
      "llm_judge_call": false,
      "mcp_call": false,
      "hook_auto_run": false,
      "subagent_run": false,
      "auto_planner_loop": false,
      "project_memory_auto_mutation": false,
      "config_auto_mutation": false,
      "quest_auto_creation": false,
      "proposal_auto_creation": false,
      "graph_auto_creation": false,
      "token_savings_estimation": false,
      "success_rate_improvement_claim": false
    },
    "metrics": [
      {
        "id": "quest.count",
        "label": "Quest count",
        "status": "good",
        "value": 4,
        "source": ".orange-hyper/quests/",
        "explanation": "Counts active and completed Quest markdown files.",
        "limitation": "Counts files only; it does not judge task quality or outcome quality.",
        "unavailable": false,
        "unavailable_reason": null
      },
      {
        "id": "token.savings",
        "label": "Token savings",
        "status": "insufficient-data",
        "value": null,
        "source": "unavailable",
        "explanation": "Orange Hyper does not collect token counts in the local-only eval surface, so token savings are unavailable and not estimated.",
        "limitation": "No token usage collection exists in this local-only eval surface, so savings must remain unavailable.",
        "unavailable": true,
        "unavailable_reason": "token counts are not collected"
      },
      {
        "id": "success_rate.improvement",
        "label": "Success-rate improvement",
        "status": "insufficient-data",
        "value": null,
        "source": "unavailable",
        "explanation": "Orange Hyper does not compare raw-agent and Orange-assisted outcomes in the local-only eval surface, so success-rate improvement is unavailable.",
        "limitation": "No comparison group or task-pack outcome dataset exists, so improvement claims must remain unavailable.",
        "unavailable": true,
        "unavailable_reason": "comparative task-pack outcomes are not collected"
      }
    ]
  }
}
```

### `growth status --json`

```bash
orange growth status --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "growth.status",
  "data": {
    "readOnly": true,
    "deterministic": true,
    "autoUnlock": false,
    "autoMutation": false,
    "projectMemoryMutation": false,
    "configMutation": false,
    "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
    "project_name": "orange-hyper",
    "acceptedMemoryNodes": 3,
    "nodeTypeDistribution": {
      "decision": 2,
      "verification": 1
    },
    "nodeTypeDiversity": 2,
    "dominantAcceptedNodeType": {
      "nodeType": "decision",
      "count": 2
    },
    "routeLayerDistribution": {
      "L3": 1
    },
    "questLayerDistribution": {
      "L2": 5
    },
    "questVerification": {
      "completed": 5,
      "verified": 4,
      "unverified": 1,
      "verifiedRatio": 0.8,
      "unverifiedRatio": 0.2
    },
    "pendingMemoryProposals": 1,
    "doctorOk": true,
    "projectBoundaryActive": true,
    "repeatedEvidenceCount": 14,
    "growthLevel": "branch",
    "growthLevelReason": "Branch requires accepted nodes plus node-type diversity, verified Quest history, repeated evidence, manageable pending proposals, doctor ok, and active project boundary.",
    "growthLevelUnlocks": false,
    "boundaries": {
      "auto_role_creation": false,
      "mcp_auto_install": false,
      "mcp_auto_run": false,
      "hook_policy_auto_change": false,
      "subagent_auto_run": false,
      "project_memory_auto_mutation": false,
      "config_auto_mutation": false,
      "graph_node_auto_creation": false,
      "workflow_enforcement": false
    }
  }
}
```

### `growth suggest --json`

```bash
orange growth suggest --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "growth.suggest",
  "data": {
    "readOnly": true,
    "deterministic": true,
    "llmCall": false,
    "networkCall": false,
    "mcpCall": false,
    "autoUnlock": false,
    "projectMemoryMutation": false,
    "configMutation": false,
    "candidates": [
      {
        "id": "verification-discipline",
        "title": "Verification discipline",
        "score": 86,
        "evidence_count": 5,
        "matched_signals": [
          "memory.verification-node",
          "quest.completed",
          "quest.verified"
        ],
        "reason": "Completed Quest history repeatedly records verification evidence.",
        "evidence": [
          {
            "id": "quest:quest_20260617_000000Z_docs:verified",
            "label": "Verified Quest evidence recorded: document README checks",
            "source": {
              "quest_id": "quest_20260617_000000Z_docs",
              "node_id": null,
              "node_type": null,
              "route_layer": "L2",
              "hook_warning_code": null,
              "mcp_signal_id": null
            },
            "matched_signals": [
              "quest.verified"
            ]
          },
          {
            "id": "node:verification.mem_delta_quest_20260617_000000Z_docs_verification:verification",
            "label": "Accepted memory node mentions verification: README checks stay verified.",
            "source": {
              "quest_id": "quest_20260617_000000Z_docs",
              "node_id": "verification.mem_delta_quest_20260617_000000Z_docs_verification",
              "node_type": "verification",
              "route_layer": "L2",
              "hook_warning_code": null,
              "mcp_signal_id": null
            },
            "matched_signals": [
              "memory.verification-node"
            ]
          }
        ],
        "confidence": "high",
        "suggested_next_step": "Keep using explicit evidence or unverified reasons before accepting new memory proposals.",
        "auto_unlock": false,
        "requires_user_approval": true
      }
    ],
    "no_candidate_reason": null,
    "boundaries": {
      "auto_role_creation": false,
      "mcp_auto_install": false,
      "mcp_auto_run": false,
      "hook_policy_auto_change": false,
      "subagent_auto_run": false,
      "project_memory_auto_mutation": false,
      "config_auto_mutation": false,
      "graph_node_auto_creation": false,
      "workflow_enforcement": false
    }
  }
}
```

### `growth explain --json`

```bash
orange growth explain --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "growth.explain",
  "data": {
    "readOnly": true,
    "deterministic": true,
    "llmCall": false,
    "networkCall": false,
    "mcpCall": false,
    "autoUnlock": false,
    "projectMemoryMutation": false,
    "configMutation": false,
    "explanations": [
      {
        "candidate_id": "verification-discipline",
        "rule_id": "growth.verification-discipline",
        "score": 86,
        "evidence_count": 5,
        "matched_signals": [
          "memory.verification-node",
          "quest.completed",
          "quest.verified"
        ],
        "confidence": "high",
        "evidence": [
          {
            "id": "quest:quest_20260617_000000Z_docs:verified",
            "label": "Verified Quest evidence recorded: document README checks",
            "source": {
              "quest_id": "quest_20260617_000000Z_docs",
              "node_id": null,
              "node_type": null,
              "route_layer": "L2",
              "hook_warning_code": null,
              "mcp_signal_id": null
            },
            "matched_signals": [
              "quest.verified"
            ]
          }
        ],
        "auto_unlock": false,
        "requires_user_approval": true
      }
    ],
    "no_candidate_reason": null,
    "boundaries": {
      "auto_role_creation": false,
      "mcp_auto_install": false,
      "mcp_auto_run": false,
      "hook_policy_auto_change": false,
      "subagent_auto_run": false,
      "project_memory_auto_mutation": false,
      "config_auto_mutation": false,
      "graph_node_auto_creation": false,
      "workflow_enforcement": false
    }
  }
}
```

### `mcp list --json`

```bash
orange mcp list --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "mcp.list",
  "data": {
    "catalog": {
      "count": 4,
      "entries": [
        {
          "id": "context7",
          "name": "Context7",
          "category": "documentation",
          "use_cases": [
            "version-specific library documentation lookup",
            "framework API freshness checks",
            "migration or deprecation review"
          ],
          "useful_when": [
            "framework/library freshness matters",
            "the task depends on current API examples",
            "hallucinated or stale library usage would be costly"
          ],
          "risks": [
            "external documentation context can increase prompt size",
            "documentation results still need user/model review before code changes"
          ],
          "token_impact": "medium",
          "install_hint": "codex mcp add context7 -- npx -y @upstash/context7-mcp",
          "persistent_use_policy": "Use once by default. Persist only after repeated docs-freshness work and explicit user approval."
        },
        {
          "id": "github",
          "name": "GitHub",
          "category": "repository",
          "use_cases": [
            "issue and pull request context",
            "repository discussion or review context",
            "linked commit or branch investigation"
          ],
          "useful_when": [
            "repo issue/PR context matters",
            "the task references external GitHub threads",
            "review comments or issue decisions are needed"
          ],
          "risks": [
            "repository metadata may include private discussion or user data",
            "credentials must stay in the MCP client or provider, not Orange Hyper memory"
          ],
          "token_impact": "medium",
          "install_hint": "codex mcp add github -- <github-mcp-server-command>",
          "persistent_use_policy": "Use once for a specific issue or PR. Persist only for repositories where the user explicitly approves ongoing access."
        },
        {
          "id": "sentry",
          "name": "Sentry",
          "category": "observability",
          "use_cases": [
            "runtime error and incident context",
            "stack trace and release health investigation",
            "production regression triage"
          ],
          "useful_when": [
            "runtime incident/error context exists",
            "stack traces or event samples would change the fix",
            "production release health matters"
          ],
          "risks": [
            "incident data can include sensitive runtime details",
            "high-volume traces can consume many tokens"
          ],
          "token_impact": "high",
          "install_hint": "codex mcp add sentry -- <sentry-mcp-server-command>",
          "persistent_use_policy": "Use once for a bounded incident. Persist only after explicit approval for a specific project and read-only scope."
        },
        {
          "id": "linear",
          "name": "Linear",
          "category": "product",
          "use_cases": [
            "product issue and work item context",
            "roadmap or backlog clarification",
            "task tracking and acceptance criteria lookup"
          ],
          "useful_when": [
            "product/task tracking context is needed",
            "acceptance criteria live outside the repo",
            "work item state changes the implementation scope"
          ],
          "risks": [
            "work items may include private roadmap or customer context",
            "task tracker context should not be copied into project memory wholesale"
          ],
          "token_impact": "medium",
          "install_hint": "codex mcp add linear -- <linear-mcp-server-command>",
          "persistent_use_policy": "Use once for a specific work item. Persist only after repeated product-tracking work and explicit user approval."
        }
      ]
    }
  }
}
```

### `mcp show --json`

```bash
orange mcp show context7 --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "mcp.show",
  "data": {
    "tool": {
      "id": "context7",
      "name": "Context7",
      "category": "documentation",
      "use_cases": [
        "version-specific library documentation lookup",
        "framework API freshness checks",
        "migration or deprecation review"
      ],
      "useful_when": [
        "framework/library freshness matters",
        "the task depends on current API examples",
        "hallucinated or stale library usage would be costly"
      ],
      "risks": [
        "external documentation context can increase prompt size",
        "documentation results still need user/model review before code changes"
      ],
      "token_impact": "medium",
      "install_hint": "codex mcp add context7 -- npx -y @upstash/context7-mcp",
      "persistent_use_policy": "Use once by default. Persist only after repeated docs-freshness work and explicit user approval."
    }
  }
}
```

### `mcp suggest --json`

```bash
orange mcp suggest --query "Spring Security 최신 문서 확인이 필요해" --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "mcp.suggest",
  "data": {
    "readOnly": true,
    "autoInstall": false,
    "autoRun": false,
    "configMutation": false,
    "projectMemoryMutation": false,
    "source_quest_id": null,
    "project": {
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper"
    },
    "input": {
      "query": "Spring Security 최신 문서 확인이 필요해",
      "quest": null
    },
    "state": {
      "doctor": {
        "ok": true,
        "checkCount": 16,
        "errorCount": 0,
        "warningCount": 0,
        "projectBoundaryErrorCount": 0,
        "projectBoundaryWarningCount": 0,
        "diagnosticCodes": []
      },
      "graph": {
        "acceptedMemoryNodeCount": 0,
        "warningCount": 0,
        "warnings": []
      },
      "hook": {
        "previewAvailable": true,
        "installed": false,
        "readOnly": true,
        "autoMutation": false,
        "supportedEvents": ["session-start", "stop"],
        "warningCount": 0
      },
      "warnings": []
    },
    "no_suggestion_reason": null,
    "suggested_next_step": null,
    "suggestions": [
      {
        "mcp_id": "context7",
        "score": 50,
        "confidence": "medium",
        "matched_signals": [
          {
            "signal": "known_framework_or_library",
            "why": "The request names a framework, library, or platform where version-specific docs can matter."
          },
          {
            "signal": "korean_docs_or_version_request",
            "why": "The request asks for latest docs, versions, or API usage."
          }
        ],
        "why_now": "The request names a framework, library, or platform where version-specific docs can matter.",
        "requires_user_approval": true,
        "tool": {
          "id": "context7",
          "name": "Context7",
          "category": "documentation",
          "use_cases": [
            "version-specific library documentation lookup",
            "framework API freshness checks",
            "migration or deprecation review"
          ],
          "useful_when": [
            "framework/library freshness matters",
            "the task depends on current API examples",
            "hallucinated or stale library usage would be costly"
          ],
          "risks": [
            "external documentation context can increase prompt size",
            "documentation results still need user/model review before code changes"
          ],
          "token_impact": "medium",
          "install_hint": "codex mcp add context7 -- npx -y @upstash/context7-mcp",
          "persistent_use_policy": "Use once by default. Persist only after repeated docs-freshness work and explicit user approval."
        },
        "proposal": {
          "tool": {
            "id": "context7",
            "name": "Context7",
            "category": "documentation"
          },
          "why_now": "The request names a framework, library, or platform where version-specific docs can matter.",
          "expected_benefit": "Version-specific documentation can reduce stale API assumptions before code changes.",
          "scope": "read-only documentation lookup for the named framework, library, or API",
          "risk": "External docs context may add tokens and should be summarized before use.",
          "token_impact": "medium",
          "install_command": "codex mcp add context7 -- npx -y @upstash/context7-mcp",
          "use_once_or_persist": "use_once",
          "requires_user_approval": true,
          "not_executed": true,
          "config_mutation": false
        }
      }
    ],
    "proposal_cards": [
      {
        "tool": {
          "id": "context7",
          "name": "Context7",
          "category": "documentation"
        },
        "why_now": "The request names a framework, library, or platform where version-specific docs can matter.",
        "expected_benefit": "Version-specific documentation can reduce stale API assumptions before code changes.",
        "scope": "read-only documentation lookup for the named framework, library, or API",
        "risk": "External docs context may add tokens and should be summarized before use.",
        "token_impact": "medium",
        "install_command": "codex mcp add context7 -- npx -y @upstash/context7-mcp",
        "use_once_or_persist": "use_once",
        "requires_user_approval": true,
        "not_executed": true,
        "config_mutation": false
      }
    ]
  }
}
```

When no catalog signal is strong enough, `mcp.suggest` still succeeds and
returns an explicit no-suggestion state. Abbreviated example:

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "mcp.suggest",
  "data": {
    "readOnly": true,
    "autoInstall": false,
    "autoRun": false,
    "configMutation": false,
    "projectMemoryMutation": false,
    "source_quest_id": null,
    "input": {
      "query": "No tool needed, just explain this concept",
      "quest": null
    },
    "no_suggestion_reason": "No deterministic MCP catalog signal matched the query or Quest context strongly enough for a proposal.",
    "suggested_next_step": "Continue without MCP, or rerun with a specific documentation, repository, incident, or product-tracker need.",
    "suggestions": [],
    "proposal_cards": []
  }
}
```

### `quest new --json`

```bash
orange quest new "Implement adapter JSON contract" --layer L2 --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "quest.new",
  "data": {
    "quest": {
      "id": "quest_20260616_000000Z_implement-adapter-json-contract",
      "file": ".orange-hyper/quests/active/quest_20260616_000000Z_implement-adapter-json-contract.md",
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper",
      "status": "active",
      "layer": "L2",
      "quest_policy": "recommended",
      "output_contract": "implementation",
      "verification_status": "pending"
    },
    "contract": {
      "route": "L2/P2/T2/V2/A0/M0/MB2",
      "layer": "L2",
      "procedure": "P2",
      "tool_budget": "T2",
      "verification": "V2",
      "delegation": "A0",
      "mcp": "M0",
      "memory": "MB2",
      "output_contract": "implementation",
      "quest_policy": "recommended",
      "reason_summary": "bounded implementation work with targeted verification; quest is recommended"
    },
    "next": {
      "route": "orange route --quest quest_20260616_000000Z_implement-adapter-json-contract",
      "capsule": "orange capsule --quest quest_20260616_000000Z_implement-adapter-json-contract"
    },
    "warning": null
  }
}
```

### `route --json`

```bash
orange route --quest quest_20260616_000000Z_implement-adapter-json-contract --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "route.show",
  "data": {
    "trace": {
      "trace_id": "route_20260616_000100Z",
      "created_at": "2026-06-16T00:01:00.000Z",
      "input": "Implement adapter JSON contract",
      "quest_id": "quest_20260616_000000Z_implement-adapter-json-contract",
      "contract": {
        "route": "L2/P2/T2/V2/A0/M0/MB2",
        "layer": "L2",
        "procedure": "P2",
        "tool_budget": "T2",
        "verification": "V2",
        "delegation": "A0",
        "mcp": "M0",
        "memory": "MB2",
        "output_contract": "implementation",
        "quest_policy": "recommended",
        "reason_summary": "bounded implementation work with targeted verification; quest is recommended"
      }
    },
    "contract": {
      "route": "L2/P2/T2/V2/A0/M0/MB2",
      "layer": "L2",
      "procedure": "P2",
      "tool_budget": "T2",
      "verification": "V2",
      "delegation": "A0",
      "mcp": "M0",
      "memory": "MB2",
      "output_contract": "implementation",
      "quest_policy": "recommended",
      "reason_summary": "bounded implementation work with targeted verification; quest is recommended"
    }
  }
}
```

### `capsule --json`

```bash
orange capsule --quest quest_20260616_000000Z_implement-adapter-json-contract --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "capsule.build",
  "data": {
    "capsule": {
      "file": ".orange-hyper/capsules/current.md",
      "content": "# Orange Hyper Current Capsule\n\nGenerated: 2026-06-16T00:02:00.000Z\nSource quest: .orange-hyper/quests/active/quest_20260616_000000Z_implement-adapter-json-contract.md\nProject name: orange-hyper\nProject id: project_550e8400-e29b-41d4-a716-446655440000\n\n## Project Boundary\n\n- Project name: orange-hyper\n- Project id: project_550e8400-e29b-41d4-a716-446655440000\n- Only Quest, Proposal, and Accepted Node artifacts with this project_id are project memory.\n- Unrelated pasted reports, external project docs, and other repo documents are not project memory without an explicit orange import command.\n\n## Quest\n\n- ID: quest_20260616_000000Z_implement-adapter-json-contract\n- Title: Implement adapter JSON contract\n- Status: active\n- Output contract: implementation\n- Quest policy: recommended\n\n## Route Contract\n\nOrange route: L2 · P2 · T2 · V2 · A0 · M0 · MB2\n\n## Request\n\nImplement adapter JSON contract\n\n## Constraints\n\n- Not specified.\n\n## Unknowns\n\n- Not specified.\n\n## Verification\n\n- Expected level: V2\n- Not specified.\n\n## Working Notes\n\n- Keep the work bounded to this capsule unless the user changes the request.\n- Do not treat this capsule as an automatic execution plan.\n"
    },
    "quest": {
      "id": "quest_20260616_000000Z_implement-adapter-json-contract",
      "file": ".orange-hyper/quests/active/quest_20260616_000000Z_implement-adapter-json-contract.md",
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper",
      "status": "active",
      "title": "Implement adapter JSON contract",
      "layer": "L2",
      "quest_policy": "recommended",
      "output_contract": "implementation",
      "verification_status": "pending",
      "verification_evidence": [],
      "unverified_reason": "",
      "completed_at": null
    }
  }
}
```

### `quest done --json`

```bash
orange quest done quest_20260616_000000Z_implement-adapter-json-contract --evidence "npm test passed" --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "quest.done",
  "data": {
    "quest": {
      "id": "quest_20260616_000000Z_implement-adapter-json-contract",
      "file": ".orange-hyper/quests/completed/quest_20260616_000000Z_implement-adapter-json-contract.md",
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper",
      "status": "completed",
      "title": "Implement adapter JSON contract",
      "layer": "L2",
      "quest_policy": "recommended",
      "output_contract": "implementation",
      "verification_status": "verified",
      "verification_evidence": ["npm test passed"],
      "unverified_reason": "",
      "completed_at": "2026-06-16T00:03:00.000Z"
    }
  }
}
```

`--evidence-file <path>` is also valid in JSON mode. The kernel reads the UTF-8
file and records the trimmed content as verification evidence.

### `remember propose --json`

```bash
orange remember propose --quest quest_20260616_000000Z_implement-adapter-json-contract --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "remember.propose",
  "data": {
    "duplicated": false,
    "warnings": [],
    "proposal": {
      "id": "mem_delta_quest_20260616_000000Z_implement-adapter-json-contract_decision",
      "file": ".orange-hyper/proposals/memory-delta/pending/mem_delta_quest_20260616_000000Z_implement-adapter-json-contract_decision.md",
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper",
      "status": "pending",
      "source_quest": "quest_20260616_000000Z_implement-adapter-json-contract",
      "node_type": "decision",
      "confidence": "medium",
      "created_at": "2026-06-16T00:04:00.000Z",
      "updated_at": "2026-06-16T00:04:00.000Z",
      "title": "Implement adapter JSON contract",
      "duplicated": false
    }
  }
}
```

If a matching pending proposal already exists for the same `source_quest`,
`node_type`, and `Candidate Memory`, `remember propose --json` returns the
existing proposal instead of creating another file. In that case
`data.duplicated` and `data.proposal.duplicated` are `true`.

### `remember validate --json`

```bash
orange remember validate mem_delta_quest_20260616_000000Z_implement-adapter-json-contract_decision --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "remember.validate",
  "data": {
    "proposal": {
      "id": "mem_delta_quest_20260616_000000Z_implement-adapter-json-contract_decision",
      "file": ".orange-hyper/proposals/memory-delta/pending/mem_delta_quest_20260616_000000Z_implement-adapter-json-contract_decision.md",
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper",
      "status": "pending",
      "source_quest": "quest_20260616_000000Z_implement-adapter-json-contract",
      "node_type": "decision",
      "confidence": "medium",
      "created_at": "2026-06-16T00:04:00.000Z",
      "updated_at": "2026-06-16T00:04:00.000Z",
      "title": "Implement adapter JSON contract",
      "duplicated": false
    },
    "validation": {
      "valid": true,
      "errors": [],
      "warnings": []
    }
  }
}
```

`remember validate` works for pending, accepted, and rejected proposals. It
checks frontmatter, required sections, quality validation, and source Quest
existence. If validation fails in JSON mode, the command returns a structured
error envelope with command id `remember.validate` and includes the same
proposal/validation data under top-level `data`.

### `remember revise --json`

```bash
orange remember revise mem_delta_quest_20260616_000000Z_implement-adapter-json-contract_decision \
  --candidate "Adapters must validate and revise memory proposals before accepting them." \
  --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "remember.revise",
  "data": {
    "revised": true,
    "revisions": ["candidate"],
    "proposal": {
      "id": "mem_delta_quest_20260616_000000Z_implement-adapter-json-contract_decision",
      "file": ".orange-hyper/proposals/memory-delta/pending/mem_delta_quest_20260616_000000Z_implement-adapter-json-contract_decision.md",
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper",
      "status": "pending",
      "source_quest": "quest_20260616_000000Z_implement-adapter-json-contract",
      "node_type": "decision",
      "confidence": "medium",
      "created_at": "2026-06-16T00:04:00.000Z",
      "updated_at": "2026-06-16T00:05:00.000Z",
      "title": "Implement adapter JSON contract",
      "duplicated": false
    },
    "validation": {
      "valid": true,
      "errors": [],
      "warnings": []
    }
  }
}
```

Accepted and rejected proposals are protected from revise. `remember revise`
also supports `--why "..."` and `--confidence low|medium|high`. A successful
revise updates `updated_at`, writes the proposal file through the kernel, and
reruns quality validation. If the revised `Candidate Memory` duplicates another
pending proposal, revise fails with a JSON error envelope. Adapters should show
that conflict to the user instead of editing `.orange-hyper` files directly.

### `remember list --json` with filters

```bash
orange remember list --status pending --type decision --quest quest_20260616_000000Z_implement-adapter-json-contract --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "remember.list",
  "data": {
    "filters": {
      "status": "pending",
      "type": "decision",
      "quest": "quest_20260616_000000Z_implement-adapter-json-contract"
    },
    "proposals": [
      {
        "id": "mem_delta_quest_20260616_000000Z_implement-adapter-json-contract_decision",
        "file": ".orange-hyper/proposals/memory-delta/pending/mem_delta_quest_20260616_000000Z_implement-adapter-json-contract_decision.md",
        "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
        "project_name": "orange-hyper",
        "status": "pending",
        "source_quest": "quest_20260616_000000Z_implement-adapter-json-contract",
        "node_type": "decision",
        "confidence": "medium",
        "created_at": "2026-06-16T00:04:00.000Z",
        "updated_at": "2026-06-16T00:04:00.000Z",
        "title": "Implement adapter JSON contract",
        "duplicated": false
      }
    ]
  }
}
```

`remember show --json`, `remember accept --json`, and `remember reject --json`
use the same envelope. `accept` is the only command that creates a graph node
candidate, and its JSON payload includes node provenance:

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "remember.accept",
  "data": {
    "proposal": {
      "id": "mem_delta_quest_20260616_000000Z_implement-adapter-json-contract_decision",
      "file": ".orange-hyper/proposals/memory-delta/accepted/mem_delta_quest_20260616_000000Z_implement-adapter-json-contract_decision.md",
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper",
      "status": "accepted",
      "source_quest": "quest_20260616_000000Z_implement-adapter-json-contract",
      "node_type": "decision",
      "confidence": "medium",
      "created_at": "2026-06-16T00:04:00.000Z",
      "updated_at": "2026-06-16T00:05:00.000Z",
      "title": "Implement adapter JSON contract"
    },
    "node": {
      "id": "decision.mem_delta_quest_20260616_000000Z_implement-adapter-json-contract_decision",
      "file": ".orange-hyper/graph/nodes/decision/decision.mem_delta_quest_20260616_000000Z_implement-adapter-json-contract_decision.md",
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper",
      "kind": "decision",
      "node_type": "decision",
      "status": "candidate",
      "confidence": "medium",
      "accepted_at": "2026-06-16T00:05:00.000Z",
      "origin": "memory-delta-proposal",
      "source_proposal": "mem_delta_quest_20260616_000000Z_implement-adapter-json-contract_decision",
      "source_quest": "quest_20260616_000000Z_implement-adapter-json-contract",
      "source_proposal_hash": "sha256...",
      "provenance": {
        "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
        "project_name": "orange-hyper",
        "proposal_id": "mem_delta_quest_20260616_000000Z_implement-adapter-json-contract_decision",
        "source_proposal": "mem_delta_quest_20260616_000000Z_implement-adapter-json-contract_decision",
        "source_quest": "quest_20260616_000000Z_implement-adapter-json-contract",
        "accepted_at": "2026-06-16T00:05:00.000Z",
        "node_type": "decision",
        "origin": "memory-delta-proposal",
        "source_proposal_hash": "sha256..."
      }
    }
  }
}
```

Adapters must not create memory proposal or graph node files directly. They
should call `remember propose`, review with `remember show`,
`remember validate`, and `remember revise`, then wait for user approval through
`remember accept` or `remember reject`.

### `hook preview --json`

```bash
orange hook preview --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "hook.preview",
  "data": {
    "previewAvailable": true,
    "installed": false,
    "readOnly": true,
    "autoMutation": false,
    "project": {
      "initialized": true,
      "orangeRootExists": true,
      "configExists": true,
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper",
      "projectIdExists": true
    },
    "checks": [
      {
        "id": "project_id",
        "label": "project_id exists",
        "target": ".orange-hyper/config.json",
        "current": true
      },
      {
        "id": "doctor.quick",
        "label": "doctor quick check",
        "target": "orange doctor --json",
        "readOnly": true
      },
      {
        "id": "capsule.freshness",
        "label": "capsule freshness check",
        "target": ".orange-hyper/capsules/current.md",
        "readOnly": true
      },
      {
        "id": "identity.summary",
        "label": "identity summary check",
        "target": ".orange-hyper/identity/summary.json",
        "readOnly": true
      },
      {
        "id": "graph.index",
        "label": "graph/index check",
        "target": ".orange-hyper/graph/index.json",
        "readOnly": true
      }
    ],
    "localReport": {
      "directory": ".orange-hyper/hooks/reports",
      "defaultWrite": false,
      "written": false,
      "file": null
    },
    "warnings": []
  }
}
```

`hook preview` does not install a hook. It only describes what the preview would
observe.

### `hook status --json`

```bash
orange hook status --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "hook.status",
  "data": {
    "previewAvailable": true,
    "installed": false,
    "readOnly": true,
    "autoMutation": false,
    "supportedEvents": ["session-start", "stop"],
    "unsupportedEvents": [
      "user-prompt-submit",
      "pre-tool-use",
      "post-tool-use",
      "notification",
      "subagent-stop"
    ],
    "localReport": {
      "directory": ".orange-hyper/hooks/reports",
      "defaultWrite": false,
      "written": false,
      "file": null
    },
    "project": {
      "initialized": true,
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper",
      "projectIdExists": true
    },
    "warnings": []
  }
}
```

### `hook run session-start --json`

```bash
orange hook run session-start --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "hook.runSessionStart",
  "data": {
    "event": "session-start",
    "installed": false,
    "readOnly": true,
    "autoMutation": false,
    "report": {
      "directory": ".orange-hyper/hooks/reports",
      "defaultWrite": false,
      "written": false,
      "file": null
    },
    "observations": {
      "orangeRootExists": true,
      "configExists": true,
      "projectIdExists": true,
      "projectBoundaryActive": true,
      "identitySummaryExists": true,
      "acceptedMemoryNodeCount": 2,
      "doctorQuickStatus": {
        "ok": true,
        "checkCount": 25,
        "errorCount": 0,
        "warningCount": 0,
        "repairCount": 0,
        "projectBoundaryErrorCount": 0,
        "projectBoundaryWarningCount": 0
      }
    },
    "warnings": [],
    "hints": []
  }
}
```

`session-start` never runs `init`, `doctor --repair-project-id`,
`identity build`, or `graph rebuild-index`.

### `hook run stop --json`

```bash
orange hook run stop --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "hook.runStop",
  "data": {
    "event": "stop",
    "installed": false,
    "readOnly": true,
    "autoMutation": false,
    "report": {
      "directory": ".orange-hyper/hooks/reports",
      "defaultWrite": false,
      "written": false,
      "file": null
    },
    "observations": {
      "doctorQuickStatus": {
        "ok": true,
        "checkCount": 25,
        "errorCount": 0,
        "warningCount": 0,
        "repairCount": 0,
        "projectBoundaryErrorCount": 0,
        "projectBoundaryWarningCount": 0
      },
      "completedQuestVerificationAnomalies": [],
      "acceptedGraphNodeProvenanceAnomalies": [],
      "pendingMemoryProposalCount": 0,
      "capsule": {
        "path": "capsules/current.md",
        "exists": true,
        "mtimeMs": 1780000000000,
        "latestSourceMtimeMs": 1780000000000,
        "latestSourcePath": "graph/index.json",
        "stale": false,
        "staleReason": null
      },
      "identity": {
        "path": "identity/summary.json",
        "exists": true,
        "mtimeMs": 1780000000000,
        "latestSourceMtimeMs": 1780000000000,
        "latestSourcePath": "graph/index.json",
        "stale": false,
        "staleReason": null
      },
      "graphIndexExists": true,
      "projectBoundaryActive": true,
      "projectBoundaryWarnings": [],
      "acceptedMemoryNodeCount": 2
    },
    "warnings": [],
    "hints": []
  }
}
```

`stop` never creates proposals, accepts/rejects proposals, rebuilds the graph,
or runs doctor repair. If `--write-report` is passed, the report is created
only under `.orange-hyper/hooks/reports/`; `--write-report` does not accept a
path or filename.

### `hook run stop --write-report --json`

```bash
orange hook run stop --write-report --json
```

The command still returns the normal `hook.runStop` JSON envelope. The only
write is the local report file named in `data.report.file`.

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "hook.runStop",
  "data": {
    "event": "stop",
    "installed": false,
    "readOnly": true,
    "autoMutation": false,
    "report": {
      "directory": ".orange-hyper/hooks/reports",
      "defaultWrite": false,
      "written": true,
      "file": ".orange-hyper/hooks/reports/hook-run-stop-20260617T000000000Z.json"
    },
    "observations": {
      "doctorQuickStatus": {
        "ok": true,
        "checkCount": 25,
        "errorCount": 0,
        "warningCount": 0,
        "repairCount": 0,
        "projectBoundaryErrorCount": 0,
        "projectBoundaryWarningCount": 0
      },
      "completedQuestVerificationAnomalies": [],
      "acceptedGraphNodeProvenanceAnomalies": [],
      "pendingMemoryProposalCount": 0,
      "capsule": {
        "path": "capsules/current.md",
        "exists": true,
        "mtimeMs": 1780000000000,
        "latestSourceMtimeMs": 1780000000000,
        "latestSourcePath": "graph/index.json",
        "stale": false,
        "staleReason": null
      },
      "identity": {
        "path": "identity/summary.json",
        "exists": true,
        "mtimeMs": 1780000000000,
        "latestSourceMtimeMs": 1780000000000,
        "latestSourcePath": "graph/index.json",
        "stale": false,
        "staleReason": null
      },
      "graphIndexExists": true,
      "projectBoundaryActive": true,
      "projectBoundaryWarnings": [],
      "acceptedMemoryNodeCount": 2
    },
    "warnings": [],
    "hints": []
  }
}
```

The report file payload has its own stable schema:

```json
{
  "generated_by": "Orange Hyper",
  "generator_package": "orange-hyper",
  "generator_version": "0.7.0",
  "source_repository": "https://github.com/KoreanCode/orange-hyper",
  "official_package": "https://www.npmjs.com/package/orange-hyper",
  "license": "MIT",
  "schema_version": 1,
  "report_kind": "hook-run-stop",
  "generated_at": "2026-06-17T00:00:00.000Z",
  "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
  "project_name": "orange-hyper",
  "event": "stop",
  "readOnly": true,
  "autoMutation": false,
  "warnings": [
    {
      "code": "HOOK_PENDING_PROPOSALS",
      "message": "1 pending memory proposal needs manual review.",
      "hint": "Run `orange remember list --status pending --json`; hook preview will not accept or reject proposals."
    }
  ],
  "summaries": {
    "doctor": {
      "ok": true,
      "checkCount": 25,
      "errorCount": 0,
      "warningCount": 0,
      "repairCount": 0,
      "diagnosticCodes": []
    },
    "graph": {
      "acceptedMemoryNodeCount": 2,
      "warningCount": 0,
      "warnings": []
    },
    "identity": {
      "path": "identity/summary.json",
      "exists": true,
      "mtimeMs": 1780000000000,
      "latestSourceMtimeMs": 1780000000000,
      "latestSourcePath": "graph/index.json",
      "stale": false,
      "staleReason": null,
      "generatedAt": "2026-06-17T00:00:00.000Z",
      "acceptedMemoryNodes": 2,
      "projectBoundaryActive": true
    },
    "capsule": {
      "path": "capsules/current.md",
      "exists": true,
      "mtimeMs": 1780000000000,
      "latestSourceMtimeMs": 1780000000000,
      "latestSourcePath": "graph/index.json",
      "stale": false,
      "staleReason": null
    }
  },
  "recommended_commands": [
    "orange remember list --status pending --json"
  ]
}
```

Adapters must treat `.orange-hyper/hooks/reports/` as local diagnostic output,
not as project memory. Hook report generation does not create Quest, Proposal,
Graph, Capsule, Identity, config, doctor repair, or graph rebuild writes.

### `graph list --json`

```bash
orange graph list --json
orange graph list --type decision --source-quest quest_20260616_000000Z_adapter-contract --json
orange graph list --source-proposal mem_delta_quest_20260616_000000Z_adapter-contract_decision --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "graph.list",
  "data": {
    "project": {
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper"
    },
    "filters": {
      "type": "decision",
      "source_quest": "quest_20260616_000000Z_adapter-contract",
      "source_proposal": null
    },
    "count": 1,
    "nodes": [
      {
        "id": "decision.mem_delta_quest_20260616_000000Z_adapter-contract_decision",
        "file": ".orange-hyper/graph/nodes/decision/decision.mem_delta_quest_20260616_000000Z_adapter-contract_decision.md",
        "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
        "project_name": "orange-hyper",
        "kind": "decision",
        "node_type": "decision",
        "status": "candidate",
        "confidence": "medium",
        "title": "Adapter JSON contract remains stable.",
        "source_quest": "quest_20260616_000000Z_adapter-contract",
        "source_proposal": "mem_delta_quest_20260616_000000Z_adapter-contract_decision",
        "accepted_at": "2026-06-16T00:05:00.000Z",
        "origin": "memory-delta-proposal",
        "candidate_memory": "Adapter JSON contract remains stable.",
        "summary": "Adapter JSON contract remains stable.",
        "tags": ["adapter", "contract", "decision"],
        "keywords": ["adapter", "contract", "decision"]
      }
    ],
    "warnings": []
  }
}
```

`graph.list` returns only accepted memory nodes for the current config
`project_id`. Pending and rejected proposals are not graph nodes. Cross-project
nodes are excluded from graph results and reported by `doctor`.

Filter fields are echoed in `data.filters`. Unset filters are `null`. Adapters
may use `--type`, `--source-quest`, and `--source-proposal` together.

### `graph show --json`

```bash
orange graph show decision.mem_delta_quest_20260616_000000Z_adapter-contract_decision --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "graph.show",
  "data": {
    "project": {
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper"
    },
    "node": {
      "id": "decision.mem_delta_quest_20260616_000000Z_adapter-contract_decision",
      "file": ".orange-hyper/graph/nodes/decision/decision.mem_delta_quest_20260616_000000Z_adapter-contract_decision.md",
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper",
      "node_type": "decision",
      "title": "Adapter JSON contract remains stable.",
      "source_quest": "quest_20260616_000000Z_adapter-contract",
      "source_proposal": "mem_delta_quest_20260616_000000Z_adapter-contract_decision",
      "accepted_at": "2026-06-16T00:05:00.000Z",
      "candidate_memory": "Adapter JSON contract remains stable.",
      "summary": "Adapter JSON contract remains stable.",
      "content": "---\\nschema_version: 1\\n...\\n"
    },
    "warnings": []
  }
}
```

The selector must be a graph node id, not a path. Path traversal selectors fail
with a structured JSON error envelope.

### `graph search --json`

```bash
orange graph search "adapter contract" --json
orange graph search "adapter contract" --type decision --source-quest quest_20260616_000000Z_adapter-contract --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "graph.search",
  "data": {
    "project": {
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper"
    },
    "filters": {
      "type": "decision",
      "source_quest": "quest_20260616_000000Z_adapter-contract",
      "source_proposal": null
    },
    "query": "adapter contract",
    "count": 1,
    "nodes": [
      {
        "id": "decision.mem_delta_quest_20260616_000000Z_adapter-contract_decision",
        "node_type": "decision",
        "title": "Adapter JSON contract remains stable.",
        "candidate_memory": "Adapter JSON contract remains stable.",
        "source_quest": "quest_20260616_000000Z_adapter-contract",
        "source_proposal": "mem_delta_quest_20260616_000000Z_adapter-contract_decision",
        "matches": ["title", "candidate_memory", "keywords"],
        "score": 87
      }
    ],
    "warnings": []
  }
}
```

v0.3 search is plain text search over node id, title, Candidate Memory/summary,
node type, source quest/proposal, tags, and keywords. Ranking is deterministic
and prefers exact id/title, Candidate Memory, node type, source quest/proposal,
then partial substring matches. It is not fuzzy, semantic, or vector search.

### `graph rebuild-index --json`

```bash
orange graph rebuild-index --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "graph.rebuildIndex",
  "data": {
    "project": {
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper"
    },
    "file": ".orange-hyper/graph/index.json",
    "count": 1,
    "index": {
      "schema_version": 1,
      "index_version": "0.3.0",
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper",
      "updated_at": "2026-06-16T00:05:00.000Z",
      "generated_at": "2026-06-16T00:06:00.000Z",
      "source": "graph-node-markdown",
      "nodes": [
        {
          "id": "decision.mem_delta_quest_20260616_000000Z_adapter-contract_decision",
          "file": ".orange-hyper/graph/nodes/decision/decision.mem_delta_quest_20260616_000000Z_adapter-contract_decision.md",
          "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
          "project_name": "orange-hyper",
          "node_type": "decision",
          "title": "Adapter JSON contract remains stable.",
          "source_quest": "quest_20260616_000000Z_adapter-contract",
          "source_proposal": "mem_delta_quest_20260616_000000Z_adapter-contract_decision",
          "accepted_at": "2026-06-16T00:05:00.000Z",
          "candidate_memory": "Adapter JSON contract remains stable.",
          "summary": "Adapter JSON contract remains stable.",
          "tags": ["adapter", "contract", "decision"],
          "keywords": ["adapter", "contract", "decision"]
        }
      ]
    },
    "warnings": []
  }
}
```

`graph/index.json` is a read model. `rebuild-index` regenerates it from graph
node Markdown and does not edit graph node source files, proposal status, or
memory content. Repeated rebuilds over the same source graph should preserve
semantic fields, including node count/id/type/source/provenance and deterministic
`updated_at`. `generated_at` is generation metadata and is preserved when the
semantic read model has not changed.

### `doctor --json`

```bash
orange doctor --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "doctor.run",
  "data": {
    "ok": true,
    "errors": [],
    "warnings": [],
    "repairs": [],
    "diagnostics": {
      "errors": [],
      "warnings": [],
      "repairs": []
    },
    "checks": [
      ".orange-hyper root exists",
      "config.json exists",
      ".orange-hyper/.gitignore exists",
      "quests/active exists",
      "quests/completed exists",
      "capsules/current.md exists",
      "proposals/memory-delta/pending exists",
      "proposals/memory-delta/accepted exists",
      "proposals/memory-delta/rejected exists",
      "graph/nodes/decision exists",
      "graph/nodes/constraint exists",
      "graph/nodes/component exists",
      "graph/nodes/risk exists",
      "graph/nodes/verification exists",
      "graph/index.json exists",
      "graph/edges.jsonl exists",
      "traces/route.jsonl exists",
      "config.json parses",
      ".orange-hyper/.gitignore policy checked",
      "quests/active/quest_20260616_000000Z_implement-adapter-json-contract.md parses",
      "graph/index.json parses",
      "graph/edges.jsonl has 0 entries",
      "traces/route.jsonl has 1 entry"
    ],
    "project_boundary": {
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper",
      "errors": [],
      "warnings": [],
      "repairs": [],
      "diagnostics": {
        "errors": [],
        "warnings": [],
        "repairs": []
      }
    }
  }
}
```

When doctor finds invalid kernel state, it exits non-zero and keeps the
diagnostics machine-readable:

```json
{
  "ok": false,
  "contract_version": "0.1",
  "command": "doctor.run",
  "error": {
    "code": "DOCTOR_FAILED",
    "message": "Orange doctor found 1 problem(s).",
    "hint": "Run `orange doctor` without --json for human-readable diagnostics."
  },
  "data": {
    "ok": false,
    "errors": [
      "graph/index.json entry decision.orphan is orphaned from source graph nodes"
    ],
    "warnings": [],
    "repairs": [],
    "diagnostics": {
      "errors": [
        {
          "code": "GRAPH_INDEX_ORPHAN_ENTRY",
          "message": "graph/index.json entry decision.orphan is orphaned from source graph nodes",
          "hint": "Run `orange graph rebuild-index` to drop stale read-model entries."
        }
      ],
      "warnings": [],
      "repairs": []
    },
    "checks": [
      ".orange-hyper root exists",
      "config.json exists",
      ".orange-hyper/.gitignore exists",
      "quests/active exists",
      "quests/completed exists",
      "capsules/current.md exists",
      "proposals/memory-delta/pending exists",
      "proposals/memory-delta/accepted exists",
      "proposals/memory-delta/rejected exists",
      "graph/nodes/decision exists",
      "graph/nodes/constraint exists",
      "graph/nodes/component exists",
      "graph/nodes/risk exists",
      "graph/nodes/verification exists",
      "graph/index.json exists",
      "graph/edges.jsonl exists",
      "traces/route.jsonl exists",
      "config.json parses",
      ".orange-hyper/.gitignore policy checked",
      "graph/index.json parses",
      "graph/edges.jsonl has 0 entries",
      "traces/route.jsonl has 0 entries"
    ],
    "project_boundary": {
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper",
      "errors": [],
      "warnings": [],
      "repairs": [],
      "diagnostics": {
        "errors": [],
        "warnings": [],
        "repairs": []
      }
    }
  }
}
```

For legacy project-boundary warnings, `doctor --json` still exits 0 when there
are no hard errors:

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "doctor.run",
  "data": {
    "ok": true,
    "errors": [],
    "warnings": [
      "quest quest_20260616_000000Z_legacy missing project_id (legacy file)"
    ],
    "repairs": [],
    "diagnostics": {
      "errors": [],
      "warnings": [
        {
          "code": "LEGACY_PROJECT_ID_MISSING",
          "message": "quest quest_20260616_000000Z_legacy missing project_id (legacy file)",
          "hint": "Run `orange doctor --repair-project-id` to fill missing legacy project_id fields."
        }
      ],
      "repairs": []
    },
    "checks": ["config.json parses"],
    "project_boundary": {
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper",
      "errors": [],
      "warnings": [
        "quest quest_20260616_000000Z_legacy missing project_id (legacy file)"
      ],
      "repairs": [],
      "diagnostics": {
        "errors": [],
        "warnings": [
          {
            "code": "LEGACY_PROJECT_ID_MISSING",
            "message": "quest quest_20260616_000000Z_legacy missing project_id (legacy file)",
            "hint": "Run `orange doctor --repair-project-id` to fill missing legacy project_id fields."
          }
        ],
        "repairs": []
      }
    }
  }
}
```

For a cross-project mismatch, `doctor --json` exits non-zero and includes the
boundary error in both `data.errors` and `data.project_boundary.errors`.
`orange doctor --repair-project-id --json` may add missing project identity
fields to legacy artifacts; it reports those writes in `data.repairs` and
`data.project_boundary.repairs`.

### `identity build --json`

```bash
orange identity build --json
```

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "identity.build",
  "data": {
    "file": ".orange-hyper/identity/orange-hyper.html",
    "summary_file": ".orange-hyper/identity/summary.json",
    "summary": {
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper",
      "projectId": "project_550e8400-e29b-41d4-a716-446655440000",
      "projectName": "orange-hyper",
      "activeCount": 0,
      "completedCount": 1,
      "verifiedCount": 1,
      "unverifiedCount": 0,
      "pendingMemoryProposals": 0,
      "pendingMemoryProposalsWithWarnings": 0,
      "acceptedMemoryProposals": 1,
      "rejectedMemoryProposals": 0,
      "acceptedMemoryNodes": 1,
      "projectBoundaryActive": true,
      "topProposalNodeTypes": [
        {
          "nodeType": "decision",
          "count": 1
        }
      ],
      "graphPreview": {
        "readOnly": true,
        "editingSupported": false,
        "acceptedMemoryNodes": 1,
        "nodeTypeDistribution": {
          "decision": 1
        },
        "nodes": [
          {
            "id": "decision.mem_delta_quest_20260616_000000Z_adapter-contract_decision",
            "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
            "project_name": "orange-hyper",
            "node_type": "decision",
            "title": "Adapter JSON contract remains stable.",
            "source_quest": "quest_20260616_000000Z_adapter-contract",
            "source_proposal": "mem_delta_quest_20260616_000000Z_adapter-contract_decision",
            "accepted_at": "2026-06-16T00:05:00.000Z",
            "candidate_memory": "Adapter JSON contract remains stable.",
            "summary": "Adapter JSON contract remains stable.",
            "tags": ["adapter", "contract", "decision"],
            "keywords": ["adapter", "contract", "decision"]
          }
        ],
        "sourceLinks": [
          {
            "node_id": "decision.mem_delta_quest_20260616_000000Z_adapter-contract_decision",
            "node_type": "decision",
            "title": "Adapter JSON contract remains stable.",
            "source_quest": "quest_20260616_000000Z_adapter-contract",
            "source_proposal": "mem_delta_quest_20260616_000000Z_adapter-contract_decision",
            "accepted_at": "2026-06-16T00:05:00.000Z"
          }
        ]
      },
      "graphWarnings": [],
      "statusMessages": [
        "Memory proposal review is active.",
        "Graph preview is read-only.",
        "Graph editing is not supported.",
        "Accepted memory nodes are candidate project memory."
      ],
      "routeDistribution": {
        "L2": 1
      }
    }
  }
}
```

## Exit Codes

| Code | Meaning | Seed Kernel expectation |
| --- | --- | --- |
| 0 | success | Command completed and any JSON payload has `"ok": true`. |
| 1 | user/input error | Missing command input, invalid flag combination, unknown command, or missing required evidence. |
| 2 | validation/schema error | Invalid kernel state, invalid quest/frontmatter/route schema, or failed `doctor` validation. |
| 3 | filesystem error | Missing unreadable files, permission failures, or filesystem operations that cannot complete. |
| 4 | internal invariant error | A kernel invariant failed unexpectedly. This should be rare in the Seed Kernel. |

The Seed Kernel prioritizes non-zero failure and clear error messages over perfect
subclassification. Adapters should branch first on `ok`, then on `error.code`
and process exit code when they need more detail.

## Adapter Rules

- Parse only `--json` output.
- Treat human-readable output as unstable display text.
- Call `orange` commands instead of editing `.orange-hyper` state directly.
- Preserve kernel ownership of Quest completion, Route trace, Capsule writes,
  Memory Delta Proposal transitions, Doctor validation, and Identity generation.
- Use `orange adapter dry-run <recipe-id> --json` to inspect invocation recipes
  without executing state-changing commands.
- Do not duplicate Seed Kernel state logic in natural-language workflows.
- Do not add graph editing, MCP, hooks, subagents, role evolution, auto planner,
  or auto execution loop behavior in adapters for the Seed Kernel contract.
- Do not write memory automatically. Only accepted proposals create graph node
  candidates.
