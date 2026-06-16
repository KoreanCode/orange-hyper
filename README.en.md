# Orange Hyper

[한국어](README.md) | [English](README.en.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

Base README: [README.md](README.md)
README version: `0.3-doc.0`
Package version: see [package.json](package.json)
Adapter JSON contract: `0.1`
Base language: `ko`
Synced translations: `en` / `zh-CN` / `ja`

If this translation is behind, trust the Korean base README.

[![npm alpha](https://img.shields.io/npm/v/orange-hyper/alpha?label=npm%20alpha)](https://www.npmjs.com/package/orange-hyper)
[![CI](https://github.com/KoreanCode/orange-hyper/actions/workflows/ci.yml/badge.svg)](https://github.com/KoreanCode/orange-hyper/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node >=20](https://img.shields.io/badge/node-%3E%3D20-339933.svg)](package.json)

README version, package version, and Adapter JSON contract version are separate version axes.

## Problem

A strong SDD harness helps with large work. But when it forces a branch, spec, review, verification, and PR loop for small tasks, it creates fatigue.

A harnessless flow is light. It also struggles with memory, verification, repeated learning, and context boundaries.

Sequential SPEC files are weak for collaboration and nonlinear thinking. Decisions, constraints, checks, and risks connect to each other.

Users want to talk lightly. The project still must not lose memory or verification.

## Harness Reflection

A harness can add procedure. Procedure can add safety. But if every task gets the same procedure, the user ends up working for the harness.

Orange Hyper does not start with a strong harness enabled. It also does not leave everything to model instructions.

The target is the middle. Small requests stay small. Larger requests leave intent, constraints, memory, and verification evidence behind.

## Direction

- Intent should be compiled.
- Work should be split by level and layer.
- Verification should become stronger by work level.
- Memory should grow like a node graph, not a sequential SPEC chain.
- role, MCP, hook, and subagent are not enabled from the start.
- role, MCP, hook, and subagent grow only from repeated evidence.
- Start light. Grow gradually.
- Do not write memory automatically.
- Create a Memory Delta Proposal only from a completed Quest.
- Only user-accepted proposals become graph node candidates.
- Only memory with the current `project_id` is current project memory.
- The CLI is a kernel interface for skills, agents, and adapters. It is not the final end-user UX.

## What Is Orange Hyper?

Orange Hyper is a repo-local project-memory kernel for coding agents.

A user request becomes a Quest and a Route Contract. The result and verification evidence are recorded on the completed Quest. When useful, a completed Quest can produce a Memory Delta Proposal, and only a user-approved proposal becomes a project memory candidate.

The goal is not a giant automation system. The user keeps asking naturally. The project remembers only what it should and strengthens verification only when the work level calls for it.

## Current Features

As of v0.3.0-alpha.0, Orange Hyper provides these Seed Kernel and read-only graph preview features.

- `orange init` creates a repo-local `.orange-hyper/` structure.
- Quest markdown and YAML frontmatter record work intent.
- Route Contract records work level, procedure, tool, and verification budgets.
- Context Capsule summarizes what the current task needs.
- `quest done` requires verification evidence or an unverified reason.
- A completed Quest can create a Memory Delta Proposal.
- Pending proposals can be listed, shown, validated, revised, accepted, or rejected.
- An accepted proposal becomes a graph node candidate with provenance.
- `graph list`, `graph show`, `graph search`, and `graph rebuild-index` provide read-only navigation over accepted memory nodes for the current project.
- Project Boundary prevents memory with a different `project_id` from being treated as current project memory.
- `doctor` checks Quest, proposal, accepted node, and Project Boundary state.
- `identity build` creates an Identity Dashboard file summarizing Seed Kernel state and the read-only Identity Graph Preview.
- Adapter JSON Contract defines the `--json` envelope, command ids, stdout/stderr, and exit-code rules.

## Install and Usage

Use `npx` with Node 20 or newer. The npm package name is `orange-hyper`; the primary CLI command is `orange`.

Recommended:

```bash
npx -y --package orange-hyper@latest orange init
npx -y --package orange-hyper@latest orange quest new "README npm usage polish" --layer L2 --json
```

Alpha channel:

```bash
npx -y --package orange-hyper@alpha orange init
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
- v0.4 Minimal Hook Preview
- v0.5 MCP Advisor
- v0.6 Growth System
- v0.7 Adapter Layer
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
- [Release Notes](RELEASE_NOTES.md)
