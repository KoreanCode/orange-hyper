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
- README version: `1.1-doc.1`
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

## インストール

```bash
npm install -D orange-hyper
```

インストールせずにパッケージを短く確認するだけなら、次のコマンドを使います。

```bash
npx -y --package orange-hyper@latest orange --help
```

このコマンドは、ユーザーが覚えて使い続ける主な UX ではありません。インストール後は AI に Orange Hyper を使ってほしいと伝え、必要なときに AI、agent、adapter が `orange ... --json` kernel command を呼び出します。

## AI に最初に伝える Prompt

新しいプロジェクトや既存 repo で Orange Hyper を使いたいときは、次の文をそのまま AI に貼り付けられます。

```text
このプロジェクトで Orange Hyper を使ってください。

私は CLI コマンドを直接管理しません。必要なときは、あなたが orange ... --json kernel command を呼び出してください。

小さな質問や単純な説明を Quest にしないでください。実際に作業が進むときは、intent と verification evidence を残してください。

記憶する価値のある決定、制約、リスク、検証結果があれば、Memory Proposal として提案してください。私が承認する前に proposal を accept しないでください。

MCP は自動インストールしないでください。必要なときに提案だけしてください。Hook、Growth、Eval は自動修正ではなく、警告と要約としてだけ使ってください。

.orange-hyper ファイルを直接編集しないでください。Orange Kernel command を使ってください。

必要なら Identity HTML を更新して、Knowledge Graph を見られるようにしてください。
```

## AI と一緒に使う実際の流れ

CLI コマンドより先に、このように話し始められます。

**例 1**

ユーザー: この作業を Orange Hyper で管理しながら進めて。

AI: この作業は Quest として残す価値があります。Orange Hyper に intent と検証基準を記録してから進めます。

**例 2**

ユーザー: この決定はあとで覚えておいた方がよさそう。

AI: Memory Proposal として提案します。承認されれば accepted memory として残せます。

**例 3**

ユーザー: 今このプロジェクトがどう成長しているか見せて。

AI: Identity HTML を更新し、Knowledge Graph と Growth/Eval summary を確認します。

**例 4**

ユーザー: このライブラリの最新ドキュメントが必要そう。

AI: MCP Advisor で適切なツールを提案します。自動インストールはしません。

## Orange Hyper が静かに残すもの

Orange Hyper は機能リストよりも、残すものから見ると理解しやすくなります。

- Quest: 作業の intent と scope。
- Evidence: 作業が実際に検証されたことを示す根拠。
- Memory Proposal: 記憶する価値のある決定、制約、リスク、検証結果の候補。
- Accepted Memory: ユーザーが承認したプロジェクト記憶。
- Knowledge Graph: accepted memory を decision、constraint、risk、verification、component node として読むグラフ。
- Identity HTML: project memory、accepted memory graph、growth signal、eval summary をひとつの HTML で見る画面。
- Hook Warning: 自動修正をしない警告。
- MCP Suggestion: インストールしないツール提案。
- Growth Signal: 自動 unlock しない成長候補。
- Eval Report: local-only の評価レポート。

## Identity HTML / Knowledge Graph

Orange Hyper の Knowledge Graph は code dependency graph ではありません。accepted project memory graph です。

ユーザーが承認した decision、constraint、risk、verification、component memory を表示します。pending/rejected proposal は含みません。

AI に「Identity HTML を更新して」と言うと、AI は Orange Kernel を通じて次のファイルを更新できます。

```text
.orange-hyper/identity/orange-hyper.html
```

現在の Identity HTML は read-only Knowledge Graph Preview を提供します。accepted memory node を探索できますが、full graph editor ではなく、brain-like full-screen Knowledge Graph Dashboard がすでに完成しているわけでもありません。より大きな brain-like dashboard は次の dashboard 方向です。

## 詳細ドキュメントリンク

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

一般ユーザーは通常、CLI を直接実行しません。AI が tool access を持たない場合や手動確認が必要な場合だけ、[Manual fallback](docs/23_MANUAL_FALLBACK.md) を参照してください。

- For AI / Adapter authors: [Adapter Layer](docs/20_ADAPTER_LAYER.md)
- Kernel command reference: [Adapter JSON Contract](docs/16_ADAPTER_CONTRACT.md)
- Manual fallback: [Manual Fallback](docs/23_MANUAL_FALLBACK.md)

次の一覧は長い使い方ではなく、AI と adapter が参照する top-level kernel surface です。

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
