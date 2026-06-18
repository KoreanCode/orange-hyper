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
- README version: `1.1-doc.2`
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

## 설치

```bash
npm install -D orange-hyper
```

설치 없이 패키지가 보이는지 짧게 확인하려면 다음 명령만 사용하면 됩니다.

```bash
npx -y --package orange-hyper@latest orange --help
```

이 명령은 계속 외워서 쓰는 주 UX가 아닙니다. 설치 이후에는 AI에게 Orange Hyper를 사용해 달라고 말하고, AI/agent/adapter가 필요한 순간 `orange ... --json` kernel command를 호출하는 흐름으로 이어집니다.

## AI에게 처음 말할 프롬프트

새 프로젝트나 기존 repo에서 Orange Hyper를 쓰고 싶다면 AI에게 아래 문장을 그대로 붙여넣어도 됩니다.

```text
이 프로젝트에서 Orange Hyper를 사용해줘.

나는 CLI 명령을 직접 관리하지 않을 거야. 필요한 경우 네가 orange ... --json kernel command를 호출해줘.

작은 질문이나 단순 설명은 Quest로 만들지 마. 작업이 실제로 진행되면 의도와 검증 evidence를 남겨줘.

기억할 만한 결정, 제약, 위험, 검증 결과가 있으면 Memory Proposal로 제안해줘. 내가 승인하기 전에는 proposal을 accept하지 마.

MCP는 자동 설치하지 말고 필요할 때 제안만 해줘. Hook, Growth, Eval은 자동 수정이 아니라 경고와 요약으로만 사용해줘.

.orange-hyper 파일을 직접 수정하지 말고 Orange Kernel command를 사용해줘.

필요하면 Identity HTML을 갱신해서 Knowledge Graph를 볼 수 있게 해줘.
```

## AI와 함께 쓰는 실제 흐름

CLI 명령보다 먼저 이런 식으로 말하면 됩니다.

**예시 1**

사용자: 이 작업을 Orange Hyper로 관리하면서 진행해줘.

AI: 이 작업은 Quest로 남길 만합니다. Orange Hyper에 의도와 검증 기준을 기록하고 진행하겠습니다.

**예시 2**

사용자: 이 결정은 나중에 기억해야 할 것 같아.

AI: Memory Proposal로 제안하겠습니다. 승인하면 accepted memory로 남기겠습니다.

**예시 3**

사용자: 지금 이 프로젝트가 어떻게 성장하고 있는지 보여줘.

AI: Identity HTML을 갱신하고 Knowledge Graph와 Growth/Eval 요약을 확인하겠습니다.

**예시 4**

사용자: 이 라이브러리 최신 문서가 필요할 것 같아.

AI: MCP Advisor로 적절한 도구를 제안하겠습니다. 자동 설치는 하지 않습니다.

## Orange Hyper가 조용히 남기는 것

Orange Hyper는 기능 목록보다 산출물로 이해하는 편이 쉽습니다.

- Quest: 작업 의도와 범위입니다.
- Evidence: 작업이 실제로 검증됐는지 보여주는 근거입니다.
- Memory Proposal: 나중에 기억할 만한 결정, 제약, 위험, 검증 결과의 후보입니다.
- Accepted Memory: 사용자가 승인한 프로젝트 기억입니다.
- Knowledge Graph: accepted memory를 decision, constraint, risk, verification, component 같은 node로 읽는 그래프입니다.
- Identity HTML: 프로젝트 기억, accepted memory graph, growth signal, eval summary를 한 곳에서 보는 단일 HTML입니다.
- Hook Warning: 자동 수정 없는 경고입니다.
- MCP Suggestion: 설치하지 않는 도구 제안입니다.
- Growth Signal: 자동 unlock 없는 성장 후보입니다.
- Eval Report: local-only 평가 보고입니다.

## Identity HTML / Knowledge Graph

Orange Hyper의 Knowledge Graph는 code dependency graph가 아닙니다. accepted project memory graph입니다.

이 그래프는 사용자가 승인한 decision, constraint, risk, verification, component memory를 보여줍니다. pending/rejected proposal은 포함하지 않습니다.

AI에게 "Identity HTML을 갱신해줘"라고 말하면, AI는 Orange Kernel을 통해 다음 파일을 갱신할 수 있습니다.

```text
.orange-hyper/identity/orange-hyper.html
```

Identity HTML은 Orange Hyper Identity의 primary product surface입니다. v1.1의 목표는 첫 화면이 문서형 report가 아니라 full-screen Knowledge Graph Dashboard가 되는 것입니다.

현재 Identity HTML은 read-only Knowledge Graph Preview를 제공합니다. accepted memory node를 탐색할 수 있지만 full graph editor가 아니며, brain-like full-screen Knowledge Graph Dashboard도 아직 완성된 현재 기능이 아닙니다. Obsidian/JSON Canvas export는 future interoperability layer이며 기본 제품 경험이 아닙니다.

## 자세한 문서 링크

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

일반 사용자는 보통 CLI를 직접 실행하지 않습니다. AI가 도구 접근 권한이 없거나 수동 확인이 필요할 때만 [Manual fallback](docs/23_MANUAL_FALLBACK.md)을 참고하세요.

- For AI / Adapter authors: [Adapter Layer](docs/20_ADAPTER_LAYER.md)
- Kernel command reference: [Adapter JSON Contract](docs/16_ADAPTER_CONTRACT.md)
- Manual fallback: [Manual Fallback](docs/23_MANUAL_FALLBACK.md)

아래 목록은 긴 사용법이 아니라 AI/adapter가 참고하는 top-level kernel surface입니다.

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
