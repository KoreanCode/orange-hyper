![Orange Hyper](readme-hero.png)

# Orange Hyper

[![npm alpha](https://img.shields.io/npm/v/orange-hyper/alpha?label=npm%20alpha)](https://www.npmjs.com/package/orange-hyper)
[![CI](https://github.com/KoreanCode/orange-hyper/actions/workflows/ci.yml/badge.svg)](https://github.com/KoreanCode/orange-hyper/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node >=20](https://img.shields.io/badge/node-%3E%3D20-339933.svg)](package.json)
[![Status: alpha](https://img.shields.io/badge/status-alpha-orange.svg)](RELEASE_NOTES.md)

Orange Hyper is an RPG-style adaptive project-memory harness that starts as a lightweight intent compiler and grows project-specific memory, roles, tools, and verification loops only when repeated work proves they are useful.

`orange-hyper`는 `codex-fable-mode`의 후속 버전이 아니라 별도 프로젝트입니다. `codex-fable-mode`에서 얻은 작업 레벨링, 의도 잠금, 검증 정직성의 힌트는 유지하되, `orange-hyper`는 메모리 그래프와 최소 하네스를 갖는 성장형 프로젝트로 설계합니다.

## npm alpha quickstart

Node 20 이상에서, 초기 alpha는 설치 없이 `npx`로 실행할 수 있습니다. `orange-hyper` package는 `orange` CLI를 제공합니다.

```bash
npx orange-hyper@alpha init
npx orange-hyper@alpha quest new "README npm usage polish" --layer L2 --verify "npm test"
npx orange-hyper@alpha identity build
```

자주 쓰는 seed kernel 명령:

```bash
npx orange-hyper@alpha quest list
npx orange-hyper@alpha route "검색 결과 정렬 버그 원인 찾아줘"
npx orange-hyper@alpha capsule
npx orange-hyper@alpha quest done <quest-id> --evidence "npm test passed"
npx orange-hyper@alpha doctor
```

v0.1 alpha는 강한 SDD 하네스가 아니라 repo-local 기록 커널입니다. 작은 요청은 계속 작게 처리하고, L2 이상 작업부터 Quest 생성을 권장하며, L3 이상 작업은 Quest를 만들어 의도와 검증 상태를 남기는 것을 기본 계약으로 봅니다.

## 문서 읽는 순서

1. `docs/00_PROJECT_DEFINITION.md` — 프로젝트 정의서
2. `docs/01_ARCHITECTURE.md` — 전체 아키텍처
3. `docs/02_MEMORY_GRAPH_SPEC.md` — LLMWiki식 node memory 구조
4. `docs/03_INTENT_COMPILER.md` — 의도 컴파일러 설계
5. `docs/04_ROUTE_LEVEL_SYSTEM.md` — 작업 레벨, 검증 레벨, 예산 체계
6. `docs/05_MINIMAL_HOOK_STRATEGY.md` — hook을 어디까지 쓸지
7. `docs/06_MCP_ADVISOR.md` — MCP 역제안 구조
8. `docs/07_MODEL_ADAPTERS_AND_SUBAGENTS.md` — 모델/에이전트 추상화
9. `docs/08_RPG_GROWTH_SYSTEM.md` — RPG식 성장 시스템
10. `docs/09_TOKEN_EVAL_TELEMETRY.md` — 토큰/평가/텔레메트리 설계
11. `docs/10_DEVELOPMENT_ROADMAP.md` — 개발 로드맵
12. `docs/11_REPOSITORY_SCAFFOLD.md` — 초기 repo 구조
13. `docs/12_IMPLEMENTATION_PROMPTS.md` — Codex에게 줄 구현 프롬프트
14. `docs/13_DISTRIBUTION_RELEASE_STRATEGY.md` — 배포 및 릴리즈 전략
15. `docs/14_IDENTITY_DASHBOARD_SPEC.md` — Identity dashboard 설계
16. `docs/15_OPEN_SOURCE_PREP.md` — 공개 준비 체크리스트
17. `docs/99_RESEARCH_NOTES.md` — 조사 참고 자료

릴리즈 노트는 `RELEASE_NOTES.md`에 정리합니다.

## 초기 개발 원칙

- 처음부터 강한 SDD 하네스를 만들지 않는다.
- 처음부터 역할 zoo를 만들지 않는다.
- 처음부터 MCP를 모두 연결하지 않는다.
- 처음부터 subagent orchestration을 만들지 않는다.
- 처음부터 모든 memory를 읽지 않는다.
- 사용자의 자연어 요청을 먼저 Intent Capsule로 컴파일한다.
- 현재 작업에 필요한 memory node slice만 Context Capsule로 조립한다.
- 검증은 작업 level에 따라 강해진다.
- 반복 증거가 쌓일 때만 role, MCP, hook, loop가 성장한다.

## v0.1 Seed Kernel CLI

v0.1에서 포함하는 CLI 표면은 다음 범위로 제한합니다.

```bash
npx orange-hyper@alpha init
npx orange-hyper@alpha quest new "Quest/Goal Capsule 기능 구현" --layer L3 --verify "node --test"
npx orange-hyper@alpha quest list
npx orange-hyper@alpha quest show <quest-id>
npx orange-hyper@alpha route "검색 결과 정렬 버그 원인 찾아줘"
npx orange-hyper@alpha route --quest <quest-id>
npx orange-hyper@alpha capsule
npx orange-hyper@alpha quest done <quest-id> --unverified "Manual verification is not available in seed test"
npx orange-hyper@alpha doctor
npx orange-hyper@alpha identity build
```

초기 저장 구조는 다음과 같습니다.

```text
.orange-hyper/
  config.json
  quests/
    active/
    completed/
  capsules/
    current.md
  traces/
    route.jsonl
  identity/
    orange-hyper.html
```

`orange init`은 `.orange-hyper/.gitignore`도 생성합니다. 기본 ignore 대상은 generated/private state인 `capsules/`, `traces/`, `proposals/`, `identity/`, `local/`입니다. `config.json`과 `quests/`는 팀 정책에 따라 선택적으로 추적할 수 있도록 막지 않습니다.

Quest는 Markdown + YAML frontmatter 파일입니다. 사용자가 직접 읽고 수정할 수 있으며, 완료할 때는 `--evidence` 또는 `--unverified` 중 하나를 반드시 남겨야 합니다. `--unverified`는 성공 검증이 아닙니다. 작업은 완료했지만 seed test에서 검증 증거를 만들 수 없었다는 상태를 명시적으로 남기는 장치입니다.

Route는 chain-of-thought가 아니라 공개 작업 계약입니다. `L0`/`L1`은 기본적으로 Quest가 필요하지 않고 `not_recommended`로 표시됩니다. `orange quest new`는 사용자가 명시적으로 Quest 생성을 요청한 명령이므로 `L0`/`L1`도 생성은 허용하지만 경고를 출력합니다. `L2`는 `recommended`, `L3` 이상은 `required`입니다.

v0.1의 frontmatter parser는 full YAML 구현이 아닙니다. 지원 범위는 문자열, 숫자, boolean, 빈 배열, 문자열 배열, 단순 nested object에 한정합니다. Quest 파일은 이 subset 안에서 사람이 읽고 고칠 수 있게 유지합니다.

`orange identity build`는 v0.1 placeholder입니다. Memory graph rendering은 아직 활성화하지 않으며, `.orange-hyper/identity/orange-hyper.html`에 Seed Kernel 상태 요약만 self-contained HTML로 생성합니다.

## Source checkout usage

저장소를 checkout한 상태에서는 npm package를 거치지 않고 source CLI를 직접 실행할 수 있습니다.

```bash
node bin/orange.js init
node bin/orange.js quest new "Quest/Goal Capsule 기능 구현" --layer L3 --verify "node --test"
node bin/orange.js route --quest <quest-id>
node bin/orange.js capsule
node bin/orange.js identity build
```

npm alpha package는 `orange-hyper` package와 `orange` CLI로 배포됩니다. Node 20 이상을 요구하고, package에는 `bin/`, `src/`, `docs/`, `RELEASE_NOTES.md`, `README.md`, `LICENSE`만 포함합니다.

v0.1에서 의도적으로 하지 않는 것:

- hook 구현
- MCP 구현
- subagent 구현
- role evolution 구현
- 자동 planner 또는 execution loop 구현
- branch/PR/spec workflow 강제
- 모든 요청의 Quest 강제 생성
- runtime automation
- telemetry/network behavior
- postinstall mutation
- provider/model bridge
- Memory Graph rendering
