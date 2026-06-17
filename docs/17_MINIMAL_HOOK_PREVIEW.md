# Minimal Hook Preview

Orange Hyper v0.4.0-alpha.1 hardens the minimal hook preview introduced in
v0.4.0-alpha.0. It is a
read-only, warning-first command surface, not a strong harness and not an
adapter runtime.

The preview shows what a future hook layer could observe at session start or
stop. It does not install hooks, register MCP servers, run subagents, evolve
roles, or start an automatic planner/execution loop.

## Scope

Included commands:

```bash
orange hook preview
orange hook status
orange hook run session-start
orange hook run stop
```

All commands support `--json` and use Adapter JSON Contract
`contract_version: "0.1"`.

Command ids:

- `hook.preview`
- `hook.status`
- `hook.runSessionStart`
- `hook.runStop`

## Read-only contract

Hook preview may observe and warn. It must not mutate project memory or fix
state unless the user runs an explicit state-changing command themselves.

The hook preview must not:

- create a Quest automatically
- create a Memory Delta Proposal automatically
- accept or reject proposals automatically
- rebuild the graph automatically
- run doctor repair automatically
- build identity automatically
- generate a capsule automatically
- install an MCP server
- start a subagent
- unlock or evolve roles
- run an auto planner or auto execution loop
- force branch, PR, or SPEC workflow

The JSON results explicitly expose:

```json
{
  "readOnly": true,
  "autoMutation": false
}
```

The no-mutation invariant covers these project-memory areas by default:

- `.orange-hyper/quests/`
- `.orange-hyper/proposals/`
- `.orange-hyper/graph/`
- `.orange-hyper/capsules/`
- `.orange-hyper/identity/`
- `.orange-hyper/config.json`

`--write-report` is the only hook option that writes a file, and that write is
limited to `.orange-hyper/hooks/reports/`. Hook reports are local diagnostics,
not project memory.

## Warning shape and codes

Hook warnings use a stable adapter-facing shape:

```json
{
  "code": "HOOK_PENDING_PROPOSALS",
  "message": "1 pending memory proposal needs manual review.",
  "hint": "Run `orange remember list --status pending --json`; hook preview will not accept or reject proposals."
}
```

Current hook warning codes include:

- `HOOK_PROJECT_ID_MISSING`
- `HOOK_CONFIG_UNREADABLE`
- `HOOK_ORANGE_ROOT_MISSING`
- `HOOK_IDENTITY_SUMMARY_MISSING`
- `HOOK_IDENTITY_SUMMARY_STALE`
- `HOOK_CAPSULE_MISSING`
- `HOOK_CAPSULE_STALE`
- `HOOK_PENDING_PROPOSALS`
- `HOOK_DOCTOR_NOT_OK`
- `HOOK_DOCTOR_WARNINGS`
- `HOOK_GRAPH_WARNING`
- `HOOK_GRAPH_PROVENANCE_WARNING`
- `HOOK_PROJECT_BOUNDARY_WARNING`
- `HOOK_COMPLETED_QUEST_VERIFICATION_ANOMALY`

Adapters should branch on `code`, display `message`, and offer `hint` as the
manual next step. Hook warnings never imply that the hook has repaired or will
repair the underlying state.

## Freshness criteria

Capsule and identity freshness use a simple mtime comparison. The hook compares
each generated artifact against the newest source file among:

- `.orange-hyper/config.json`
- active and completed Quest files
- pending, accepted, and rejected Memory Delta Proposal files
- accepted graph node files
- `.orange-hyper/graph/index.json`

If `.orange-hyper/capsules/current.md` is older than that newest source by more
than a 1 ms filesystem tolerance, the hook emits `HOOK_CAPSULE_STALE`. If
`.orange-hyper/identity/summary.json` is older by the same rule, it emits
`HOOK_IDENTITY_SUMMARY_STALE`.

This is intentionally not a freshness engine. The hook does not compare graph
semantics, rebuild indexes, generate capsules, or build identity output.

## `orange hook preview`

`orange hook preview` shows what the preview would check in the current
project. It does not install a hook.

Preview checks:

- whether `project_id` exists
- doctor quick check target
- capsule freshness check target
- identity summary check target
- graph/index check target
- local report directory
- `autoMutation: false`
- `readOnly: true`

## `orange hook status`

`orange hook status` summarizes the preview state:

- `previewAvailable: true`
- `installed: false`
- `readOnly: true`
- `autoMutation: false`
- `supportedEvents: ["session-start", "stop"]`
- future unsupported events such as `user-prompt-submit` and `post-tool-use`

## `orange hook run session-start`

`session-start` performs read-only observation only.

It checks:

- whether `.orange-hyper` exists
- whether `config.project_id` exists
- whether Project Boundary is active
- whether the identity summary exists
- accepted memory node count
- doctor quick status

If something is missing, the command returns warnings and hints. It does not
run `orange init`, `orange doctor --repair-project-id`, `orange identity build`,
or `orange graph rebuild-index`.

## `orange hook run stop`

`stop` performs a read-only end-of-work check.

It checks:

- doctor quick status
- completed Quest verification anomalies
- accepted graph node provenance anomalies
- pending memory proposal count
- stale or missing capsule/identity warnings
- project boundary mismatch warnings

It does not create proposals, accept/reject proposals, rebuild the graph, or
run doctor repair.

## Local hook report

Hook reports are off by default. No report file is created unless
`--write-report` is passed.

When enabled, reports are written only under:

```text
.orange-hyper/hooks/reports/
```

That directory is ignored by default. Reports contain project identity plus
doctor, graph, capsule, and identity summaries. They do not modify project
memory and do not include a project memory import path.

`--write-report` does not accept a path or filename. The kernel chooses a safe
filename under the reports directory to avoid path traversal.

Report payloads use this stable schema:

```json
{
  "schema_version": 1,
  "generated_at": "2026-06-17T00:00:00.000Z",
  "project_id": "project_550e8400-e29b-41d4-a716-446655440000",
  "project_name": "orange-hyper",
  "event": "stop",
  "readOnly": true,
  "autoMutation": false,
  "warnings": [
    {
      "code": "HOOK_IDENTITY_SUMMARY_MISSING",
      "message": "Identity summary is missing.",
      "hint": "Run `orange identity build` explicitly if a refreshed identity summary is needed."
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
      "acceptedMemoryNodeCount": 0,
      "warningCount": 0,
      "warnings": []
    },
    "identity": {
      "path": "identity/summary.json",
      "exists": false,
      "mtimeMs": null,
      "latestSourceMtimeMs": 1780000000000,
      "latestSourcePath": "graph/index.json",
      "stale": false,
      "staleReason": null,
      "generatedAt": null,
      "acceptedMemoryNodes": null,
      "projectBoundaryActive": null
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
    "orange identity build"
  ]
}
```

`recommended_commands` are manual commands for the adapter or user to present.
They are not executed by the hook preview.

## Adapter boundary

This is not a Codex-only or Claude-only adapter. The command surface is a kernel
preview that any adapter can call through the CLI.

The real adapter layer remains v0.7 scope. v0.4 only adds the minimal hook
preview command surface and the read-only observation behavior described here.
