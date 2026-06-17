# MCP Advisor

Orange Hyper v0.5.0-alpha.1 keeps MCP Advisor as a read-only recommendation
layer. It is not MCP integration.

The advisor can explain when an MCP may help, but it does not install, run,
configure, or persist MCP access. The user must approve any install/use step
outside Orange Hyper.

## Command Surface

```bash
orange mcp list [--json]
orange mcp show <mcp-id> [--json]
orange mcp suggest [--quest <quest-id>] [--query <text>] [--json]
```

JSON command ids:

- `mcp.list`
- `mcp.show`
- `mcp.suggest`

All JSON output uses the Adapter JSON Contract envelope with
`contract_version: "0.1"`.

## Catalog

v0.5 starts with a small built-in catalog:

| id | category | useful when |
| --- | --- | --- |
| `context7` | documentation | 최신 library/framework docs, version-specific APIs, migration/deprecation checks |
| `github` | repository | issue/PR/repo context, review comments, commits, branches |
| `sentry` | observability | runtime errors, incidents, stack traces, production regressions |
| `linear` | product | product work items, tickets, roadmap/backlog, acceptance criteria |

Each catalog entry exposes:

- `id`
- `name`
- `category`
- `use_cases`
- `useful_when`
- `risks`
- `token_impact`
- `install_hint`
- `persistent_use_policy`

Install hints are displayed only as user-facing commands or placeholders. Orange
Hyper never executes them.

## Suggestion Logic

`orange mcp suggest` reads current project state and request context:

- Quest context when `--quest <quest-id>` is provided
- free text query when `--query <text>` is provided
- Doctor summary
- Graph summary
- Hook preview/status boundary

The advisor then returns zero or more proposal cards:

- framework/library freshness -> `context7`
- repo issue/PR connection -> `github`
- runtime incident/error context -> `sentry`
- product/task tracking context -> `linear`

No suggestion is a command to act. It is only a card the user can evaluate.

Scoring is deterministic and local-only. Orange Hyper does not call an LLM,
network service, MCP server, installer, or config writer while scoring. Each
matched catalog signal contributes a fixed score. Suggestions include:

- `score`
- `confidence`: `low`, `medium`, or `high`
- `matched_signals`
- `why_now`
- `requires_user_approval: true`

Current signal coverage is intentionally small and multilingual:

| signal family | examples | recommendation |
| --- | --- | --- |
| docs/version/API/library/framework | latest docs, version, API, library, framework, 최신 문서, 버전, 라이브러리, 프레임워크 | `context7` |
| repository work | issue, PR, repository, pull request, 이슈, 저장소, 커밋 | `github` |
| runtime incident | error, incident, stacktrace, exception, 에러, 장애, 예외 | `sentry` |
| product work | product, ticket, task, roadmap, work item, 제품, 티켓, 로드맵 | `linear` |

## No Suggestion

If the query or Quest context does not contain enough catalog signal, the
advisor returns no recommendation instead of forcing a weak match.

JSON output uses:

- `suggestions: []`
- `proposal_cards: []`
- `no_suggestion_reason`
- `suggested_next_step`

Human output prints `현재 MCP 제안 없음` with the reason and next step. This is
the expected state for ordinary explanation or implementation requests that do
not need an external MCP.

## Ranking

When multiple MCPs match, suggestions are sorted by descending `score`.
Ties are resolved by built-in catalog order, then by MCP id. The same input
must return the same order across runs.

## Quest-Based Suggestions

`--quest` accepts both active and completed Quest ids or paths. Completed
Quests are allowed because they can contain useful request and notes context
for follow-up work. The advisor reads the Quest title, Request section,
frontmatter constraints, and Notes section. It avoids treating route metadata,
verification plans, completion evidence, or project memory as broad semantic
signals.

Quest-based JSON includes `source_quest_id`. The advisor does not modify the
Quest file.

## Proposal Card

Human and JSON output include:

- `tool`
- `why_now`
- `expected_benefit`
- `scope`
- `risk`
- `token_impact`
- `install_command`
- `use_once_or_persist`
- `requires_user_approval: true`
- `not_executed: true`
- `config_mutation: false`

Example:

```json
{
  "tool": {
    "id": "context7",
    "name": "Context7",
    "category": "documentation"
  },
  "why_now": "The request asks for latest docs, versions, or API usage.",
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
```

## Project Boundary

MCP proposals are not project memory.

The advisor does not create Quest files, Memory Delta Proposals, accepted graph
nodes, graph indexes, route traces, hook reports, or config changes. If a user
wants to preserve a durable lesson learned from an MCP-assisted task, they
should finish the task and create a separate Quest/Memory Proposal through the
normal project-memory flow.

## Hook Relationship

Hooks do not automatically suggest, install, or run MCPs in v0.5.

Hook reports do not include MCP Advisor summaries by default. The advisor only
runs when the user explicitly calls `orange mcp ...`.

## Explicit Non-Goals

- MCP automatic installation
- MCP automatic execution
- MCP config automatic modification
- API key storage
- external network calls
- hook-triggered MCP install/run/suggest
- subagent execution
- role evolution
- auto planner
- auto execution loop
- unapproved state changes
