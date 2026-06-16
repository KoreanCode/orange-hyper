# Release Notes

## v0.3.0-alpha.0

Memory Graph Usability, Identity Graph Preview, and README Identity Rewrite
alpha.

- Package version is `0.3.0-alpha.0`.
- README version is `0.3-doc.0`.
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
includes `README.md`, `README.en.md`, `README.zh-CN.md`, and `README.ja.md`.

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
