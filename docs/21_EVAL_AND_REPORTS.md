# Eval and Reports Preview

Orange Hyper v0.8.0-alpha.0 adds a local-only Eval and Reports Preview.

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

Sections use signal summaries such as `good`, `needs-attention`, and
`insufficient-data`. v0.8 does not produce an overall grade.

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
