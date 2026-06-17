# Eval and Reports Preview

Orange Hyper v0.8.0-alpha.1 hardens the local-only Eval and Reports Preview
introduced in v0.8.0-alpha.0.

This is not telemetry. It does not upload data, call external APIs, call an LLM
judge, run MCP servers, run hooks automatically, start subagents, or mutate
project memory/config. It reads the current `.orange-hyper` project state and
shows conservative signal summaries.

## Commands

```bash
orange eval snapshot
orange eval report
orange eval explain
```

All commands support `--json` and keep Adapter JSON `contract_version: "0.1"`.

Command ids:

- `eval.snapshot`
- `eval.report`
- `eval.explain`

## `orange eval snapshot`

`eval snapshot` summarizes current local project state.

Included signals:

- `project_id` / `project_name` from `.orange-hyper/config.json`
- Quest count from `.orange-hyper/quests/`
- completed Quest count from `.orange-hyper/quests/completed/`
- verified / unverified completed Quest count
- Memory Delta Proposal count from `.orange-hyper/proposals/memory-delta/`
- accepted / rejected / pending proposal count
- accepted graph node count from `.orange-hyper/graph/nodes/`
- doctor errors/warnings count from `runDoctor(cwd)` without repair
- hook warning summary from the latest local hook report when present
- MCP Advisor catalog availability and local MCP-shaped signal count
- growth candidate count from deterministic Growth Signal Preview
- adapter recipe count from built-in adapter recipes
- identity report existence under `.orange-hyper/identity/`

Snapshot does not run `doctor --repair-project-id`, `graph rebuild-index`,
`identity build`, hook events, MCP tools, or adapter recipes.

## `orange eval report`

`eval report` creates a Markdown report from the same local-only snapshot.

By default it writes only to stdout:

```bash
orange eval report
orange eval report --json
```

It writes a file only when explicitly requested:

```bash
orange eval report --write-report
orange eval report --write-report --json
```

Report files are written only under:

```text
.orange-hyper/evals/reports/
```

`--write-report` does not accept a path or value. This keeps report path
selection inside the kernel and prevents path traversal.

The report starts as Markdown. v0.8 does not add an HTML dashboard.

## Report Sections

The Markdown report includes:

- Project Summary
- Quest Completion
- Verification Honesty
- Memory Proposal Flow
- Graph Memory Health
- Doctor Diagnostics
- Hook Warning Usefulness
- MCP Advisor Signals
- Growth Signal Preview
- Adapter Invocation Readiness
- Known Gaps

Sections use only these status values:

- `good`: local evidence exists and the section has no current warning,
  unverified item, pending review item, or diagnostic error.
- `needs-attention`: local evidence exists and shows a warning, error,
  pending review item, unverified completed Quest, or other explicit follow-up.
- `insufficient-data`: the required local source is missing, no relevant local
  evidence exists yet, or the metric is intentionally unavailable.

Every section includes:

- `status`
- `reason`
- `evidence_count`

`evidence_count` counts referenced metrics with available local evidence and a
status other than `insufficient-data`. Unavailable metrics do not increase the
count. v0.8 does not produce a score, rank, or grade.

The top of the Markdown report includes a short summary:

- project name / project id
- `generated_at`
- report mode: `local-only`
- total section count
- `needs-attention` section count
- `insufficient-data` section count
- no telemetry / no network / no LLM judge

## JSON Report Schema

`orange eval report --json` returns an adapter-friendly JSON payload. Existing
camelCase boundary fields remain available, and v0.8.0-alpha.1 adds the fixed
snake_case fields shown below.

```json
{
  "report_id": "eval-report-20260618T010203000Z",
  "schema_version": 2,
  "generated_at": "2026-06-18T01:02:03.000Z",
  "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
  "project_name": "orange-hyper",
  "local_only": true,
  "telemetry": false,
  "network_upload": false,
  "llm_judge": false,
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
  "sections": [
    {
      "title": "Project Summary",
      "status": "good",
      "reason": "Project identity exists and local project signals can be summarized.",
      "evidence_count": 4,
      "metrics": ["project.identity", "quest.count"]
    }
  ],
  "known_gaps": [
    {
      "id": "token.savings",
      "status": "insufficient-data",
      "reason": "Token counts are not collected by the local-only Eval and Reports Preview.",
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
      "limitation": "No token usage collection exists in this local-only preview, so savings must remain unavailable."
    }
  ]
}
```

## `orange eval explain`

`eval explain` describes where each metric came from.

Examples:

- `quest.count` comes from `.orange-hyper/quests/`.
- `quest.completed`, `quest.verified`, and `quest.unverified` come from
  `.orange-hyper/quests/completed/`.
- `memory.proposals` comes from
  `.orange-hyper/proposals/memory-delta/{pending,accepted,rejected}/`.
- `graph.accepted_nodes` comes from the current-project graph reader over
  `.orange-hyper/graph/nodes/`.
- `doctor.errors` and `doctor.warnings` come from local doctor diagnostics
  without repair.
- `hook.warnings` comes from existing local hook report files when present.
  Eval does not run hook events automatically.
- `hook.warning.usefulness` comes from the same existing local hook report. If
  there is no hook report, the status is `insufficient-data`.
- `memory.acceptance_rate` is calculated from proposal state:
  accepted proposals divided by total proposals. It is not a success-rate
  improvement claim.
- `mcp.advisor.availability` comes from the built-in read-only MCP Advisor
  catalog and local MCP-shaped growth signals. It does not call MCP servers.
- `growth.candidates` comes from deterministic local Growth Signal Preview.
- `adapter.recipes` comes from built-in adapter invocation recipes.
- `identity.report.exists` checks `.orange-hyper/identity/summary.json` and
  `.orange-hyper/identity/orange-hyper.html`.

## Conservative Metrics

Eval metrics are count-based or warning-based.

Allowed status values:

- `good`
- `needs-attention`
- `insufficient-data`

Unavailable metrics stay unavailable. v0.8 does not estimate:

- token savings
- success-rate improvement
- model capability improvement
- raw-agent versus Orange-assisted outcome deltas

The preview must not claim improvements such as "90% success-rate increase" or
"tokens saved" without collected evidence.

Current unavailable metric policy:

- `token.savings`: unavailable because token counts are not collected.
- `success_rate.improvement`: unavailable because there is no comparison group
  or comparative task-pack outcome dataset.
- unavailable metrics use `value: null`, `status: "insufficient-data"`, and an
  explicit `limitation`.

## Local-Only Boundary

Eval commands must not:

- upload telemetry
- call network APIs
- call an LLM judge
- estimate token savings
- auto-create Quest, Proposal, Graph, or Identity artifacts
- run MCP tools or install MCP servers
- run hook events automatically
- run subagents
- start an auto planner or auto execution loop
- repair doctor findings
- mutate project memory or config

The only eval write path is `orange eval report --write-report`, and that path
is limited to `.orange-hyper/evals/reports/`.

`--write-report` does not accept a path, filename, or value. Report filenames
use a deterministic `eval-report-` prefix plus the report timestamp. The report
is a local generated artifact, not project memory.

## Identity Integration

`identity build` does not automatically include eval summaries in
v0.8.0-alpha.1. Eval reports remain available only through explicit
`orange eval report` commands. A user-approved identity summary integration may
be considered as a future target, but it is not part of this alpha.
