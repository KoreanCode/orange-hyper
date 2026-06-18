# Project Sync

Project Sync lets an AI/adapter ask Orange Kernel to read an existing repository
and generate local Structure Graph state.

The user does not need to manage CLI details. The natural-language layer should
call `orange ... --json` and parse only JSON envelopes.

## Commands

```bash
orange init --json
orange sync plan --json
orange sync apply --json
orange sync status --json
```

Command ids:

- `project.init`
- `sync.plan`
- `sync.apply`
- `sync.status`

`init` is idempotent. It creates `.orange-hyper/` and returns a JSON envelope
that adapters can parse before running sync commands.

The success envelope includes:

- `initialized`
- `already_initialized`
- `project_id`
- `project_name`
- `root`
- `created_paths`
- `preserved_paths`

Re-running init in an initialized project is a no-op unless the user explicitly
passes a force flag. Existing config, Quest, Proposal, accepted Memory, and
Graph state are preserved.

`sync plan` is read-only. It scans the repository and returns the proposed graph,
state revision, freshness, and file paths, but writes nothing.

Plan/status diff fields:

- `added_nodes`
- `changed_nodes`
- `removed_nodes`
- `added_edges`
- `removed_edges`
- `unchanged_nodes`
- `current_revision`
- `planned_revision`

Running sync again without repository structure changes should report zero added,
changed, or removed nodes/edges.

`sync apply` writes generated structure state only:

```text
.orange-hyper/structure/index.json
.orange-hyper/structure/status.json
```

After a successful apply, Orange Kernel attempts to rebuild Identity HTML. If the
identity build fails, the structure state remains written and status records a
stale identity warning.

The refreshed Identity HTML remains a single self-contained file. Its runtime
uses a Canvas graph surface with inline JavaScript and CSS only; it does not
fetch, load a CDN, or require a local server.

`sync status` is read-only. It reports the last sync, currently applied
revision, planned scan revision, freshness, changed state, diff fields, and
identity freshness.

## Adapter Recipe

The `project-sync` recipe is ordered as:

| Step | Command or gate | JSON command id | Input source | Condition | Mutates state | User approval |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `orange init --json` | `project.init` | `user` | Run first; already-initialized projects return no-op JSON. | yes | yes |
| 2 | `orange sync plan --json` | `sync.plan` | `previous_step` | Run after init; review diff fields. | no | no |
| 3 | user approval | none | `user` | Required before apply. | no | yes |
| 4 | `orange sync apply --json` | `sync.apply` | `previous_step` | Run only after approval. | yes | yes |
| 5 | `orange sync status --json` | `sync.status` | `previous_step` | Verify revision and identity status. | no | no |

## Generated State

Structure state is local/generated state. It is ignored by default and is not
accepted memory.

```text
.orange-hyper/structure/
.orange-hyper/identity/
```

Shared project-memory state remains separate:

```text
.orange-hyper/config.json
.orange-hyper/quests/completed/*.md
.orange-hyper/proposals/memory-delta/accepted/*.md
.orange-hyper/graph/**
```

Sync never creates or modifies Quest, Proposal, accepted Memory, hook, MCP,
subagent, or graph-editing state.

## Scanner Scope

The scanner is intentionally shallow and deterministic.

Included signals:

- `package.json`
- `pom.xml`
- `build.gradle`
- `settings.gradle`
- package/workspace/module settings
- top-level directories
- `src`, `test`, `tests`, `docs`, `config`, `infra`, `infrastructure`, datastore directories
- role-bearing source, test, document, config, infrastructure, and datastore files

Role-bearing source detection is shallow and deterministic. It is not AST or
call-graph analysis.

Node examples:

- `route`
- `controller`
- `service`
- `repository`
- `config`
- `test`

Spring examples:

- `Controller`
- `Service`
- `Repository`
- `Entity`
- `Configuration`
- `Test`

Excluded paths:

- `.git`
- `node_modules`
- `dist`
- `build`
- `target`
- `coverage`
- `.orange-hyper`
- binary/generated files
- lock files
- temporary files
- simple assets

The scanner should not create a default node for every source file. It should
prefer project/module/domain/component/test/document/infrastructure/datastore
structure over a flat file list.

Not implemented in alpha.6:

- React/Sigma runtime renderer migration
- Obsidian or JSON Canvas export
- full AST/class/function/call graph analysis
- LLM-generated structure
- Memory Proposal auto accept
- postinstall mutation
- graph editing
- MCP/hook/subagent auto execution

## Graph Model

Structure node types:

- `project`
- `module`
- `domain`
- `component`
- `test`
- `document`
- `infrastructure`
- `datastore`

Structure edge types:

- `contains`
- `depends_on`
- `tests`
- `documents`
- `configures`

The project root node is always present:

```text
project.root
```

Node ids are deterministic from role and project-relative path. Examples:

```text
module.backend
domain.src-user
component.src-user-user-service
test.tests-user-service-test
document.docs-architecture
```

## Identity Composition

Identity state separates three graphs:

```text
structureGraph = generated project structure
memoryGraph    = accepted memory only
identityGraph  = structureGraph + memoryGraph composition
```

`sourceGraph` may remain as a compatibility alias for `memoryGraph`.
The generated summary may also retain `visualGraph` as a compatibility alias for
the composed Identity graph, but the HTML runtime state embeds
`structureGraph`, `memoryGraph`, and `identityGraph` once.

Composition rules:

- `project.root` is the central node.
- module/domain nodes are first-level cluster anchors around `project.root`.
- component/test/document/infrastructure/datastore nodes are placed near their
  module/domain cluster.
- accepted memory connects to structure nodes through Quest `scope_paths` or a
  source path when available.
- mapped memory is placed near the related structure node in Combined view.
- accepted memory with an explicit path whose target disappeared is marked
  `orphaned`.
- accepted memory without a usable structure target is marked `unmapped`.
- Identity summary includes `memory_mapping.mapped`, `memory_mapping.unmapped`,
  and `memory_mapping.orphaned` counts.
- pending/rejected proposals are excluded.
- keyword concept expansion is disabled by default in alpha.6.

Identity HTML view modes:

- Structure: generated project structure only.
- Memory: accepted memory only.
- Combined: structure, accepted memory, and mapping edges. This is the default.

Search and view filtering do not recalculate layout. The same state revision
uses the same build-time coordinates.

## Revision And Freshness

`sync apply` records:

- `state_revision`
- `current_revision`
- `planned_revision`
- `identity_built_from_revision`
- `identity_status`: `current` or `stale`

`doctor` warns when generated identity is stale relative to the current
structure revision. This warning is not an automatic repair instruction.

If Identity build fails after a successful sync apply:

- generated structure state remains written
- source Quest/Proposal/accepted Memory state is not rolled back or deleted
- `identity_status` becomes `stale`
- `doctor --json` includes an `IDENTITY_BUILD_FAILED` warning with the failure
  reason
- the manual recovery command is `orange identity build --json`
