# Beta Test Checklist

Use this checklist for each closed beta repository. Record one status per
scenario:

- `pass`
- `fail`
- `blocked`
- `not applicable`
- `not verified`

Default status is `not verified` until the tester observes the scenario in the
target repository.

Do not attach raw prompts, raw transcripts, credentials, tokens, secrets,
`.env` content, private absolute paths, full tool output, or proprietary source
code. Prefer selected JSON fields and short notes.

## Session Metadata

| Field | Value |
| --- | --- |
| Tester |  |
| Date |  |
| Repository type |  |
| OS and architecture |  |
| Codex version |  |
| Orange version |  |
| Install channel | standalone / npm fallback / other |
| Binding root | redacted |
| Project path | redacted |

## Scenario Checklist

| # | Scenario | Status | Expected evidence | Notes |
| --- | --- | --- | --- | --- |
| 1 | Standalone install | not verified | Installer completes and checksum verification passes |  |
| 2 | `orange --version` | not verified | Prints `1.1.0-alpha.8` |  |
| 3 | Binding plan | not verified | `orange binding plan --host codex --scope user --json` is read-only |  |
| 4 | Binding install | not verified | `orange binding install --host codex --scope user --json` writes only user-scoped binding state |  |
| 5 | Plugin install and enable | not verified | Codex `/plugins` shows Orange installed and enabled |  |
| 6 | `/hooks` review | not verified | Codex `/hooks` shows current Orange hooks reviewed and trusted |  |
| 7 | Inactive repository no-op | not verified | Inactive repo lifecycle hook returns no-op behavior |  |
| 8 | Project activation | not verified | `orange activate apply --host codex --scope project --json` completes without project npm files |  |
| 9 | L0 question | not verified | No Quest ceremony for a simple question |  |
| 10 | L1 small edit | not verified | No Quest ceremony for a small edit |  |
| 11 | L2 bounded implementation | not verified | Quest and current Capsule are created |  |
| 12 | Same-task follow-up | not verified | Follow-up continues the same Quest when scope matches |  |
| 13 | Separate task Quest split | not verified | Clearly different L2 work creates a separate Quest |  |
| 14 | Verification evidence collection | not verified | Targeted evidence is recorded without raw output storage |  |
| 15 | Stop continuation once | not verified | Missing V2 evidence requests exactly one continuation |  |
| 16 | Quest verified completion | not verified | Quest completes with `verification_status: verified` only after evidence |  |
| 17 | Pending Memory Proposal check | not verified | Pending proposal can be listed and reviewed manually |  |
| 18 | Memory Proposal not auto-accepted | not verified | No accepted proposal appears without explicit user approval |  |
| 19 | Deactivate | not verified | `orange activate remove --host codex --scope project --json` removes project activation/runtime state only |  |
| 20 | Binding remove and plugin cleanup | not verified | `orange binding remove --host codex --scope user --json` removes Orange-owned binding state; Codex plugin cleanup is checked in `/plugins` |  |
| 21 | Project npm pollution check | not verified | No `package.json`, `package-lock.json`, or `node_modules` was created for Orange |  |

## Safe Diagnostic Commands

Run only the commands needed for the issue being reported:

```bash
orange --version
orange env --json
orange binding status --host codex --json
orange activate status --host codex --json
orange doctor --json
orange eval snapshot --json
orange growth status --json
```

Before sharing results, redact private paths and remove raw prompt text, raw
transcripts, credentials, tokens, secrets, `.env` content, full tool output, and
proprietary source code.

## Outcome Summary

| Metric | Value |
| --- | --- |
| Install success | pass / fail / blocked / not applicable / not verified |
| Binding install success | pass / fail / blocked / not applicable / not verified |
| Hook review completed | pass / fail / blocked / not applicable / not verified |
| Activation success | pass / fail / blocked / not applicable / not verified |
| Time-to-active |  |
| L0/L1 false Quest count |  |
| L2 Quest creation success | pass / fail / blocked / not applicable / not verified |
| Quest continuity success | pass / fail / blocked / not applicable / not verified |
| Incorrect Quest joining | yes / no / not verified |
| Stop continuation count |  |
| False verification observed | yes / no / not verified |
| Verified completions |  |
| Unverified completions |  |
| Pending Memory Proposals |  |
| User-worth-accepting proposal count |  |
| Deactivate/remove success | pass / fail / blocked / not applicable / not verified |
| Project npm pollution | yes / no / not verified |
| Privacy incident | yes / no |
| Data-loss incident | yes / no |

## Final Cleanup Confirmation

- Project activation removed or intentionally left active for the beta.
- User-scoped binding removed or intentionally left installed for more testing.
- Codex `/plugins` checked for Orange plugin enabled/installed state.
- New Codex thread started after plugin cleanup.
- No project `package.json`, `package-lock.json`, or `node_modules` was created
  by Orange.
- Any shared issue evidence has been redacted.
