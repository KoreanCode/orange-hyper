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
- Codex version: `codex-cli 0.141.0`.
- Orange version: `1.1.0-alpha.8`.
- Codex plugin version: `1.1.0-alpha.8`.
- Validation base commit: `92890995467a98107700daa424c8bdf7fd1343f0`.
- Diagnostic commit: `Diagnose Codex plugin hooks for alpha.8`.
- Binding fingerprint:
  `df05c483c1e949a3065df56a4531108da6c3a1a2542eeb6583e45511a1835bd1`.

Setup:

1. A current alpha.8 standalone candidate was built and used through
   `ORANGE_HYPER_BIN`.
2. The E2E target was an isolated temporary git repository with only a minimal
   README and small CommonJS source fixture before activation.
3. The test project did not contain `package.json`, `package-lock.json`, or
   `node_modules` before or after activation.
4. `binding status` started as `absent`; `binding plan` was read-only.
5. `binding install` prepared user-scoped binding state and the marketplace at
   `.agents/plugins/marketplace.json`.
6. Codex plugin manager reported
   `orange-hyper-codex@orange-hyper-user` as installed, enabled, and version
   `1.1.0-alpha.8`.
7. `activate plan` was read-only.
8. `activate apply` created project-local activation/runtime state and reported
   `waiting_for_host_binding`, not `active`, before any lifecycle heartbeat.

Real `/hooks` discovery and review:

| Hook | Source | Command | Result |
| --- | --- | --- | --- |
| `SessionStart` | `Plugin - orange-hyper-codex@orange-hyper-user` | `"$PLUGIN_ROOT/hooks/run-orange.sh" session-start` | Found and trusted |
| `UserPromptSubmit` | `Plugin - orange-hyper-codex@orange-hyper-user` | `"$PLUGIN_ROOT/hooks/run-orange.sh" user-prompt-submit` | Found and trusted |
| `PostToolUse` | `Plugin - orange-hyper-codex@orange-hyper-user` | `"$PLUGIN_ROOT/hooks/run-orange.sh" post-tool-use` | Found and trusted |
| `Stop` | `Plugin - orange-hyper-codex@orange-hyper-user` | `"$PLUGIN_ROOT/hooks/run-orange.sh" stop` | Found and trusted |

After review, Codex `/hooks` reported one installed and one active hook for
each of `SessionStart`, `UserPromptSubmit`, `PostToolUse`, and `Stop`. The
source for each reviewed hook was the installed Orange plugin, not the
marketplace entry alone.

Defects found in trusted real Codex runs:

1. Stop success output used the wrong Codex schema.
   - Symptom: after verification succeeded, Codex rejected the Stop hook output
     as invalid because Orange returned `{"continue":true}`.
   - Cause: Codex Stop accepts blocking continuation output, but successful Stop
     completion must return an empty JSON object.
   - Fix: native Stop success and degraded Stop fallback now return `{}`.
2. Successful direct Node verification was not recognized when Codex omitted an
   exit status from `PostToolUse`.
   - Symptom: a direct Node assertion printed a success marker, but Orange
     stored `exit_status: null`, `passed: false`, and `success_evidence: false`.
   - Cause: the lifecycle evidence path discarded string `tool_response` values,
     only recognized some runner-shaped verification commands, and required an
     exit code even when Codex provided a bounded success marker but no exit
     status.
   - Fix: string and nested text tool responses are summarized safely; direct
     `node -e` assertion commands are verification commands; exit status still
     wins when present; without exit status, only a direct Node assertion with an
     explicit verification/assertion success marker can become success evidence.

Final patched real lifecycle:

| Item | Result |
| --- | --- |
| New Codex thread after hook review and rebuild | Pass |
| Candidate binary forced with `ORANGE_HYPER_BIN` | Pass |
| `SessionStart` heartbeat | Pass at `2026-06-20T03:31:24.117Z` |
| `UserPromptSubmit` heartbeat | Pass at `2026-06-20T03:31:24.193Z` |
| `PostToolUse` heartbeat | Pass at `2026-06-20T03:31:59.303Z` |
| `Stop` heartbeat | Pass at `2026-06-20T03:32:01.200Z` |
| Same binding fingerprint | Pass |
| `activate status` transition | Pass: `active`; binding `operational`; lifecycle `current` |
| L2 route | Pass: `L2/P2/T2/V2/A0/M0/MB2` |
| L2 Quest and Capsule | Pass: Quest created and current Capsule generated |
| Evidence-free first Stop | Pass: continuation requested |
| Continuation count | Pass: exactly one continuation for the turn |
| `stop_hook_active` suppression | Pass: no second continuation after evidence |
| Verification evidence | Pass: direct Node assertion success marker recorded as success evidence |
| Quest completion | Pass: active Quest count returned to `0` after the second Stop |
| Raw output storage | Pass: evidence kept `raw_output_stored: false` and bounded summaries |
| Project npm files | Pass: no `package.json`, `package-lock.json`, or `node_modules` |

Final patched lifecycle counters:

- Cumulative trusted-run event count in the isolated project:
  `SessionStart=2`, `UserPromptSubmit=2`, `PostToolUse=29`, `Stop=4`.
- Final patched turn:
  `quest_c26af715e32c_l2_implementation`,
  `continuation_requested=true`, `incomplete=false`,
  `success_evidence=true`, `active_quests=0`.
- Final `activate status`:
  `active`, `complete_lifecycle_fresh`, current fingerprint
  `df05c483c1e949a3065df56a4531108da6c3a1a2542eeb6583e45511a1835bd1`.

Fixture coverage that passed:

- marketplace standard location.
- plugin bundle includes `hooks/hooks.json`.
- manifest/default hook discovery assets are bundled.
- POSIX launcher uses `ORANGE_HYPER_BIN` before PATH lookup.
- POSIX and PowerShell launchers have safe JSON failure behavior.
- Stop success and degraded fallback satisfy the Codex Stop schema.
- inactive repositories no-op without creating Orange state.
- current-fingerprint heartbeat status.
- same-session complete lifecycle.
- L0/L1 no Quest.
- L2 Quest/Capsule creation.
- Quest continuity and different-scope new Quest creation.
- unrelated L1 Stop does not complete a previous L2 Quest.
- missing verification evidence requests continuation exactly once.
- `stop_hook_active` does not request another continuation.
- evidence-free verification is not marked verified.
- explicit unverified reason is required before unverified completion.
- raw prompt text is not stored in Quest, Capsule, route trace, or runtime
  artifacts.

Automatic validation on the diagnostic branch:

- Focused lifecycle regression: `node --test tests/activation-runtime.test.js`
  passed with 28 tests after the final evidence fix.
- Full validation passed:
  - `npm test`: 170 tests passed.
  - `npm run typecheck`: passed.
  - `npm run check:readme-sync`: passed.
  - `git diff --check`: passed.
  - `node bin/orange.js --version`: `1.1.0-alpha.8`.
  - `node bin/orange.js env --json`: passed.
  - `node bin/orange.js binding status --host codex --json`: passed.
  - `node bin/orange.js activate status --host codex --json`: passed.
  - `node bin/orange.js doctor --json`: passed.
  - `npm run build:standalone`: passed.
  - `dist/standalone/orange.cjs --version`: `1.1.0-alpha.8`.
  - `dist/standalone/orange.cjs binding status --host codex --json`:
    passed.
  - `npm run build:sea`: passed for `dist/standalone/orange-macos-arm64`.
  - `dist/standalone/orange-macos-arm64 --version`: `1.1.0-alpha.8`.
  - `dist/standalone/orange-macos-arm64 binding status --host codex --json`:
    passed.
  - `npm pack --dry-run`: passed with a temporary npm cache after the default
    user npm cache reported an `EPERM` cache ownership problem outside Orange.

Items not re-verified in real Codex after the final evidence fix:

- Same-work follow-up continuing the same Quest in an interactive Codex thread.
- An unrelated L1 turn failing to complete a previous L2 Quest in an
  interactive Codex thread.
- Operational status when `PostToolUse` is absent in a real interactive thread.

Release decision:

- Keep the `v1.1.0-alpha.8` release gate blocked for this diagnostic task.
  The original hook-trust blocker is resolved, and the final patched run
  proves trusted hooks, one-shot Stop continuation, verification evidence, and
  active status. The release gate still requires the remaining interactive
  Quest-continuity/isolation checks.
