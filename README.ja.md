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
- README version: `1.0-doc.2`
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

## どう使いますか？

Orange Hyper を使うために、ユーザーが CLI コマンドを覚える必要はありません。

いつも通り AI に依頼してください。Orange Hyper が必要な場面では、AI が `orange ... --json` kernel command を呼び出し、intent、verification evidence、memory proposal、graph、hook warning、MCP suggestion、growth signal、eval summary を扱います。

CLI はユーザーの主な UX ではありません。skill、agent、adapter が Orange Kernel と話すための kernel interface です。Orange Hyper はプロジェクトを制御するのではなく、そばで記憶と検証を手入れします。

## AI に貼り付ける Starter Prompt

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

## 会話例

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

## Orange Hyper が残すもの

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

## Knowledge Graph とは

Orange Hyper の Knowledge Graph は code dependency graph ではありません。accepted project memory graph です。

ユーザーが承認した decision、constraint、risk、verification、component memory を表示します。pending/rejected proposal は含みません。

Identity HTML には read-only Knowledge Graph Preview があります。現時点では full graph editor ではありません。より豊かな node-link 可視化は future dashboard の方向性です。

## Identity HTML を開く

AI に「Identity HTML を更新して」と言うと、AI は Orange Kernel を通じて次のファイルを更新できます。

```text
.orange-hyper/identity/orange-hyper.html
```

この HTML は、project memory、accepted memory graph、growth signal、eval summary を一箇所で見る read-only dashboard です。

## Memory Lifecycle

<p align="center">
  <img src="./assets/readme/memory-lifecycle.png" alt="Orange Hyper の記憶ライフサイクル" width="860" />
</p>

Orange Hyper は自動で記憶を保存しません。ユーザーが accept した proposal だけが accepted memory node candidate になり、pending/rejected proposal は graph node ではありません。

## Type Safety Foundation（型安全の土台）

v0.3 stable の Type Safety Foundation は、Orange Hyper 全体を一度に TypeScript に書き換えたという意味ではありません。まず `--json` 出力と、Quest、Proposal、Graph、Doctor、Identity が受け渡す情報の形を確認する土台を置いた段階です。

- Orange Hyper はこの段階でも JavaScript パッケージとして配布されます。
- TypeScript はまず、約束したデータの形が崩れていないかを見るための静かな確認役として使います。
- ソース全体を TypeScript に移す作業は、v1 以後の TS Migration Review track として別に検討します。
- Adapter JSON Contract は引き続き `contract_version: "0.1"` を維持します。

## For AI / Adapter authors

v1.0.1 は README onboarding patch であり、runtime feature release ではありません。v1 stable command surface と Adapter JSON `contract_version: "0.1"` は変わりません。

AI と adapter は human-readable output ではなく `--json` output を parse してください。`.orange-hyper/` ファイルを直接編集せず、Orange Kernel command を呼び出してください。

v1 stable audit の CLI command surface は次の通りです。

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

`init` は bootstrap command です。その他の command は Quest、route、capsule、proposal-first memory、accepted graph、hook warning、MCP advice、growth preview、adapter recipe、local eval、doctor、identity surface を担当します。

## Manual fallback

Node 20 以上で `npx` から実行できます。npm package name は `orange-hyper`、primary CLI command は `orange` です。

一般ユーザーは通常、これらを直接実行しません。AI にターミナル権限がない場合や、手動確認が必要な場合だけ使ってください。

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

## Kernel command reference

adapter は human output ではなく `--json` output だけを parse してください。

よく使う kernel command:

```bash
npx -y --package orange-hyper@latest orange quest list
npx -y --package orange-hyper@latest orange route "検索結果の並び替え bug の原因を探す"
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
- v0.8 Eval and Reports (stable)
- v1.0 First Stable Boundary Release (current stable)

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
- [Eval and Reports](docs/21_EVAL_AND_REPORTS.md)
- [v1 Stabilization Readiness](docs/22_V1_STABILIZATION.md)
- [Release Notes](RELEASE_NOTES.md)
