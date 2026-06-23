# v1 Stabilization Readiness

Orange Hyper v1.0.0 is the first stable boundary release. Orange Hyper
v1.1.0-alpha.0 adds a read-only Identity HTML Knowledge Graph view, and
v1.1.0-alpha.1 realigns the README product surface around the AI-first usage
model, v1.1.0-alpha.2 fixes the Identity Graph product spec, and
v1.1.0-alpha.3 implements the full-screen read-only brain-like Identity Graph,
v1.1.0-alpha.4 adds Project Sync plus generated Structure Graph state, and
v1.1.0-alpha.5 hardens AI-first bootstrap, sync diff quality, semantic
Structure Graph roles, accepted-memory mapping, and stale Identity diagnostics.
v1.1.0-alpha.6 hardens Identity HTML rendering with Canvas, build-time graph
layout coordinates, Structure/Memory/Combined views, responsive drawers, and
500+ node fixture coverage.
v1.1.0-alpha.7 adds the standalone distribution foundation: a bundled CommonJS
entry, Node SEA binary release workflow, checksum-verifying user-local
installers, and `orange env --json`.
v1.1.0-alpha.8 adds Orange Activation Runtime v0.1 and the first-party Codex
Host Binding as a limited opt-in runtime surface. v1.1.0-beta.1 promotes that
runtime path to the official Closed Beta prerelease channel after the
source/release metadata, beta docs, and real Codex hook lifecycle are
revalidated. v1.1.0-beta.2 hardens the Identity HTML graph-lab surface while
preserving the same read-only/runtime boundaries. It still does not add an MCP
runner, custom subagent execution, role system, planner, LLM judge, telemetry
path, graph editing surface, or Memory Proposal auto-accept.

Version axes remain separate:

- package version: `1.1.0-beta.2`
- Codex plugin version: `1.1.0-beta.2`
- README version: `1.1-doc.12`
- Adapter JSON contract version: `0.1`

## AI-first Usage Model

v1.1.0-alpha.1 documents Orange Hyper as an AI-first workflow, not a CLI-first
product experience.

- The user talks to an AI normally and does not need to memorize Orange CLI
  commands.
- Installation appears immediately after the Orange Hyper introduction, but
  the standalone binary is the default path. The `npx ... orange --help` check
  is framed only as an exact-version fallback.
- The AI should check `orange --version` and `orange env --json` from PATH
  first, then propose user-local standalone installation if `orange` is
  missing.
- The AI must not run `npm init -y`, must not use `npm install -D orange-hyper`
  as the default install path, and must not create or modify project
  `package.json`, `package-lock.json`, or `node_modules`.
- The AI, skill, or adapter calls `orange ... --json` kernel commands when the
  task benefits from Quest capture, verification evidence, Memory Proposal,
  accepted memory graph reads, hook warnings, MCP suggestions, growth signals,
  eval summaries, or Identity HTML refresh.
- CLI commands remain the kernel interface. Human-readable output is for people;
  adapters parse only `--json` output.
- Long CLI examples live in `docs/23_MANUAL_FALLBACK.md`,
  `docs/16_ADAPTER_CONTRACT.md`, and `docs/20_ADAPTER_LAYER.md`, not as the
  main README product flow.
- `.orange-hyper/` state is changed only through Orange Kernel commands, not by
  direct adapter file mutation.
- Small questions and simple explanations should stay lightweight. Real work can
  become a Quest, and memorable decisions, constraints, risks, or verification
  results should be proposed first, then accepted only after user approval.
- Hook, Growth, and Eval remain warning/summary surfaces. MCP remains a
  suggestion surface. None of them automatically repair, install, unlock, or
  mutate project memory/config.
- Supported host binding and project activation are separate: `binding install`
  prepares user-scoped Codex marketplace/plugin source, `activate apply` records
  only repo-local activation state, and `status` reports `active` only after the
  current binding fingerprint has produced the required lifecycle events.
- Knowledge Graph is documented as generated project structure plus accepted
  project memory, not a code dependency graph. Current Identity HTML remains
  read-only and graph-first, not a full graph editor.

## v0.1-v0.8 Summary

| Version | Surface | Stabilized boundary |
| --- | --- | --- |
| v0.1 | Seed Kernel | repo-local Quest, Route, Capsule, Doctor, Identity placeholder |
| v0.2 | Memory Delta Proposal | completed Quest -> proposal -> manual accept/reject |
| v0.3 | Memory Graph Usability | current-project accepted memory graph read model |
| v0.4 | Minimal Hook Preview | read-only / warning-first hook observations |
| v0.5 | MCP Advisor | read-only MCP proposal cards, no install/run/config mutation |
| v0.6 | Growth Signal Preview | deterministic advisory growth candidates, no unlock |
| v0.7 | Adapter Invocation Contract | recipe and `--json` invocation contract, no adapter runtime |
| v0.8 | Eval and Reports | local-only count/warning reports, no telemetry or LLM judge |
| runtime v0.1 | Activation Runtime | opt-in Codex lifecycle binding, local state automation, no durable memory auto-accept |

## Boundary Audit

| Boundary | v1.0 stable result | Evidence surface |
| --- | --- | --- |
| Seed Kernel is lightweight | Pass. `init`, Quest, Route, Capsule, Doctor, and Identity remain repo-local file surfaces. No graph DB, vector DB, branch workflow, or external API is required. | README current features, `docs/10_DEVELOPMENT_ROADMAP.md`, `node bin/orange.js --help` |
| Memory Proposal is not automatic storage | Pass. Only completed Quest state can create a pending proposal, and only explicit `remember accept` creates an accepted graph node. L0/L1 proposal creation remains disabled by default. | `docs/02_MEMORY_GRAPH_SPEC.md`, memory tests, `remember.*` JSON commands |
| Graph sees accepted memory only | Pass. Graph list/show/search scan current-project accepted graph nodes with accepted proposal provenance. Pending/rejected proposals are not graph nodes. | `docs/02_MEMORY_GRAPH_SPEC.md`, graph reader, doctor graph diagnostics |
| Hook is read-only / warning-first | Pass. Hook preview/status/run return observations, warnings, and hints. They do not repair doctor findings, rebuild graph, create proposals, accept memory, build identity, or install hooks. | `docs/17_MINIMAL_HOOK_PREVIEW.md`, hook tests |
| MCP is Advisor | Pass. MCP commands produce deterministic proposal cards. They do not install, run, configure, persist API keys, call external networks, or write project memory/config. | `docs/18_MCP_ADVISOR.md`, MCP tests |
| Growth is not automatic unlock | Pass. Growth commands read local signals and produce advisory candidates with `auto_unlock: false` and `requires_user_approval: true`. | `docs/19_GROWTH_SYSTEM.md`, growth tests |
| Adapter is invocation contract | Pass. Adapter recipes describe safe `--json` command sequences and dry-runs. Activation Runtime adds a separate host binding path without moving Kernel state logic into adapters. | `docs/16_ADAPTER_CONTRACT.md`, `docs/20_ADAPTER_LAYER.md`, adapter tests, activation runtime tests |
| Eval is local-only report | Pass. Eval snapshot/report/explain read local `.orange-hyper` state only. Reports are stdout by default and write only under `.orange-hyper/evals/reports/` with `--write-report`. | `docs/21_EVAL_AND_REPORTS.md`, eval tests |
| Project Sync is generated state | Pass. `init --json` is idempotent, `sync plan` is read-only, `sync apply` writes only `.orange-hyper/structure/` and refreshes Identity HTML, `sync status` reports freshness and diff fields, and accepted memory is preserved as overlay state. | `docs/24_PROJECT_SYNC.md`, sync tests |

## Adapter JSON Contract

The v1 stable line keeps the adapter-facing JSON contract at
`contract_version: "0.1"`.
This is intentional: the package version changed, but the adapter envelope did
not.

Successful JSON output remains:

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "...",
  "data": {}
}
```

Failure JSON output remains:

```json
{
  "ok": false,
  "contract_version": "0.1",
  "command": "...",
  "error": {
    "code": "...",
    "message": "...",
    "hint": "..."
  }
}
```

## Command Surface

The v1 stable audited top-level CLI command surface is:

<!-- orange-command-surface:start -->
- `init`
- `activate`
- `lifecycle`
- `host`
- `quest`
- `route`
- `capsule`
- `remember`
- `graph`
- `hook`
- `mcp`
- `growth`
- `adapter`
- `binding`
- `eval`
- `sync`
- `env`
- `doctor`
- `identity`
<!-- orange-command-surface:end -->

`init` is the bootstrap command. The user-requested audit surface is the
post-init kernel surface: `activate`, `lifecycle`, `host`, `quest`, `route`,
`capsule`, `remember`, `graph`, `hook`, `mcp`, `growth`, `adapter`, `binding`, `eval`,
`sync`, `env`, `doctor`, and `identity`.

## What v1 Stable Guarantees

- The documented top-level command surface remains available.
- JSON success and failure envelopes keep `contract_version: "0.1"`.
- Hook, MCP Advisor, Growth Signal Preview, Adapter dry-run, and Eval report
  surfaces stay warning-first, advisory, dry-run, or local-only as documented.
- Shared project memory remains limited to config, completed Quest evidence,
  accepted memory proposals, and graph provenance.
- Local/generated artifacts such as structure sync state, identity HTML, and
  opt-in reports stay under ignored local directories.
- Package contents are audited with `npm pack --dry-run`.

## What v1 Stable Does Not Guarantee

- A limited Codex Activation Runtime is provided only after explicit user-scope
  Host Binding setup and explicit project activation.
- No MCP server is installed, configured, or executed automatically.
- No hook lifecycle is trusted or considered active without Codex hook review,
  plugin enablement evidence where Codex exposes it, and current-fingerprint
  SessionStart, UserPromptSubmit, and Stop heartbeat events.
- No roles, subagents, workflows, planner loops, or automatic growth unlocks are
  created.
- No telemetry, network upload, external API call, or LLM judge is used.
- No project memory or config is mutated without an explicit user command.
- No success-rate improvement, token-savings estimate, or model-capability
  improvement claim is made.

## Stable Readiness Evidence

The `v1.0.0-alpha.1` Stabilization Polish smoke is recorded as stable readiness
evidence, not as a new feature claim. It carries forward the published
`v1.0.0-alpha.0` package smoke and the actual-repo smoke surface used to verify
that the stable release can keep the same command and contract boundaries.

Readiness command surface:

- `orange --help`
- `orange doctor --json`
- `orange eval report --json`
- `orange adapter dry-run project-status --json`
- `orange growth status --json`
- `orange hook run stop --json`
- `orange mcp suggest --query "Spring Security 최신 문서 확인이 필요해" --json`
- `orange graph list --json`

The smoke kept the adapter JSON envelope at `contract_version: "0.1"` and did
not install MCPs, run MCP servers, install hooks, mutate hook state, execute
adapter recipes, upload telemetry, call an LLM judge, or automatically mutate
project memory/config.

Known warning:

- `HOOK_CAPSULE_STALE` may appear from `hook run stop` when the generated
  capsule is older than the latest completed work. This is not a smoke failure.
  The hook surface is read-only and warning-first; it reports the state and
  leaves the manual follow-up to the user. Run `orange capsule` only when a
  refreshed generated artifact is explicitly wanted.
- Missing or stale identity summaries are handled the same way. Run
  `orange identity build` only when a refreshed generated artifact is
  explicitly wanted.

## Shared vs Local State

Shared project-memory state can be committed when it passes `orange doctor`:

- `.orange-hyper/config.json`
- `.orange-hyper/quests/completed/*.md`
- `.orange-hyper/proposals/memory-delta/accepted/*.md`
- `.orange-hyper/graph/**`

Local/generated state remains ignored and should not be treated as shared
project memory:

- `.orange-hyper/capsules/`
- `.orange-hyper/traces/`
- `.orange-hyper/identity/`
- `.orange-hyper/structure/`
- `.orange-hyper/hooks/reports/`
- `.orange-hyper/evals/reports/`
- `.orange-hyper/proposals/memory-delta/pending/`
- `.orange-hyper/proposals/memory-delta/rejected/`
- `.orange-hyper/local/`

`doctor` checks root `.gitignore`, `.orange-hyper/.gitignore`, accepted proposal
provenance, graph/index consistency, tracked private `.orange-hyper` state,
private-looking paths in public memory, and token/secret/auth-like strings in
public memory.

## Package Surface

The npm package is expected to include:

- `bin/`
- `src/`
- `docs/`
- `scripts/`
- `README.md`, `README.en.md`, `README.zh-CN.md`, `README.ja.md`
- `install.sh`, `install.ps1`
- `readme-hero.png` and `assets/readme/`
- `RELEASE_NOTES.md`
- `LICENSE`
- package metadata and provenance/security/citation files

The package must not include:

- `tests/`
- `.orange-hyper/` local/generated artifacts
- `node_modules/`
- temporary output
- `coverage/`

## Known Limitations

- The adapter layer is still an invocation contract, not a runtime.
- MCP Advisor is a local deterministic recommender, not MCP installation or
  execution.
- Hook commands are preview observations only and are not installed into any
  agent hook lifecycle.
- Growth candidates are advisory labels; no role/tool/workflow unlock happens.
- Eval reports are local count/warning summaries; token savings and
  success-rate improvement remain unavailable.
- Identity output is generated local state and not shared memory.
- Structure sync output is generated local state and not accepted memory.
- `graph rebuild-index` rewrites only the generated graph read model and should
  not be treated as graph source editing.

## Stable Release Gate

- Keep the full validation gate green for the stable prep: `npm test`,
  `npm run typecheck`, `npm run check:readme-sync`, `git diff --check`, CLI
  help, actual repo smoke, and package dry-run.
- Reconfirm README/doc command surface and package surface from
  `npm pack --dry-run`, not only by reading source files.
- Treat hook warnings such as `HOOK_CAPSULE_STALE` as manual follow-up
  evidence, not release failures, when the command exits successfully and
  preserves read-only/no-mutation flags.
- Keep Adapter JSON `contract_version` at `"0.1"` unless a real adapter-facing
  breaking contract change is made.
- Keep stable release notes focused on stabilization, not new runtime claims.

The required stable-prep commands are:

```bash
npm test
npm run typecheck
npm run check:readme-sync
git diff --check
node bin/orange.js --help
npm pack --dry-run --cache /private/tmp/orange-hyper-npm-cache
node bin/orange.js env --json
node bin/orange.js doctor --json
node bin/orange.js eval report --json
node bin/orange.js adapter dry-run project-status --json
node bin/orange.js growth status --json
node bin/orange.js hook run stop --json
node bin/orange.js mcp suggest --query "Spring Security 최신 문서 확인이 필요해" --json
node bin/orange.js graph list --json
node bin/orange.js init --json
node bin/orange.js sync plan --json
node bin/orange.js sync apply --json
node bin/orange.js sync status --json
node bin/orange.js identity build --json
```

## Non-Goals

The v1 stable line does not include:

- MCP automatic installation or execution
- hook installation or automatic mutation
- role automatic creation
- subagent orchestration
- auto planner or auto execution loop
- LLM judge
- telemetry or network upload
- adapter runtime implementation
- automatic project memory/config mutation

## Future Tracks After v1

Post-v1 work should stay measured. It should not automatically become a v1.1
feature expansion queue.

- Stabilization: keep regression checks, package surface audits, warning
  clarity, and docs sync healthy.
- Dogfooding: collect real workflow evidence before widening runtime scope.
- Measured improvement: define evidence-backed quality signals before making
  improvement claims.
- Adapter Runtime Research: evaluate whether a runtime is needed separately
  from the already stable Adapter Invocation Contract.
- TS Migration Review: assess source migration cost and safety without turning
  the v1 stable line into a TypeScript rewrite.

## Trusted Publishing

Official npm publishing remains tag-triggered GitHub Actions Trusted Publishing.
The publish workflow has `id-token: write`, uses npm provenance through
`publishConfig.provenance: true`, publishes `v*-alpha.*`, `v*-beta.*`, and
`v*-rc.*` tags with matching prerelease npm dist-tags, and publishes stable
`vX.Y.Z` tags with the default `latest` dist-tag.

Local `npm publish` is not the official path. Local package checks should use
`npm pack --dry-run` and fresh temp smoke tests; the actual publication path is
the trusted GitHub Actions workflow.

## Local-Only / No Telemetry Principle

Orange Hyper reads and writes repo-local files only through explicit commands.
It does not upload `.orange-hyper` state, emit telemetry, call external APIs,
call LLM judges, or send reports over the network. Local reports are generated
artifacts and stay opt-in under ignored local directories.
