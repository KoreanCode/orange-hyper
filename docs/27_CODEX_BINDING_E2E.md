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

## 2026-06-20 alpha.8 Hook Trust Diagnostics

Release status: `blocked`; do not create or push `v1.1.0-alpha.8` from this
attempt.

The earlier "no heartbeat" attempt is reclassified as an inconclusive
pre-trust attempt. The plugin was installed and enabled, but the current hook
definitions had not been reviewed in the real Codex `/hooks` surface, so that
attempt was not evidence of a product-code launcher failure.

Environment:

- Date: 2026-06-20 KST.
- Platform: macOS arm64 (`Darwin 25.5.0 arm64`).
- Codex version: `codex-cli 0.133.0`.
- Orange version: `1.1.0-alpha.8`.
- Codex plugin version: `1.1.0-alpha.8`.
- Validation base commit: `8439d6215eafb915068a288e5885fa0dc1468a2d`.
- Diagnostic commit: pending final merge commit.
- Binding fingerprint:
  `71a074d4e20b26184428247323db0b2fbf1e644f72695f2305c804d771a29edb`.

Setup:

1. A current alpha.8 standalone candidate was built and used through
   `ORANGE_HYPER_BIN`.
2. The E2E target was an isolated temporary git repository with no
   `package.json`, `package-lock.json`, or `node_modules`.
3. `binding status` started as `absent`; `binding plan` was read-only.
4. `binding install` prepared user-scoped binding state and the marketplace at
   `.agents/plugins/marketplace.json`.
5. Codex plugin manager reported
   `orange-hyper-codex@orange-hyper-user` as installed, enabled, and version
   `1.1.0-alpha.8`.
6. `activate apply` initially created only
   `.orange-hyper/local/activation.json` and reported
   `waiting_for_host_binding`, not `active`.

Real `/hooks` discovery and review:

| Hook | Source | Command | Result |
| --- | --- | --- | --- |
| `SessionStart` | `Plugin - orange-hyper-codex@orange-hyper-user` | `"$PLUGIN_ROOT/hooks/run-orange.sh" session-start` | Found and trusted |
| `UserPromptSubmit` | `Plugin - orange-hyper-codex@orange-hyper-user` | `"$PLUGIN_ROOT/hooks/run-orange.sh" user-prompt-submit` | Found and trusted |
| `PostToolUse` | `Plugin - orange-hyper-codex@orange-hyper-user` | `"$PLUGIN_ROOT/hooks/run-orange.sh" post-tool-use` | Found and trusted |
| `Stop` | `Plugin - orange-hyper-codex@orange-hyper-user` | `"$PLUGIN_ROOT/hooks/run-orange.sh" stop` | Found and trusted |

After review, Codex `/hooks` reported one installed and one active hook for
each of `SessionStart`, `UserPromptSubmit`, `PostToolUse`, and `Stop`.

Observed real lifecycle:

| Item | Result |
| --- | --- |
| New Codex thread after hook review | Pass |
| `SessionStart` heartbeat | Pass at `2026-06-20T02:00:43.539Z` |
| L1 `UserPromptSubmit` heartbeat | Pass at `2026-06-20T02:00:43.585Z` |
| L1 `PostToolUse` heartbeat | Pass |
| L1 `Stop` heartbeat | Pass at `2026-06-20T02:02:20.238Z` |
| Same session and binding fingerprint | Pass |
| `activate status` transition | Pass: `active`; binding `operational` |
| L1 Quest/Capsule behavior | Pass: no Quest or Capsule created |
| L2 `UserPromptSubmit` heartbeat | Pass |
| L2 route | Pass: `L2/P2/T2/V2/A0/M0/MB2` |
| L2 Quest and Capsule | Pass: Quest created and current Capsule generated |
| L2 `PostToolUse` heartbeat | Pass |
| L2 verification failure classification | Pass: failed verification was not success evidence |
| L2 `Stop` heartbeat | Blocked: not observed before the interactive session was interrupted |
| L2 continuation count | Blocked: real `Stop` did not complete, so continuation count was not observed |
| Same-work follow-up continuity in real Codex | Blocked |
| Different L2 request creates new Quest in real Codex | Blocked |
| `stop_hook_active` suppression in real Codex | Blocked |

Fixture coverage that passed:

- marketplace standard location.
- plugin bundle includes `hooks/hooks.json`.
- POSIX launcher uses `ORANGE_HYPER_BIN` before PATH lookup.
- POSIX and PowerShell launchers have safe JSON failure behavior.
- inactive repositories no-op without creating Orange state.
- current-fingerprint heartbeat status.
- same-session complete lifecycle.
- L0/L1 no Quest.
- L2 Quest/Capsule creation.
- Quest continuity and different-scope new Quest creation.
- unrelated L1 Stop does not complete a previous L2 Quest.
- missing verification evidence requests continuation exactly once.
- `stop_hook_active` does not request another continuation.
- explicit unverified reason is required before unverified completion.
- raw prompt text is not stored in Quest, Capsule, route trace, or runtime
  artifacts.

Automatic validation that passed on the diagnostic branch:

- `npm test`.
- `npm run typecheck`.
- `npm run check:readme-sync`.
- `git diff --check`.
- `node bin/orange.js --version`.
- `node bin/orange.js env --json`.
- `node bin/orange.js binding status --host codex --json`.
- `node bin/orange.js activate status --host codex --json`.
- `node bin/orange.js doctor --json`.
- `npm run build:standalone`.
- `dist/standalone/orange.cjs --version`.
- `dist/standalone/orange.cjs binding status --host codex --json`.
- `npm run build:sea`.
- `dist/standalone/orange-macos-arm64 --version`.
- `dist/standalone/orange-macos-arm64 binding status --host codex --json`.
- `npm pack --dry-run`.

Defects found and fixed:

- The marketplace path defect was fixed in the preserved
  `codex/activation-runtime-alpha8-e2e` branch and merged before this run.
- `activate apply` initialized the full project memory tree before the first
  L2 lifecycle event. It now writes only activation-local state; L2+ lifecycle
  events initialize the project workspace only when Quest/Capsule artifacts are
  actually needed.
- L2 lifecycle artifacts previously used raw prompt text in durable Quest and
  Capsule content. They now store a bounded summary with intent and scope
  signatures instead of raw prompt text.
- The regression suite now executes the POSIX hook launcher against a fake
  candidate `ORANGE_HYPER_BIN`, proving the launcher does not silently select an
  older PATH binary first.

Root cause for the original no-heartbeat observation:

- The hook definitions were pending real Codex `/hooks` review. After reviewing
  and trusting the current definitions, Orange recorded `SessionStart`,
  `UserPromptSubmit`, `PostToolUse`, and `Stop` heartbeats from the installed
  plugin source. No plugin discovery, bundle path, executable permission,
  launcher JSON, or Host Bridge failure was confirmed in the trusted-hook run.

Items not verified in real Codex:

- L2 `Stop` after successful verification evidence.
- Evidence-free L2 `Stop` continuation exactly once.
- `stop_hook_active` no-second-continuation behavior.
- Same-work real follow-up continuing the same Quest.
- Clearly different real L2 work creating a new Quest.
- Real completed L2 Quest with verification evidence or explicit unverified
  reason.

Release decision:

- Keep the `v1.1.0-alpha.8` release gate blocked. The hook trust blocker is
  resolved, but a full real Codex L2 Stop/continuation lifecycle was not
  observed before session interruption. The automated fixture suite covers the
  behavior, but fixture success is not real Codex E2E success.
