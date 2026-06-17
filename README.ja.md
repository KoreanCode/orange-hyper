<p align="center">
  <img src="./readme-hero.png" alt="Orange Hyper" width="960" />
</p>

<h2 align="center">
  プロジェクトを制御するのではなく、<br />
  そばで手入れしながら一緒に育てます。
</h2>

[![Korean README](https://img.shields.io/badge/README-KO-ff7e13)](README.md) [![English README](https://img.shields.io/badge/README-EN-2f80ed)](README.en.md) [![Simplified Chinese README](https://img.shields.io/badge/README-ZH--CN-dc2626)](README.zh-CN.md) [![Japanese README](https://img.shields.io/badge/README-JA-7c3aed)](README.ja.md)

<details>
<summary>Version metadata の詳細</summary>

- Base README: [README.md](README.md)
- README version: `0.8-doc.0`
- Package version: see [package.json](package.json)
- Adapter JSON contract: `0.1`
- Base language: `ko`
- Translation source of truth: `README.md` (`ko`)

この翻訳が遅れている場合は、韓国語 README を基準にしてください。README version、package version、Adapter JSON contract version は別々のバージョン軸です。

</details>

[![npm latest](https://img.shields.io/npm/v/orange-hyper/latest?label=npm%20latest)](https://www.npmjs.com/package/orange-hyper) [![CI](https://github.com/KoreanCode/orange-hyper/actions/workflows/ci.yml/badge.svg)](https://github.com/KoreanCode/orange-hyper/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE) [![Node >=20](https://img.shields.io/badge/node-%3E%3D20-339933.svg)](package.json)

## 問題 · 考察 · 方向性

| 問題 | 考察 | 方向性 |
| --- | --- | --- |
| 強い harness は小さな作業にも重い手順をかけてしまいます。 | harnessless は軽い一方で、memory、検証、boundary が弱くなります。 | Orange Hyper は必要な記憶だけを proposal -> review -> accept で育てます。 |

## 問題定義

強い SDD harness は大きな作業に役立ちます。けれど、小さな作業にも branch、spec、review、verification、PR loop を強制すると、すぐに疲れがたまります。

harnessless な進め方は軽いです。一方で、memory、検証、反復学習、context boundary を長く保ちにくくなります。

順番に積む SPEC は、協業や非線形な思考に弱いです。決定、制約、検証、リスクは一直線に積まれるのではなく、互いにつながります。

ユーザーは軽く話したい。けれどプロジェクトは memory と検証を失ってはいけません。

## Harness への考察

harness は手順を作れます。手順は安全性を上げます。ただし、すべての作業に同じ手順をかけると、ユーザーが harness を運用するために働くことになります。

Orange Hyper は最初から強い harness を有効にしません。harnessless のように、すべてをモデル指示だけに任せることもしません。

必要なのは、その間の地帯です。小さな依頼は小さく終える。大きな依頼は意図、制約、memory、検証証拠を残す。

## 選んだ方向性

- Intent はコンパイルされるべきです。
- 作業は level と layer に分けるべきです。
- Verification は作業 level に応じて強くするべきです。
- Memory は sequential SPEC ではなく node graph のように育つべきです。
- role、MCP、hook、subagent は最初から有効にしません。
- role、MCP、hook、subagent は反復した証拠があるときだけ成長します。
- 軽く始めて、段階的に育てます。
- automatic memory write はしません。
- completed Quest からだけ Memory Delta Proposal を作ります。
- ユーザーが accept した proposal だけが graph node candidate になります。
- 現在の `project_id` と一致する memory だけを現在のプロジェクト memory と扱います。
- CLI は skill、agent、adapter が呼び出す kernel interface です。最終ユーザー UX ではありません。

## Core Flow

<p align="center">
  <img src="./assets/readme/core-flow.png" alt="Orange Hyper のコアフロー" width="860" />
</p>

ユーザーの依頼は Quest になり、Route Contract と Capsule を通って、検証済みの完了へ進みます。Memory Delta Proposal の起点になるのは completed Quest だけです。

## Orange Hyper とは

Orange Hyper は coding agent のための repo-local project-memory kernel です。

ユーザーの依頼は Quest と Route Contract に整理されます。結果と検証証拠は completed Quest に残ります。必要なときは completed Quest から Memory Delta Proposal を作り、ユーザーが承認した proposal だけが project memory candidate になります。

目標は巨大な自動化システムではありません。ユーザーは軽く依頼し続けます。プロジェクトは必要なものだけを記憶し、必要な level でだけ検証を強めます。

## 現在の機能

v0.7.0 時点で、Orange Hyper は Seed Kernel、Memory Graph Usability、read-only Identity Graph Preview、Minimal Hook Preview、MCP Advisor stable、Growth Signal Preview stable、Adapter Invocation Contract stable 機能を提供します。

- `orange init` が repo-local な `.orange-hyper/` 構造を作ります。
- Quest markdown と YAML frontmatter が作業意図を記録します。
- Route Contract が work level、procedure、tool、verification budget を記録します。
- Context Capsule が現在の作業に必要な要約を作ります。
- `quest done` は verification evidence または unverified reason を要求します。
- completed Quest から Memory Delta Proposal を作れます。
- pending proposal は list、show、validate、revise、accept、reject できます。
- accepted proposal は provenance 付きの graph node candidate になります。
- `graph list`、`graph show`、`graph search`、`graph rebuild-index` で現在のプロジェクトの accepted memory node を read-only に探索できます。
- `graph list --type ... --source-quest ... --source-proposal ...` と `graph search <query> --type ... --source-quest ...` で現在プロジェクトの accepted node に結果を絞り込めます。
- Project Boundary は別の `project_id` を持つ memory を現在のプロジェクト memory と扱いません。
- `doctor` は Quest、proposal、accepted node、Project Boundary の状態を確認します。
- `identity build` は Seed Kernel 状態と read-only Identity Graph Preview を要約する Identity Dashboard ファイルを作ります。
- `hook preview`、`hook status`、`hook run session-start`、`hook run stop` は read-only / warning-first hook preview を提供します。
- hook preview は Quest、Proposal、Graph、Identity、Project Boundary を自動修正しません。
- `--write-report` を明示した場合だけ、`.orange-hyper/hooks/reports/` に local report を作ります。
- hook warning と local report は adapter が解釈できる安定した JSON shape を保ちます。
- `mcp list`、`mcp show`、`mcp suggest` は score、confidence、matched_signals、no-suggestion 状態を持つ read-only MCP proposal card だけを提案します。
- MCP Advisor の proposal card はインストールや実行の結果ではなく、`requires_user_approval: true`、`not_executed: true`、`config_mutation: false` の境界を保ちます。
- MCP Advisor は MCP をインストールまたは実行せず、config や project memory も変更せず、外部ネットワーク呼び出しもしません。
- `growth status`、`growth suggest`、`growth explain` は Quest、Route、accepted Memory Graph、Hook warning、MCP advisor signal を読み、保守的な成長状態と score/source evidence 付き候補を preview します。
- Growth candidate は提案にすぎず、`auto_unlock: false` と `requires_user_approval: true` を維持します。
- Growth Signal Preview の `growthLevel` は装飾的な候補であり、role、tool、hook、MCP、subagent、workflow を自動 unlock しません。
- `adapter list`、`adapter show <recipe-id>`、`adapter dry-run <recipe-id>` は natural-language/skill layer が Orange Kernel を `--json` recipe で呼び出す方法を示します。
- adapter dry-run は `missing_inputs`、`input_source`、`step_index`、`next_user_decision` で安全な呼び出し順を示します。
- Adapter Layer は `.orange-hyper` を直接変更せず、human output を解析せず、Quest、Memory、MCP、Hook、Subagent の流れを自動実行しません。
- Adapter JSON Contract は `--json` envelope、command id、stdout/stderr、exit-code の規則を定義します。

## Memory Lifecycle

<p align="center">
  <img src="./assets/readme/memory-lifecycle.png" alt="Orange Hyper の記憶ライフサイクル" width="860" />
</p>

Orange Hyper は自動で記憶を保存しません。ユーザーが accept した proposal だけが accepted memory node candidate になり、pending/rejected proposal は graph node ではありません。

## Type Safety Foundation（型安全の土台）

v0.3 stable の Type Safety Foundation は、Orange Hyper 全体を一度に TypeScript に書き換えたという意味ではありません。まず `--json` 出力と、Quest、Proposal、Graph、Doctor、Identity が受け渡す情報の形を確認する土台を置いた段階です。

- Orange Hyper はこの段階でも JavaScript パッケージとして配布されます。
- TypeScript はまず、約束したデータの形が崩れていないかを見るための静かな確認役として使います。
- ソース全体を TypeScript に移す作業は、v0.4 stable の後も別の将来作業として残します。
- Adapter JSON Contract は引き続き `contract_version: "0.1"` を維持します。

## インストールと使い方

Node 20 以上で `npx` から実行できます。npm package name は `orange-hyper`、primary CLI command は `orange` です。

推奨:

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

よく使うコマンド:

```bash
npx -y --package orange-hyper@latest orange quest list
npx -y --package orange-hyper@latest orange route "検索結果の並び替え bug の原因を探す"
npx -y --package orange-hyper@latest orange capsule
npx -y --package orange-hyper@latest orange quest done <quest-id> --evidence "npm test passed"
npx -y --package orange-hyper@latest orange doctor
npx -y --package orange-hyper@latest orange mcp suggest --query "Need latest React API documentation before migration" --json
npx -y --package orange-hyper@latest orange growth status --json
npx -y --package orange-hyper@latest orange growth suggest --json
npx -y --package orange-hyper@latest orange adapter dry-run project-status --json
```

v0.2.0 のプロジェクトを v0.2.1 Project Boundary Guard に上げるときは、先に実行します。

```bash
orange doctor --json
orange doctor --repair-project-id
orange doctor
```

`--repair-project-id` は欠けている legacy project identity だけを埋めます。すでに別プロジェクトに属しているファイルは上書きしません。

## Roadmap

詳しくは [Development Roadmap](docs/10_DEVELOPMENT_ROADMAP.md) を参照してください。

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

Orange Hyper は次を目指しません。

- 特定の model や provider の clone
- すべての作業に SPEC を強制する SDD framework
- すべての作業に branch、PR、review loop を強制する workflow manager
- automatic memory write
- ユーザー承認なしの memory accept
- raw prompt archive
- 初日から有効な role zoo、MCP bundle、hook system、subagent orchestration
- MCP の自動インストール、自動実行、config 自動変更
- auto planner または auto execution loop
- graph DB や vector DB を必須にする system
- 外部 report、clipboard、file を自動的に project memory と扱う system

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
