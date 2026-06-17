# Growth Signal Preview

Orange Hyper v0.6.0-alpha.1 hardens Growth Signal Preview quality.

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
- `growthLevelReason`
- conservative inputs such as `nodeTypeDiversity`, `doctorOk`,
  `projectBoundaryActive`, and `repeatedEvidenceCount`

`growthLevel` is decorative. It does not imply role unlock, MCP install, hook
policy changes, graph node creation, subagent execution, workflow enforcement,
or project memory mutation.

### Level Calibration

`growthLevel` is intentionally conservative. Accepted node count alone is not
enough to advance the label.

The level calculation considers:

- accepted memory node count
- accepted node type diversity
- verified completed Quest ratio
- repeated evidence count
- pending memory proposal count
- whether `orange doctor` is ok
- whether the project boundary is active

Calibration:

| Level | Conservative threshold |
| --- | --- |
| `seed` | Default. Also used when project boundary is missing or doctor is not ok. |
| `sprout` | Requires repeated evidence plus at least one accepted node, at least two completed Quests, or pending proposal evidence. |
| `branch` | Requires accepted nodes, at least two node types, at least five completed Quests, verified ratio >= 0.7, repeated evidence >= 6, manageable pending proposals, doctor ok, and active project boundary. |
| `canopy` | Requires at least eight accepted nodes, at least three node types, at least ten completed Quests, verified ratio >= 0.8, repeated evidence >= 14, low pending review load, doctor ok, and active project boundary. |

Pending proposals do not count as accepted project memory. A high pending review
load prevents higher labels even when other evidence is present.

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
  "score": 86,
  "evidence_count": 5,
  "matched_signals": ["memory.verification-node", "quest.completed", "quest.verified"],
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
      "matched_signals": ["quest.verified"]
    }
  ],
  "confidence": "high",
  "suggested_next_step": "Keep using explicit evidence or unverified reasons before accepting new memory proposals.",
  "auto_unlock": false,
  "requires_user_approval": true
}
```

Candidate thresholds require repeated evidence, source diversity, and matched
signal diversity. A single generic string match is not enough. For example,
generic `API` text in a Route Contract does not create the backend/API focus
candidate unless a non-generic backend, endpoint, service, data-access, auth,
server, request, or response signal also repeats.

Ranking is deterministic:

1. higher `score`
2. candidate id alphabetical order for ties

The preview never creates roles, installs MCPs, edits hook policy, runs
subagents, creates graph nodes, writes project memory, or starts a planner loop.

## Explain

`orange growth explain` explains why each candidate appeared. It uses the same
deterministic evidence and rule set as `growth suggest`.

Each explanation includes `score`, `evidence_count`, `matched_signals`, and
source-backed evidence. Evidence sources may include:

- `quest_id`
- `node_id`
- `node_type`
- `route_layer`
- `hook_warning_code`
- `mcp_signal_id`

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

The summary includes:

- growth level reason
- candidate count
- top candidates
- growth confidence summary
- `No automatic unlocks`

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

v0.6.0-alpha.1 intentionally stops at preview hardening:

- no role automatic creation
- no MCP automatic installation or execution
- no hook policy automatic change
- no subagent automatic execution or recommendation loop
- no auto planner or auto execution loop
- no project memory automatic mutation
- no graph node automatic creation
- no workflow enforcement
