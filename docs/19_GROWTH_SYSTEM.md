# Growth Signal Preview

Orange Hyper v0.6.0-alpha.0 adds Growth Signal Preview.

This is not an automatic growth system. It is a read-only preview that observes
repeated evidence from Quest, Route, accepted Memory Graph, Hook warning, and
MCP-advisor-shaped signals, then suggests possible growth candidates.

Core rule:

```text
Observe repeated evidence.
Suggest growth.
Do not unlock roles/tools automatically.
```

## Command Surface

```bash
orange growth status
orange growth suggest
orange growth explain
```

All commands support `--json` and use the Adapter JSON Contract:

```bash
orange growth status --json
orange growth suggest --json
orange growth explain --json
```

Command ids:

- `growth.status`
- `growth.suggest`
- `growth.explain`

## Status

`orange growth status` reads the current project state and summarizes:

- `project_id` / `project_name`
- accepted memory node count
- accepted node type distribution
- dominant accepted node type
- route layer distribution
- Quest layer distribution
- verified/unverified completed Quest ratio
- pending memory proposal count
- Hook warning summary
- MCP advisor signal summary
- `growthLevel`: `seed`, `sprout`, `branch`, or `canopy`

`growthLevel` is decorative. It does not imply role unlock, MCP install, hook
policy changes, graph node creation, subagent execution, workflow enforcement,
or project memory mutation.

## Suggest

`orange growth suggest` uses deterministic rules to propose growth candidates
when evidence repeats.

Candidate examples:

- verification discipline
- memory hygiene
- backend/API focus
- documentation focus
- MCP documentation advisor readiness
- hook hygiene

Every candidate includes:

```json
{
  "id": "verification-discipline",
  "title": "Verification discipline",
  "reason": "Completed Quest history repeatedly records verification evidence.",
  "evidence": ["2 completed Quests observed", "2/2 completed Quests verified"],
  "confidence": "medium",
  "suggested_next_step": "Keep using explicit evidence or unverified reasons before accepting new memory proposals.",
  "auto_unlock": false,
  "requires_user_approval": true
}
```

The preview never creates roles, installs MCPs, edits hook policy, runs
subagents, creates graph nodes, writes project memory, or starts a planner loop.

## Explain

`orange growth explain` explains why each candidate appeared. It uses the same
deterministic evidence and rule set as `growth suggest`.

It does not use:

- LLM calls
- network calls
- MCP calls
- automatic planner or execution loops

The output is useful for adapters that need to show evidence without scraping
human-readable text.

## Identity Dashboard

`orange identity build` now includes a compact Growth Signal Preview summary in
the generated HTML and summary JSON.

The Identity Dashboard still does not include:

- graph editor
- role system
- automatic unlock controls
- MCP install or run controls
- hook policy controls

## Hook and MCP Boundaries

Hooks do not run Growth Signal Preview automatically. Growth commands run only
when the user or adapter explicitly invokes `orange growth ...`.

MCP Advisor does not generate growth candidates. Growth may observe
documentation/API freshness-shaped signals, but it does not call MCP Advisor,
install MCPs, run MCP tools, or write MCP config.

## Release Boundary

v0.6.0-alpha.0 intentionally stops at preview:

- no role automatic creation
- no MCP automatic installation or execution
- no hook policy automatic change
- no subagent automatic execution or recommendation loop
- no auto planner or auto execution loop
- no project memory automatic mutation
- no graph node automatic creation
- no workflow enforcement
