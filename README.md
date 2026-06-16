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
- README version: `0.3-doc.3`
- Package version: see [package.json](package.json)
- Adapter JSON contract: `0.1`
- Base language: `ko`
- Synced translations: `en` / `zh-CN` / `ja`

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

v0.3.0 stable 기준으로 Orange Hyper는 Seed Kernel, Memory Graph Usability, read-only Identity Graph Preview 기능을 제공합니다.

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
- Adapter JSON Contract는 `--json` 출력의 envelope, command id, stdout/stderr, exit-code 규칙을 정의합니다.

## Memory Lifecycle

<p align="center">
  <img src="./assets/readme/memory-lifecycle.png" alt="Orange Hyper 메모리 생명주기" width="860" />
</p>

Orange Hyper는 자동으로 기억을 저장하지 않습니다. 사용자가 accept한 proposal만 accepted memory node 후보가 되며, pending/rejected proposal은 graph node가 아닙니다.

## Type Safety Foundation

v0.3 stable의 Type Safety Foundation은 전체 TypeScript rewrite가 아니라
Adapter JSON Contract와 Quest/Proposal/Graph/Doctor/Identity schema를 먼저
고정하기 위한 contract-checking layer입니다.

- Orange Hyper is still distributed as JavaScript in this phase.
- TypeScript is used first as a contract checker.
- Full TS source migration is planned before/around v0.4 hook work.
- Adapter JSON Contract remains contract_version `"0.1"`.

## 설치/사용법

Node 20 이상이면 설치 없이 `npx`로 실행할 수 있습니다. npm package name은 `orange-hyper`, primary CLI command는 `orange`입니다.

권장 실행법:

```bash
npx -y --package orange-hyper@latest orange init
npx -y --package orange-hyper@latest orange quest new "README npm usage polish" --layer L2 --json
```

향후 v0.4 alpha channel:

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

자주 쓰는 명령:

```bash
npx -y --package orange-hyper@latest orange quest list
npx -y --package orange-hyper@latest orange route "검색 결과 정렬 버그 원인 찾아줘"
npx -y --package orange-hyper@latest orange capsule
npx -y --package orange-hyper@latest orange quest done <quest-id> --evidence "npm test passed"
npx -y --package orange-hyper@latest orange doctor
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
- v0.4 Minimal Hook Preview (next)
- v0.5 MCP Advisor
- v0.6 Growth System
- v0.7 Adapter Layer
- v0.8 Eval and Reports
- v1.0 Stable product boundary

## Non-goals

Orange Hyper는 다음을 목표로 하지 않습니다.

- 특정 모델이나 provider의 clone
- 모든 작업에 SPEC을 강제하는 SDD framework
- 모든 작업에 branch, PR, review loop를 강제하는 workflow manager
- 자동 memory write
- 사용자 승인 없는 memory accept
- raw prompt archive
- 처음부터 켜는 role zoo, MCP bundle, hook system, subagent orchestration
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
- [Release Notes](RELEASE_NOTES.md)
