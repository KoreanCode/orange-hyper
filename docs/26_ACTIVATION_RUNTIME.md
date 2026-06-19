# Activation Runtime

Orange Activation Runtime v0.1 turns Orange Hyper from a CLI-only kernel into an
opt-in lifecycle binding for supported coding-agent hosts.

User contract:

```text
Install the Orange Codex Host Binding once.
Activate Orange in the repositories where you want it.
Then work normally.
```

Binary installation alone does not mean Orange is active. A local marketplace
entry alone does not mean the Codex plugin is installed or enabled. Project
activation alone does not mean lifecycle hooks are operational.

## Two Lifecycles

Orange separates Host Binding from Project Activation.

| Lifecycle | Scope | Owns | Must not own |
| --- | --- | --- | --- |
| Host Binding | user Codex environment | Orange Codex plugin source, personal marketplace root, binding metadata, binding fingerprint, host health hints | repo activation, project memory, Codex plugin cache, hook trust store |
| Project Activation | repository | `.orange-hyper/local/activation.json`, activation policy, project-local runtime and episodes | marketplace registration, plugin installation, plugin enablement, hook trust, user binding removal |

The final shape is:

```text
User Codex Environment
  Orange Host Binding
  personal marketplace
  Orange plugin
  meta-skill
  lifecycle hooks

Repository
  .orange-hyper/local/activation.json
  .orange-hyper/local/runtime/
  .orange-hyper/local/episodes/
```

Inactive repositories return quiet hook no-ops.

## CLI Surface

Binding commands use the Adapter JSON envelope and keep
`contract_version: "0.1"`:

```bash
orange binding plan --host codex --scope user --json
orange binding install --host codex --scope user --json
orange binding status --host codex --json
orange binding remove --host codex --scope user --json
```

Command ids:

- `binding.plan`
- `binding.install`
- `binding.status`
- `binding.remove`

Activation commands remain project-scoped:

```bash
orange activate plan --host codex --scope project --json
orange activate apply --host codex --scope project --json
orange activate status --host codex --json
orange activate remove --host codex --scope project --json
```

Command ids:

- `activation.plan`
- `activation.apply`
- `activation.status`
- `activation.remove`

Lifecycle commands also use the Adapter JSON envelope:

```bash
orange lifecycle session-start --host codex --from-stdin --json
orange lifecycle user-prompt-submit --host codex --from-stdin --json
orange lifecycle post-tool-use --host codex --from-stdin --json
orange lifecycle stop --host codex --from-stdin --json
```

Codex hooks call the host bridge instead:

```bash
orange host codex hook session-start
orange host codex hook user-prompt-submit
orange host codex hook post-tool-use
orange host codex hook stop
```

The host bridge returns Codex-native hook JSON, not the Adapter JSON envelope.

## Binding Commands

`binding plan` is read-only. It reports:

- Codex executable detection
- Orange executable and version
- plugin version
- deterministic binding fingerprint
- user data path
- marketplace state
- plugin availability, installation, and enablement state
- current hook execution state
- legacy project-local binding state
- planned writes, removals, and external commands
- conflicts, restart hints, user actions, and rollback availability

`binding install` writes only user-scoped Orange-owned binding files. The default
layout is:

```text
${ORANGE_HYPER_HOME:-~/.orange-hyper}/bindings/codex/
  marketplace.json
  plugins/orange-hyper-codex/
  binding.json
```

The command prepares the marketplace root and plugin source. If Codex plugin
installation, enablement, or hook review cannot be reliably automated through
official Codex surfaces, the command returns user actions instead of claiming
the binding is operational.

`binding status` reports independent state:

| Field | Values |
| --- | --- |
| marketplace | `absent`, `registered`, `degraded`, `unknown` |
| plugin availability | `unavailable`, `available`, `unknown` |
| plugin installation | `not_installed`, `installed`, `unknown` |
| plugin enabled | `enabled`, `disabled`, `unknown` |
| hook execution | `none`, `partial`, `current`, `stale`, `degraded` |
| effective status | `absent`, `pending_install`, `pending_enable`, `pending_review_or_restart`, `operational`, `partial`, `stale`, `degraded`, `unknown` |

Forbidden inferences:

- marketplace exists = plugin installed
- plugin source exists = plugin enabled
- no heartbeat = hook trust rejected
- one heartbeat = full lifecycle healthy

When Codex does not expose a state in a machine-readable way, Orange reports
`unknown`.

`binding remove` removes only Orange-owned user-scoped marketplace, plugin
source, and binding metadata. It preserves:

- other Codex marketplaces and plugins
- unrelated Codex config
- project activation
- completed Quests
- accepted proposals
- accepted Memory Graph

If official plugin uninstall is not available, Orange does not delete Codex
plugin cache. It returns an action telling the user to remove the plugin from
Codex `/plugins`.

Removal status is intentionally partial and explicit:

```json
{
  "removal_status": {
    "source_removed": true,
    "marketplace_removed": true,
    "metadata_removed": true,
    "installed_plugin_status": "unknown",
    "enabled_status": "unknown",
    "effective_status": "pending_user_uninstall_or_disable"
  },
  "next_actions": [
    "disable Orange Hyper in Codex /plugins if still enabled",
    "uninstall Orange Hyper in Codex /plugins if still installed",
    "start a new Codex thread",
    "recheck binding status"
  ]
}
```

Orange must not summarize this as a complete uninstall when Codex-side
installed/enabled state is not observable.

## Project Activation

`activate apply` performs only repo-local work:

- idempotent project init when needed
- `.orange-hyper/local/activation.json`
- `.orange-hyper/local/runtime/`
- `.orange-hyper/local/episodes/`
- activation policy

It does not:

- register a marketplace
- materialize plugin source
- install or enable a plugin
- mutate hook trust
- remove user-scoped binding
- create `package.json`, `package-lock.json`, `node_modules`, or project npm
  dependencies

Host Binding can be absent when a project is activated. In that case status is:

```json
{
  "project_activated": true,
  "effective_status": "waiting_for_host_binding"
}
```

`activate remove` removes only project-local activation and runtime state. It
preserves user binding and durable memory.

## Legacy Binding Migration

Earlier Activation Runtime builds could write project-local Codex binding files
under `.agents/plugins/`. Orange now treats these as legacy binding artifacts.

Migration order:

1. write user-scoped bundle
2. validate bundle ownership and structure
3. write personal marketplace root
4. confirm the user-scoped bundle exists
5. remove only Orange-owned legacy artifacts

Rules:

- user-scope install failure preserves legacy state
- unrelated marketplace entries are preserved
- artifacts without Orange ownership markers are not deleted automatically
- partial migration returns a recovery action
- `.orange-hyper` memory and activation are preserved

## Fingerprint and Health

The binding fingerprint is a deterministic SHA-256 over the host bridge schema
version and plugin bundle inputs:

- plugin manifest
- hooks definition
- POSIX launcher
- PowerShell launcher
- meta-skill

This is an Orange bundle fingerprint. It is not a Codex internal trust hash.

Heartbeat records at least:

- `schema_version`
- `host`
- `event`
- `plugin_version`
- `orange_version`
- `binding_fingerprint`
- hashed session key
- hashed turn key
- `session_start_at`
- `latest_prompt_at`
- `stop_at`
- `complete_lifecycle_at`
- `observed_at`

Required operational events:

- `SessionStart`
- `UserPromptSubmit`
- `Stop`

Optional event:

- `PostToolUse`

Default freshness window: 24 hours from `complete_lifecycle_at`.

A complete lifecycle is one hashed session key, one binding fingerprint, one
Orange version, and one plugin version where all required events have been
observed. Orange must not merge `SessionStart` from one session with
`UserPromptSubmit` or `Stop` from another session.

Hook execution status:

| Status | Meaning |
| --- | --- |
| `none` | no current-fingerprint event exists |
| `partial` | some required same-session events exist |
| `current` | a complete same-session lifecycle exists for the current fingerprint/version and is inside the freshness window |
| `stale` | only previous fingerprint/version events exist, or the complete lifecycle is outside the freshness window |
| `degraded` | launcher or lifecycle error exists |
| `unknown` | current execution cannot be determined from the available machine-readable evidence |

Project active requires both project activation and current-fingerprint required
events inside the freshness window. A single heartbeat is not enough.

Orange reports lifecycle health, not direct Codex hook trust. Unless Codex
exposes hook trust through a machine-readable surface, `hook_trust.trusted`
remains `false` and `hook_trust.status` remains `unknown` even after a current
lifecycle.

## Windows Hook Requirements

Every Codex command hook includes `commandWindows`.

Windows launchers must:

- tolerate spaces in `PLUGIN_ROOT`
- emit exactly one Codex-native JSON object on stdout
- avoid UTF-8 BOM and progress output
- avoid requiring Node or Python in the launcher itself
- support `ORANGE_HYPER_BIN`
- support `orange.exe` on `PATH`
- support the official user-local Orange install fallback
- return valid safe JSON on launcher failure

Source and fixture tests validate this behavior. Direct Windows execution must
be reported separately from source/fixture validation.

## Quest Continuity

UserPromptSubmit resolves continuity without an LLM API.

Result values:

- `none`
- `create_new`
- `continue_existing`

Local session state stores:

- hashed session and turn keys
- current turn's linked Quest
- recent Quest ids
- normalized intent signature
- scope signature
- continuity confidence

Rules:

- L0/L1 create no Quest
- L2+ with no active Quest creates a Quest
- same session with same scope or explicit follow-up continues the current Quest
- clearly different scope/component creates a new Quest
- ambiguous follow-up continues with low confidence

Stop processes only the current turn's linked Quest. An unrelated L1 turn cannot
complete a previous L2 Quest.

## Verification Soft Gate

PostToolUse evidence is observation, not a complete test runner. Absence of
observed evidence must be phrased as:

```text
Orange가 현재 turn에서 verification evidence를 관찰하지 못했습니다.
```

Stop policy:

- L0/L1: no default block
- L2+ with evidence: verified completion candidate
- L2+ without evidence: exactly one continuation
- `stop_hook_active` or second Stop: no repeated continuation
- evidence later appears: verified completion
- explicit reason exists: unverified completion
- no evidence and no reason: do not mark verified; keep Quest incomplete

Continuation idempotency includes project, session, turn, quest, and binding
fingerprint.

## Privacy

Activation Runtime is local-only:

- no telemetry
- no network upload
- no transcript parsing
- no raw prompt in session continuity state
- no raw full tool-output storage
- no automatic MCP install or run
- no LLM judge
- no Memory Proposal auto-accept

`transcript_path` from Codex hook input is ignored because it is convenience
data, not the stable lifecycle state source.

## Actual Codex E2E Status

Fixture and local CLI tests can verify Orange's state model, JSON contracts,
launcher source, and no-op behavior. They do not prove that a user's Codex UI
has installed the plugin, enabled it, reviewed hooks, or restarted into the new
hook definitions.

Until a real Codex UI path is executed and observed, report:

```text
not externally verified
```

for plugin install, enablement, hook review, required lifecycle events, and
active operational behavior.

## Non-goals

Activation Runtime v0.1 does not implement:

- `orange-hyper-run` fusion
- Claude Code or IDE binding
- project-specific Skill/Agent generation
- subagent execution
- MCP automatic install or run
- role unlock
- L5 autonomous loop
- branch, PR, or SPEC workflow
- Memory Proposal auto-accept
- telemetry or network upload
- Identity Dashboard redesign
- Codex plugin cache direct mutation
- hook trust silent bypass
- tag, npm publish, or GitHub Release execution
