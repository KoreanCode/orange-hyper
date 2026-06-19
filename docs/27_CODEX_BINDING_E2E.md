# Codex Binding E2E Checklist

This document separates Orange fixture validation from a real Codex UI
end-to-end run.

Default user sentence:

```text
Install the Orange Codex Host Binding once.
Activate Orange in the repositories where you want it.
Then work normally.
```

## State Model

Keep these states independent:

- marketplace registration
- plugin installation
- plugin enablement
- hook review
- lifecycle heartbeat
- project activation
- operational status

Do not infer plugin installation from marketplace registration. Do not infer
plugin enablement from plugin source existence. Do not infer full lifecycle
health from one heartbeat.

## Local Fixture Checklist

These can be verified without the Codex UI:

1. `orange binding plan --host codex --scope user --json` is read-only.
2. `orange binding install --host codex --scope user --json` writes only
   user-scoped Orange-owned binding state.
3. `orange binding status --host codex --json` keeps unknown install/enable
   states as `unknown` when Codex does not expose them.
4. `orange activate apply --host codex --scope project --json` writes only
   project-local activation/runtime state.
5. inactive repositories return lifecycle no-op JSON.
6. current-fingerprint `SessionStart`, `UserPromptSubmit`, and `Stop` are
   required before project status can become active.
7. previous-fingerprint heartbeats are `stale`.
8. follow-up prompts continue the current Quest when scope matches.
9. unrelated L1 turns do not complete previous L2 Quests.
10. missing verification evidence produces exactly one continuation.
11. all Codex hooks include `commandWindows`.
12. POSIX and PowerShell launchers return one safe JSON object on failure.

## Real Codex UI Checklist

These require actual Codex UI interaction and must be reported as
`not externally verified` unless performed:

1. binding status before install is absent or an exact pending state.
2. binding plan is read-only.
3. binding install prepares the personal marketplace and plugin source.
4. Orange plugin is installed from Codex `/plugins`.
5. Orange plugin is enabled.
6. current hook definitions are reviewed in Codex `/hooks`.
7. a new Codex thread starts after plugin/hook changes.
8. inactive repository lifecycle hooks no-op.
9. project activation runs in the target repository.
10. before the first complete lifecycle, status is warming up or partial.
11. L1 prompt creates no Quest.
12. L2 prompt creates a Quest and Capsule.
13. follow-up prompt for the same work links to the same Quest.
14. clearly different work creates a new Quest.
15. unrelated L1 Stop does not complete the previous Quest.
16. evidence-free L2 Stop requests continuation exactly once.
17. `stop_hook_active` does not trigger a second continuation.
18. `SessionStart`, `UserPromptSubmit`, and `Stop` make the binding current.
19. expired freshness fixture makes the binding stale.
20. bundle fingerprint change makes the heartbeat stale.
21. hook review/restart makes the new fingerprint current.
22. project deactivation returns lifecycle hooks to no-op.
23. binding removal preserves project activation and accepted memory while
    reporting Codex-side installed/enabled state as unknown.

E2E evidence may record only:

- Codex version
- Orange version
- plugin version
- binding fingerprint
- platform
- status transitions
- observed event kinds and timestamps
- Quest ids
- continuation count

Do not record secrets, raw prompts, raw transcripts, or private absolute paths.

## Reporting Rule

Fixture success is not real Codex E2E success. If plugin install, enablement,
hook review, required lifecycle events, or active status were not observed in
the real Codex UI, report them as `not externally verified`.
