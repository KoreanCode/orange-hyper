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

## 2026-06-20 alpha.8 E2E Attempt

Release status: `blocked`; do not create or push `v1.1.0-alpha.8` from this
attempt.

Environment:

- Date: 2026-06-20 KST.
- Platform: macOS arm64 (`Darwin 25.5.0 arm64`).
- Codex version: `codex-cli 0.133.0`.
- Orange version: `1.1.0-alpha.8`.
- Codex plugin version: `1.1.0-alpha.8`.
- Source commit at start: `bcddda7a140bed6cb9110bea67a8b2b5c3d12f59`.
- Binding fingerprint:
  `71a074d4e20b26184428247323db0b2fbf1e644f72695f2305c804d771a29edb`.

Observed state transitions:

1. Initial `binding status`: `absent`; lifecycle hook execution `none`.
2. `binding plan`: `dry_run: true`; no project files changed.
3. First `binding install`: `pending_install`; user-scoped plugin source and
   marketplace state were prepared.
4. Codex marketplace registration failed because the generated user binding
   wrote `marketplace.json` at the binding root instead of the supported
   `.agents/plugins/marketplace.json` location.
5. After the marketplace path fix, `binding install` wrote the supported
   marketplace layout and `codex plugin marketplace add` succeeded.
6. Codex plugin manager reported `orange-hyper-codex@orange-hyper-user` as
   `installed, enabled` at version `1.1.0-alpha.8`.
7. Project activation applied successfully and reported
   `waiting_for_host_binding` before any complete lifecycle.
8. A new Codex app thread was started and completed a minimal L1 response, but
   no Orange lifecycle heartbeat was written for `SessionStart`,
   `UserPromptSubmit`, or `Stop`.

Scenario results:

| # | Scenario | Result |
| --- | --- | --- |
| 1 | Initial `binding status --host codex --json` | Pass: `absent`, no lifecycle events |
| 2 | `binding plan --host codex --scope user --json` read-only | Pass |
| 3 | `binding install --host codex --scope user --json` | Pass after marketplace path fix |
| 4 | Codex plugin install | Pass through official Codex plugin manager; `/plugins` UI click path not externally verified |
| 5 | Plugin enable | Pass through official Codex plugin manager status; `/plugins` UI click path not externally verified |
| 6 | Codex `/hooks` review and approval | Not externally verified |
| 7 | New Codex thread starts | Pass through Codex app thread creation |
| 8 | Inactive repository lifecycle no-op | Not externally verified in real Codex thread |
| 9 | Test repository project activation | Pass |
| 10 | Before first complete lifecycle status is warming up/partial | Partial: `waiting_for_host_binding`; no real hook event observed |
| 11 | L1 request creates no Quest | Not externally verified because hooks did not run |
| 12 | L2 request creates Quest and Capsule | Not reached |
| 13 | Follow-up continues same Quest | Not reached |
| 14 | Different task creates a new Quest | Not reached |
| 15 | Unrelated L1 Stop does not complete prior L2 Quest | Not reached |
| 16 | Evidence-free L2 Stop continuation exactly once | Not reached |
| 17 | `stop_hook_active` suppresses additional continuation | Not reached |
| 18 | Required events observed in same session and current fingerprint | Fail: no required lifecycle events observed |
| 19 | `activate status` becomes `active` | Fail: remained `waiting_for_host_binding` |
| 20 | Deactivate returns lifecycle to no-op | Not reached |
| 21 | `binding remove` preserves project activation and accepted memory | Partial pass during cleanup: project activation preservation was reported; not verified after an active lifecycle |

Continuation count: not observed; no real `Stop` hook execution was recorded.

Defects found and fixed:

- User-scoped Codex binding wrote the marketplace manifest at the binding root.
  Codex `0.133.0` requires the marketplace manifest under
  `.agents/plugins/marketplace.json`. The binding path now uses
  `CODEX_MARKETPLACE_RELATIVE_PATH`, and the activation runtime test verifies
  the supported layout.

Items not verified:

- Manual `/plugins` UI install and enable flow.
- Manual `/hooks` definition review and approval.
- Real lifecycle hook execution in a new Codex thread.
- L1/L2 routing, Quest/Capsule creation, multi-turn continuity, and Stop
  continuation behavior through real Codex hooks.
- Transition to `active`.
- tag-driven release, GitHub Release assets, npm publication, and hosted
  installer smoke.

Release decision:

- Hold the `v1.1.0-alpha.8` release until a real Codex hook run records
  current-fingerprint `SessionStart`, `UserPromptSubmit`, and `Stop` events.
