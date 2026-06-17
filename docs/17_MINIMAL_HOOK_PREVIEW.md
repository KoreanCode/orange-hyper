# Minimal Hook Preview

Orange Hyper v0.4.0-alpha.0 introduces a minimal hook preview. It is a
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

That directory is ignored by default. Reports contain only doctor, Project
Boundary, capsule, and identity summaries. They do not modify project memory and
do not include a project memory import path.

`--write-report` does not accept a path or filename. The kernel chooses a safe
filename under the reports directory to avoid path traversal.

## Adapter boundary

This is not a Codex-only or Claude-only adapter. The command surface is a kernel
preview that any adapter can call through the CLI.

The real adapter layer remains v0.7 scope. v0.4 only adds the minimal hook
preview command surface and the read-only observation behavior described here.
