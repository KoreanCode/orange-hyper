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

`sync plan` is read-only. It scans the repository and returns the proposed graph,
state revision, freshness, and file paths, but writes nothing.

`sync apply` writes generated structure state only:

```text
.orange-hyper/structure/index.json
.orange-hyper/structure/status.json
```

After a successful apply, Orange Kernel attempts to rebuild Identity HTML. If the
identity build fails, the structure state remains written and status records a
stale identity warning.

`sync status` is read-only. It reports the last sync, current scan revision,
freshness, changed state, and identity freshness.

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
- major source, test, document, config, infrastructure, and datastore files

Excluded paths:

- `.git`
- `node_modules`
- `dist`
- `build`
- `target`
- `coverage`
- `.orange-hyper`
- binary/generated files

Not implemented in alpha.4:

- React/Sigma renderer migration
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

Composition rules:

- `project.root` is the central node.
- module/domain/component/test/document/infrastructure/datastore nodes cluster
  around the project root.
- accepted memory connects to structure nodes through Quest `scope_paths` or a
  source path when available.
- accepted memory with no matching structure target goes under
  `unmapped-memory`.
- pending/rejected proposals are excluded.
- keyword concept expansion is disabled by default in alpha.4.

## Revision And Freshness

`sync apply` records:

- `state_revision`
- `identity_built_from_revision`
- `identity_status`: `current` or `stale`

`doctor` warns when generated identity is stale relative to the current
structure revision. This warning is not an automatic repair instruction.
