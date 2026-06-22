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

## 2026-06-22 beta.1 Closed Beta Candidate E2E

Release gate status after this run: `pass` for the `v1.1.0-beta.1` Closed Beta
candidate.

Environment:

- Date: 2026-06-22 KST.
- Platform: macOS arm64.
- Codex version: `OpenAI Codex v0.141.0`.
- Orange version: `1.1.0-beta.1`.
- Codex plugin version: `1.1.0-beta.1`.
- Adapter contract version: `0.1`.
- Binding fingerprint:
  `0bf28c8d7b3d937cceaecb7b5fed27da7f73e30121f3ec4fef4dee049a7eb179`.
- Candidate binary: current platform standalone SEA built from the beta.1
  candidate source tree and forced through `ORANGE_HYPER_BIN`.

Setup:

1. The E2E target was an isolated temporary git repository, not this
   repository.
2. The target fixture contained only a minimal README and one small source
   file before activation.
3. The target project did not contain `package.json`, `package-lock.json`, or
   `node_modules` before activation, after activation, or after lifecycle
   execution.
4. `binding plan --host codex --scope user --json` was read-only and planned
   only the user-scoped plugin source, marketplace, and binding metadata under
   the temporary Orange home.
5. `binding install --host codex --scope user --json` reported
   `installed_user_scope_only: true` and `pending_install`.
6. Codex plugin management reported
   `orange-hyper-codex@orange-hyper-user` as installed, enabled, and version
   `1.1.0-beta.1`.
7. The installed hook bundle exposed `SessionStart`, `UserPromptSubmit`,
   `PostToolUse`, and `Stop`; every hook had POSIX and Windows command
   launchers.
8. Codex config contained trusted hook entries for the four installed plugin
   hooks.

Lifecycle results:

| Item | Result |
| --- | --- |
| Inactive repository thread | Pass: hooks ran and Orange no-oped without creating project state |
| Project activation | Pass: `activate apply` created only project-local activation/runtime state |
| Status before lifecycle | Pass: `waiting_for_host_binding`, not active |
| L0 literal direct response | Pass: no Quest, no Stop continuation |
| Current lifecycle status | Pass: `active`, binding `operational`, lifecycle `current` |
| Observed required events | Pass: `SessionStart`, `UserPromptSubmit`, `Stop` |
| Observed optional events | Pass: `PostToolUse` |
| Final complete lifecycle time | `2026-06-22T02:14:03.400Z` |

Observed Quest and continuation behavior:

| Item | Result |
| --- | --- |
| L2 bounded source edit | Pass: `quest_df5c08e0fedd_l2_validation` created with current Capsule |
| L2 source verification | Pass: Node module check recorded success evidence |
| L2 source Quest completion | Pass: Quest completed with `verification_status: verified` |
| L2 README edit | Pass: `quest_1edf4adbe51b_l2_edit` created |
| First evidence-free Stop | Pass: Stop was blocked and requested continuation |
| Continuation count | Pass: one continuation; no second continuation from active Stop |
| Weak verification guard | Pass: simple heading output did not mark the Quest verified |
| Same-work follow-up | Pass: new Codex session continued `quest_1edf4adbe51b_l2_edit` |
| Follow-up verification | Pass: fail-fast Node heading check recorded success evidence |
| README Quest completion | Pass: same Quest completed with `verification_status: verified` |

Artifact hygiene:

- Route traces stored lifecycle summaries, route metadata, intent signatures,
  and scope signatures, not raw prompt text.
- Evidence records used bounded output summaries and did not store full tool
  output.
- Searches for raw prompt fragments, transcript markers, session headers, and
  token summaries under `.orange-hyper` returned no matches.
- Pending Memory Proposals were created for verified Quests.
- No accepted memory directory or accepted memory artifact was created.
- No MCP server was installed or run by Orange.
- No project-specific Skill or Agent was materialized.
- No project `package.json`, `package-lock.json`, or `node_modules` was
  created.

Candidate fixes validated by this beta.1 E2E:

1. Literal direct-response prompts using an explicit `with exactly` shape now
   route as L0 and do not create Quest ceremony.
2. Same-work follow-up in a fresh Codex session can continue a recent active
   Quest when the prompt is explicit and the Quest is still active.

Release decision:

- The beta.1 Codex Host Binding and lifecycle gate is open for the normal
  tag-driven release workflow.
- The alpha.8 tag and package remain unchanged.
- `contract_version` remains `0.1`.

## 2026-06-20 alpha.8 Hook Trust Diagnostics

Initial diagnostic status: `blocked` before the independent Stop-continuation
recheck below. Do not treat this subsection alone as release approval.

The earlier "no heartbeat" attempt is reclassified as an inconclusive
pre-trust attempt. The plugin had been installed and enabled, but the current
hook definitions had not yet been reviewed in the real Codex `/hooks` surface.
That attempt is therefore not evidence of a launcher or Host Bridge product
failure.

Environment:

- Date: 2026-06-20 KST.
- Platform: macOS arm64.
- Codex version: `codex-cli 0.141.0`.
- Orange version: `1.1.0-alpha.8`.
- Codex plugin version: `1.1.0-alpha.8`.
- Validation base commit before this diagnostic continuation:
  `f8ab4226c97a61890218fae570476bcf978f28b0`.
- Binding fingerprint:
  `df05c483c1e949a3065df56a4531108da6c3a1a2542eeb6583e45511a1835bd1`.
- Adapter contract version: `0.1`.

Setup:

1. A current alpha.8 standalone candidate was built and forced through
   `ORANGE_HYPER_BIN`.
2. The E2E target was an isolated temporary git repository, not this
   repository.
3. The target fixture contained a minimal README and one small CommonJS source
   file before activation.
4. The target project did not contain `package.json`, `package-lock.json`, or
   `node_modules` before activation, after activation, or after the lifecycle
   run.
5. `binding status` started as `absent`.
6. `binding plan --host codex --scope user --json` was read-only.
7. `binding install --host codex --scope user --json` prepared only
   user-scoped Orange binding state and registered the user marketplace at
   `.agents/plugins/marketplace.json` under the binding root.
8. Codex plugin management reported
   `orange-hyper-codex@orange-hyper-user` as installed, enabled, and version
   `1.1.0-alpha.8`.
9. `activate plan --host codex --scope project --json` was read-only.
10. `activate apply --host codex --scope project --json` created only
    project-local Orange activation/runtime state and reported
    `waiting_for_host_binding`, not `active`, before lifecycle evidence existed.

Real `/hooks` discovery and review:

| Hook | Source | Command | Review result |
| --- | --- | --- | --- |
| `SessionStart` | `Plugin - orange-hyper-codex@orange-hyper-user` | `"$PLUGIN_ROOT/hooks/run-orange.sh" session-start` | Found, active, trusted |
| `UserPromptSubmit` | `Plugin - orange-hyper-codex@orange-hyper-user` | `"$PLUGIN_ROOT/hooks/run-orange.sh" user-prompt-submit` | Found, active, trusted |
| `PostToolUse` | `Plugin - orange-hyper-codex@orange-hyper-user` | `"$PLUGIN_ROOT/hooks/run-orange.sh" post-tool-use` | Found, active, trusted |
| `Stop` | `Plugin - orange-hyper-codex@orange-hyper-user` | `"$PLUGIN_ROOT/hooks/run-orange.sh" stop` | Found, active, trusted |

Codex `/hooks` reported one installed and one active hook for each reviewed
event. The source for every hook was the installed Orange plugin, not merely
the marketplace registration. No trust store was edited directly, no bypass
flag was used, and plugin installation/enabling was not treated as hook trust.

Defects and product changes from the trusted runs:

1. Stop success schema was previously invalid.
   - Symptom: after verification succeeded, Codex rejected the Stop hook output
     when Orange returned a continuation-shaped object.
   - Cause: Codex Stop accepts a blocking continuation object only when asking
     the model to continue; successful Stop completion must return an empty JSON
     object.
   - Fix already merged before this continuation: native Stop success and
     degraded Stop fallback return `{}`.
2. Exit-status-free Node verification needed a narrower success rule.
   - Symptom: Codex sometimes omitted an exit status for `node -e` verification.
     A fail-fast assertion with no success output stayed unverified, which is
     correct, but a later fail-fast assertion with a clear success marker also
     needed to be accepted.
   - Cause: Orange accepted only a small set of success phrases when exit
     status was absent.
   - Fix in this continuation: for Node inline verification only, Orange now
     accepts a bounded success marker such as `verified`, `passed`, or `ok`
     when the command itself contains a fail-fast guard such as
     `throw new Error(...)` or `process.exit(1)`, and rejects the result if the
     captured output also contains failure/error terms.
3. Short acknowledgement or literal-response prompts were too easy to route as
   L2 work.
   - Symptom: an acknowledgement or a direct "reply with this literal only"
     instruction could create unnecessary lifecycle ceremony.
   - Fix in this continuation: acknowledgement-only prompts and direct
     response-only instructions route as L0 answers, including the tested
     no-edit/no-command shape used in the E2E setup.

Final real lifecycle observed after hook review:

| Item | Result |
| --- | --- |
| New Codex thread after hook review | Pass |
| Candidate binary forced with `ORANGE_HYPER_BIN` | Pass |
| `SessionStart` heartbeat | Pass at `2026-06-20T05:51:27.644Z` |
| `UserPromptSubmit` heartbeat | Pass; latest observed at `2026-06-20T05:52:57.834Z` |
| `PostToolUse` heartbeat | Pass; latest observed at `2026-06-20T05:53:36.596Z` |
| `Stop` heartbeat | Pass at `2026-06-20T05:53:41.236Z` |
| Same session and current binding fingerprint | Pass |
| `activate status` transition | Pass: `active`, binding `operational`, lifecycle `current` |
| L0 direct response | Pass: no Quest |
| L1 small edit | Pass: no Quest |
| L2 bounded edit | Pass: Quest and current Capsule created |
| Initial evidence-free L2 Stop | Pass: continuation requested |
| Continuation count for that turn | Pass: exactly one continuation |
| Verification after continuation | Pass: fail-fast Node verification with success marker recorded as success evidence |
| Quest completion | Pass: Quest moved to `completed` with `verification_status: verified` |
| Raw prompt storage | Pass: Quest, Capsule, and route trace stored lifecycle summaries and signatures, not raw prompt text |
| Raw transcript/full output storage | Pass: episode and evidence records kept `raw_transcript_stored: false`, `raw_tool_output_stored: false`, and `raw_output_stored: false` with bounded output summaries |

Final activation status in the isolated project:

- `status`: `active`
- binding `effective_status`: `operational`
- hook execution `status`: `current`
- hook execution `status_reason`: `complete_lifecycle_fresh`
- observed required events:
  `SessionStart`, `UserPromptSubmit`, `Stop`
- optional observed event: `PostToolUse`
- observed fingerprint:
  `df05c483c1e949a3065df56a4531108da6c3a1a2542eeb6583e45511a1835bd1`
- complete lifecycle time: `2026-06-20T05:53:41.236Z`

Fixture and automated regression coverage:

- marketplace standard location:
  `<binding-root>/.agents/plugins/marketplace.json`.
- plugin bundle includes `hooks/hooks.json`.
- manifest/default hook discovery assets are bundled.
- launcher prefers the candidate binary supplied through `ORANGE_HYPER_BIN`.
- launcher failure paths emit safe JSON.
- inactive repositories no-op.
- current-fingerprint heartbeat status.
- same-session complete lifecycle.
- L0/L1 no Quest.
- L2 Quest/Capsule creation.
- Quest continuity for same-scope follow-up.
- different-scope L2 creates a new Quest.
- unrelated L1 Stop does not complete a previous L2 Quest.
- missing verification evidence requests continuation exactly once.
- `stop_hook_active` does not request another continuation.
- evidence-free verification is not marked verified.
- explicit unverified reason handling.
- guarded Node success marker with missing exit status.
- guarded Node output containing failure text is rejected.

Automatic validation on this diagnostic continuation:

| Command | Result |
| --- | --- |
| `npm test` | Pass: 172 tests |
| `npm run typecheck` | Pass |
| `npm run check:readme-sync` | Pass: `1.1-doc.8` |
| `git diff --check` | Pass |
| `node bin/orange.js --version` | Pass: `1.1.0-alpha.8` |
| `node bin/orange.js env --json` | Pass: source distribution, `darwin arm64`, project initialized |
| `node bin/orange.js binding status --host codex --json` | Pass: default user binding absent after cleanup-facing source check |
| `node bin/orange.js activate status --host codex --json` | Pass: this repository inactive |
| `node bin/orange.js doctor --json` | Pass after `init --json` regenerated ignored local `capsules/current.md` and `traces/route.jsonl` for validation |
| `npm run build:standalone` | Pass |
| `dist/standalone/orange.cjs --version` | Pass: `1.1.0-alpha.8` |
| `dist/standalone/orange.cjs binding status --host codex --json` | Pass |
| `npm run build:sea` | Pass: `dist/standalone/orange-macos-arm64` |
| `dist/standalone/orange-macos-arm64 --version` | Pass: `1.1.0-alpha.8` |
| `dist/standalone/orange-macos-arm64 binding status --host codex --json` | Pass |
| `npm pack --dry-run` | Pass with a temporary npm cache; the default user npm cache first failed with an `EPERM` ownership error outside Orange |

Items not re-verified in a real interactive Codex thread during the first
diagnostic continuation:

- Same-work follow-up continuing the same active Quest.
- Clearly different L2 work creating a new Quest in the same interactive
  session.
- An unrelated L1 turn failing to complete a previous L2 Quest in the same
  interactive session.
- Operational status when `PostToolUse` is completely absent in a real
  interactive thread.

Release decision for this first diagnostic continuation:

- Superseded by the independent Stop-continuation recheck below. At this point,
  hook trust, hook execution, one-shot Stop continuation, verification evidence,
  Quest completion, and active status were proven in a real Codex run, but the
  release gate stayed blocked until the final release-blocking continuation case
  was reproduced in a fresh thread.

## 2026-06-20 alpha.8 Independent Stop Continuation Recheck

Release status: `open` for the `v1.1.0-alpha.8` release path after this
recheck. This section records the additional independent Codex thread that
closed the remaining alpha.8 release blocker. It does not create a tag, npm
publication, or GitHub Release by itself.

Environment:

- Date: 2026-06-20 KST.
- Platform: macOS arm64.
- Codex version: `codex-cli 0.141.0`.
- Orange version: `1.1.0-alpha.8`.
- Codex plugin version: `1.1.0-alpha.8`.
- Validation base commit before this recheck:
  `c8eed1134bac6a990e76fc6a7ff51dd1a6614af1`.
- Candidate binary: current alpha.8 standalone built from this source tree and
  forced through `ORANGE_HYPER_BIN`.
- Binding fingerprint:
  `df05c483c1e949a3065df56a4531108da6c3a1a2542eeb6583e45511a1835bd1`.
- Adapter contract version: `0.1`.

Setup:

1. The E2E target was an isolated temporary git repository, not this
   repository.
2. The temporary project contained only a minimal README and one small
   CommonJS source fixture before activation.
3. The temporary project contained no `package.json`, `package-lock.json`, or
   `node_modules` before activation, after activation, or after the lifecycle
   run.
4. The user-scoped Orange binding was installed under an isolated Orange home.
5. Codex installed `orange-hyper-codex@orange-hyper-user` from the Orange user
   marketplace and reported it as installed, enabled, and version
   `1.1.0-alpha.8`.
6. Project activation was applied only in the temporary repository. Immediately
   after activation it was `waiting_for_host_binding`, not `active`.
7. No raw prompt, raw transcript, credential, or private absolute path was
   recorded in this document.

Real `/hooks` result:

| Hook | Source | Command | Review result |
| --- | --- | --- | --- |
| `SessionStart` | `Plugin - orange-hyper-codex@orange-hyper-user` | `"$PLUGIN_ROOT/hooks/run-orange.sh" session-start` | Found, active, trusted |
| `UserPromptSubmit` | `Plugin - orange-hyper-codex@orange-hyper-user` | `"$PLUGIN_ROOT/hooks/run-orange.sh" user-prompt-submit` | Found, active, trusted |
| `PostToolUse` | `Plugin - orange-hyper-codex@orange-hyper-user` | `"$PLUGIN_ROOT/hooks/run-orange.sh" post-tool-use` | Found, active, trusted |
| `Stop` | `Plugin - orange-hyper-codex@orange-hyper-user` | `"$PLUGIN_ROOT/hooks/run-orange.sh" stop` | Found, active, trusted |

The hooks were reviewed through the real Codex `/hooks` surface. No trust store
was edited directly, no unsafe trust bypass was used, and plugin installation
or enablement was not treated as equivalent to hook trust.

Independent lifecycle scenario:

- A new Codex thread was started after hook review.
- The task was a bounded L2 source edit in the temporary fixture.
- The first completion intentionally had no verification evidence before the
  Stop hook.
- The Stop hook requested continuation because V2 verification evidence had
  not been observed.
- The continuation ran the narrow Node verification for the touched behavior.
- The follow-up Stop completed the Quest after verification evidence was
  recorded.

Observed hook lifecycle:

| Event | Result |
| --- | --- |
| `SessionStart` | Pass at `2026-06-20T06:21:30.760Z` |
| `UserPromptSubmit` | Pass at `2026-06-20T06:21:30.825Z` |
| `PostToolUse` | Pass; latest observed at `2026-06-20T06:22:43.513Z` |
| First `Stop` | Pass at `2026-06-20T06:22:29.875Z`; requested continuation |
| Second `Stop` | Pass at `2026-06-20T06:22:46.673Z`; completed after verification |
| Same current binding fingerprint | Pass |
| Same Codex hook heartbeat session | Pass |
| `activate status` transition | Pass: `active`, binding `operational`, lifecycle `current` |

Observed Quest and continuation behavior:

| Item | Result |
| --- | --- |
| Route | `L2/P2/T2/V2/A0/M0/MB2` |
| Quest id | `quest_cf8aa5a23224_l2_implementation` |
| Quest creation | Pass: new Quest and current Capsule created |
| Continuation trigger | Pass: missing V2 evidence at the first Stop |
| Continuation count | Pass: one turn file, exactly one `continuation_requested: true` |
| `stop_hook_active` isolation | Pass: no additional continuation after the verification continuation |
| Verification evidence | Pass: one targeted Node verification recorded with `passed: true` and `success_evidence: true` |
| Quest completion | Pass: Quest moved to `completed` with `verification_status: verified` |
| Raw output storage | Pass: 22 evidence files, zero with `raw_output_stored: true` |
| Secret redaction marker | Pass: 22 evidence files, zero with `secret_redaction_applied: false` |

Final activation status in the isolated project:

- `status`: `active`
- binding `effective_status`: `operational`
- hook execution `status`: `current`
- hook execution `status_reason`: `complete_lifecycle_fresh`
- observed required events:
  `SessionStart`, `UserPromptSubmit`, `Stop`
- optional observed event: `PostToolUse`
- observed fingerprint:
  `df05c483c1e949a3065df56a4531108da6c3a1a2542eeb6583e45511a1835bd1`
- complete lifecycle time: `2026-06-20T06:22:46.673Z`

Release decision after this recheck:

- The exact original "no heartbeat" cause was not a product launcher failure;
  it was an inconclusive pre-trust attempt where current hook definitions had
  not yet been reviewed in the real Codex `/hooks` surface.
- The trusted-hook diagnostics then found and fixed product issues in Stop
  success output shape and guarded Node verification evidence handling.
- This independent recheck confirms that reviewed/trusted hooks now execute,
  request a single Stop continuation when verification evidence is absent,
  capture the post-continuation verification evidence, complete the Quest, and
  make activation status `active`.
- The alpha.8 release gate is open, subject to the normal release workflow and
  hosted release verification.
