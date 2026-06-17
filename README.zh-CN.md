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
- README version: `1.0-doc.2`
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

## 如何使用？

使用 Orange Hyper 不需要用户背 CLI 命令。

像平时一样和 AI 对话就可以。AI 认为需要 Orange Hyper 时，会调用 `orange ... --json` kernel command 来处理 intent、verification evidence、memory proposal、graph、hook warning、MCP suggestion、growth signal 和 eval summary。

CLI 不是用户的主要 UX。它是 skill、agent、adapter 与 Orange Kernel 对话时使用的 kernel interface。Orange Hyper 不控制项目，而是在旁边照料记忆和验证。

## 可以直接贴给 AI 的 Starter Prompt

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

## 对话示例

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

## Orange Hyper 会留下什么

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

## Knowledge Graph 是什么？

Orange Hyper 的 Knowledge Graph 不是 code dependency graph。它是 accepted project memory graph。

它展示用户批准过的 decision、constraint、risk、verification、component memory。pending/rejected proposal 不会包含在内。

Identity HTML 中有 read-only Knowledge Graph Preview。它目前不是 full graph editor；更丰富的 node-link 可视化属于 future dashboard 方向。

## 打开 Identity HTML

对 AI 说“刷新 Identity HTML”时，AI 可以通过 Orange Kernel 更新这个文件：

```text
.orange-hyper/identity/orange-hyper.html
```

这个 HTML 是一个 read-only dashboard，用来集中查看项目记忆、accepted memory graph、growth signal 和 eval summary。

## Memory Lifecycle

<p align="center">
  <img src="./assets/readme/memory-lifecycle.png" alt="Orange Hyper 记忆生命周期" width="860" />
</p>

Orange Hyper 不会自动保存记忆。只有用户 accept 的 proposal 才会成为 accepted memory node candidate，pending 或 rejected proposal 不是 graph node。

## Type Safety Foundation（类型安全基础）

在 v0.3 stable 中，Type Safety Foundation 并不是把 Orange Hyper 一次性改写成 TypeScript。它的意思是，项目先为自己承诺的数据形状加上一层检查：`--json` 输出，以及 Quest、Proposal、Graph、Doctor、Identity 之间传递的信息。

- Orange Hyper 在这个阶段仍然以 JavaScript 包发布。
- TypeScript 先作为安静的检查工具使用，帮助确认这些数据形状没有被不小心改坏。
- 完整的 TypeScript 源码迁移会作为 v1 之后的 TS Migration Review track 单独评估。
- Adapter JSON Contract 继续保持 `contract_version: "0.1"`。

## For AI / Adapter authors

v1.0.1 是 README onboarding patch，不是 runtime feature release。v1 stable command surface 和 Adapter JSON `contract_version: "0.1"` 保持不变。

AI 和 adapter 必须解析 `--json` output，而不是 human-readable output。不要直接编辑 `.orange-hyper/` 文件；请调用 Orange Kernel command。

v1 stable audit 的 CLI command surface 如下：

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

`init` 是 bootstrap command。其他 command 分别覆盖 Quest、route、capsule、proposal-first memory、accepted graph、hook warning、MCP advice、growth preview、adapter recipe、local eval、doctor 和 identity surface。

## Manual fallback

Node 20 或更高版本可以直接用 `npx` 运行。npm package name 是 `orange-hyper`，primary CLI command 是 `orange`。

普通用户通常不需要直接执行这些命令。只有在 AI 没有终端权限，或需要手动确认时才使用。

推荐用法：

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

adapter 必须解析 `--json` output，而不是 human output。

常用 kernel command：

```bash
npx -y --package orange-hyper@latest orange quest list
npx -y --package orange-hyper@latest orange route "查找搜索排序 bug 的原因"
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

从 v0.2.0 项目升级到 v0.2.1 Project Boundary Guard 时，先运行：

```bash
orange doctor --json
orange doctor --repair-project-id
orange doctor
```

`--repair-project-id` 只填补缺失的 legacy project identity。它不会覆盖已经属于其他项目的文件。

## Roadmap

详情见 [Development Roadmap](docs/10_DEVELOPMENT_ROADMAP.md)。

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

Orange Hyper 不打算成为：

- 某个模型或 provider 的 clone
- 对所有任务强制 SPEC 的 SDD framework
- 对所有任务强制 branch、PR、review loop 的 workflow manager
- automatic memory write
- 未经用户批准的 memory accept
- raw prompt archive
- 从第一天就启用的 role zoo、MCP bundle、hook system 或 subagent orchestration
- MCP 自动安装、自动执行或 config 自动修改
- auto planner 或 auto execution loop
- 必须依赖 graph DB 或 vector DB 的系统
- 自动把外部 report、clipboard、file 当作 project memory 的系统

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
