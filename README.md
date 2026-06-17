<p align="center">
  <img src="./readme-hero.png" alt="Orange Hyper" width="960" />
</p>

<h2 align="center">
  프로젝트를 통제하기보다,<br />
  곁에서 돌보며 함께 자라게 합니다.
</h2>

[![Korean README](https://img.shields.io/badge/README-KO-ff7e13)](README.md) [![English README](https://img.shields.io/badge/README-EN-2f80ed)](README.en.md) [![Simplified Chinese README](https://img.shields.io/badge/README-ZH--CN-dc2626)](README.zh-CN.md) [![Japanese README](https://img.shields.io/badge/README-JA-7c3aed)](README.ja.md)

<details>
<summary>Version metadata 상세보기</summary>

- Base README: [README.md](README.md)
- README version: `1.0-doc.1`
- Package version: see [package.json](package.json)
- Adapter JSON contract: `0.1`
- Base language: `ko`
- Translation source of truth: `README.md` (`ko`)

번역이 뒤처진 경우 한국어 README를 기준으로 합니다. README version, package version, Adapter JSON contract version은 서로 다른 축입니다.

</details>

[![npm latest](https://img.shields.io/npm/v/orange-hyper/latest?label=npm%20latest)](https://www.npmjs.com/package/orange-hyper) [![CI](https://github.com/KoreanCode/orange-hyper/actions/workflows/ci.yml/badge.svg)](https://github.com/KoreanCode/orange-hyper/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE) [![Node >=20](https://img.shields.io/badge/node-%3E%3D20-339933.svg)](package.json)

## 문제 · 고찰 · 방향

| 문제 | 고찰 | 방향 |
| --- | --- | --- |
| 강한 하네스는 작은 작업에도 과한 절차를 강제합니다. | 하네스리스는 가볍지만 memory, 검증, boundary가 약합니다. | Orange Hyper는 필요한 기억만 proposal -> review -> accept로 성장시킵니다. |

## 문제 정의

강한 SDD 하네스는 큰 작업에 유용합니다. 하지만 작은 작업에도 branch, spec, review, verification, PR loop를 강제하면 금방 피로해집니다.

하네스리스 방식은 가볍지만 memory, 검증, 반복 학습, context boundary를 오래 유지하기 어렵습니다.

순차 SPEC 방식은 협업과 비선형 사고에 약합니다. 결정, 제약, 검증, 위험은 일렬로 쌓이기보다 서로 연결됩니다.

사용자는 가볍게 대화하고 싶습니다. 그렇다고 프로젝트가 기억과 검증을 잃어서는 안 됩니다.

## 하네스에 대한 고찰

하네스는 절차를 만들고, 절차는 안전을 줍니다. 하지만 모든 작업에 같은 절차를 강제하면 사용자는 하네스를 운영하기 위해 일하게 됩니다.

Orange Hyper는 강한 하네스를 바로 켜지 않습니다. 하네스리스처럼 모든 것을 모델 지침에 맡기지도 않습니다.

필요한 것은 그 사이의 지대입니다. 작은 요청은 작게 끝나야 합니다. 큰 작업은 의도, 제약, memory, 검증 증거를 남겨야 합니다.

## 그래서 정한 방향

- 의도는 컴파일돼야 합니다.
- 작업은 level과 layer로 나뉘어야 합니다.
- 검증은 작업 level에 따라 강해져야 합니다.
- memory는 sequential SPEC이 아니라 node graph처럼 자라야 합니다.
- role, MCP, hook, subagent는 처음부터 켜 두지 않습니다.
- role, MCP, hook, subagent는 반복 증거가 있을 때만 성장합니다.
- 가볍게 시작하고 점진적으로 성장합니다.
- 자동 memory write는 하지 않습니다.
- completed Quest에서만 Memory Delta Proposal을 만듭니다.
- 사용자가 `accept`한 proposal만 graph node 후보가 됩니다.
- 현재 `project_id`와 일치하는 memory만 현재 프로젝트 memory로 취급합니다.
- CLI는 최종 사용자 UX가 아니라 skill, agent, adapter가 호출하는 kernel interface입니다.

## Core Flow

<p align="center">
  <img src="./assets/readme/core-flow.png" alt="Orange Hyper 핵심 흐름" width="860" />
</p>

사용자의 요청은 Quest가 되고, Route Contract와 Capsule을 거쳐 검증된 완료로 이어집니다. 완료된 Quest만 Memory Delta Proposal의 출발점이 됩니다.

## Orange Hyper 소개

Orange Hyper는 coding agent를 위한 repo-local project-memory kernel입니다.

사용자의 요청은 Quest와 Route Contract로 정리됩니다. 작업 결과와 검증 증거는 completed Quest에 남습니다. 필요하면 completed Quest에서 Memory Delta Proposal을 만들고, 사용자가 승인한 것만 project memory 후보가 됩니다.

목표는 거대한 자동화 시스템이 아닙니다. 사용자는 계속 가볍게 요청합니다. 프로젝트는 필요한 만큼만 기억하고, 필요한 수준으로 검증을 강화합니다.

## 현재 제공 기능

v1.0.0-alpha.1 stabilization polish 기준으로 Orange Hyper는 v0.1~v0.8에서 구현한 Seed Kernel, Memory Proposal, Memory Graph Usability, read-only Identity Graph Preview, Minimal Hook Preview, MCP Advisor, Growth Signal Preview, Adapter Invocation Contract, local-only Eval and Reports 경계를 새 기능 추가 없이 재검증합니다.

- `orange init`으로 repo-local `.orange-hyper/` 구조를 만듭니다.
- Quest markdown과 YAML frontmatter로 작업 의도를 기록합니다.
- Route Contract로 작업 level, procedure, tool, verification budget을 남깁니다.
- Context Capsule로 현재 작업에 필요한 요약을 만듭니다.
- `quest done`에서 verification evidence 또는 unverified reason을 요구합니다.
- completed Quest에서 Memory Delta Proposal을 만듭니다.
- pending proposal을 list, show, validate, revise, accept, reject할 수 있습니다.
- accepted proposal은 provenance가 있는 graph node 후보가 됩니다.
- `graph list`, `graph show`, `graph search`, `graph rebuild-index`로 현재 프로젝트의 accepted memory node를 read-only로 탐색할 수 있습니다.
- `graph list --type ... --source-quest ... --source-proposal ...`와 `graph search <query> --type ... --source-quest ...`로 current-project accepted node를 좁혀 볼 수 있습니다.
- Project Boundary는 `project_id`가 다른 memory를 현재 프로젝트 memory로 보지 않습니다.
- `doctor`는 Quest, proposal, accepted node, Project Boundary 상태를 점검합니다.
- `identity build`는 Seed Kernel 상태와 read-only Identity Graph Preview를 요약하는 Identity Dashboard 파일을 만듭니다.
- `hook preview`, `hook status`, `hook run session-start`, `hook run stop`은 read-only / warning-first hook preview를 제공합니다.
- hook preview는 자동 Quest/Proposal/Graph/Identity/Project Boundary 수정을 하지 않습니다.
- `--write-report`를 명시했을 때만 `.orange-hyper/hooks/reports/` 아래에 local report를 생성합니다.
- hook warning과 local report는 adapter가 해석할 수 있는 안정적인 JSON shape를 유지합니다.
- `mcp list`, `mcp show`, `mcp suggest`는 현재 Quest/Graph/Doctor/Hook 상태와 요청 문맥을 바탕으로 score, confidence, matched_signals, no-suggestion 상태를 가진 read-only MCP proposal card만 제안합니다.
- MCP Advisor proposal card는 설치/실행 결과가 아니며 `requires_user_approval: true`, `not_executed: true`, `config_mutation: false` 경계를 유지합니다.
- MCP Advisor는 MCP를 자동 설치/실행하지 않고 config, Quest, Proposal, Graph, project memory를 자동 수정하지 않으며 외부 네트워크를 호출하지 않습니다.
- `growth status`, `growth suggest`, `growth explain`은 Quest, Route, accepted Memory Graph, Hook warning, MCP advisor signal을 읽어 보수적인 성장 상태와 score/source evidence가 있는 후보를 preview합니다.
- Growth candidate는 제안일 뿐이며 `auto_unlock: false`, `requires_user_approval: true`를 유지합니다.
- Growth Signal Preview의 `growthLevel`은 장식적 후보이며 role/tool/hook/MCP/subagent/workflow를 자동 unlock하지 않습니다.
- `adapter list`, `adapter show <recipe-id>`, `adapter dry-run <recipe-id>`는 natural-language/skill layer가 Orange Kernel을 `--json`으로 호출하는 recipe 계약을 보여줍니다.
- adapter dry-run은 `missing_inputs`, `input_source`, `step_index`, `next_user_decision`으로 안전한 호출 순서를 설명합니다.
- Adapter Layer는 `.orange-hyper` 직접 수정, human output parsing, 자동 Quest/Memory/MCP/Hook/Subagent 실행을 하지 않습니다.
- Adapter JSON Contract는 `--json` 출력의 envelope, command id, stdout/stderr, exit-code 규칙을 정의합니다.
- `eval snapshot`, `eval report`, `eval explain`은 `.orange-hyper` local project state만 읽어 Quest, verification, proposal, graph, doctor, hook report, MCP Advisor, growth, adapter, identity 신호를 보수적으로 요약합니다.
- eval report는 summary, section별 status reason/evidence_count, unavailable metric, known gap을 JSON/Markdown에 명시합니다.
- eval report는 기본적으로 stdout만 사용하며, `--write-report`를 명시했을 때만 `.orange-hyper/evals/reports/` 아래 Markdown report를 생성합니다.
- Eval and Reports stable은 외부 telemetry, 네트워크 업로드, LLM judge, token savings 추정, success-rate improvement claim, MCP 실행, hook 자동 실행, project memory/config 자동 수정을 하지 않습니다.

## Command Surface

v1.0-alpha audit 기준 CLI command surface는 다음과 같습니다.

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

`init`은 bootstrap command입니다. 나머지 command는 Quest, route, capsule, proposal-first memory, accepted graph, hook warning, MCP advice, growth preview, adapter recipe, local eval, doctor, identity surface를 담당합니다.

## Memory Lifecycle

<p align="center">
  <img src="./assets/readme/memory-lifecycle.png" alt="Orange Hyper 메모리 생명주기" width="860" />
</p>

Orange Hyper는 자동으로 기억을 저장하지 않습니다. 사용자가 accept한 proposal만 accepted memory node 후보가 되며, pending/rejected proposal은 graph node가 아닙니다.

## Type Safety Foundation

v0.3 stable의 Type Safety Foundation은 Orange Hyper 전체를 한 번에 TypeScript로 바꾸는 작업이 아닙니다. 먼저 `--json` 출력과 Quest, Proposal, Graph, Doctor, Identity가 주고받는 정보의 모양을 확인하는 바탕을 마련한 단계입니다. 기능을 크게 바꾸기보다, 앞으로 깨지면 안 되는 약속을 조용히 고정합니다.

- Orange Hyper는 이 단계에서도 JavaScript 패키지로 배포됩니다.
- TypeScript는 먼저 안전 확인용으로 씁니다. 약속한 JSON과 상태 정보가 맞는지 살피는 역할입니다.
- 전체 소스를 TypeScript로 옮기는 일은 v0.4 stable 이후에도 별도 작업으로 남겨 둡니다.
- Adapter JSON Contract는 계속 `contract_version: "0.1"`을 유지합니다.

## 설치/사용법

Node 20 이상이면 설치 없이 `npx`로 실행할 수 있습니다. npm package name은 `orange-hyper`, primary CLI command는 `orange`입니다.

권장 실행법:

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

자주 쓰는 명령:

```bash
npx -y --package orange-hyper@latest orange quest list
npx -y --package orange-hyper@latest orange route "검색 결과 정렬 버그 원인 찾아줘"
npx -y --package orange-hyper@latest orange capsule
npx -y --package orange-hyper@latest orange quest done <quest-id> --evidence "npm test passed"
npx -y --package orange-hyper@latest orange doctor
npx -y --package orange-hyper@latest orange hook preview --json
npx -y --package orange-hyper@latest orange mcp suggest --query "Spring Security 최신 문서 확인이 필요해" --json
npx -y --package orange-hyper@latest orange growth status --json
npx -y --package orange-hyper@latest orange growth suggest --json
npx -y --package orange-hyper@latest orange adapter dry-run project-status --json
npx -y --package orange-hyper@latest orange eval snapshot --json
npx -y --package orange-hyper@latest orange eval report --json
```

v0.2.0 프로젝트를 v0.2.1 Project Boundary Guard로 올릴 때는 다음을 먼저 실행합니다.

```bash
orange doctor --json
orange doctor --repair-project-id
orange doctor
```

`--repair-project-id`는 누락된 legacy project identity만 채웁니다. 이미 다른 프로젝트에 속한 파일은 덮어쓰지 않습니다.

## Roadmap

자세한 내용은 [Development Roadmap](docs/10_DEVELOPMENT_ROADMAP.md)을 참고하세요.

- v0.1 Seed Kernel
- v0.2 Memory Delta Proposal
- v0.3 Memory Graph Usability + Identity Graph Preview
- v0.4 Minimal Hook Preview (stable)
- v0.5 MCP Advisor (stable)
- v0.6 Growth Signal Preview (stable)
- v0.7 Adapter Invocation Contract (stable)
- v0.8 Eval and Reports (stable)
- v1.0 Stabilization Candidate (current alpha)

## Non-goals

Orange Hyper는 다음을 목표로 하지 않습니다.

- 특정 모델이나 provider의 clone
- 모든 작업에 SPEC을 강제하는 SDD framework
- 모든 작업에 branch, PR, review loop를 강제하는 workflow manager
- 자동 memory write
- 사용자 승인 없는 memory accept
- raw prompt archive
- 처음부터 켜는 role zoo, MCP bundle, hook system, subagent orchestration
- MCP 자동 설치/실행 또는 config 자동 수정
- auto planner 또는 auto execution loop
- graph DB나 vector DB 필수화
- 외부 report, clipboard, file import를 자동으로 project memory로 취급하는 기능

## Docs links

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
