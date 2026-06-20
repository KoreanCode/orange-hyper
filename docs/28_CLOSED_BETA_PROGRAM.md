# Closed Beta Program

Closed Beta status: `open` for `v1.1.0-alpha.8`.

This program prepares Orange Hyper `v1.1.0-alpha.8` for a small private
technical beta. It does not add a new Runtime, Skill, Agent, MCP server,
Subagent lane, telemetry path, support-bundle command, or network upload.

## Purpose

The closed beta checks whether technical users can install, bind, activate,
use, diagnose, and remove Orange Hyper without turning their projects into
Orange-specific or npm-specific projects.

The beta also collects enough real-world evidence to decide whether a later
`v1.1.0-beta.1` should be proposed. It does not publish `beta.1` and does not
claim token savings, model improvement, user productivity improvement, or
overall success-rate improvement.

## Initial Audience

- 5 to 15 technical users.
- Personal or non-sensitive development repositories.
- Node and non-Node repositories.
- Users who can follow known limitations and cleanup instructions.

Do not use this beta in production-critical, regulated, credential-heavy, or
highly proprietary repositories.

## Environment Scope

Primary validated:

- macOS arm64.
- Codex CLI.
- Orange standalone binary.
- User-scoped Codex Host Binding.
- Project-scoped Activation.
- Interactive Codex `/hooks` review.
- L0/L1/L2 workflow behavior.

Exploratory:

- macOS x64.
- Linux x64.
- Windows x64.
- Other Codex minor versions.

Exploratory platforms can have release binaries and installers without being
called validated. A platform is validated only after a real interactive hook
end-to-end run proves plugin install, plugin enablement, hook review, lifecycle
events, project activation, and cleanup behavior.

## Current Release State

Use `v1.1.0-alpha.8` as the closed beta build.

Verified release inputs:

- Package version: `1.1.0-alpha.8`.
- Adapter JSON contract version: `0.1`.
- Git tag: `v1.1.0-alpha.8`.
- GitHub Release: <https://github.com/KoreanCode/orange-hyper/releases/tag/v1.1.0-alpha.8>
- GitHub Release prerelease metadata: `true`.
- GitHub Release assets: 8 required assets.
- npm alpha dist-tag: `orange-hyper@alpha -> 1.1.0-alpha.8`.

Required GitHub Release assets:

- `install.sh`
- `install.ps1`
- `checksums.txt`
- `release-manifest.json`
- `orange-macos-arm64`
- `orange-macos-x64`
- `orange-linux-x64`
- `orange-windows-x64.exe`

## Installation

Standalone installation is the default path. Do not run `npm init -y`, do not
install `orange-hyper` into the project by default, and do not create
`package.json`, `package-lock.json`, or `node_modules` for Orange.

macOS and Linux:

```bash
curl -fsSL https://github.com/KoreanCode/orange-hyper/releases/download/v1.1.0-alpha.8/install.sh | sh
```

Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "iwr https://github.com/KoreanCode/orange-hyper/releases/download/v1.1.0-alpha.8/install.ps1 -OutFile $env:TEMP\orange-install.ps1; & $env:TEMP\orange-install.ps1 -Version 1.1.0-alpha.8"
```

Use npm only as an explicit fallback check, and pin either the alpha dist-tag or
the exact version:

```bash
npx -y --package orange-hyper@1.1.0-alpha.8 orange --help
```

## Host Binding vs Project Activation

Host Binding and Project Activation are separate lifecycles.

Host Binding is user-scoped. It prepares Orange-owned Codex marketplace and
plugin source state under the user's Orange home. It does not activate a
repository and it does not prove that Codex installed, enabled, reviewed, or
trusted the plugin.

Project Activation is repository-scoped. It writes repo-local activation and
runtime state under `.orange-hyper/local/`. It does not install a Codex plugin,
enable a plugin, mutate hook trust, or remove a user-scoped binding.

Installation alone is not active. Marketplace registration alone is not plugin
installation. Plugin source alone is not plugin enablement. Project activation
alone is not lifecycle health.

## Binding and Activation Procedure

1. Confirm Orange from `PATH`.

```bash
orange --version
orange env --json
```

2. Preview user-scoped Codex Host Binding.

```bash
orange binding plan --host codex --scope user --json
```

3. Install the user-scoped binding only after explicit approval.

```bash
orange binding install --host codex --scope user --json
```

4. Open Codex `/plugins`, install Orange Hyper from the Orange marketplace, and
   enable it.
5. Open Codex `/hooks`, review the Orange plugin hooks, and trust the current
   hook definitions.
6. Start a new Codex thread after plugin or hook changes.
7. Preview project-scoped activation.

```bash
orange activate plan --host codex --scope project --json
```

8. Activate the repository only after explicit approval.

```bash
orange activate apply --host codex --scope project --json
```

9. Confirm status after lifecycle events.

```bash
orange binding status --host codex --json
orange activate status --host codex --json
```

Do not call a project active before a fresh complete lifecycle is observed for
the current binding fingerprint. At minimum, the current fingerprint must have
fresh `SessionStart`, `UserPromptSubmit`, and `Stop` evidence.

## AI Starter Prompt

Closed beta testers can give this short prompt to their AI assistant:

```text
Use Orange Hyper v1.1.0-alpha.8 for this repository.

First check `orange --version` and `orange env --json` from PATH.
Prefer the standalone installer. Do not create or modify project `package.json`,
`package-lock.json`, or `node_modules` for Orange.

If Codex Host Binding is missing, show
`orange binding plan --host codex --scope user --json` first. Install the
user-scoped binding only after I approve.

After binding install, I must install and enable the Orange plugin in Codex
`/plugins`, review the current hooks in `/hooks`, and start a new Codex thread.

Then show `orange activate plan --host codex --scope project --json`. Apply
project activation only after I approve. Do not call the project active before
the current lifecycle heartbeat is observed.

For L0 and L1 work, do not create Quest ceremony. For bounded L2 work, keep the
Quest, Capsule, and verification evidence small and specific.

Never auto-accept Memory Proposals. Never edit `.orange-hyper` files directly.
If something fails, collect only safe JSON diagnostics and remove raw prompts,
raw transcripts, secrets, tokens, private absolute paths, full tool output, and
proprietary source code before reporting.
```

## Expected Workflow Behavior

- L0 questions stay lightweight and do not create Quest ceremony.
- L1 small edits stay lightweight and do not create Quest ceremony.
- L2 bounded implementation can create a Quest, Capsule, and verification
  evidence.
- Same-task follow-up should continue the same Quest when scope matches.
- Different work should create a separate Quest rather than being joined to an
  unrelated task.
- A missing V2 verification signal may request one Stop continuation.
- A second continuation must not be requested only because the Stop hook is
  already active.
- Memory Proposal creation is pending review only. Acceptance remains manual.

## Safe Diagnostics

Do not add telemetry or upload diagnostics. Use existing local commands only.

Commands allowed for beta issue evidence:

```bash
orange --version
orange env --json
orange binding status --host codex --json
orange activate status --host codex --json
orange doctor --json
orange eval snapshot --json
orange growth status --json
```

Before attaching any result, remove:

- Raw prompt text.
- Raw transcript.
- Credentials.
- Tokens.
- Secrets.
- `.env` content.
- Private absolute paths.
- Full tool output.
- Proprietary source code.

Prefer a short summary of selected JSON fields over a full payload.

## Issue Reporting

Use GitHub Issues. Discussions are not part of the initial beta surface.

- Bug reports: `.github/ISSUE_TEMPLATE/beta-bug.yml`
- Feedback: `.github/ISSUE_TEMPLATE/beta-feedback.yml`

Issue reports must not include raw prompts, raw transcripts, credentials,
tokens, secrets, `.env` content, private absolute paths, full tool output, or
proprietary source code.

## Known Limitations

- Only macOS arm64 has real trusted-hook interactive E2E evidence for alpha.8.
- macOS x64, Linux x64, and Windows x64 are exploratory until real interactive
  Codex hook E2E evidence exists for each.
- Codex plugin install, enablement, and hook trust are user-visible Codex
  actions and should not be inferred from Orange-owned marketplace files.
- Activation can report `waiting_for_host_binding` until host lifecycle evidence
  is present.
- Orange does not uninstall Codex-side plugin cache when Codex does not expose
  a machine-readable uninstall surface. It reports follow-up user actions.
- The beta does not measure token savings, model quality, productivity, or
  success-rate improvement.

## Deactivation and Cleanup

Project deactivation:

```bash
orange activate remove --host codex --scope project --json
orange activate status --host codex --json
```

User binding cleanup:

```bash
orange binding remove --host codex --scope user --json
orange binding status --host codex --json
```

Then open Codex `/plugins` and disable or uninstall Orange Hyper if Codex still
shows it installed or enabled. Start a new Codex thread after plugin changes.

After cleanup, check that the project did not gain:

- `package.json`
- `package-lock.json`
- `node_modules`

## Beta Metrics

Use only user-submitted issues and local JSON evidence.

Measure:

- Installation success.
- Binding install success.
- Hook review completion.
- Activation success.
- Time-to-active.
- L0/L1 false Quest creation.
- L2 Quest creation success.
- Quest continuity for same-task follow-up.
- Incorrect Quest joining across unrelated work.
- Stop continuation count.
- False verification.
- Verified vs unverified completion.
- Pending Memory Proposal count.
- Share of proposals the user considered worth accepting.
- Deactivate/remove success.
- Project npm file pollution.
- Privacy or data-loss incident.

Do not measure or infer:

- Token savings.
- Model performance improvement.
- Success-rate improvement.
- User productivity improvement.
- Full conversation content.

Do not make improvement claims until there is a comparison baseline and enough
evidence to support the claim.

## Closed Beta Gate

Current gate status: `open`.

| Gate item | Status | Evidence |
| --- | --- | --- |
| alpha.8 install assets and checksums exist | pass | GitHub Release has 8 required assets including `checksums.txt` |
| npm alpha dist-tag is correct | pass | `orange-hyper@alpha` points to `1.1.0-alpha.8` |
| trusted-hook E2E evidence exists | pass | `docs/27_CODEX_BINDING_E2E.md` records real Codex `/hooks` review |
| L1 no-Quest behavior confirmed | pass | alpha.8 E2E and regression tests |
| L2 Quest/Capsule behavior confirmed | pass | alpha.8 E2E and regression tests |
| Stop continuation once confirmed | pass | independent Stop continuation recheck |
| verified completion confirmed | pass | alpha.8 E2E verified Quest completion |
| Memory Proposal auto-accept absent | pass | pending proposal policy and regression coverage |
| uninstall/deactivate procedure exists | pass | this document and activation/binding docs |
| privacy boundary documented | pass | this document and issue forms |
| beta issue forms exist | pass | beta bug and beta feedback forms |
| known limitations public | pass | this document |
| prerelease metadata correct | pass | GitHub Release metadata is prerelease |

## Public Beta Promotion Criteria

Propose `v1.1.0-beta.1` only after evidence from the closed beta supports it.
Reaching the numbers below does not automatically publish a release.

Minimum target:

- 5 or more different repositories.
- About 10 real users or equivalent external usage sessions.
- 50 or more real tasks.
- macOS arm64 real E2E remains healthy.
- Linux x64 real interactive E2E.
- Windows x64 PowerShell and real interactive E2E.
- 0 critical data-loss incidents.
- 0 privacy incidents.
- 0 project npm pollution incidents.
- Reproducible activation and cleanup success.
- Route, Quest, Stop, and verification misclassification cases are analyzed
  and major blockers are resolved.

The `beta.1` decision requires a separate release approval step.
