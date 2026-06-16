# Adapter Contract

Orange Hyper v0.2.0 stable is still a Seed Kernel. The `orange` CLI is the kernel
control plane, not the final end-user UX.

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

`contract_version` is the adapter-facing JSON contract version. v0.2.0 stable keeps
`"0.1"` as the stable Seed Kernel adapter contract and appears in both success
and failure envelopes.

`command` uses dot notation. The Seed Kernel command ids are:

- `quest.new`
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

## Command Examples

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
      "traces/route.jsonl exists",
      "config.json parses",
      ".orange-hyper/.gitignore policy checked",
      "quests/active/quest_20260616_000000Z_implement-adapter-json-contract.md parses",
      "traces/route.jsonl has 1 entry"
    ],
    "project_boundary": {
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper",
      "errors": [],
      "warnings": [],
      "repairs": []
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
      ".orange-hyper/quests/active/broken.md failed to parse: Missing YAML frontmatter."
    ],
    "warnings": [],
    "repairs": [],
    "checks": [
      ".orange-hyper root exists",
      "config.json exists",
      ".orange-hyper/.gitignore exists",
      "quests/active exists",
      "quests/completed exists",
      "capsules/current.md exists",
      "traces/route.jsonl exists",
      "config.json parses",
      ".orange-hyper/.gitignore policy checked",
      "traces/route.jsonl has 0 entries"
    ],
    "project_boundary": {
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper",
      "errors": [],
      "warnings": [],
      "repairs": []
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
    "checks": ["config.json parses"],
    "project_boundary": {
      "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
      "project_name": "orange-hyper",
      "errors": [],
      "warnings": [
        "quest quest_20260616_000000Z_legacy missing project_id (legacy file)"
      ],
      "repairs": []
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
      "topProposalNodeTypes": [
        {
          "nodeType": "decision",
          "count": 1
        }
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
- Do not duplicate Seed Kernel state logic in natural-language workflows.
- Do not add Memory Graph, MCP, hooks, subagents, role evolution, auto planner,
  or auto execution loop behavior in adapters for the Seed Kernel contract.
- Do not write memory automatically. Only accepted proposals create graph node
  candidates.
