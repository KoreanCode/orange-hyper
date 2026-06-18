# Release Notes

## v1.1.0-alpha.3

Brain-like Identity Graph Implementation.

- Package version is `1.1.0-alpha.3`.
- README version is `1.1-doc.3`.
- Release date is `2026-06-18`.
- Adapter JSON `contract_version` remains `"0.1"`.
- Identity HTML now opens on a graph-first `100vw` x `100vh` dark SVG stage
  instead of a document-style max-width report.
- The generated HTML embeds separate `sourceGraph` and `visualGraph` state.
  `sourceGraph` remains current-project accepted memory only, while
  `visualGraph` adds display-only concept, source quest, source proposal, and
  category nodes for a denser brain-like view.
- Derived visual nodes carry `displayOnly: true`, `derived: true`, and
  `readOnly: true`; they are never written to `.orange-hyper/graph` or
  `edges.jsonl`.
- The visual graph uses dependency-free vanilla SVG/JS with deterministic
  seed-based force-like layout, node glow, translucent neural links, search,
  type filtering, derived-node and label toggles, reset, fit-to-view, pan, and
  wheel zoom.
- Project summary, growth preview, eval note, node type distribution, accepted
  memory table, source quest/proposal links, boundary text, and raw debug state
  now live in sidebar/drawer surfaces. The default screen stays graph-first.
- Node click opens a read-only detail drawer. Empty accepted-memory state and
  JavaScript-disabled fallback table paths remain intact.
- Added Identity tests for full-screen graph-first layout, sourceGraph and
  visualGraph boundaries, derived node flags, sidebar/drawer markup, fallback
  placement, external-script/dependency bans, and editing-control exclusion.

### Explicitly not included

- graph editing
- source node or edge mutation
- external CDN or network fetch
- heavy graph dependencies such as D3, Cytoscape, or Sigma
- code dependency analysis
- LLM graph clustering
- pending/rejected proposal display
- project memory auto-generation
- MCP, hook, or subagent auto-run
- Obsidian or JSON Canvas export

## v1.1.0-alpha.2

Identity Graph Product Spec and Redesign Plan.

- Package version is `1.1.0-alpha.2`.
- README version is `1.1-doc.2`.
- Release date is `2026-06-18`.
- Adapter JSON `contract_version` remains `"0.1"`.
- This alpha does not add runtime behavior. It fixes the v1.1 product direction
  for Identity HTML before renderer work continues.
- `docs/14_IDENTITY_DASHBOARD_SPEC.md` now records the current alpha problem:
  the HTML is still a max-width document layout, the graph canvas is an
  internal 430px preview rather than a 100vh stage, table/detail information is
  visible in the document body, and the current 3-node/1-edge accepted-memory
  sample cannot produce a brain-like graph by itself.
- Identity HTML is now documented as the primary product surface for Orange
  Hyper Identity. Obsidian, JSON Canvas, orange graph JSON, and future app
  exports are secondary interoperability artifacts, not the default product
  experience.
- v1.1 target UX is fixed as a 100vw x 100vh graph-first dark neural field with
  hamburger sidebar, node detail drawer, search/filter drawer, no
  document-style main content, no always-visible table, and non-graph report
  information hidden until requested.
- `docs/02_MEMORY_GRAPH_SPEC.md` now separates `sourceGraph` from
  `visualGraph`: sourceGraph remains accepted current-project memory nodes
  only, while visualGraph may add display-only derived concept, source quest,
  source proposal, and category/type nodes inside generated Identity HTML state.
- Derived visual nodes must be marked `displayOnly: true`, `derived: true`, and
  `readOnly: true`; they are never written to `.orange-hyper/graph` and never
  mutate project memory.
- Future export candidates are documented for v1.2+: orange graph JSON,
  Obsidian Markdown Vault, and JSON Canvas `.canvas`, all explicit-command-only
  and non-mutating.
- README Identity copy now states that the full-screen Knowledge Graph
  Dashboard is the Identity target and that export is future interoperability,
  not the primary UX.
- Package metadata, package lock metadata, citation metadata, version tests,
  and `src/core/origin.js` now target `1.1.0-alpha.2`.

### Explicitly not included

- Identity HTML renderer implementation
- export command implementation
- Obsidian vault export
- JSON Canvas export
- graph editing
- project memory mutation
- external dependency addition
- D3, Cytoscape, Sigma, or other graph library adoption

## v1.1.0-alpha.1

README Product Surface Realignment.

- Package version is `1.1.0-alpha.1`.
- README version is `1.1-doc.1`.
- Release date is `2026-06-18`.
- Adapter JSON `contract_version` remains `"0.1"`.
- This alpha follows the active v1.1 line but does not add runtime behavior.
  It realigns the README product surface around the AI-first usage model.
- The README sections after "Orange Hyper 소개" now use this order:
  installation, first prompt for the AI, real flow with the AI, quiet
  artifacts left behind, Identity HTML / Knowledge Graph, detailed docs links,
  and Manual fallback / Kernel command reference.
- Installation now appears immediately after the Orange Hyper introduction.
  The `npx -y --package orange-hyper@latest orange --help` command is framed
  only as a quick package check, not as the continuing user workflow.
- Added a copy-paste AI starter prompt that tells the AI to use Orange Hyper,
  keep the user out of CLI management, call `orange ... --json` kernel commands
  when needed, avoid turning small questions into Quests, record intent and
  verification evidence for real work, propose memory without auto-accepting it,
  avoid MCP auto-installation, keep Hook/Growth/Eval advisory, avoid direct
  `.orange-hyper` edits, and refresh Identity HTML when useful.
- Conversation examples now come before CLI references and show Quest capture,
  Memory Proposal, Identity HTML plus Knowledge Graph/Growth/Eval review, and
  MCP Advisor suggestions.
- Reframed the feature list as artifacts Orange Hyper leaves behind: Quest,
  Evidence, Memory Proposal, Accepted Memory, Knowledge Graph, Identity HTML,
  Hook Warning, MCP Suggestion, Growth Signal, and Eval Report.
- Clarified that the Knowledge Graph is an accepted project memory graph, not a
  code dependency graph. It shows accepted decision, constraint, risk,
  verification, and component memory, excludes pending/rejected proposals, and
  the current Identity HTML surface is a read-only preview rather than a full
  graph editor or completed brain-like full-screen dashboard.
- Moved long manual CLI examples out of README into
  `docs/23_MANUAL_FALLBACK.md`. README now links adapter authors to
  `docs/20_ADAPTER_LAYER.md`, the kernel reference to
  `docs/16_ADAPTER_CONTRACT.md`, and manual fallback to the new document.
- Synced the same structure across Korean, English, Simplified Chinese, and
  Japanese README files while keeping Korean README as the source of truth.
- `docs/22_V1_STABILIZATION.md` records the AI-first usage model for the active
  v1.1 alpha line.
- Package metadata, package lock metadata, citation metadata, version tests,
  and `src/core/origin.js` now target `1.1.0-alpha.1`.

### Explicitly not included

- new CLI command
- runtime behavior change
- Identity HTML renderer implementation
- Knowledge Graph dashboard implementation
- MCP, hook, or adapter runtime implementation
- project memory/config automatic mutation
- package feature expansion

## v1.1.0-alpha.0

Knowledge Graph Dashboard alpha for Identity HTML.

- Package version is `1.1.0-alpha.0`.
- README version is `1.1-doc.0`.
- Release date is `2026-06-18`.
- Adapter JSON `contract_version` remains `"0.1"`.
- `identity build` now embeds a read-only Knowledge Graph Dashboard state with
  accepted current-project memory nodes, dashboard-derived display edges, node
  type, label, source Quest/Proposal, candidate memory summary, degree,
  `project_id`, node type colors, and `readOnly: true`.
- Identity HTML now includes a single-file vanilla SVG/JS graph view with a dark
  canvas, colored nodes by type, labels, edge lines, node sizing by degree,
  deterministic layout, click-to-detail panel, type filter, and search box.
- The Knowledge Graph warning copy is explicit: it is read-only, built from
  accepted memory nodes, not a code dependency graph, excludes
  pending/rejected proposals, and does not support graph editing.
- Empty accepted-memory state now renders a clear empty graph message while the
  accepted-node table remains as the no-JS fallback.
- README and Identity Dashboard docs now describe the v1.1 Dashboard boundary,
  while `docs/02_MEMORY_GRAPH_SPEC.md` clarifies that dashboard edges are
  visualization-only display relations, not persisted graph source edges.
- Added identity dashboard tests for embedded graph state, accepted-only node
  inclusion, pending/rejected proposal exclusion, SVG view scaffolding, node
  type colors, read-only warning copy, no external script/dependency usage, no
  graph editing controls, and table fallback.
- Package metadata, package lock metadata, citation metadata, and
  `src/core/origin.js` now target `1.1.0-alpha.0`.

### Explicitly not included

- graph editing
- node/edge state mutation
- external CDN or network fetch
- D3, Cytoscape, Sigma, or other heavy graph dependency
- code dependency automatic analysis
- LLM graph clustering
- pending/rejected proposal display in the graph
- project memory automatic creation
- MCP, hook, or subagent automatic execution

## v1.0.1

README after-intro onboarding patch for Orange Hyper.

- Package version is `1.0.1`.
- README version is `1.0-doc.2`.
- Release date is `2026-06-18`.
- Adapter JSON `contract_version` remains `"0.1"`.
- This patch does not add runtime features. It keeps the v1 stable command
  surface and focuses on how users should actually start using Orange Hyper
  with an AI.
- The README sections after "Orange Hyper 소개" now lead with the AI-first
  usage model: the user talks normally, and the AI or adapter calls
  `orange ... --json` kernel commands when Orange Hyper is useful.
- Added a Starter Prompt that tells the AI to use Orange Hyper without making
  the user manage CLI commands, to avoid turning small explanations into
  Quests, to record intent and verification evidence for real work, to propose
  memory without auto-accepting it, to avoid MCP auto-installation, to keep
  Hook/Growth/Eval advisory, and to use Orange Kernel commands instead of
  direct `.orange-hyper` edits.
- Added conversation-first examples for Quest capture, Memory Proposal,
  Identity HTML plus Growth/Eval review, and MCP Advisor suggestions.
- Reframed the feature list as artifacts Orange Hyper leaves behind: Quest,
  Evidence, Memory Proposal, Accepted Memory, Knowledge Graph, Identity HTML,
  Hook Warning, MCP Suggestion, Growth Signal, and Eval Report.
- Clarified that the Knowledge Graph is an accepted project memory graph, not a
  code dependency graph. It shows accepted decision, constraint, risk,
  verification, and component memory, excludes pending/rejected proposals, and
  is currently a read-only Identity HTML preview rather than a full graph
  editor.
- Moved CLI examples to lower reference sections: "For AI / Adapter authors",
  "Manual fallback", and "Kernel command reference".
- Synced the same structure across Korean, English, Simplified Chinese, and
  Japanese README files while keeping Korean README as the source of truth.
- `docs/22_V1_STABILIZATION.md` now records the AI-first usage model as part of
  the v1 stable line.
- Package metadata, package lock metadata, citation metadata, and
  `src/core/origin.js` now target `1.0.1`.

### Explicitly not included

- new CLI command
- runtime behavior change
- Knowledge Graph renderer or full graph editor
- MCP automatic installation or execution
- hook automatic mutation or installation
- adapter runtime implementation
- project memory/config automatic mutation

## v1.0.0

First stable boundary release for Orange Hyper.

- Package version is `1.0.0`.
- README version is `1.0-doc.2`.
- Release date is `2026-06-18`.
- Adapter JSON `contract_version` remains `"0.1"`.
- v1.0.0 is not a new feature release. It promotes the Boundary Audit and
  Stabilization Polish work from `v1.0.0-alpha.0` and `v1.0.0-alpha.1` into the
  first stable Orange Hyper surface.
- Stable surface fixed for v1:
  Seed Kernel, Memory Delta Proposal, Memory Graph Usability, Minimal Hook
  Preview, MCP Advisor, Growth Signal Preview, Adapter Invocation Contract, and
  Eval and Reports.
- The stable command surface remains: `init`, `quest`, `route`, `capsule`,
  `remember`, `graph`, `hook`, `mcp`, `growth`, `adapter`, `eval`, `doctor`,
  and `identity`.
- Stable readiness evidence carries forward the alpha smoke surface and is
  re-run during release prep: `orange --help`, `doctor --json`,
  `eval report --json`, `adapter dry-run project-status --json`,
  `growth status --json`, `hook run stop --json`,
  `mcp suggest --query ... --json`, and `graph list --json`.
- Hook warnings such as `HOOK_CAPSULE_STALE` are read-only warning evidence,
  not release failures, when the command exits successfully and preserves
  no-mutation boundaries.
- Package surface policy remains clean: include `bin`, `src`, `docs`, README
  files, release notes, license, provenance/security/citation metadata, README
  assets, and `scripts/check-readme-sync.js`; exclude tests, `.orange-hyper`,
  `node_modules`, coverage, temporary output, and local generated artifacts.

### Explicitly not included

- telemetry or network upload
- LLM judge
- MCP automatic installation or execution
- hook automatic mutation or installation
- role automatic creation
- subagent orchestration
- adapter runtime implementation
- auto planner or auto execution loop
- project memory/config automatic mutation
- Adapter JSON Contract shape change

## v1.0.0-alpha.1

v1 Stabilization Polish alpha.

- Package version is `1.0.0-alpha.1`.
- README version is `1.0-doc.1`.
- Adapter JSON `contract_version` remains `"0.1"`.
- This alpha is stabilization polish after the `v1.0.0-alpha.0` Boundary Audit
  and npm alpha smoke. It does not add a new CLI command, runtime adapter, MCP
  runner, hook installer, role system, planner, LLM judge, telemetry path, or
  automatic project memory/config mutation.
- `docs/22_V1_STABILIZATION.md` now records the published alpha.0 smoke surface:
  `orange --help`, `doctor --json`, `eval report --json`,
  `adapter dry-run project-status --json`, `growth status --json`,
  `hook run stop --json`, `mcp suggest --query ... --json`, and
  `graph list --json`.
- The alpha.0 smoke warning policy is now explicit: local generated-state hook
  warnings such as missing or stale capsule/identity summaries are manual
  follow-up evidence, not failures, when the command exits successfully and
  preserves read-only/no-mutation flags.
- CLI diagnostic text is clearer for v1 users without changing runtime
  behavior: doctor now distinguishes warnings from blocking problems, hook
  unsupported-event errors list supported events, adapter unknown-recipe errors
  list available recipe ids, and JSON failure hints for doctor/hook/eval/adapter
  point to the safest manual next command.
- Package surface policy remains clean: `npm pack --dry-run` is expected to
  include `bin`, `src`, `docs`, README files, release notes, license, public
  metadata, assets, and `scripts/check-readme-sync.js`, while excluding tests,
  `.orange-hyper` local/generated artifacts, `node_modules`, coverage, and temp
  output.
- `CITATION.cff`, package metadata, package lock metadata, README metadata,
  roadmap notes, adapter contract wording, v1 boundary tests, and
  `src/core/origin.js` now target `1.0.0-alpha.1` / `1.0-doc.1` as appropriate.

### Explicitly not included

- new CLI feature
- MCP automatic installation or execution
- hook automatic mutation or installation
- role automatic creation
- subagent orchestration
- auto planner or auto execution loop
- LLM judge
- telemetry or network upload
- adapter runtime implementation
- project memory/config automatic mutation

## v1.0.0-alpha.0

v1.0 Stabilization Candidate alpha.

- Package version is `1.0.0-alpha.0`.
- README version is `1.0-doc.0`.
- Adapter JSON `contract_version` remains `"0.1"`.
- This alpha is stabilization work, not a new feature release. It re-audits the
  v0.1 through v0.8 Seed Kernel, Memory Proposal, Memory Graph, Hook, MCP
  Advisor, Growth, Adapter, and Eval boundaries before a future v1.0 stable.
- Added `docs/22_V1_STABILIZATION.md` as the v1 readiness report covering
  v0.1-v0.8 summaries, boundary audit results, known limitations, stable
  readiness work, non-goals, Trusted Publishing, and local-only/no-telemetry
  principles.
- README Korean, English, Simplified Chinese, and Japanese docs now mark the
  README version as `1.0-doc.0`, describe v1 as a stabilization candidate, and
  expose an audited command surface marker.
- `docs/10_DEVELOPMENT_ROADMAP.md` now marks v1.0 Stabilization Candidate as
  the current roadmap stage.
- `src/core/origin.js` generator metadata now reports `1.0.0-alpha.0`.
- Package metadata now targets `1.0.0-alpha.0`.
- The Adapter JSON envelope remains unchanged:
  `{ ok, contract_version: "0.1", command, data }` for success and
  `{ ok, contract_version: "0.1", command, error }` for failure.
- The audited command surface is `init`, `quest`, `route`, `capsule`,
  `remember`, `graph`, `hook`, `mcp`, `growth`, `adapter`, `eval`, `doctor`,
  and `identity`.
- Shared `.orange-hyper` state remains limited to config, completed Quests,
  accepted memory proposals, and graph provenance. Capsules, traces, identity,
  hook reports, eval reports, pending/rejected proposals, and `local/` remain
  local/generated state.
- Package dry-run policy remains: include `bin`, `src`, `docs`, README files,
  release notes, license, and public metadata; exclude tests, `.orange-hyper`
  local/generated artifacts, `node_modules`, temporary output, and coverage.

### Boundary summary

- Seed Kernel stays lightweight: no graph DB, vector DB, branch workflow, or
  external API requirement.
- Memory Proposal stays proposal-first: no automatic memory write and no
  accept without explicit user command.
- Graph reads current-project accepted memory only; pending/rejected proposals
  are not graph nodes.
- Hook stays read-only / warning-first and does not repair, rebuild, generate,
  install, or mutate state automatically.
- MCP remains Advisor only and does not install, run, configure, persist keys,
  call networks, or write project memory/config.
- Growth remains preview only and keeps `auto_unlock: false` plus
  `requires_user_approval: true`.
- Adapter remains an invocation contract and does not execute recipes or
  mutate `.orange-hyper` directly.
- Eval remains local-only and does not upload telemetry, call LLM judges,
  estimate token savings, claim success-rate improvement, or mutate state.

### Explicitly not included

- new CLI feature
- MCP automatic installation or execution
- hook automatic mutation or installation
- role automatic creation
- subagent orchestration
- auto planner or auto execution loop
- LLM judge
- telemetry or network upload
- adapter runtime implementation
- project memory/config automatic mutation

## v0.8.0

Local-only Eval and Reports stable release.

- Package version is `0.8.0`.
- README version is `0.8-doc.2`.
- Adapter JSON `contract_version` remains `"0.1"`.
- v0.8.0 promotes the validated v0.8.0-alpha.0 and v0.8.0-alpha.1 Eval
  and Reports surface to stable without adding telemetry, upload, judging, or
  automatic state mutation.
- Stable command surface:
  `orange eval snapshot`, `orange eval report`, and `orange eval explain`.
- `eval snapshot` reads current local `.orange-hyper` project state and
  summarizes project identity, Quest verification, Memory Delta Proposal flow,
  accepted graph nodes, doctor diagnostics, existing local hook report
  warnings, MCP Advisor signals, Growth Signal Preview, Adapter Invocation
  Contract readiness, and identity report existence.
- `eval report --json` exposes `report_id`, `schema_version: 2`,
  `report_kind: "eval-report"`, `project_id`, `project_name`,
  `local_only: true`, `telemetry: false`, `network_upload: false`,
  `llm_judge: false`, `summary`, `sections`, `known_gaps`, and
  `unavailable_metrics`.
- Report sections use only `good`, `needs-attention`, and
  `insufficient-data`. Every section includes a human-readable `reason` and
  numeric `evidence_count`; v0.8.0 does not produce a score, rank, or grade.
- `known_gaps` and `unavailable_metrics` keep unsupported measurements
  explicit. `token.savings` is unavailable, and
  `success_rate.improvement` is unavailable.
- `token.savings` stays unavailable because token counts are not collected.
  v0.8.0 does not estimate token savings.
- `success_rate.improvement` stays unavailable because no comparative
  task-pack outcome dataset is collected. v0.8.0 does not claim success-rate
  improvement.
- `eval explain` documents metric source, limitation, and unavailable reason
  for local metrics, including `token.savings`,
  `success_rate.improvement`, `hook.warning.usefulness`, and
  `memory.acceptance_rate`.
- `--write-report` remains the only eval write path. It writes a Markdown
  local-only report under `.orange-hyper/evals/reports/` only when explicitly
  requested and rejects path/value arguments.
- Eval reports use local state only. They are generated artifacts, not project
  memory, and they do not update config, Quest, Proposal, Graph, Identity,
  hook, MCP, adapter, or growth state.
- `identity build` does not automatically embed eval summaries; eval reports
  remain separate explicit commands.

### Explicitly not included

- external telemetry
- network upload or API calls
- LLM judge calls
- token savings estimation
- success-rate improvement claims
- project memory or config automatic mutation
- automatic Quest, Proposal, Graph, or Identity creation
- MCP automatic execution
- hook automatic execution
- subagent execution
- auto planner or auto execution loop

## v0.8.0-alpha.1

Eval Report Quality Hardening alpha.

- Package version is `0.8.0-alpha.1`.
- README version is `0.8-doc.1`.
- Adapter JSON `contract_version` remains `"0.1"`.
- `eval report` now includes a top summary with project identity,
  `generated_at`, local-only report mode, total section count,
  `needs-attention` count, `insufficient-data` count, and explicit no
  telemetry / no network / no LLM judge flags.
- `eval report --json` now exposes `report_id`, `schema_version: 2`,
  `project_id`, `project_name`, `local_only: true`, `telemetry: false`,
  `network_upload: false`, `llm_judge: false`, `sections`, `known_gaps`,
  and `unavailable_metrics`.
- Report sections now include `status`, `reason`, and `evidence_count`.
  Allowed statuses remain only `good`, `needs-attention`, and
  `insufficient-data`; no score or grade is produced.
- `eval explain` now includes a `limitation` for each metric and documents
  `token.savings`, `success_rate.improvement`,
  `hook.warning.usefulness`, and `memory.acceptance_rate` without estimating
  missing data.
- `--write-report` remains the only eval write path. It writes Markdown only
  under `.orange-hyper/evals/reports/` with an `eval-report-` timestamped
  filename and still rejects path/value arguments.
- `identity build` does not automatically include eval summaries in this
  alpha; eval reports remain separate explicit commands.
- Tests cover report summary, section status metadata, unavailable token and
  success metrics, JSON report schema, local-only report writing,
  explain limitations, and identity/eval separation.

### Explicitly not included

- external telemetry
- network upload or API calls
- LLM judge calls
- token savings estimation
- success-rate improvement claims
- project memory or config automatic mutation
- automatic Quest, Proposal, Graph, or Identity creation
- MCP automatic execution
- hook automatic execution
- subagent execution
- auto planner or auto execution loop

## v0.8.0-alpha.0

Eval and Reports Preview alpha.

- Package version is `0.8.0-alpha.0`.
- README version is `0.8-doc.0`.
- Adapter JSON `contract_version` remains `"0.1"`.
- This alpha adds the local-only Eval and Reports Preview command surface:
  `orange eval snapshot`, `orange eval report`, and `orange eval explain`.
- New JSON command ids are `eval.snapshot`, `eval.report`, and
  `eval.explain`.
- `eval snapshot` reads current local `.orange-hyper` project state and
  summarizes project identity, Quest counts, completed/verified/unverified
  Quest counts, Memory Delta Proposal flow, accepted graph node count, doctor
  errors/warnings, latest local hook report warnings when available, MCP
  Advisor availability, growth candidate count, adapter recipe count, and
  identity report existence.
- `eval report` emits a Markdown local report to stdout by default. It writes
  only when `--write-report` is explicit, and the write path is limited to
  `.orange-hyper/evals/reports/`.
- `eval explain` shows where each metric came from and keeps unavailable
  metrics such as token savings and success-rate improvement unestimated.
- Eval sections use conservative signal summaries: `good`,
  `needs-attention`, and `insufficient-data`. v0.8 does not create an overall
  grade.
- `.orange-hyper/evals/reports/` is now treated as local/generated ignored
  state.
- Tests cover eval human/JSON output, no default file creation, opt-in report
  writes, path traversal rejection, no project memory/config mutation,
  unavailable metrics, and JSON envelope stability.

### Explicitly not included

- external telemetry
- network upload or API calls
- LLM judge calls
- token savings estimation
- success-rate improvement claims
- model capability improvement claims
- project memory or config automatic mutation
- automatic Quest, Proposal, Graph, or Identity creation
- MCP automatic execution
- hook automatic execution
- subagent execution
- auto planner or auto execution loop
- HTML dashboard

## v0.7.0

Adapter Invocation Contract stable release.

- Package version is `0.7.0`.
- README version is `0.7-doc.2`.
- Adapter JSON `contract_version` remains `"0.1"`.
- v0.7.0 promotes the validated v0.7.0-alpha.0 and v0.7.0-alpha.1 Adapter
  Invocation Contract surface to stable without adding adapter runtime
  execution.
- Stable command surface:
  `orange adapter list`, `orange adapter show <recipe-id>`, and
  `orange adapter dry-run <recipe-id>`.
- Built-in adapter recipes are `quest-capture`, `work-complete-to-memory`,
  `project-status`, `hook-check`, and `mcp-advice`.
- `adapter dry-run` returns a dry-run execution plan with `recipe_id`,
  `dry_run: true`, `executed: false`, `steps`, `commands`,
  `required_inputs`, `missing_inputs`, `safety_flags`,
  `expected_contract_version`, `next_user_decision`, `mutation_policy`, and
  `adapter_rules`.
- Recipe inputs declare whether values come from `user`, `previous_step`, or
  `project_state`, so adapters can distinguish user prompts from prior JSON
  outputs and existing kernel state.
- Every recipe step declares `mutates_project_state` and
  `requires_user_approval`; mutating steps require approval, while read-only
  status/advice/hook checks do not.
- Safety flags remain fixed as `direct_file_mutation: false`,
  `parses_human_output: false`, `requires_json_mode: true`,
  `auto_accept: false`, `auto_install: false`, and `auto_unlock: false`.
- The stable Adapter Layer remains an invocation contract: adapters call Orange
  CLI `--json`, parse JSON envelopes only, avoid `.orange-hyper` direct file
  mutation, and do not duplicate kernel state logic.

### Explicitly not included

- actual adapter runtime
- Codex/Claude-specific adapter automatic installation
- direct `.orange-hyper` file mutation
- human output parsing
- automatic Quest creation
- automatic memory proposal creation
- automatic accept or reject
- automatic graph rebuild
- automatic hook execution
- MCP automatic installation or execution
- subagent orchestration
- auto planner or auto execution loop
- recipe automatic execution

## v0.7.0-alpha.1

Adapter Recipe Quality Hardening.

- Package version is `0.7.0-alpha.1`.
- README version is `0.7-doc.1`.
- Adapter JSON `contract_version` remains `"0.1"`.
- Recipe steps now carry `step_index` and structured `input_requirements`.
- Placeholder inputs such as `<request>`, `<quest-id>`, `<proposal-id>`, and
  `<query>` now declare `input_source`: `user`, `previous_step`, or
  `project_state`.
- `adapter dry-run` now returns `recipe_id`, `dry_run: true`,
  `executed: false`, `steps`, `required_inputs`, `missing_inputs`,
  `safety_flags`, `expected_contract_version`, and `next_user_decision`.
- Dry-run keeps a `commands` alias for compatibility with the initial v0.7
  alpha while making `steps` the clearer execution-plan field.
- Recipe metadata now pins mutating commands to `requires_user_approval: true`
  and non-mutating read commands to `requires_user_approval: false`.
- `hook run session-start` and `hook run stop` remain read-only when
  `--write-report` is omitted, so their recipe steps are
  `mutates_project_state: false` and `requires_user_approval: false`.
- Tests now verify command ids, placeholder input sources, missing dry-run
  inputs, mutation approval flags, read-only approval flags, no dry-run
  `.orange-hyper` mutation, unknown recipe failures, and the no-human-output
  parsing guard.
- `docs/20_ADAPTER_LAYER.md` documents the recipe quality standard.
- `docs/16_ADAPTER_CONTRACT.md` includes a richer dry-run JSON example.

### Explicitly still not included

- Codex/Claude-specific adapter automatic installation
- actual adapter runtime
- automatic Quest creation
- automatic memory proposal creation
- automatic accept or reject
- automatic graph rebuild
- automatic hook execution
- MCP automatic installation or execution
- subagent orchestration
- direct `.orange-hyper` file mutation
- auto planner or auto execution loop

## v0.7.0-alpha.0

Adapter Invocation Contract alpha.

- Package version is `0.7.0-alpha.0`.
- README version is `0.7-doc.0`.
- Adapter JSON `contract_version` remains `"0.1"`.
- This alpha adds the Adapter Layer command surface:
  `orange adapter list`, `orange adapter show <recipe-id>`, and
  `orange adapter dry-run <recipe-id>`.
- New JSON command ids are `adapter.list`, `adapter.show`, and
  `adapter.dryRun`.
- Built-in recipes are `quest-capture`, `work-complete-to-memory`,
  `project-status`, `hook-check`, and `mcp-advice`.
- Each recipe declares `id`, `title`, `purpose`, `when_to_use`, `commands`,
  `required_inputs`, `outputs`, `safety_rules`, `forbidden_actions`,
  `expected_contract_version`, and `safety_flags`.
- Each recipe command step declares `command`, `why`, `required_input`,
  `expected_json_command_id`, `mutates_project_state`, and
  `requires_user_approval`.
- Safety flags are fixed as `direct_file_mutation: false`,
  `parses_human_output: false`, `requires_json_mode: true`,
  `auto_accept: false`, `auto_install: false`, and `auto_unlock: false`.
- `adapter dry-run` does not execute recipe commands and does not modify
  `.orange-hyper`.
- `docs/20_ADAPTER_LAYER.md` documents that natural-language and skill layers
  must call the kernel through Orange CLI `--json` commands, must not parse
  human output, and must not duplicate kernel state logic.

### Explicitly not included

- Codex/Claude-specific adapter automatic installation
- actual adapter runtime
- automatic Quest creation
- automatic memory proposal creation
- automatic accept or reject
- automatic graph rebuild
- automatic hook execution
- MCP automatic installation or execution
- subagent orchestration
- direct `.orange-hyper` file mutation
- auto planner or auto execution loop

## v0.6.0

Growth Signal Preview stable release.

- Package version is `0.6.0`.
- README version is `0.6-doc.2`.
- Adapter JSON `contract_version` remains `"0.1"`.
- v0.6.0 promotes the validated v0.6.0-alpha.0 and v0.6.0-alpha.1 Growth
  Signal Preview surface to stable without adding automatic role, tool, hook,
  subagent, planner, workflow, config, graph, or project-memory mutation.
- Stable command surface:
  `orange growth status`, `orange growth suggest`, and
  `orange growth explain`.
- `growth status` reports conservative project growth state from Quest, Route,
  accepted Memory Graph, Hook warning, Doctor, and MCP-advisor-shaped
  documentation/API freshness signals.
- `growth suggest` creates candidates only from repeated source-backed
  evidence. Each candidate includes `score`, `evidence_count`,
  `matched_signals`, `confidence`, `reason`, `suggested_next_step`,
  `auto_unlock: false`, and `requires_user_approval: true`.
- `growth explain` reports the same deterministic rule path with source-backed
  evidence instead of LLM calls, network calls, MCP calls, or planner loops.
- No-candidate negative cases are expected when evidence is too thin; a single
  Quest or one-off generic signal should not create a candidate.
- Positive repo smoke showed repeated documentation, verification, and memory
  hygiene evidence producing `verification-discipline`, `documentation-focus`,
  and `memory-hygiene` candidates while keeping `growthLevel` conservatively at
  `sprout`.
- `identity build` includes a Growth Signal Preview summary with growth level
  reason, candidate count, top candidates, growth confidence summary, and
  `No automatic unlocks`.
- At the v0.6.0 cut, v0.7 Adapter Layer was the next roadmap step after this
  stable Growth Signal Preview boundary.

### Explicitly not included

- role automatic creation
- MCP automatic installation or execution
- hook policy automatic changes
- subagent execution or recommendation automation
- auto planner or auto execution loop
- project memory automatic mutation
- graph node automatic creation
- workflow enforcement

## v0.6.0-alpha.1

Growth Signal Preview quality hardening.

- Package version is `0.6.0-alpha.1`.
- README version is `0.6-doc.1`.
- Adapter JSON `contract_version` remains `"0.1"`.
- `growthLevel` calibration is more conservative and no longer advances from
  accepted node count alone.
- Level calculation now considers node type diversity, verified Quest ratio,
  repeated evidence count, pending proposal load, doctor ok state, and active
  project boundary.
- Growth candidates now include deterministic `score`, `evidence_count`,
  `matched_signals`, `confidence`, `reason`, `suggested_next_step`,
  `auto_unlock: false`, and `requires_user_approval: true`.
- Candidate thresholds now require repeated source-backed evidence; a single
  generic string match is not enough to create a candidate.
- Backend/API false positives from generic API/Route Contract text are pinned
  by regression tests.
- `growth explain` now reports source-backed evidence for each candidate,
  including Quest, node, route layer, Hook warning, and MCP-shaped signal
  source fields where available.
- `identity build` now shows growth level reason, candidate count, top
  candidates, growth confidence summary, and `No automatic unlocks`.

### Explicitly still not included

- role automatic creation
- MCP automatic installation or execution
- hook policy automatic changes
- subagent execution or recommendation automation
- auto planner or auto execution loop
- project memory automatic mutation
- graph node automatic creation
- workflow enforcement

## v0.6.0-alpha.0

Growth Signal Preview alpha.

- Package version is `0.6.0-alpha.0`.
- README version is `0.6-doc.0`.
- Adapter JSON `contract_version` remains `"0.1"`.
- This alpha adds a read-only Growth Signal Preview command surface:
  `orange growth status`, `orange growth suggest`, and
  `orange growth explain`.
- New JSON command ids are `growth.status`, `growth.suggest`, and
  `growth.explain`.
- `growth status` summarizes project identity, accepted memory nodes, node
  type distribution, route/layer distribution, verified/unverified Quest
  ratio, pending memory proposals, Hook warning summary, MCP advisor signal
  summary, and decorative `growthLevel`.
- `growth suggest` returns deterministic candidates such as verification
  discipline, memory hygiene, backend/API focus, documentation focus, MCP
  documentation advisor readiness, and hook hygiene.
- Every growth candidate keeps `auto_unlock: false` and
  `requires_user_approval: true`.
- `growth explain` reports the deterministic evidence/rule path for each
  candidate without LLM calls, network calls, MCP calls, or planner loops.
- `identity build` now includes a compact Growth Signal Preview summary in the
  generated HTML and summary JSON.

### Explicitly not included

- role automatic creation
- MCP automatic installation or execution
- hook policy automatic changes
- subagent execution or recommendation automation
- auto planner or auto execution loop
- project memory automatic mutation
- graph node automatic creation
- workflow enforcement

## v0.5.0

MCP Advisor stable release.

- Package version is `0.5.0`.
- README version is `0.5-doc.2`.
- Adapter JSON `contract_version` remains `"0.1"`.
- v0.5.0 promotes the validated MCP Advisor alpha surface to stable without
  adding MCP integration or automatic execution behavior.
- Stable command surface:
  `orange mcp list`, `orange mcp show <mcp-id>`, and
  `orange mcp suggest [--quest <quest-id>] [--query <text>]`.
- The built-in MCP catalog remains local and deterministic, starting with
  `context7`, `github`, `sentry`, and `linear`.
- `mcp suggest` returns proposal cards with score-backed recommendation
  metadata: `score`, `confidence`, `matched_signals`, `why_now`, and
  `requires_user_approval: true`.
- Proposal cards remain recommendation cards, not install or execution results;
  they include `not_executed: true` and `config_mutation: false`.
- Weak or unrelated inputs return the explicit no-suggestion state with
  `suggestions: []`, `proposal_cards: []`, `no_suggestion_reason`, and
  `suggested_next_step`.
- Ranking is deterministic by descending `score`, built-in catalog order, and
  MCP id tie-breaker.
- Korean and English catalog signal matching is stable for docs/version/API,
  repository issue/PR, runtime incident/error, and product ticket/task contexts.
- Quest-based suggestions remain read-only and can use active or completed
  Quest title, request, constraints, and notes without mutating the Quest or
  project memory.

### Explicitly not included

- MCP automatic installation
- MCP automatic execution
- MCP config automatic modification
- API key storage
- external network calls
- hook-triggered MCP suggestion, installation, or execution
- subagent execution
- role evolution
- auto planner or auto execution loop
- automatic Quest, Proposal, Graph, config, or project memory mutation

## v0.5.0-alpha.1

MCP Advisor recommendation-quality hardening.

- Package version is `0.5.0-alpha.1`.
- README version is `0.5-doc.1`.
- Adapter JSON `contract_version` remains `"0.1"`.
- `mcp suggest` suggestions now include deterministic `score`,
  `confidence`, `matched_signals`, `why_now`, and
  `requires_user_approval: true`.
- Weak or unrelated requests now return an explicit no-suggestion state with
  `suggestions: []`, `no_suggestion_reason`, and `suggested_next_step`.
- Multiple matching MCPs are ranked by score, with deterministic catalog-order
  tie-breaking.
- Korean and English catalog signals were expanded for docs/version/API,
  repository issue/PR, runtime incident/error, and product ticket/task contexts.
- Quest-based suggestions include `source_quest_id`, support active and
  completed Quests, and read Quest request/title/constraints/notes without
  mutating Quest or project memory.
- Proposal cards now make the execution boundary explicit with
  `not_executed: true` and `config_mutation: false`.

### Explicitly still not included

- MCP automatic installation
- MCP automatic execution
- MCP config automatic modification
- API key storage
- external network calls
- hook-triggered MCP suggestion, installation, or execution
- subagent execution
- role evolution
- auto planner or auto execution loop
- automatic Quest, Proposal, Graph, config, or project memory mutation

## v0.5.0-alpha.0

MCP Advisor alpha.

- Package version is `0.5.0-alpha.0`.
- README version is `0.5-doc.0`.
- Adapter JSON `contract_version` remains `"0.1"`.
- This alpha adds a read-only MCP Advisor command surface:
  `orange mcp list`, `orange mcp show <mcp-id>`, and
  `orange mcp suggest [--quest <quest-id>] [--query <text>]`.
- New JSON command ids are `mcp.list`, `mcp.show`, and `mcp.suggest`.
- The built-in catalog starts with `context7`, `github`, `sentry`, and
  `linear`, each with use cases, useful-when guidance, risks, token impact,
  install hints, and persistent-use policy.
- `mcp suggest` returns proposal cards with `tool`, `why_now`,
  `expected_benefit`, `scope`, `risk`, `token_impact`, `install_command`,
  `use_once_or_persist`, and `requires_user_approval: true`.
- MCP suggestions read current project state only. They do not install MCPs,
  run MCPs, write MCP config, create Quest/Proposal/Graph state, write hook
  reports, or save project memory.
- Hooks remain separate from MCP Advisor. Hook preview/status/run output does
  not automatically include MCP advisor summaries.

### Explicitly not included

- MCP automatic installation
- MCP automatic execution
- MCP config automatic modification
- API key storage
- external network calls
- hook-triggered MCP suggestion, installation, or execution
- subagent execution
- role evolution
- auto planner or auto execution loop
- automatic Quest, Proposal, Graph, config, or project memory mutation

## v0.4.0

Minimal Hook Preview stable release.

- Package version is `0.4.0`.
- README version is `0.4-doc.2`.
- Adapter JSON `contract_version` remains `"0.1"`.
- v0.4.0 promotes the validated v0.4.0-alpha.0 and v0.4.0-alpha.1
  Minimal Hook Preview surface to stable without adding new CLI behavior.
- `orange hook preview`, `orange hook status`,
  `orange hook run session-start`, and `orange hook run stop` are the stable
  read-only / warning-first hook preview commands.
- `session-start` and `stop` perform read-only checks only. They observe
  project identity, Project Boundary, doctor quick status, graph/index state,
  pending proposals, and capsule/identity freshness without repairing or
  generating project memory.
- Hook warnings use stable adapter-facing `{ code, message, hint }` objects
  with `HOOK_*` warning codes such as `HOOK_PROJECT_ID_MISSING`,
  `HOOK_IDENTITY_SUMMARY_MISSING`, `HOOK_CAPSULE_STALE`,
  `HOOK_PENDING_PROPOSALS`, `HOOK_DOCTOR_NOT_OK`, and
  `HOOK_GRAPH_PROVENANCE_WARNING`.
- Hook report files use the stable report schema with generator metadata,
  `schema_version`, `report_kind`, `generated_at`, `project_id`,
  `project_name`, `event`, `readOnly: true`, `autoMutation: false`,
  `warnings`, `summaries` for doctor/graph/identity/capsule, and
  `recommended_commands`.
- The no-mutation invariant is stable: default hook preview/status/run
  commands do not modify Quest, Proposal, Graph, Capsule, Identity, Project
  Boundary, or config state.
- `--write-report` is the only hook option that writes a file. It writes a
  local-only diagnostic report under `.orange-hyper/hooks/reports/`, which is
  ignored by default and is not project memory.
- v0.5 MCP Advisor is the next roadmap step after this stable hook preview
  boundary.

### Explicitly not included

- MCP implementation or installation
- subagent execution
- role evolution
- auto planner or auto execution loop
- automatic Quest creation
- automatic memory proposal creation
- automatic proposal accept/reject
- automatic graph rebuild
- automatic doctor repair
- automatic Quest, Proposal, or Graph mutation

## v0.4.0-alpha.1

Minimal Hook Preview hardening alpha.

- Package version is `0.4.0-alpha.1`.
- README version is `0.4-doc.1`.
- Adapter JSON `contract_version` remains `"0.1"`.
- Hook warnings now use stable adapter-facing `{ code, message, hint }`
  objects with `HOOK_*` codes such as `HOOK_PROJECT_ID_MISSING`,
  `HOOK_IDENTITY_SUMMARY_MISSING`, `HOOK_CAPSULE_STALE`,
  `HOOK_PENDING_PROPOSALS`, `HOOK_DOCTOR_NOT_OK`, and
  `HOOK_GRAPH_PROVENANCE_WARNING`.
- `--write-report` now writes a stable hook report schema with
  `schema_version`, `generated_at`, `project_id`, `project_name`, `event`,
  `readOnly: true`, `autoMutation: false`, `warnings`, `summaries` for
  doctor/graph/identity/capsule, and `recommended_commands`.
- Hook reports remain off by default and write only under
  `.orange-hyper/hooks/reports/`; reports are local diagnostics, not project
  memory.
- Hook preview/status/run no-mutation coverage now verifies that default hook
  execution does not modify Quest, Proposal, Graph, Capsule, Identity, or config
  state.
- Capsule and identity stale warnings now use a documented mtime comparison
  against config, Quest, proposal, graph node, and graph index source files,
  with no graph rebuild, capsule generation, or identity build.
- Tests cover warning code shape, report schema, report-only writes, stale
  capsule/identity warnings, doctor-not-ok warnings, pending proposal warnings,
  and the existing v0.4.0-alpha.0 hook command surface.

### Explicitly not included

- automatic Quest creation
- automatic memory proposal creation
- automatic proposal accept/reject
- automatic graph rebuild
- automatic doctor repair
- hook installation
- Codex-specific or Claude-specific adapter implementation
- MCP implementation or installation
- subagent execution
- role evolution
- auto planner or auto execution loop

## v0.4.0-alpha.0

Minimal Hook Preview alpha.

- Package version is `0.4.0-alpha.0`.
- README version is `0.4-doc.0`.
- Adapter JSON `contract_version` remains `"0.1"`.
- This alpha adds a read-only, warning-first hook command surface only:
  `orange hook preview`, `orange hook status`,
  `orange hook run session-start`, and `orange hook run stop`.
- New JSON command ids are `hook.preview`, `hook.status`,
  `hook.runSessionStart`, and `hook.runStop`.
- `hook preview` shows project_id, doctor quick check, capsule freshness,
  identity summary, graph/index, local report, `readOnly: true`, and
  `autoMutation: false` targets without installing hooks.
- `hook status` reports `previewAvailable: true`, `installed: false`,
  `readOnly: true`, `autoMutation: false`, supported events
  `session-start` and `stop`, and future unsupported events such as
  `user-prompt-submit` and `post-tool-use`.
- `hook run session-start` observes `.orange-hyper`, `config.project_id`,
  Project Boundary, identity summary presence, accepted memory node count, and
  doctor quick status.
- `hook run stop` observes doctor quick status, completed Quest verification
  anomalies, accepted graph node provenance anomalies, pending memory proposal
  count, stale/missing capsule or identity warnings, and project boundary
  warnings.
- Hook run warnings are returned as warnings and hints; missing project_id or
  doctor diagnostics do not trigger automatic repair.
- Hook reports are off by default. `--write-report` writes only under
  `.orange-hyper/hooks/reports/`, which is ignored by default, and the option
  does not accept a path or filename.

### Explicitly not included

- automatic Quest creation
- automatic memory proposal creation
- automatic proposal accept/reject
- automatic graph rebuild
- automatic doctor repair
- hook installation
- MCP implementation or installation
- subagent execution
- role evolution
- auto planner or auto execution loop
- branch/PR/SPEC workflow enforcement

## v0.3.0

Memory Graph Usability stable release.

- Package version is `0.3.0`.
- README version remains `0.3-doc.3`.
- Adapter JSON `contract_version` remains `"0.1"`.
- v0.3.0 promotes the validated v0.3.0-alpha.0 through v0.3.0-alpha.3
  surface to stable without adding new CLI behavior.
- This is a Memory Graph Usability stable release, not a Hook, MCP, Subagent,
  role evolution, auto planner, auto execution loop, graph editing, or
  semantic/vector search release.

### Stable surface

- `orange graph list`, `orange graph show`, `orange graph search`, and
  `orange graph rebuild-index` provide read-only exploration of current-project
  accepted memory nodes.
- Graph filters cover node type, source Quest, and source Proposal where
  supported; search remains deterministic plain-text search, not fuzzy,
  semantic, or vector search.
- `orange identity build` includes a read-only Identity Graph Preview with
  accepted memory node count, node type distribution, source columns,
  project-boundary state, and node details.
- Project Boundary Guard keeps graph results scoped to the current
  `project_id` and keeps cross-project memory out of current-project graph
  views.
- Shared Memory State Policy keeps public `.orange-hyper/` state bounded to
  shareable config, completed Quests, accepted Memory Delta Proposals, accepted
  graph nodes/read models, and graph provenance.
- README identity rewrite and synchronized Korean, English, Simplified Chinese,
  and Japanese READMEs are the stable public project narrative.
- Type Safety Foundation remains a development-only contract-checking layer for
  Adapter JSON envelopes and Quest/Proposal/Graph/Doctor/Identity shapes while
  the package is still distributed as JavaScript.
- Trusted Publishing is the official npm release path. Tags matching
  `v*-alpha.*` publish with npm dist-tag `alpha`; stable tags matching `vX.Y.Z`,
  including `v0.3.0`, publish with the default `latest` dist-tag.

## v0.3.0-alpha.3

Publish Pipeline Trusted Publishing release.

- Package version is `0.3.0-alpha.3`.
- README version remains `0.3-doc.3`.
- Adapter JSON `contract_version` remains `"0.1"`.
- Publish pipeline moved to GitHub Actions trusted publishing.
- Official npm publish now runs from the `push` tag `v*` workflow with
  `id-token: write`, npm registry setup, full release checks, package dry-run,
  and `npm publish` without `NODE_AUTH_TOKEN` as the default path.
- Alpha tags matching `v*-alpha.*` publish with npm dist-tag `alpha`; stable
  tags matching `vX.Y.Z` publish with npm dist-tag `latest`.
- Local `npm publish` is not the official release path because local terminals
  may not have an npm provenance OIDC provider. Emergency local publish can use
  `NPM_CONFIG_PROVENANCE=false`, but that bypass is not the official release
  path.
- Public Memory State Audit now keeps `.orange-hyper/` dogfooding evidence
  bounded to shared project memory: config, completed Quests, accepted Memory
  Delta Proposals, and graph provenance.
- `orange doctor` now warns if local/generated/private `.orange-hyper` state is
  tracked by Git, warns on private-looking local paths in public memory, and
  errors on token/secret/env/auth-like strings before commit.
- Existing dogfooding memory evidence no longer stores local absolute temporary
  paths; accepted proposal hashes were refreshed to preserve graph provenance.
- No MCP, hooks, subagents, role evolution, auto planner, or auto execution loop
  behavior is introduced.

## v0.3.0-alpha.1

Graph Quality Hardening and real-repo dogfooding release.

- Package version is `0.3.0-alpha.1`.
- README version is `0.3-doc.3`.
- Adapter JSON `contract_version` remains `"0.1"`.
- No MCP, hooks, subagents, role evolution, auto planner, or auto execution loop
  behavior is introduced.

### Graph Quality Hardening

- `orange init` now idempotently backfills missing v0.2/v0.3 storage directories
  and graph read-model files without overwriting existing config/project data.
- `.orange-hyper/.gitignore` now keeps accepted Memory Delta Proposals shareable
  with accepted graph nodes while pending/rejected proposals and generated local
  state remain ignored by default.
- `orange graph list` now supports `--type`, `--source-quest`, and
  `--source-proposal` filters in human and JSON modes.
- `orange graph search` now supports `--type` and `--source-quest` filters and
  returns deterministic plain-text scores. It remains non-fuzzy, non-semantic,
  and non-vector search.
- `graph show` human output now highlights node id, type, title, Candidate
  Memory, source Quest/Proposal, accepted time, and provenance.
- `graph rebuild-index` separates deterministic `updated_at` from generation
  metadata and preserves semantic read-model output across repeated rebuilds.

### Doctor and Identity

- `doctor --json` now includes structured graph/project-boundary diagnostics
  with `code`, `message`, and `hint` while preserving existing string arrays.
- Diagnostic codes include `CONFIG_PROJECT_ID_MISSING`,
  `GRAPH_INDEX_ORPHAN_ENTRY`, `ACCEPTED_PROPOSAL_MISSING_NODE`,
  `ACCEPTED_NODE_SOURCE_PROPOSAL_MISSING`, `GRAPH_NODE_PROJECT_MISMATCH`, and
  `LEGACY_PROJECT_ID_MISSING`.
- Identity preview now shows accepted memory node count, node type distribution,
  project-boundary active state, source columns, and anchor-based node details.
- Identity remains read-only and does not include graph editing controls or
  heavy graph dependencies.

### Documentation and Checks

- Added `npm run check:readme-sync` to verify the README version metadata across
  Korean, English, Simplified Chinese, and Japanese READMEs.
- Updated README, Memory Graph spec, Identity Dashboard spec, and Adapter
  Contract examples for graph filters, deterministic ranking, idempotent index
  principles, and alpha.1 identity preview hardening.

### Type Safety Foundation

- Added TypeScript as a development-only contract checker while keeping Orange
  Hyper distributed as JavaScript.
- Added `tsconfig.json` with `allowJs`, `checkJs`, and `noEmit` for gradual JS
  typechecking without a dist build pipeline.
- Added domain contract types for Adapter JSON envelopes, command ids, project
  identity, Quest frontmatter, route contracts, Memory Delta Proposals,
  accepted graph nodes, graph index entries, doctor diagnostics, and identity
  summaries.
- Added focused JSDoc return-shape links for JSON envelopes and core
  Quest/Memory/Graph/Doctor/Identity result surfaces.
- Adapter JSON Contract remains contract_version `"0.1"`.

## v0.3.0-alpha.0

Memory Graph Usability, Identity Graph Preview, and README Identity Rewrite
alpha.

- Package version is `0.3.0-alpha.0`.
- README version is `0.3-doc.2` for this documentation-only narrative restore
  patch.
- Adapter JSON `contract_version` remains `"0.1"`.

### Memory Graph Usability

- New command: `orange graph list [--json]`.
- New command: `orange graph show <node-id> [--json]`.
- New command: `orange graph search <query> [--json]`.
- New command: `orange graph rebuild-index [--json]`.
- New JSON command ids are `graph.list`, `graph.show`, `graph.search`, and
  `graph.rebuildIndex`.
- Graph commands return only accepted memory nodes whose `project_id` matches
  the current `.orange-hyper/config.json`.
- Pending and rejected Memory Delta Proposals are not graph nodes.
- `graph/index.json` is a read model regenerated from graph node Markdown.
- `graph search` is simple text search over node id, title, Candidate
  Memory/summary, node type, source quest/proposal, tags, and keywords.
- `doctor` now checks graph index parseability, source/index mismatch, orphan
  index entries, accepted proposals missing graph nodes, graph provenance
  consistency, project boundary mismatches, and graph selector/path safety.

### Identity Graph Preview

- `identity build` remains a single self-contained HTML file and now includes a
  read-only graph preview with accepted memory node count, node type
  distribution, source quest/proposal table, simple SVG node-link preview, and
  selected node detail.
- Identity output explicitly displays `Graph preview is read-only.` and
  `Graph editing is not supported.`

### Documentation

- README Narrative Restore / Visual-Narrative Reconciliation is a documentation
  patch, not a core feature release.
- Restored the canonical README narrative after the 3-card summary: problem
  definition, harness reflection, chosen direction, and Orange Hyper identity.
- Kept the existing visual structure assets in place: hero image,
  `assets/readme/core-flow.png`, and `assets/readme/memory-lifecycle.png`.
- Kept package version and Adapter JSON `contract_version` unchanged.
- No CLI, core runtime, Memory Graph behavior, Identity runtime, MCP, hooks,
  subagents, or role evolution changes are included.

### README Identity Rewrite

- Internal documentation work name: `v0.3-doc-prep`.
- Korean is the base README language.
- Added synchronized English, Simplified Chinese, and Japanese README files.
- Clarified that README version, package version, and Adapter JSON contract
  version are separate version axes.
- Reframed the README around problem definition, harness reflection, project
  direction, Orange Hyper identity, current features, usage, roadmap,
  non-goals, and docs links.
- Kept current recommended `npx --package orange-hyper@latest orange ...`
  usage, alpha channel usage, source checkout usage, and `npm link` usage.

### README Visual Structure

- This is a README visual structure update, not a core feature release.
- README version for the visual structure pass was `0.3-doc.1`; the narrative
  restore patch reconciles that visual rhythm with the longer README narrative
  at `0.3-doc.2`.
- No CLI, Memory Graph, Identity runtime, Adapter JSON Contract, or package
  runtime behavior changes are included.
- Moved the user-provided `core-flow` and `memory-lifecycle` README images under
  `assets/readme/`.
- Synchronized `README.md`, `README.en.md`, `README.zh-CN.md`, and
  `README.ja.md` around the same visual rhythm: hero, project identity, language
  links, badges and version metadata, 3-card problem/reflection/direction,
  Core Flow image, Memory Lifecycle image, feature summary, Quickstart, Identity
  Dashboard / Graph Preview, roadmap, non-goals, and docs links.
- Added `assets` to the package file list so the README images are included in
  npm package contents.

### Explicitly not included

- automatic memory write
- graph state editing
- Obsidian-grade editor
- fuzzy/semantic/vector search
- D3/Cytoscape/heavy graph dependency
- external source import
- MCP/hooks/subagents/role evolution
- auto planner or auto execution loop

### Verification checklist

```bash
npm test
git diff --check
node bin/orange.js --help
npm pack --dry-run --cache /private/tmp/orange-hyper-npm-cache
```

README package inclusion check: confirm the `npm pack --dry-run` file list
includes `README.md`, `README.en.md`, `README.zh-CN.md`, `README.ja.md`, and
the `assets/readme/` images.

### Fresh temp smoke

```bash
node bin/orange.js init
node bin/orange.js quest new "remember graph usability" --layer L2 --json
node bin/orange.js quest done <quest-id> --evidence "manual smoke passed" --json
node bin/orange.js remember propose --quest <quest-id> --json
node bin/orange.js remember accept <proposal-id> --json
node bin/orange.js graph rebuild-index --json
node bin/orange.js graph list --json
node bin/orange.js graph search "graph usability" --json
node bin/orange.js doctor --json
node bin/orange.js identity build --json
```

## v0.2.1

This patch release includes two bounded release-surface fixes before v0.3 Memory
Graph usability work:

- Project Boundary Guard
- `project_id`/`project_name` propagation
- capsule `Project Boundary` header
- `doctor` project boundary checks
- `doctor --repair-project-id`
- external source import explicitly blocked
- CLI/npx execution surface fix
- `orange-hyper` bin alias
- README explicit `npx --package` usage

Project Boundary Guard release.

This patch release keeps v0.3 Memory Graph usability work from indexing memory
that belongs to another project or came from unrelated external context. The
latest published npm version is `0.2.0`, so this release bumps the package
version to `0.2.1`.

- Package version is `0.2.1`.
- Adapter JSON `contract_version` remains `"0.1"`.
- `orange init` now writes stable random `project_id` and `project_name` fields
  to `.orange-hyper/config.json` without storing absolute local paths.
- New Quest, Memory Delta Proposal, Accepted Memory Node, Capsule boundary, and
  Identity summary JSON output record the current project identity.
- `orange capsule` adds a `Project Boundary` header explaining that only
  Quest/Proposal/Accepted Node artifacts with the current `project_id` are
  project memory.
- `doctor` warns on legacy artifacts missing `project_id` and errors on explicit
  cross-project mismatches.
- `doctor` verifies proposal-to-source-Quest and accepted-node-to-source-proposal
  project identity consistency.
- New option: `orange doctor --repair-project-id`. It fills missing legacy
  project identity fields with the current config values, but does not overwrite
  a different existing `project_id`.
- `doctor --json` keeps the existing JSON envelope and includes boundary
  diagnostics under `data.project_boundary`.
- External source memory import remains a future feature. v0.2.1 does not add
  `remember propose --from-file`, external report import, clipboard/pasted
  report automatic proposal, Memory Graph rendering, MCP, hooks, subagents, role
  evolution, auto planner, or auto execution loop.

## v0.2.0

Memory Delta Proposal stable release.

This stable release does not add new core features after `v0.2.0-alpha.2`.
It promotes the v0.2 proposal review lifecycle to the stable channel: completed
Quests can produce pending Memory Delta Proposals, users can inspect, validate,
revise, accept, or reject them, and `doctor`/`identity build` can summarize the
resulting proposal state. This is not a Memory Graph rendering release.

- Package version is `0.2.0`.
- Adapter JSON `contract_version` remains `"0.1"`.
- Stable usage is `npx orange-hyper ...` after publish.
- Alpha usage remains `npx orange-hyper@alpha ...` for the alpha channel.
- Expected post-publish dist-tags: `latest: 0.2.0`, `alpha: 0.2.0-alpha.2`.
- Stabilized from `v0.2.0-alpha.0`: `remember propose`, `remember list`,
  `remember show`, `remember accept`, and `remember reject`.
- Stabilized from `v0.2.0-alpha.1`: proposal quality validation, pending
  duplicate prevention, list filters, accepted node provenance, doctor
  provenance checks, and identity proposal/node counts.
- Stabilized from `v0.2.0-alpha.2`: `remember validate`, `remember revise`,
  accepted/rejected revise protection, pending duplicate revise protection,
  proposal timestamp warning, and identity review-stage messaging.
- Accepted proposals create candidate graph node files with proposal/source
  Quest provenance. They do not activate graph rendering or automatic retrieval.
- There is no automatic memory write. Only a user-approved `remember accept`
  can create an accepted graph node candidate.

Explicitly not included:

- Memory Graph rendering
- Obsidian-style dashboard graph
- MCP/hooks/subagents/role evolution
- auto planner or auto execution loop
- raw prompt archive
- automatic memory write

### Stable Publish Method

`0.2.0` is stable, so publish it to npm without an explicit prerelease tag. The
npm `publish` command uses the `tag` config to decide which dist-tag to apply,
and its default is `latest`; alpha releases should continue to use
`npm publish --tag alpha`.

Do not run the publishing commands until the release is explicitly approved.

```bash
npm test
git diff --check
node bin/orange.js --help
npm pack --dry-run --cache /private/tmp/orange-hyper-npm-cache

git add -A
git commit -m "chore: release orange-hyper v0.2.0 memory proposal stable"

git tag -a v0.2.0 -m "orange-hyper v0.2.0"
git push origin main
git push origin v0.2.0

gh release create v0.2.0 \
  --title "orange-hyper v0.2.0" \
  --notes-file RELEASE_NOTES.md

npm publish
```

After publish:

```bash
npm dist-tag ls orange-hyper
npx orange-hyper --help
```

Expected dist-tags:

```text
latest: 0.2.0
alpha: 0.2.0-alpha.2
```

### Alpha.2 Smoke Evidence

The `v0.2.0-alpha.2` npm package was used to harden the stable proposal review
contract before `0.2.0`:

- `node bin/orange.js --help` exposed the full v0.2 remember command surface.
- `npm pack --dry-run --cache /private/tmp/orange-hyper-npm-cache` checked the
  package contents before stable promotion.
- Fresh temp smoke covered `init`, `quest new --json`, `quest done --json`,
  `remember propose --json`, `remember validate --json`,
  `remember revise --json`, `remember accept --json`, `doctor --json`, and
  `identity build --json`.
- The smoke JSON outputs kept `contract_version: "0.1"` and command ids
  `quest.new`, `quest.done`, `remember.propose`, `remember.validate`,
  `remember.revise`, `remember.accept`, `doctor.run`, and `identity.build`.

## v0.2.0-alpha.2

Memory Proposal Review UX release.

This release lets users and adapters safely inspect, validate, revise, and
re-validate pending Memory Delta Proposals before accepting them. It does not
enable Memory Graph rendering, MCP, hooks, subagents, role evolution, auto
planning, automatic execution loops, or automatic memory writes.

- Package version is `0.2.0-alpha.2`.
- Adapter JSON `contract_version` remains `"0.1"`.
- New command: `orange remember validate <proposal-id> [--json]`.
- New command: `orange remember revise <proposal-id> --candidate "..." [--json]`.
- New command: `orange remember revise <proposal-id> --why "..." [--json]`.
- New command: `orange remember revise <proposal-id> --confidence low|medium|high [--json]`.
- JSON command ids are `remember.validate` and `remember.revise`.
- `remember validate` works for pending, accepted, and rejected proposals.
- `remember revise` is limited to pending proposals. Accepted/rejected proposals
  remain protected user decision records.
- Successful revise writes the proposal through the kernel, updates
  `updated_at`, and reruns quality validation.
- Revising `Candidate Memory` to duplicate another pending proposal fails with a
  clear JSON/human error.
- `doctor` now warns when proposal `updated_at` is earlier than `created_at`.
- `identity build` remains a placeholder. It now reports the v0.2 proposal
  review stage and includes `pendingMemoryProposalsWithWarnings` in JSON
  summary.

Explicitly not included:

- Memory Graph rendering
- Obsidian-style dashboard graph
- MCP/hooks/subagents/role evolution
- auto planner or auto execution loop
- raw prompt archive
- automatic memory write

### Verification Checklist

```bash
npm test
git diff --check
node bin/orange.js --help
npm pack --dry-run --cache /private/tmp/orange-hyper-npm-cache
```

Fresh temp smoke:

```bash
node bin/orange.js init
node bin/orange.js quest new "remember a durable decision" --layer L2 --json
node bin/orange.js quest done <quest-id> --evidence "manual smoke passed" --json
node bin/orange.js remember propose --quest <quest-id> --json
node bin/orange.js remember validate <proposal-id> --json
node bin/orange.js remember revise <proposal-id> --candidate "Durable project memory candidate." --json
node bin/orange.js remember validate <proposal-id> --json
node bin/orange.js remember accept <proposal-id> --json
node bin/orange.js doctor --json
node bin/orange.js identity build --json
```

## v0.2.0-alpha.1

Memory Proposal Quality Hardening release.

This release hardens the v0.2 Memory Delta Proposal workflow without enabling
Memory Graph rendering, MCP, hooks, subagents, role evolution, auto planning, or
automatic execution loops.

- Package version is `0.2.0-alpha.1`.
- Adapter JSON `contract_version` remains `"0.1"`.
- `remember propose` is idempotent for matching pending proposals with the same
  `source_quest`, `node_type`, and `Candidate Memory`.
- Duplicate `remember propose --json` calls return the existing proposal and set
  `data.duplicated: true`.
- `remember list` now supports `--status pending|accepted|rejected`,
  `--type decision|constraint|component|risk|verification`, and
  `--quest <quest-id>` in human and JSON modes.
- Proposal quality validation now checks required content sections, source
  quest or verification evidence references, suggested node type consistency,
  and `low|medium|high` confidence.
- Very short or generic `Candidate Memory` text is reported as a warning rather
  than a hard error.
- Accepted graph node candidates now include `source_proposal`, `source_quest`,
  `accepted_at`, `node_type`, `origin: memory-delta-proposal`, and
  `source_proposal_hash` provenance.
- `doctor` now reports proposal quality warnings/errors and catches accepted
  proposal to graph node provenance mismatches.
- `identity build` still does not render a graph. It now reports:
  `Memory proposals are active.`, `Graph rendering is not active yet.`, and
  `Accepted memory nodes are candidate project memory.`

Accepted/rejected policy:

- v0.2 only de-duplicates pending proposals.
- accepted/rejected proposals remain historical user decisions.
- Re-proposing after accept/reject may create a new pending proposal id instead
  of rewriting history.

Explicitly not included:

- Memory Graph rendering
- Obsidian-style dashboard graph
- MCP/hooks/subagents/role evolution
- auto planner or auto execution loop
- raw prompt archive
- automatic memory write

### Verification Checklist

```bash
npm test
git diff --check
node bin/orange.js --help
npm pack --dry-run --cache /private/tmp/orange-hyper-npm-cache
```

Fresh temp smoke:

```bash
node bin/orange.js init
node bin/orange.js quest new "remember a durable decision" --layer L2 --json
node bin/orange.js quest done <quest-id> --evidence "manual smoke passed" --json
node bin/orange.js remember propose --quest <quest-id> --json
node bin/orange.js remember propose --quest <quest-id> --json
node bin/orange.js remember list --status pending --json
node bin/orange.js remember list --type decision --json
node bin/orange.js remember accept <proposal-id> --json
node bin/orange.js doctor --json
node bin/orange.js identity build --json
```

## v0.2.0-alpha.0

Memory Delta Proposal alpha release.

This release adds the proposal-first memory workflow without enabling full
Memory Graph rendering or automatic memory writes.

- Package version is `0.2.0-alpha.0`.
- Adapter JSON `contract_version` remains `"0.1"`.
- New CLI commands:
  - `orange remember propose --quest <quest-id>`
  - `orange remember list`
  - `orange remember show <proposal-id>`
  - `orange remember accept <proposal-id>`
  - `orange remember reject <proposal-id>`
- Completed L2+ Quests can produce pending Memory Delta Proposals when they have
  verification evidence or an unverified reason.
- L0/L1 Quests are blocked from default memory proposal generation.
- `accept` moves a pending proposal to accepted and creates a graph node
  candidate with proposal/source Quest provenance.
- `reject` moves a pending proposal to rejected and does not create graph nodes.
- `doctor` validates proposal schema, source Quest existence, status/location
  consistency, accepted graph provenance, rejected no-node state, graph JSON,
  and traversal-safe ids.
- `identity build` remains a placeholder and adds memory proposal/node counts
  plus top proposal node types. It does not render a graph.

Explicitly not included:

- Memory Graph rendering
- Obsidian-style dashboard graph
- MCP/hooks/subagents/role evolution
- auto planner or auto execution loop
- raw prompt archive
- unapproved graph node creation
- default L0/L1 memory proposal generation

### Verification Checklist

```bash
npm test
git diff --check
node bin/orange.js --help
npm pack --dry-run --cache /private/tmp/orange-hyper-npm-cache
```

Fresh temp smoke:

```bash
node bin/orange.js init
node bin/orange.js quest new "remember a durable decision" --layer L2 --json
node bin/orange.js quest done <quest-id> --evidence "manual smoke passed" --json
node bin/orange.js remember propose --quest <quest-id> --json
node bin/orange.js remember list --json
node bin/orange.js remember show <proposal-id> --json
node bin/orange.js remember accept <proposal-id> --json
node bin/orange.js doctor --json
node bin/orange.js identity build --json
```

## v0.1.0

Seed Kernel stable release.

This stable release does not add new core features after `v0.1.0-alpha.4`.
It promotes the frozen Seed Kernel CLI and Adapter Contract to `0.1.0`.

- Package version is `0.1.0`.
- Adapter JSON `contract_version` remains `"0.1"` and is the stable v0.1 contract.
- Stable usage is `npx orange-hyper ...` after publish.
- Alpha usage remains `npx orange-hyper@alpha ...` for the alpha channel.
- This release keeps the Seed Kernel boundary: no Memory Graph, MCP, hooks,
  subagents, role system, auto planner, or auto execution loop.

### Stable Publish Method

`0.1.0` is stable, so publish it to npm without an explicit prerelease tag.
The npm `publish` command uses the
[`tag` config](https://docs.npmjs.com/cli/v11/commands/npm-publish#tag) to
decide which dist-tag to apply, and its default is `latest`; alpha releases
should continue to use `npm publish --tag alpha`.

Do not run the publishing commands until the release is explicitly approved.

```bash
npm version 0.1.0 --no-git-tag-version

npm test
git diff --check
node bin/orange.js --help
npm pack --dry-run --cache /private/tmp/orange-hyper-npm-cache

git add -A
git commit -m "chore: release orange-hyper v0.1.0 seed kernel stable"

git tag -a v0.1.0 -m "orange-hyper v0.1.0"
git push origin main
git push origin v0.1.0

gh release create v0.1.0 \
  --title "orange-hyper v0.1.0" \
  --notes-file RELEASE_NOTES.md

npm publish
```

After publish:

```bash
npm dist-tag ls orange-hyper
npx orange-hyper --help
```

Expected dist-tags:

```text
latest: 0.1.0
alpha: 0.1.0-alpha.4
```

### Alpha Dogfooding Evidence

The alpha channel was used to harden the stable Seed Kernel contract before
`0.1.0`:

- `v0.1.0-alpha.2` added adapter-friendly JSON output for `quest new` and
  `route --quest`.
- `v0.1.0-alpha.3` added JSON output for `capsule`, `quest done`, `doctor`, and
  `identity build`.
- `v0.1.0-alpha.4` froze the adapter envelope with `contract_version: "0.1"`,
  dot-notation command ids, and explicit stdout/stderr behavior.
- `npx orange-hyper@alpha --help` returned the Seed Kernel command list.
- `npx orange-hyper@alpha` dogfooding in a fresh temp directory verified:
  `init`, `quest new --json`, `route --json`, `capsule --json`,
  `quest done --json`, `doctor --json`, and `identity build --json`.
- The alpha dogfood JSON outputs returned `contract_version: "0.1"` with
  command ids `quest.new`, `route.show`, `capsule.build`, `quest.done`,
  `doctor.run`, and `identity.build`.
- Pre-stable package dry-run produced `orange-hyper@0.1.0`; after publish,
  `0.1.0` should become `latest` while `alpha` remains `0.1.0-alpha.4`.

## v0.1.0-alpha.4

Adapter Contract Freeze release.

- JSON success and failure envelopes now include `"contract_version": "0.1"`.
- JSON envelope `command` values now use dot notation such as `quest.new`, `route.show`, `capsule.build`, `quest.done`, `doctor.run`, and `identity.build`.
- `docs/16_ADAPTER_CONTRACT.md` now fixes stdout/stderr behavior for JSON and human modes.
- README points to the adapter contract instead of repeating JSON envelope details.
- This release keeps the v0.1 Seed Kernel scope: no Memory Graph, MCP, hooks, subagents, role system, auto planner, or auto execution loop.

## v0.1.0-alpha.3

Seed Kernel Adapter Contract release.

- `orange capsule --quest <id> --json`, `orange quest done ... --json`, `orange doctor --json`, and `orange identity build --json` now provide machine-readable output.
- JSON success payloads use the `{ ok, command, data }` envelope.
- JSON failures use the `{ ok, command, error }` envelope when the executable catches an error in `--json` mode.
- `docs/16_ADAPTER_CONTRACT.md` defines adapter rules, command examples, error shape, and exit codes.
- README clarifies that skills/adapters should call JSON mode and that users are not expected to manually drive every command long-term.

## v0.1.0-alpha.2

Seed Kernel UX/API hardening release.

- `orange quest new` now prints a copy-friendly quest id line, file path, and next kernel commands.
- `orange quest new --json` and `orange route --quest <id> --json` provide machine-readable output for skills and adapters without mixing human text.
- `orange quest done` accepts `--evidence-file <path>` for longer UTF-8 verification evidence.
- Completion now rejects evidence and `--unverified` together.
- README clarifies that the CLI is the Seed Kernel interface, not the final user experience.

## v0.1.0-alpha.0

Orange Hyper Seed Kernel의 첫 alpha 릴리즈입니다. 이 릴리즈는 강한 자동화 하네스가 아니라 repo-local Quest, Route, Capsule 기록을 남기는 최소 커널입니다.

### Included CLI

- `orange init`
- `orange quest new`
- `orange quest list`
- `orange quest show`
- `orange quest done`
- `orange route`
- `orange capsule`
- `orange doctor`
- `orange identity build`

### Core Concepts

- Quest as editable intent capsule
- Route contract as public work contract
- verified/unverified completion
- path traversal protection
- identity placeholder

### Explicitly Not Included

- hooks
- MCP
- subagents
- role evolution
- auto planner
- auto loop
- branch/PR/spec workflow enforcement
- forced Quest creation for every request
- runtime automation
- telemetry/network behavior
- postinstall mutation
- provider/model bridge
- Memory Graph rendering

### Verification Results

- `npm test`: passed, 19 tests
- `git diff --check`: passed
- CLI smoke: `node bin/orange.js --help` passed
- `npm pack --dry-run`: passed package contents check

### Manual Release Commands

Do not run these until the release is explicitly approved.

```bash
npm test
git diff --check
npm pack --dry-run
git add -A
git commit -m "chore: prepare v0.1.0-alpha.0 seed kernel release"
git tag v0.1.0-alpha.0
git push origin main
git push origin v0.1.0-alpha.0
npm publish --tag alpha
```
