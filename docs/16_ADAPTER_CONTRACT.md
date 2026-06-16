# Adapter Contract

Orange Hyper v0.1 is a Seed Kernel. The `orange` CLI is the kernel control
plane, not the final end-user UX.

Human-readable output exists for people who run commands directly. Skills,
agents, natural-language adapters, and other integration layers must parse only
`--json` output. They must not scrape human-readable text.

Adapters must not directly modify files under `.orange-hyper/`. They should call
`orange` commands and let the kernel own state transitions, validation, route
trace writes, capsule generation, quest completion, and identity output. A
natural-language workflow may translate user intent into kernel commands, but it
must not copy or reimplement kernel state logic.

## JSON Envelope

Successful JSON output uses this envelope:

```json
{
  "ok": true,
  "command": "quest new",
  "data": {}
}
```

Structured failures use this envelope:

```json
{
  "ok": false,
  "command": "quest done",
  "error": {
    "code": "USER_INPUT_ERROR",
    "message": "Completion requires --evidence or --unverified.",
    "hint": "Run `orange --help` for command usage, or rerun without --json for human-readable diagnostics."
  }
}
```

In JSON mode, adapters should read stdout as JSON. Human-readable diagnostics are
reserved for non-JSON command usage.

## Command Examples

### `quest new --json`

```bash
orange quest new "Implement adapter JSON contract" --layer L2 --json
```

```json
{
  "ok": true,
  "command": "quest new",
  "data": {
    "quest": {
      "id": "quest_20260616_000000Z_implement-adapter-json-contract",
      "file": ".orange-hyper/quests/active/quest_20260616_000000Z_implement-adapter-json-contract.md",
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
  "command": "route",
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
  "command": "capsule",
  "data": {
    "capsule": {
      "file": ".orange-hyper/capsules/current.md",
      "content": "# Orange Hyper Current Capsule\n\nGenerated: 2026-06-16T00:02:00.000Z\n..."
    },
    "quest": {
      "id": "quest_20260616_000000Z_implement-adapter-json-contract",
      "file": ".orange-hyper/quests/active/quest_20260616_000000Z_implement-adapter-json-contract.md",
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
  "command": "quest done",
  "data": {
    "quest": {
      "id": "quest_20260616_000000Z_implement-adapter-json-contract",
      "file": ".orange-hyper/quests/completed/quest_20260616_000000Z_implement-adapter-json-contract.md",
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

### `doctor --json`

```bash
orange doctor --json
```

```json
{
  "ok": true,
  "command": "doctor",
  "data": {
    "ok": true,
    "errors": [],
    "warnings": [],
    "checks": [".orange-hyper root exists"]
  }
}
```

When doctor finds invalid kernel state, it exits non-zero and keeps the
diagnostics machine-readable:

```json
{
  "ok": false,
  "command": "doctor",
  "error": {
    "code": "DOCTOR_FAILED",
    "message": "Orange doctor found 1 problem(s).",
    "hint": "Run `orange doctor` without --json for human-readable diagnostics."
  },
  "data": {
    "ok": false,
    "errors": ["broken quest failed to parse: Missing YAML frontmatter."],
    "warnings": [],
    "checks": []
  }
}
```

### `identity build --json`

```bash
orange identity build --json
```

```json
{
  "ok": true,
  "command": "identity build",
  "data": {
    "file": ".orange-hyper/identity/orange-hyper.html",
    "summary": {
      "projectName": "orange-hyper",
      "activeCount": 1,
      "completedCount": 1,
      "verifiedCount": 1,
      "unverifiedCount": 0,
      "routeDistribution": {
        "L2": 1
      }
    }
  }
}
```

## Exit Codes

| Code | Meaning | v0.1 expectation |
| --- | --- | --- |
| 0 | success | Command completed and any JSON payload has `"ok": true`. |
| 1 | user/input error | Missing command input, invalid flag combination, unknown command, or missing required evidence. |
| 2 | validation/schema error | Invalid kernel state, invalid quest/frontmatter/route schema, or failed `doctor` validation. |
| 3 | filesystem error | Missing unreadable files, permission failures, or filesystem operations that cannot complete. |
| 4 | internal invariant error | A kernel invariant failed unexpectedly. This should be rare in v0.1. |

v0.1 prioritizes non-zero failure and clear error messages over perfect
subclassification. Adapters should branch first on `ok`, then on `error.code`
and process exit code when they need more detail.

## Adapter Rules

- Parse only `--json` output.
- Treat human-readable output as unstable display text.
- Call `orange` commands instead of editing `.orange-hyper` state directly.
- Preserve kernel ownership of Quest completion, Route trace, Capsule writes,
  Doctor validation, and Identity generation.
- Do not duplicate Seed Kernel state logic in natural-language workflows.
- Do not add Memory Graph, MCP, hooks, subagents, role evolution, auto planner,
  or auto execution loop behavior in adapters for the v0.1 Seed Kernel contract.
