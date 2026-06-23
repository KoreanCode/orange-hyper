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
- README version: `1.1-doc.12`
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
- durable/shared memory の accept は自動化しません。
- activated supported host では、activation policy の範囲内で local runtime state、Quest、Capsule、evidence、working memory、pending proposal candidate を自動管理できます。
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

デフォルトのインストール方法は、現在のプロジェクトに npm dev dependency を追加することではありません。Orange Hyper は standalone binary を優先し、非 Node プロジェクトに `package.json`、`package-lock.json`、`node_modules` を作らないようにします。

インストール優先順位:

1. Standalone binary: GitHub Release から platform 別の `orange` 実行ファイルを user-local ディレクトリにインストールします。
2. Future package manager: Homebrew、Scoop などの user-scope package manager は今後のチャネルです。
3. `npx` exact-version fallback: 一時確認だけに使い、`orange-hyper@1.1.0-beta.2` または `@beta` を指定します。
4. Project-local npm install: ユーザーが明示的に求めた場合だけ使う advanced/manual option です。

macOS/Linux user-local インストール:

```bash
curl -fsSL https://github.com/KoreanCode/orange-hyper/releases/download/v1.1.0-beta.2/install.sh | sh
"$HOME/.local/bin/orange" --version
```

Windows PowerShell user-local インストール:

```powershell
$Installer = Join-Path $env:TEMP "orange-install.ps1"
Invoke-WebRequest "https://github.com/KoreanCode/orange-hyper/releases/download/v1.1.0-beta.2/install.ps1" -OutFile $Installer
powershell -NoProfile -ExecutionPolicy Bypass -File $Installer -Version "1.1.0-beta.2" -AddToPath
& (Join-Path $env:LOCALAPPDATA "OrangeHyper\bin\orange.exe") --version
```

Windows で `-AddToPath` を使った後、新しい PowerShell window では PATH から `orange --version` を実行できます。インストーラーは SHA-256 checksum を検証し、失敗したら停止します。npm は使わず、package files や `node_modules` を作らず、現在のプロジェクトも変更しません。

非公開技術 beta の参加者は、onboarding と安全な診断境界を [Closed Beta Program](docs/28_CLOSED_BETA_PROGRAM.md) で確認し、実際のテスト結果を [Beta Test Checklist](docs/29_BETA_TEST_CHECKLIST.md) に沿って記録します。

fallback としてパッケージの可視性だけを確認する場合は exact version を指定します。

```bash
npx -y --package orange-hyper@1.1.0-beta.2 orange --help
```

これはデフォルトのインストール方法ではありません。AI は `npm init -y` や `npm install -D orange-hyper` を自動実行してはいけません。npm package は developer/fallback channel として残します。

## Closed Beta チャネル

現在の推奨テストチャネルは `v1.1.0-beta.2` です。この build は公式 Closed Beta prerelease であり、npm `latest` stable チャネルではありません。

Primary validated 環境は macOS arm64、Codex CLI、standalone binary、user-scoped Codex Host Binding、project-scoped Activation、interactive Codex `/hooks` review です。macOS x64、Linux x64、Windows x64、その他の Codex minor version は、実ユーザー検証が蓄積されるまで exploratory 環境です。

この Beta では、ユーザーは Orange を直接運用するのではなく、普段どおり AI に作業を依頼します。AI は Codex Host Binding をユーザー環境に一度だけインストールし、Orange を使う repository だけを別途 activate します。Codex `/plugins` で plugin を install/enable し、Codex `/hooks` で current definition を review すると lifecycle が接続されます。L0/L1 作業は静かに通過し、L2 以上の作業は Quest、Capsule、verification evidence を policy の範囲で管理します。verification evidence が観測されない場合、Stop continuation を一度だけ要求します。Working memory と pending Memory Proposal は作成できますが、durable memory accept は自動化しません。

Beta quick start:

1. standalone `v1.1.0-beta.2` を user-local の場所にインストールします。
2. Codex Host Binding をインストールします。
3. Codex `/plugins` で Orange plugin をインストールして enable します。
4. Codex `/hooks` で current definition を review します。
5. Orange を使う repository で project activation を適用します。
6. `orange activate status --host codex --json` で `active` 状態を確認します。
7. その後は普段どおり AI に作業を依頼します。

長いコマンドと状態の読み方は [Closed Beta Program](docs/28_CLOSED_BETA_PROGRAM.md)、[Activation Runtime](docs/26_ACTIVATION_RUNTIME.md)、[Codex Binding E2E Checklist](docs/27_CODEX_BINDING_E2E.md) にあります。

自動化されない安全境界:

- Memory Proposal accept
- MCP のインストールまたは実行
- project-specific Skill/Agent の作成
- subagent 実行
- branch/PR/SPEC workflow
- telemetry または network upload
- raw prompt と transcript の保存

Beta 参加者は [Closed Beta Program](docs/28_CLOSED_BETA_PROGRAM.md)、[Beta Test Checklist](docs/29_BETA_TEST_CHECKLIST.md)、[Beta Bug](.github/ISSUE_TEMPLATE/beta-bug.yml)、[Beta Feedback](.github/ISSUE_TEMPLATE/beta-feedback.yml)、[Codex Binding E2E Checklist](docs/27_CODEX_BINDING_E2E.md) を使います。

alpha.8 を使っていた場合、beta.1 をインストールした後、plugin version と binding fingerprint の変更により Codex `/hooks` の hook definition を再度 review する必要があるかもしれません。既存の accepted project memory は自動削除も reset もされません。alpha.8 は再発行せず、beta.1 が新しい Closed Beta 配布チャネルです。

## AI に最初に伝える Prompt

新しいプロジェクトや既存 repo で Orange Hyper を使いたいときは、次の文をそのまま AI に貼り付けられます。

```text
このプロジェクトで Orange Hyper を使ってください。

Install the Orange Codex Host Binding once.
Activate Orange in the repositories where you want it.
Then work normally.

まず PATH で `orange --version` と `orange env --json` が動くか確認してください。

`orange` がない場合は standalone binary のインストールを提案し、私が承認した後で user-local の場所にインストールしてください。

`npm init -y` を実行しないでください。`npm install -D orange-hyper` をデフォルトのインストール方法にしないでください。プロジェクトの `package.json`、`package-lock.json`、`node_modules` を作成または変更しないでください。

npm fallback は私が明示的に求めた場合だけ使い、その場合も `orange-hyper@beta` または `orange-hyper@1.1.0-beta.2` を指定してください。

この Codex 環境に Orange Host Binding がまだない場合は、`orange binding plan --host codex --scope user --json` で read-only binding plan を見せてください。

私が承認したら、`orange binding install --host codex --scope user --json` を実行してください。このコマンドが準備できるのは user-scoped marketplace と plugin source だけです。marketplace 登録を plugin installation、enable、hook review、operational status として説明しないでください。

その後、`orange activate plan --host codex --scope project --json` で read-only project activation plan を見せてください。

私が承認したら、`orange activate apply --host codex --scope project --json` でこのプロジェクトを有効化してください。実際の lifecycle heartbeat が記録されるまでは active と報告しないでください。

その後 `orange sync plan --json` で diff を見せてください。私が承認したら、`orange sync apply --json` と `orange sync status --json` で generated Structure Graph と Identity HTML を更新してください。

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
- Activation Runtime: ユーザーが承認した supported-host lifecycle binding。インストールだけでは active ではなく、heartbeat が必要です。
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

Identity HTML は Orange Hyper Identity の primary product surface です。v1.1 の目標は、最初の画面を document-style report ではなく full-screen Knowledge Graph Dashboard にすることです。

現在の Identity HTML は read-only full-screen Knowledge Graph Dashboard を提供します。最初の画面は Canvas graph stage で、generated Structure Graph と accepted memory を合成し、floating action dock、search popover、selected-node badge、minimap、click-to-inspect node drawer を備えます。デフォルトの Combined に加えて、Structure と Memory の表示を選べます。layout 座標は build 時に決まるため、同じ revision は同じ初期位置になります。search/view filter と fit/reset/pan/zoom は source state を変更しません。これは graph editor ではなく、Obsidian/JSON Canvas export は future interoperability layer であり、デフォルトの製品体験ではありません。

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
- [Project Sync](docs/24_PROJECT_SYNC.md)
- [Standalone Distribution](docs/25_STANDALONE_DISTRIBUTION.md)
- [Activation Runtime](docs/26_ACTIVATION_RUNTIME.md)
- [Codex Binding E2E Checklist](docs/27_CODEX_BINDING_E2E.md)
- [Closed Beta Program](docs/28_CLOSED_BETA_PROGRAM.md)
- [Beta Test Checklist](docs/29_BETA_TEST_CHECKLIST.md)
- [Release Notes](RELEASE_NOTES.md)

## Manual fallback / Kernel command reference

一般ユーザーは通常、CLI を直接実行しません。AI が tool access を持たない場合や手動確認が必要な場合だけ、[Manual fallback](docs/23_MANUAL_FALLBACK.md) を参照してください。

- For AI / Adapter authors: [Adapter Layer](docs/20_ADAPTER_LAYER.md)
- Kernel command reference: [Adapter JSON Contract](docs/16_ADAPTER_CONTRACT.md)
- Manual fallback: [Manual Fallback](docs/23_MANUAL_FALLBACK.md)

次の一覧は長い使い方ではなく、AI と adapter が参照する top-level kernel surface です。

<!-- orange-command-surface:start -->
- `init`
- `activate`
- `lifecycle`
- `host`
- `quest`
- `route`
- `capsule`
- `remember`
- `graph`
- `hook`
- `mcp`
- `growth`
- `adapter`
- `binding`
- `eval`
- `sync`
- `env`
- `doctor`
- `identity`
<!-- orange-command-surface:end -->
