<p align="center">
  <img src="./readme-hero.png" alt="Orange Hyper" width="960" />
</p>

<h2 align="center">
  不把项目当作控制对象，<br />
  而是陪在身边照料，让它一起成长。
</h2>

[![Korean README](https://img.shields.io/badge/README-KO-ff7e13)](README.md) [![English README](https://img.shields.io/badge/README-EN-2f80ed)](README.en.md) [![Simplified Chinese README](https://img.shields.io/badge/README-ZH--CN-dc2626)](README.zh-CN.md) [![Japanese README](https://img.shields.io/badge/README-JA-7c3aed)](README.ja.md)

<details>
<summary>版本元数据详情</summary>

- Base README: [README.md](README.md)
- README version: `1.1-doc.6`
- Package version: see [package.json](package.json)
- Adapter JSON contract: `0.1`
- Base language: `ko`
- Translation source of truth: `README.md` (`ko`)

如果本译文落后，请以韩文 README 为准。README version、package version 和 Adapter JSON contract version 是彼此独立的版本轴。

</details>

[![npm latest](https://img.shields.io/npm/v/orange-hyper/latest?label=npm%20latest)](https://www.npmjs.com/package/orange-hyper) [![CI](https://github.com/KoreanCode/orange-hyper/actions/workflows/ci.yml/badge.svg)](https://github.com/KoreanCode/orange-hyper/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE) [![Node >=20](https://img.shields.io/badge/node-%3E%3D20-339933.svg)](package.json)

## 问题 · 思考 · 方向

| 问题 | 思考 | 方向 |
| --- | --- | --- |
| 强 harness 会把过重流程压到小任务上。 | 无 harness 很轻，但 memory、验证和 boundary 都偏弱。 | Orange Hyper 只让必要的记忆通过 proposal -> review -> accept 成长。 |

## 问题定义

强 SDD harness 对大型任务有帮助。但如果小任务也必须走 branch、spec、review、verification、PR loop，很快就会产生疲劳。

无 harness 的流程很轻。它也很难长期维持 memory、验证、重复学习和 context boundary。

顺序式 SPEC 不适合协作和非线性思考。决策、约束、验证和风险不是排成一条直线，而是互相连接。

用户想轻松对话。项目却不能失去记忆和验证。

## 对 Harness 的思考

harness 可以建立流程，流程可以带来安全感。但如果所有任务都套同一种流程，用户就会为了运转 harness 而工作。

Orange Hyper 不会一开始就打开强 harness。它也不会像无 harness 流程那样把一切都交给模型指令。

需要的是两者之间的地带。小请求应该小结束。更大的工作应该留下意图、约束、memory 和验证证据。

## 选择的方向

- Intent 应该被编译。
- 工作应该按 level 和 layer 划分。
- Verification 应该随工作 level 变强。
- Memory 应该像 node graph 一样成长，而不是顺序 SPEC 链。
- role、MCP、hook、subagent 不会从一开始启用。
- role、MCP、hook、subagent 只从重复证据中成长。
- 轻量开始，逐步成长。
- 不做 automatic memory write。
- 只从 completed Quest 创建 Memory Delta Proposal。
- 只有用户 accept 的 proposal 才会成为 graph node candidate。
- 只有匹配当前 `project_id` 的 memory 才是当前项目 memory。
- CLI 是 skill、agent、adapter 调用的 kernel interface，不是最终用户 UX。

## Core Flow

<p align="center">
  <img src="./assets/readme/core-flow.png" alt="Orange Hyper 核心流程" width="860" />
</p>

用户请求会成为 Quest，再经过 Route Contract 和 Capsule，走向经过验证的完成状态。只有 completed Quest 才能成为 Memory Delta Proposal 的起点。

## Orange Hyper 是什么？

Orange Hyper 是面向 coding agent 的 repo-local project-memory kernel。

用户请求会被整理成 Quest 和 Route Contract。结果和验证证据会记录在 completed Quest 中。需要时，completed Quest 可以生成 Memory Delta Proposal，只有用户批准的 proposal 才会成为 project memory candidate。

目标不是巨大的自动化系统。用户继续轻松提出请求。项目只记住需要记住的内容，并按工作需要的 level 增强验证。

## 安装

```bash
npm install -D orange-hyper
```

如果只想在不安装的情况下快速确认包是否可用，可以使用这条命令：

```bash
npx -y --package orange-hyper@latest orange --help
```

这条命令不是需要长期手动记住的主要 UX。安装之后，请告诉 AI 使用 Orange Hyper；在需要时，由 AI、agent 或 adapter 调用 `orange ... --json` kernel command。

## 第一次告诉 AI 的 Prompt

在新项目或已有 repo 里想使用 Orange Hyper 时，可以把下面这段直接贴给 AI。

```text
请在这个项目中使用 Orange Hyper。

我不会直接管理 CLI 命令。需要时，请你调用 orange ... --json kernel command。

不要把小问题或简单说明变成 Quest。真正开始推进工作时，请记录 intent 和 verification evidence。

如果有值得记住的决定、约束、风险或验证结果，请作为 Memory Proposal 提出。在我批准之前，不要 accept proposal。

不要自动安装 MCP。只在有需要时提出建议。Hook、Growth、Eval 只作为警告和摘要使用，不要作为自动修复。

不要直接编辑 .orange-hyper 文件。请使用 Orange Kernel command。

需要时，请刷新 Identity HTML，让我可以查看 Knowledge Graph。
```

## 和 AI 一起使用的实际流程

先用对话开始，而不是先找 CLI 命令。

**示例 1**

用户：这个任务请用 Orange Hyper 管理着推进。

AI：这个任务值得记录为 Quest。我会把 intent 和验证标准记录到 Orange Hyper，然后开始推进。

**示例 2**

用户：这个决定以后应该记住。

AI：我会把它作为 Memory Proposal 提出。你批准后，它可以成为 accepted memory。

**示例 3**

用户：看看这个项目现在是怎么成长的。

AI：我会刷新 Identity HTML，并查看 Knowledge Graph 与 Growth/Eval summary。

**示例 4**

用户：我可能需要这个库的最新文档。

AI：我会用 MCP Advisor 建议合适的工具。不会自动安装。

## Orange Hyper 会静静留下什么

比起功能列表，用产物来理解 Orange Hyper 更容易。

- Quest：工作意图和范围。
- Evidence：工作确实经过验证的依据。
- Memory Proposal：值得记住的决定、约束、风险或验证结果候选。
- Accepted Memory：用户批准后的项目记忆。
- Knowledge Graph：把 accepted memory 作为 decision、constraint、risk、verification、component node 来读取的图。
- Identity HTML：在一个 HTML 中查看项目记忆、accepted memory graph、growth signal 和 eval summary。
- Hook Warning：不会自动修复的警告。
- MCP Suggestion：不会安装的工具建议。
- Growth Signal：不会自动 unlock 的成长候选。
- Eval Report：local-only 评价报告。

## Identity HTML / Knowledge Graph

Orange Hyper 的 Knowledge Graph 不是 code dependency graph。它是 accepted project memory graph。

它展示用户批准过的 decision、constraint、risk、verification、component memory。pending/rejected proposal 不会包含在内。

对 AI 说“刷新 Identity HTML”时，AI 可以通过 Orange Kernel 更新这个文件：

```text
.orange-hyper/identity/orange-hyper.html
```

Identity HTML 是 Orange Hyper Identity 的 primary product surface。v1.1 的目标是让第一屏成为 full-screen Knowledge Graph Dashboard，而不是 document-style report。

当前 Identity HTML 提供 read-only full-screen Knowledge Graph Dashboard。第一屏是 Canvas graph stage，把 generated Structure Graph 和 accepted memory 合成在一起，并提供 Combined、Structure、Memory 视图。layout 坐标在 build 时确定，所以同一 revision 会保持同一初始位置，search/view filter 不会修改 source state。它不是 graph editor；Obsidian/JSON Canvas export 是 future interoperability layer，不是默认产品体验。

## 详细文档链接

- [Project Definition](docs/00_PROJECT_DEFINITION.md)
- [Architecture](docs/01_ARCHITECTURE.md)
- [Memory Graph Spec](docs/02_MEMORY_GRAPH_SPEC.md)
- [Route Level System](docs/04_ROUTE_LEVEL_SYSTEM.md)
- [Development Roadmap](docs/10_DEVELOPMENT_ROADMAP.md)
- [Identity Dashboard Spec](docs/14_IDENTITY_DASHBOARD_SPEC.md)
- [Minimal Hook Preview](docs/17_MINIMAL_HOOK_PREVIEW.md)
- [MCP Advisor](docs/18_MCP_ADVISOR.md)
- [Growth Signal Preview](docs/19_GROWTH_SYSTEM.md)
- [Eval and Reports](docs/21_EVAL_AND_REPORTS.md)
- [v1 Stabilization Readiness](docs/22_V1_STABILIZATION.md)
- [Release Notes](RELEASE_NOTES.md)

## Manual fallback / Kernel command reference

普通用户通常不直接运行 CLI。只有在 AI 没有工具访问权限，或需要手动确认时，才参考 [Manual fallback](docs/23_MANUAL_FALLBACK.md)。

- For AI / Adapter authors: [Adapter Layer](docs/20_ADAPTER_LAYER.md)
- Kernel command reference: [Adapter JSON Contract](docs/16_ADAPTER_CONTRACT.md)
- Manual fallback: [Manual Fallback](docs/23_MANUAL_FALLBACK.md)

下面不是长篇使用说明，而是供 AI 和 adapter 参考的 top-level kernel surface。

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
- `sync`
- `doctor`
- `identity`
<!-- orange-command-surface:end -->
