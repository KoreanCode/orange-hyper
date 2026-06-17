# v1 Stabilization Readiness

Orange Hyper v1.0.0 is the first stable boundary release. Orange Hyper v1.0.1
keeps that stable boundary and adds a README after-intro onboarding patch
without adding a new CLI feature, runtime adapter, MCP runner, hook installer,
role system, planner, LLM judge, or telemetry path. The purpose of the v1
stable line is to make the v0.1 through v0.8 boundaries explicit, verified, and
publish-ready while making the user-facing usage model clearer.

Version axes remain separate:

- package version: `1.0.1`
- README version: `1.0-doc.2`
- Adapter JSON contract version: `0.1`

## AI-first Usage Model

v1.0.1 documents Orange Hyper as an AI-first workflow, not a CLI-first product
experience.

- The user talks to an AI normally and does not need to memorize Orange CLI
  commands.
- The AI, skill, or adapter calls `orange ... --json` kernel commands when the
  task benefits from Quest capture, verification evidence, Memory Proposal,
  accepted memory graph reads, hook warnings, MCP suggestions, growth signals,
  eval summaries, or Identity HTML refresh.
- CLI commands remain the kernel interface. Human-readable output is for people;
  adapters parse only `--json` output.
- `.orange-hyper/` state is changed only through Orange Kernel commands, not by
  direct adapter file mutation.
- Small questions and simple explanations should stay lightweight. Real work can
  become a Quest, and memorable decisions, constraints, risks, or verification
  results should be proposed first, then accepted only after user approval.
- Hook, Growth, and Eval remain warning/summary surfaces. MCP remains a
  suggestion surface. None of them automatically repair, install, unlock, or
  mutate project memory/config.

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

## Boundary Audit

| Boundary | v1.0 stable result | Evidence surface |
| --- | --- | --- |
| Seed Kernel is lightweight | Pass. `init`, Quest, Route, Capsule, Doctor, and Identity remain repo-local file surfaces. No graph DB, vector DB, branch workflow, or external API is required. | README current features, `docs/10_DEVELOPMENT_ROADMAP.md`, `node bin/orange.js --help` |
| Memory Proposal is not automatic storage | Pass. Only completed Quest state can create a pending proposal, and only explicit `remember accept` creates an accepted graph node. L0/L1 proposal creation remains disabled by default. | `docs/02_MEMORY_GRAPH_SPEC.md`, memory tests, `remember.*` JSON commands |
| Graph sees accepted memory only | Pass. Graph list/show/search scan current-project accepted graph nodes with accepted proposal provenance. Pending/rejected proposals are not graph nodes. | `docs/02_MEMORY_GRAPH_SPEC.md`, graph reader, doctor graph diagnostics |
| Hook is read-only / warning-first | Pass. Hook preview/status/run return observations, warnings, and hints. They do not repair doctor findings, rebuild graph, create proposals, accept memory, build identity, or install hooks. | `docs/17_MINIMAL_HOOK_PREVIEW.md`, hook tests |
| MCP is Advisor | Pass. MCP commands produce deterministic proposal cards. They do not install, run, configure, persist API keys, call external networks, or write project memory/config. | `docs/18_MCP_ADVISOR.md`, MCP tests |
| Growth is not automatic unlock | Pass. Growth commands read local signals and produce advisory candidates with `auto_unlock: false` and `requires_user_approval: true`. | `docs/19_GROWTH_SYSTEM.md`, growth tests |
| Adapter is invocation contract | Pass. Adapter recipes describe safe `--json` command sequences and dry-runs. They do not execute recipes or mutate `.orange-hyper` directly. | `docs/16_ADAPTER_CONTRACT.md`, `docs/20_ADAPTER_LAYER.md`, adapter tests |
| Eval is local-only report | Pass. Eval snapshot/report/explain read local `.orange-hyper` state only. Reports are stdout by default and write only under `.orange-hyper/evals/reports/` with `--write-report`. | `docs/21_EVAL_AND_REPORTS.md`, eval tests |

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
- `quest`
- `route`
- `capsule`
- `remember`
- `graph`
- `hook`
- `mcp`
- `growth`
- `adapter`
- `eval`
- `doctor`
- `identity`
<!-- orange-command-surface:end -->

`init` is the bootstrap command. The user-requested audit surface is the
post-init kernel surface: `quest`, `route`, `capsule`, `remember`, `graph`,
`hook`, `mcp`, `growth`, `adapter`, `eval`, `doctor`, and `identity`.

## What v1 Stable Guarantees

- The documented top-level command surface remains available.
- JSON success and failure envelopes keep `contract_version: "0.1"`.
- Hook, MCP Advisor, Growth Signal Preview, Adapter dry-run, and Eval report
  surfaces stay warning-first, advisory, dry-run, or local-only as documented.
- Shared project memory remains limited to config, completed Quest evidence,
  accepted memory proposals, and graph provenance.
- Local reports are opt-in generated artifacts under ignored local directories.
- Package contents are audited with `npm pack --dry-run`.

## What v1 Stable Does Not Guarantee

- No adapter runtime is provided.
- No MCP server is installed, configured, or executed automatically.
- No hook lifecycle is installed into an agent, and hook commands do not repair
  state automatically.
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
- `scripts/check-readme-sync.js`
- `README.md`, `README.en.md`, `README.zh-CN.md`, `README.ja.md`
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
node bin/orange.js doctor --json
node bin/orange.js eval report --json
node bin/orange.js adapter dry-run project-status --json
node bin/orange.js growth status --json
node bin/orange.js hook run stop --json
node bin/orange.js mcp suggest --query "Spring Security 최신 문서 확인이 필요해" --json
node bin/orange.js graph list --json
```

## Non-Goals

The v1 stable line does not include:

- new CLI features
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
`publishConfig.provenance: true`, publishes `v*-alpha.*` tags with the npm
`alpha` dist-tag, and publishes non-alpha `vX.Y.Z` tags with the default
`latest` dist-tag.

Local `npm publish` is not the official path. Local package checks should use
`npm pack --dry-run` and fresh temp smoke tests; the actual publication path is
the trusted GitHub Actions workflow.

## Local-Only / No Telemetry Principle

Orange Hyper reads and writes repo-local files only through explicit commands.
It does not upload `.orange-hyper` state, emit telemetry, call external APIs,
call LLM judges, or send reports over the network. Local reports are generated
artifacts and stay opt-in under ignored local directories.
