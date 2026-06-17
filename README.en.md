<p align="center">
  <img src="./readme-hero.png" alt="Orange Hyper" width="960" />
</p>

<h2 align="center">
  Instead of controlling projects,<br />
  care for them and let them grow with us.
</h2>

[![Korean README](https://img.shields.io/badge/README-KO-ff7e13)](README.md) [![English README](https://img.shields.io/badge/README-EN-2f80ed)](README.en.md) [![Simplified Chinese README](https://img.shields.io/badge/README-ZH--CN-dc2626)](README.zh-CN.md) [![Japanese README](https://img.shields.io/badge/README-JA-7c3aed)](README.ja.md)

<details>
<summary>Version metadata details</summary>

- Base README: [README.md](README.md)
- README version: `0.7-doc.2`
- Package version: see [package.json](package.json)
- Adapter JSON contract: `0.1`
- Base language: `ko`
- Synced translations: `en` / `zh-CN` / `ja`

If this translation falls behind, use the Korean README as the source of truth. README version, package version, and Adapter JSON contract version are separate version axes.

</details>

[![npm latest](https://img.shields.io/npm/v/orange-hyper/latest?label=npm%20latest)](https://www.npmjs.com/package/orange-hyper) [![CI](https://github.com/KoreanCode/orange-hyper/actions/workflows/ci.yml/badge.svg)](https://github.com/KoreanCode/orange-hyper/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE) [![Node >=20](https://img.shields.io/badge/node-%3E%3D20-339933.svg)](package.json)

## Problem · Reflection · Direction

| Problem | Reflection | Direction |
| --- | --- | --- |
| A strong harness can impose too much process on small tasks. | A harnessless flow is light, but memory, verification, and boundaries are weak. | Orange Hyper grows only the needed memory through proposal -> review -> accept. |

## Problem Definition

A strong SDD harness is useful for large work. But when it forces a branch, spec, review, verification, and PR loop for small tasks, fatigue builds quickly.

A harnessless flow is light. It also struggles to preserve memory, verification, repeated learning, and context boundaries over time.

Sequential SPEC files are weak for collaboration and nonlinear thinking. Decisions, constraints, checks, and risks connect to each other instead of stacking in a straight line.

Users want to talk lightly. The project still must not lose memory or verification.

## Reflection on Harnesses

A harness creates procedure, and procedure can create safety. But if every task gets the same procedure, the user ends up working to operate the harness.

Orange Hyper does not turn on a strong harness immediately. It also does not leave everything to model instructions as a harnessless flow would.

What is needed is the space between those two. Small requests should stay small. Larger work should leave behind intent, constraints, memory, and verification evidence.

## Chosen Direction

- Intent should be compiled.
- Work should be divided by level and layer.
- Verification should become stronger by work level.
- Memory should grow like a node graph, not a sequential SPEC chain.
- role, MCP, hook, and subagent are not enabled from the start.
- role, MCP, hook, and subagent grow only from repeated evidence.
- Start light and grow gradually.
- Do not write memory automatically.
- Create a Memory Delta Proposal only from a completed Quest.
- Only user-accepted proposals become graph node candidates.
- Only memory with the current `project_id` is treated as current project memory.
- The CLI is a kernel interface for skills, agents, and adapters. It is not the final end-user UX.

## Core Flow

<p align="center">
  <img src="./assets/readme/core-flow.png" alt="Orange Hyper core flow" width="860" />
</p>

A user request becomes a Quest, then moves through the Route Contract and Capsule toward a verified completion. Only completed Quests can start a Memory Delta Proposal.

## What Orange Hyper Is

Orange Hyper is a repo-local project-memory kernel for coding agents.

A user request becomes a Quest and a Route Contract. The result and verification evidence are recorded on the completed Quest. When useful, a completed Quest can produce a Memory Delta Proposal, and only a user-approved proposal becomes a project memory candidate.

The goal is not a giant automation system. The user keeps asking lightly. The project remembers only what it should and strengthens verification only to the level the work needs.

## Current Features

As of v0.7.0, Orange Hyper provides the Seed Kernel, Memory Graph Usability, read-only Identity Graph Preview, Minimal Hook Preview, MCP Advisor stable, Growth Signal Preview stable, and Adapter Invocation Contract stable features.

- `orange init` creates a repo-local `.orange-hyper/` structure.
- Quest markdown and YAML frontmatter record work intent.
- Route Contract records work level, procedure, tool, and verification budgets.
- Context Capsule summarizes what the current task needs.
- `quest done` requires verification evidence or an unverified reason.
- A completed Quest can create a Memory Delta Proposal.
- Pending proposals can be listed, shown, validated, revised, accepted, or rejected.
- An accepted proposal becomes a graph node candidate with provenance.
- `graph list`, `graph show`, `graph search`, and `graph rebuild-index` provide read-only navigation over accepted memory nodes for the current project.
- `graph list --type ... --source-quest ... --source-proposal ...` and `graph search <query> --type ... --source-quest ...` narrow results to current-project accepted nodes.
- Project Boundary prevents memory with a different `project_id` from being treated as current project memory.
- `doctor` checks Quest, proposal, accepted node, and Project Boundary state.
- `identity build` creates an Identity Dashboard file summarizing Seed Kernel state and the read-only Identity Graph Preview.
- `hook preview`, `hook status`, `hook run session-start`, and `hook run stop` provide a read-only, warning-first hook preview.
- The hook preview does not automatically modify Quest, Proposal, Graph, Identity, or Project Boundary state.
- `--write-report` creates a local report only under `.orange-hyper/hooks/reports/`.
- Hook warnings and local reports keep a stable JSON shape that adapters can interpret.
- `mcp list`, `mcp show`, and `mcp suggest` provide score-, confidence-, matched_signals-, and no-suggestion-aware, read-only MCP proposal cards.
- MCP Advisor proposal cards are not install or execution results and keep `requires_user_approval: true`, `not_executed: true`, and `config_mutation: false`.
- MCP Advisor does not install or run MCPs, mutate config, write project memory, or make external network calls.
- `growth status`, `growth suggest`, and `growth explain` read Quest, Route, accepted Memory Graph, Hook warning, and MCP advisor signals to preview conservative growth state and candidates with score/source evidence.
- Growth candidates are suggestions only and keep `auto_unlock: false` and `requires_user_approval: true`.
- Growth Signal Preview `growthLevel` is a decorative candidate only; it does not automatically unlock roles, tools, hooks, MCPs, subagents, or workflows.
- `adapter list`, `adapter show <recipe-id>`, and `adapter dry-run <recipe-id>` describe how natural-language and skill layers should call the Orange Kernel through `--json` recipes.
- Adapter dry-run describes safe invocation order with `missing_inputs`, `input_source`, `step_index`, and `next_user_decision`.
- The Adapter Layer does not directly modify `.orange-hyper`, parse human output, or automatically run Quest, Memory, MCP, Hook, or Subagent flows.
- Adapter JSON Contract defines the `--json` envelope, command ids, stdout/stderr, and exit-code rules.

## Memory Lifecycle

<p align="center">
  <img src="./assets/readme/memory-lifecycle.png" alt="Orange Hyper memory lifecycle" width="860" />
</p>

Orange Hyper does not store memory automatically. Only a user-accepted proposal becomes an accepted memory node candidate, and pending or rejected proposals are not graph nodes.

## Type Safety Foundation

In v0.3 stable, Type Safety Foundation does not mean Orange Hyper has been rewritten in TypeScript. It means the project now has a first safety check for the shapes it promises: `--json` output and the Quest, Proposal, Graph, Doctor, and Identity data.

- Orange Hyper is still shipped as JavaScript.
- TypeScript is used first as a quiet checker, so promised data shapes are easier to keep stable.
- A full move of the source code to TypeScript remains separate future work after v0.4 stable.
- Adapter JSON Contract still stays at `contract_version: "0.1"`.

## Install and Usage

Use `npx` with Node 20 or newer. The npm package name is `orange-hyper`; the primary CLI command is `orange`.

Recommended:

```bash
npx -y --package orange-hyper@latest orange init
npx -y --package orange-hyper@latest orange quest new "README npm usage polish" --layer L2 --json
```

Stable latest channel:

```bash
npx -y --package orange-hyper@latest orange init
```

Source checkout:

```bash
node bin/orange.js init
```

Local linked development:

```bash
npm link
orange init
```

Common commands:

```bash
npx -y --package orange-hyper@latest orange quest list
npx -y --package orange-hyper@latest orange route "Find the cause of the search sorting bug"
npx -y --package orange-hyper@latest orange capsule
npx -y --package orange-hyper@latest orange quest done <quest-id> --evidence "npm test passed"
npx -y --package orange-hyper@latest orange doctor
npx -y --package orange-hyper@latest orange mcp suggest --query "Need latest React API documentation before migration" --json
npx -y --package orange-hyper@latest orange growth status --json
npx -y --package orange-hyper@latest orange growth suggest --json
npx -y --package orange-hyper@latest orange adapter dry-run project-status --json
```

When upgrading a v0.2.0 project to the v0.2.1 Project Boundary Guard, run:

```bash
orange doctor --json
orange doctor --repair-project-id
orange doctor
```

`--repair-project-id` fills only missing legacy project identity fields. It does not overwrite files that already belong to another project.

## Roadmap

See [Development Roadmap](docs/10_DEVELOPMENT_ROADMAP.md) for details.

- v0.1 Seed Kernel
- v0.2 Memory Delta Proposal
- v0.3 Memory Graph Usability + Identity Graph Preview
- v0.4 Minimal Hook Preview (stable)
- v0.5 MCP Advisor (stable)
- v0.6 Growth Signal Preview (stable)
- v0.7 Adapter Invocation Contract (stable)
- v0.8 Eval and Reports
- v1.0 Stable product boundary

## Non-goals

Orange Hyper is not trying to be:

- a clone of any model or provider
- an SDD framework that forces SPEC for every task
- a workflow manager that forces branch, PR, and review loops for every task
- automatic memory write
- memory accept without user approval
- a raw prompt archive
- a role zoo, MCP bundle, hook system, or subagent orchestration enabled from day one
- automatic MCP installation, execution, or config mutation
- an auto planner or auto execution loop
- a system that requires a graph DB or vector DB
- a system that automatically treats external reports, clipboard content, or files as project memory

## Docs Links

- [Project Definition](docs/00_PROJECT_DEFINITION.md)
- [Architecture](docs/01_ARCHITECTURE.md)
- [Memory Graph Spec](docs/02_MEMORY_GRAPH_SPEC.md)
- [Route Level System](docs/04_ROUTE_LEVEL_SYSTEM.md)
- [Development Roadmap](docs/10_DEVELOPMENT_ROADMAP.md)
- [Identity Dashboard Spec](docs/14_IDENTITY_DASHBOARD_SPEC.md)
- [Adapter JSON Contract](docs/16_ADAPTER_CONTRACT.md)
- [Minimal Hook Preview](docs/17_MINIMAL_HOOK_PREVIEW.md)
- [MCP Advisor](docs/18_MCP_ADVISOR.md)
- [Growth Signal Preview](docs/19_GROWTH_SYSTEM.md)
- [Adapter Layer](docs/20_ADAPTER_LAYER.md)
- [Release Notes](RELEASE_NOTES.md)
