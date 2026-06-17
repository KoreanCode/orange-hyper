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
- README version: `1.0-doc.2`
- Package version: see [package.json](package.json)
- Adapter JSON contract: `0.1`
- Base language: `ko`
- Translation source of truth: `README.md` (`ko`)

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

## How Do You Use It?

You do not need to memorize CLI commands to use Orange Hyper.

Talk to your AI the way you normally would. When Orange Hyper is useful, the AI calls `orange ... --json` kernel commands to handle intent, verification evidence, memory proposals, graph reads, hook warnings, MCP suggestions, growth signals, and eval summaries.

The CLI is not the main user experience. It is the kernel interface that skills, agents, and adapters use to talk to the Orange Kernel. Orange Hyper does not control your project; it stays beside it and cares for memory and verification.

## Starter Prompt For Your AI

Paste this into your AI when you want to use Orange Hyper in a new or existing repo.

```text
Use Orange Hyper for this project.

I will not manage CLI commands directly. When needed, call orange ... --json kernel commands yourself.

Do not turn small questions or simple explanations into Quests. When real work begins, record the intent and verification evidence.

If a decision, constraint, risk, or verification result is worth remembering, propose it as a Memory Proposal. Do not accept a proposal before I approve it.

Do not auto-install MCPs. Only suggest them when useful. Use Hook, Growth, and Eval only as warnings and summaries, not as automatic fixes.

Do not edit .orange-hyper files directly. Use Orange Kernel commands.

When useful, refresh Identity HTML so I can view the Knowledge Graph.
```

## Conversation Examples

Start with conversation before reaching for CLI commands.

**Example 1**

User: Manage this work with Orange Hyper as you proceed.

AI: This is worth recording as a Quest. I will record the intent and verification criteria in Orange Hyper, then proceed.

**Example 2**

User: I think this decision should be remembered later.

AI: I will propose it as a Memory Proposal. If you approve it, it can become accepted memory.

**Example 3**

User: Show me how this project is growing right now.

AI: I will refresh Identity HTML and check the Knowledge Graph plus Growth/Eval summaries.

**Example 4**

User: I probably need the latest docs for this library.

AI: I will use MCP Advisor to suggest an appropriate tool. I will not install it automatically.

## What Orange Hyper Leaves Behind

Orange Hyper is easier to understand by its artifacts than by a feature list.

- Quest: work intent and scope.
- Evidence: proof that work was actually verified.
- Memory Proposal: a candidate decision, constraint, risk, or verification result worth remembering.
- Accepted Memory: project memory approved by the user.
- Knowledge Graph: accepted memory read as decision, constraint, risk, verification, and component nodes.
- Identity HTML: a single HTML view of project memory, accepted memory graph, growth signals, and eval summary.
- Hook Warning: a warning without automatic repair.
- MCP Suggestion: a tool suggestion without installation.
- Growth Signal: a growth candidate without automatic unlock.
- Eval Report: a local-only evaluation report.

## What Is The Knowledge Graph?

Orange Hyper's Knowledge Graph is not a code dependency graph. It is an accepted project memory graph.

It shows user-approved decision, constraint, risk, verification, and component memory. Pending and rejected proposals are not included.

Identity HTML contains a read-only Knowledge Graph Preview. It is not a full graph editor today; richer node-link visualization is a future dashboard direction.

## Open Identity HTML

If you tell the AI "refresh Identity HTML", the AI can use the Orange Kernel to update this file:

```text
.orange-hyper/identity/orange-hyper.html
```

That HTML is a read-only dashboard for project memory, the accepted memory graph, growth signals, and eval summary.

## Memory Lifecycle

<p align="center">
  <img src="./assets/readme/memory-lifecycle.png" alt="Orange Hyper memory lifecycle" width="860" />
</p>

Orange Hyper does not store memory automatically. Only a user-accepted proposal becomes an accepted memory node candidate, and pending or rejected proposals are not graph nodes.

## Type Safety Foundation

In v0.3 stable, Type Safety Foundation does not mean Orange Hyper has been rewritten in TypeScript. It means the project now has a first safety check for the shapes it promises: `--json` output and the Quest, Proposal, Graph, Doctor, and Identity data.

- Orange Hyper is still shipped as JavaScript.
- TypeScript is used first as a quiet checker, so promised data shapes are easier to keep stable.
- A full source migration remains a separate post-v1 TS Migration Review track.
- Adapter JSON Contract still stays at `contract_version: "0.1"`.

## For AI / Adapter authors

v1.0.1 is a README onboarding patch, not a runtime feature release. The v1 stable command surface and Adapter JSON `contract_version: "0.1"` stay unchanged.

AIs and adapters must parse `--json` output, not human-readable output. Do not edit `.orange-hyper/` files directly; call Orange Kernel commands.

The v1 stable audited CLI command surface is:

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

`init` is the bootstrap command. The other commands cover Quest, route, capsule, proposal-first memory, accepted graph, hook warning, MCP advice, growth preview, adapter recipe, local eval, doctor, and identity surfaces.

## Manual fallback

Use `npx` with Node 20 or newer. The npm package name is `orange-hyper`; the primary CLI command is `orange`.

Most users do not run these directly. Use them when the AI has no terminal access or you need to check something manually.

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

## Kernel command reference

Adapters must parse `--json` output, not human output.

Common kernel commands:

```bash
npx -y --package orange-hyper@latest orange quest list
npx -y --package orange-hyper@latest orange route "Find the cause of the search sorting bug"
npx -y --package orange-hyper@latest orange capsule
npx -y --package orange-hyper@latest orange quest done <quest-id> --evidence "npm test passed"
npx -y --package orange-hyper@latest orange doctor
npx -y --package orange-hyper@latest orange hook preview --json
npx -y --package orange-hyper@latest orange mcp suggest --query "Need latest React API documentation before migration" --json
npx -y --package orange-hyper@latest orange growth status --json
npx -y --package orange-hyper@latest orange growth suggest --json
npx -y --package orange-hyper@latest orange adapter dry-run project-status --json
npx -y --package orange-hyper@latest orange eval snapshot --json
npx -y --package orange-hyper@latest orange eval report --json
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
- v0.8 Eval and Reports (stable)
- v1.0 First Stable Boundary Release (current stable)

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
- [Eval and Reports](docs/21_EVAL_AND_REPORTS.md)
- [v1 Stabilization Readiness](docs/22_V1_STABILIZATION.md)
- [Release Notes](RELEASE_NOTES.md)
