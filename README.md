# Orange Hyper Documentation Pack

이 문서 세트는 `orange-hyper`를 실제로 개발하기 위한 초기 설계 문서입니다.

`orange-hyper`는 `codex-fable-mode`의 후속 버전이 아니라 별도 프로젝트입니다. `codex-fable-mode`에서 얻은 작업 레벨링, 의도 잠금, 검증 정직성의 힌트는 유지하되, `orange-hyper`는 메모리 그래프와 최소 하네스를 갖는 성장형 프로젝트로 설계합니다.

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
14. `docs/13_OPEN_SOURCE_PREP.md` — 공개 준비 체크리스트
15. `docs/99_RESEARCH_NOTES.md` — 조사 참고 자료

## 핵심 한 줄

Orange Hyper is an RPG-style adaptive project-memory harness that starts as a lightweight intent compiler and grows project-specific memory, roles, tools, and verification loops only when repeated work proves they are useful.

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
