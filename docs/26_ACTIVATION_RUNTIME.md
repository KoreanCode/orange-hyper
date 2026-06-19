# Activation Runtime

Orange Activation Runtime v0.1 turns Orange Hyper from a CLI-only kernel into an
opt-in lifecycle binding for supported coding-agent hosts.

Product contract:

```text
Orange Hyper becomes automatic after one-time activation on a supported host.
Binary installation alone does not mean the project is active.
```

The guiding principle is:

```text
Strong attachment, adaptive ceremony.
```

Attachment is deterministic: if a project is activated and Codex hooks are
installed/trusted, lifecycle events call Orange automatically. Ceremony is
adaptive: L0/L1 stay light, while L2+ can create Quest, Context Capsule,
verification evidence, working memory, and pending Memory Proposal candidates.

## Installed vs Active

Orange distinguishes these states:

| State | Meaning |
| --- | --- |
| `installed` | An `orange` executable exists on PATH or at a known user-local install path. |
| `initialized` | The current project has `.orange-hyper/config.json`. |
| `binding_installed` | The Codex binding bundle is available from the project marketplace. |
| `pending_trust` | Activation policy and binding material exist, but no lifecycle heartbeat has been observed. |
| `active` | Activation policy exists and a real lifecycle heartbeat has been recorded. |
| `degraded` | Activation exists, but a lifecycle or binding part is unavailable or inconsistent. |
| `inactive` | Orange may be installed, but this project has no activation policy. |

`orange activate status --host codex --json` must not return `active` merely
because a binary exists. A lifecycle heartbeat under
`.orange-hyper/local/runtime/heartbeat.json` is required.

## CLI Surface

Activation commands use the Adapter JSON envelope and keep
`contract_version: "0.1"`:

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

Provider-neutral lifecycle commands also use the Adapter JSON envelope:

```bash
orange lifecycle session-start --host codex --from-stdin --json
orange lifecycle user-prompt-submit --host codex --from-stdin --json
orange lifecycle post-tool-use --host codex --from-stdin --json
orange lifecycle stop --host codex --from-stdin --json
```

Command ids:

- `lifecycle.sessionStart`
- `lifecycle.userPromptSubmit`
- `lifecycle.postToolUse`
- `lifecycle.stop`

Codex hooks call the host bridge instead:

```bash
orange host codex hook session-start
orange host codex hook user-prompt-submit
orange host codex hook post-tool-use
orange host codex hook stop
```

The host bridge returns Codex-native hook JSON, not the Adapter JSON envelope.

## Activation State

Project activation policy is local state, not shared project memory:

```text
.orange-hyper/local/activation.json
.orange-hyper/local/runtime/
.orange-hyper/local/episodes/
```

The default policy allows only activation-scoped local automation:

```json
{
  "schema_version": 1,
  "host": "codex",
  "scope": "project",
  "mode": "adaptive",
  "status": "pending_trust",
  "policy": {
    "automatic": {
      "project_init": true,
      "route": true,
      "quest_from": "L2",
      "capsule": true,
      "working_memory": true,
      "verification_evidence_capture": true,
      "quest_completion": true,
      "pending_memory_proposal": true,
      "growth_evidence": true
    },
    "approval_required": {
      "memory_accept": true,
      "mcp_install": true,
      "persistent_mcp": true,
      "skill_materialization": true,
      "agent_materialization": true,
      "write_capable_agent": true,
      "external_side_effect": true,
      "destructive_operation": true,
      "raid_mode": true
    }
  }
}
```

The refined memory rule is:

```text
No automatic durable/shared-memory acceptance.
```

Activation-scoped local state, Quest state, verification evidence, working
memory, and pending proposal candidates may be written automatically. Accepted
Memory Graph writes still require explicit `remember accept`.

## Codex Binding

The first-party Codex plugin bundle lives at:

```text
adapters/codex/plugin/
  .codex-plugin/plugin.json
  skills/orange-hyper/SKILL.md
  hooks/hooks.json
  hooks/run-orange.sh
  hooks/run-orange.ps1
```

`activate apply` materializes an Orange-owned project-local copy under:

```text
.agents/plugins/orange-hyper-codex/
.agents/plugins/marketplace.json
```

The plugin contains one small `orange-hyper` skill and four lifecycle command
hooks:

- `SessionStart`
- `UserPromptSubmit`
- `PostToolUse`
- `Stop`

It does not include MCP servers, custom subagents, project-specific generated
skills/agents, role packs, planner loops, or `orange-hyper-run`.

Codex hook trust is a Codex user action. `activate apply` does not claim that
hooks are trusted. Until a heartbeat is observed, status remains
`pending_trust`.

## Responsibilities

| Layer | Owns |
| --- | --- |
| Lifecycle Kernel | activation policy, Route, Quest, Capsule, evidence, Stop verification, working episodes, pending proposal candidates |
| Codex Host Bridge | Codex hook input mapping and Codex-native hook output mapping |
| Codex Agent | code edits, tool execution, user-facing implementation, verification commands |
| Plugin Bundle | one meta-skill, hook declarations, cross-platform launcher |

Adapters must not edit `.orange-hyper` files directly or duplicate lifecycle
state logic. They call Orange Kernel commands.

## Event Behavior

### SessionStart

Inactive project:

- no state creation
- no context injection
- quiet no-op

Activated project:

- records heartbeat
- checks project boundary
- reads a bounded doctor summary
- reads a small accepted-memory slice
- returns `hookSpecificOutput.additionalContext`

The default context limit is 3,200 characters, which is a conservative
approximation for the requested roughly 800-token budget.

### UserPromptSubmit

UserPromptSubmit reads one JSON object from stdin, normalizes and redacts the
prompt, determines Route, and applies Route policy:

- L0: no Quest, no Capsule, no visible Orange ceremony.
- L1: no Quest by default; may return a tiny touched-surface reminder.
- L2: creates a Quest and Context Capsule; expected V2 verification.
- L3: creates a Quest and stronger investigation context; no automatic subagent.
- L4: returns a Codex block asking for explicit confirmation.
- L5: never auto-enters; explicit opt-in required.

The idempotency key includes project, host, session id, turn id, event name, and
tool use id when present. Re-running the same turn does not create duplicate
Quests.

### PostToolUse

PostToolUse runs after the tool already had its side effects. It is not a
rollback boundary.

It may record bounded evidence for:

- Bash test/build/lint/typecheck commands
- `apply_patch` touched paths
- supported MCP source identifiers and timestamps

It does not store:

- raw full stdout/stderr
- raw secrets
- full patches
- full MCP responses
- transcript files

Failed tests are recorded as failed attempts, not success evidence.

### Stop

Stop checks the active turn/Quest, Route verification level, collected evidence,
and `stop_hook_active`.

For L2+ Quests:

- if required evidence is missing, Stop asks Codex to continue once with a
  specific verification prompt;
- if continuation already happened or evidence remains unavailable, it records
  an unverified reason and avoids an infinite loop;
- if evidence exists, it completes the Quest as verified;
- it writes a local episode;
- it creates a pending Memory Proposal only when a durable candidate is
  detected.

Pending proposals are never auto-accepted.

## Working Memory vs Durable Memory

Working memory:

- local/generated
- automatically writable
- low confidence
- stored under `.orange-hyper/local/`
- ignored by git

Durable memory:

- accepted Memory Graph
- explicit review/accept required
- provenance required
- shared project truth

Flow:

```text
tool/session evidence
-> local episode
-> durable candidate quality check
-> pending Memory Proposal
-> user review
-> explicit accept
-> accepted Memory Graph
```

## Failure and Degraded Behavior

Host bridge failures return safe Codex-native no-op JSON with a system message
instead of breaking the user's whole task.

Examples:

- missing `orange` executable in hook launcher
- malformed stdin JSON
- activation policy missing
- untrusted hooks that have not produced heartbeat

Policy blocks still use Codex-native block output when required, for example L4
confirmation or Stop verification continuation.

## Remove and Rollback

`orange activate remove --host codex --scope project --json` removes only
Orange-owned activation state and the Orange-owned Codex binding material.

It preserves:

- completed Quests
- accepted proposals
- accepted Memory Graph
- user code
- unrelated Codex plugins, hooks, marketplace entries, and config

The marketplace is losslessly merged. Existing unrelated entries are preserved.

## Privacy

Activation Runtime is local-only:

- no telemetry
- no network upload
- no transcript parsing
- no raw full tool-output storage
- no automatic MCP install or run
- no LLM judge

`transcript_path` from Codex hook input is ignored because Codex documents it as
convenience data, not a stable hook interface.

## Non-goals

Activation Runtime v0.1 does not implement:

- `orange-hyper-run` fusion
- Claude Code adapter
- IDE adapter
- automatic MCP install/run
- custom subagent execution
- project-specific skill or agent generation
- role unlock
- autonomous planner
- L5 repair loop
- branch/PR/SPEC workflow
- telemetry
- network upload
- LLM judge
- Memory Proposal auto-accept
