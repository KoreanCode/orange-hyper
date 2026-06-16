# Open Source Preparation

## 1. 공개 전략

`orange-hyper`는 처음부터 큰 기능을 약속하면 안 된다. 첫 공개 버전은 작고 명확해야 한다.

공개 포지셔닝:

```text
Orange Hyper is an RPG-style adaptive project-memory harness for coding agents.
It starts as a lightweight intent compiler and grows project-specific memory, roles, tools, and verification loops only when repeated work proves they are useful.
```

## 2. README 첫 문단

```md
# Orange Hyper

Orange Hyper is an RPG-style adaptive project-memory harness for coding agents.
It helps agents compile user intent, retrieve only the relevant project memory, verify work by level, and grow project-specific capabilities without forcing every task through a heavy SPEC or PR ceremony.
```

## 3. Non-goals를 README 상단에 넣기

```md
Orange Hyper does not:
- clone or unlock any model
- force SDD for every task
- create branches or PRs by default
- install MCP servers by default
- spawn subagents by default
- preload a role zoo
- dump the full project memory into every prompt
```

## 4. Repository 필수 파일

```text
README.md
LICENSE
CONTRIBUTING.md
SECURITY.md
CODE_OF_CONDUCT.md
CHANGELOG.md
docs/PROJECT_DEFINITION.md
docs/ARCHITECTURE.md
docs/MEMORY_GRAPH.md
docs/ROADMAP.md
examples/
evals/
```

## 5. License 선택

추천: Apache-2.0

이유:

- 기업 채택에 비교적 안정적
- patent grant 포함
- 하네스/도구 프로젝트에 적합

MIT도 가능하지만, 장기적으로 외부 기여와 기업 사용을 고려하면 Apache-2.0이 낫다.

## 6. 보안 문서에 넣을 내용

- secrets를 memory node에 저장하지 말 것
- `.orange-hyper/local/`은 gitignore 권장
- MCP install은 사용자 승인 필요
- hook은 optional이며 trust review 필요
- raw prompt trace는 opt-in
- shareable trace는 redaction 필요

## 7. 기여 가이드 원칙

기여자가 기능을 추가할 때 다음 질문에 답해야 한다.

```text
1. 이 기능은 시작을 더 무겁게 만드는가?
2. 이 기능은 반복 증거에서 unlock되는가?
3. 이 기능은 L0/L1 작업에 overhead를 만드는가?
4. 이 기능은 memory bloat를 만드는가?
5. 이 기능은 MCP/subagent/role을 기본값으로 만드는가?
6. 이 기능은 사용자 승인 없이 외부 도구를 실행하는가?
```

하나라도 위험하면 설계를 수정해야 한다.

## 8. Issue Template

### Feature Request

```md
## Problem

## Proposed capability

## Which growth level?
H0 / H1 / H2 / H3 / H4 / H5 / H6

## Does it add ceremony to L0/L1?

## Does it require user approval?

## Token impact

## Alternatives
```

### Bug Report

```md
## What happened

## Expected behavior

## Orange route if available

## Memory nodes loaded

## Token trace if available

## Reproduction
```

## 9. Eval 공개 전략

처음부터 거창한 benchmark를 주장하지 않는다.

표현:

```text
Orange Hyper evals are behavioral checks, not model capability benchmarks.
```

평가할 것:

- over-scope 감소
- output drift 감소
- memory retrieval precision
- stale memory handling
- false verification 감소
- MCP proposal fit
- role bloat 방지

평가하지 않는 것:

- 특정 모델 성능 자체
- Fable/Claude/Codex parity
- autonomous coding benchmark 점수 과장

## 10. Release Strategy

```text
v0.1.0-alpha: seed kernel
v0.1.0: stable file schemas + CLI
v0.2.0: memory graph usability
v0.3.0: optional hooks preview
v0.4.0: MCP advisor
v0.5.0: growth system
```

각 release는 migration note를 포함해야 한다.

## 11. Public Messaging

좋은 문장:

```text
Orange Hyper grows from project evidence.
```

나쁜 문장:

```text
Orange Hyper makes agents autonomous.
Orange Hyper replaces your development process.
Orange Hyper gives Codex memory superpowers.
Orange Hyper automatically manages your whole workflow.
```

## 12. 첫 공개 전 체크리스트

```text
[ ] README quickstart 5분 내 성공
[ ] no default hooks
[ ] no default MCP
[ ] no default subagents
[ ] no role zoo
[ ] memory proposal-first
[ ] .orange-hyper/local gitignore 안내
[ ] token trace schema 문서화
[ ] evals는 behavioral checks라고 명시
[ ] examples 2개 이상
[ ] CI: typecheck/test/lint
[ ] LICENSE 선택
[ ] SECURITY.md 작성
```
