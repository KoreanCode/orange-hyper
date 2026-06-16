# Development Roadmap

## 1. 개발 원칙

`orange-hyper`는 처음부터 완성형 하네스를 만들지 않는다. MVP는 작아야 한다. 기능은 반복 증거와 trace를 기반으로 확장한다.

## 2. v0.1 — Seed Kernel

목표: 하네스의 가장 작은 핵심 구현.

포함:

- `orange init`
- `.orange/` 디렉터리 생성
- config schema
- Intent Capsule 생성
- Route Contract 생성
- Memory Node markdown schema
- edges.jsonl
- index builder
- Context Capsule 생성
- Memory Delta proposal
- basic trace jsonl
- `orange doctor`

제외:

- hook 설치
- MCP 설치
- subagent 생성
- role unlock
- vector DB
- graph DB
- LLM API 필수화

완료 기준:

```text
사용자가 repo에서 orange init 후, 자연어 요청을 intent/route/capsule로 변환하고, 작업 후 memory delta proposal을 파일로 남길 수 있다.
```

## 3. v0.2 — Memory Graph Usability

목표: memory graph가 실제 작업에 쓰이기 시작한다.

포함:

- node search 개선
- stale/superseded/conflict metadata
- memory budget 적용
- context capsule archive
- accepted/rejected memory delta workflow
- route trace 개선

완료 기준:

```text
반복 작업에서 이전 decision/constraint/verification node를 찾아 Context Capsule에 넣을 수 있다.
```

## 4. v0.3 — Minimal Hook Preview

목표: hook을 optional safety layer로 도입한다.

포함:

- Stop hook template
- SessionStart hook template
- hook strictness config
- verification claim 누락 경고
- memory delta 자동 proposal

제외:

- 자동 memory accept
- 자동 SPEC 생성
- 자동 branch/PR workflow

완료 기준:

```text
사용자가 명시적으로 hook을 켜면, L2 이상 작업에서 verification claim 누락을 경고하고 memory delta proposal을 만든다.
```

## 5. v0.4 — MCP Advisor

목표: MCP를 기본 장착이 아니라 역제안 체계로 제공한다.

포함:

- MCP catalog
- MCP proposal card
- Codex adapter install command generation
- use once / persistent 구분
- risk/token impact 표시

완료 기준:

```text
framework docs freshness 같은 상황에서 Context7 등 MCP를 제안하되, 설치/사용은 사용자 승인 뒤에만 진행한다.
```

## 6. v0.5 — Growth System

목표: role과 capability가 반복 증거 기반으로 성장한다.

포함:

- growth profile
- XP event log
- role proposal
- dormant/pruning proposal
- project-specific role template generation

완료 기준:

```text
반복된 Spring backend review 작업이 있으면 spring_backend_reviewer role proposal을 만들 수 있다.
```

## 7. v0.6 — Adapter Layer

목표: Codex 외 client도 지원 가능한 구조로 확장한다.

포함:

- Adapter interface 안정화
- Codex adapter
- generic CLI adapter
- Claude Code adapter 초안
- model capability profile

완료 기준:

```text
core는 그대로 두고 adapter만 바꿔 context capsule과 proposal을 다른 agent client에 전달할 수 있다.
```

## 8. v0.7 — Eval and Reports

목표: 오픈소스 신뢰성을 위한 평가 체계를 제공한다.

포함:

- eval runner
- synthetic task pack
- token report
- memory precision report
- failure mode dashboard markdown

완료 기준:

```text
raw agent vs orange-hyper 적용 결과를 동일 task pack에서 비교할 수 있다.
```

## 9. 추천 구현 순서

1. TypeScript package scaffold
2. CLI command framework
3. config schema
4. `.orange/` init
5. Intent Capsule schema + generator
6. Route Contract rule engine
7. Memory Node parser
8. Edge store
9. Index builder
10. Context Capsule builder
11. Memory Delta proposal
12. Trace writer
13. Doctor command
14. Tests
15. README + examples

## 10. 첫 주 개발 목표

```text
Day 1: repo scaffold, CLI, config
Day 2: intent schema, route schema
Day 3: memory node/edge schema
Day 4: index builder, capsule builder
Day 5: memory delta proposal
Day 6: trace/doctor/test
Day 7: README, examples, v0.1-alpha tag
```

## 11. 품질 기준

- 모든 schema는 test가 있어야 한다.
- 모든 generated file은 deterministic해야 한다.
- CLI는 실패 시 수정 가능한 메시지를 내야 한다.
- `.orange/local/`은 기본 gitignore해야 한다.
- memory write는 proposal-first여야 한다.
- L0/L1 작업에 overhead를 만들지 않는 설계여야 한다.

## 12. 절대 하지 말 것

- MVP에 hook을 넣지 말 것.
- MVP에 MCP를 넣지 말 것.
- MVP에 subagent를 넣지 말 것.
- MVP에 graph DB를 넣지 말 것.
- MVP에 role zoo를 넣지 말 것.
- MVP에 SDD workflow를 넣지 말 것.

MVP는 작아야 한다. 작아야 실제로 시작할 수 있다.
