# Development Roadmap

## 1. 개발 원칙

`orange-hyper`는 처음부터 완성형 하네스를 만들지 않는다. MVP는 작아야 한다. 기능은 반복 증거와 trace를 기반으로 확장한다.

## 2. v0.1 — Seed Kernel

목표: 하네스의 가장 작은 repo-local 기록 커널.

포함:

- `orange init`
- `.orange-hyper/` 디렉터리 생성
- `config.json`
- Quest markdown + YAML frontmatter
- Route Contract 생성
- route trace jsonl
- Context Capsule 생성
- `orange doctor`
- `orange identity build` placeholder

제외:

- Memory Delta Proposal
- Memory Graph usability
- Identity Dashboard graph rendering
- hook 설치
- MCP 설치
- subagent 생성
- role unlock
- vector DB
- graph DB
- LLM API 필수화

완료 기준:

```text
사용자가 repo에서 orange init 후, Quest/Route/Capsule을 repo-local 파일로 남기고,
작업 완료 시 verified 또는 unverified evidence를 명시할 수 있다.
identity build는 Seed Kernel 상태 요약 placeholder HTML만 생성한다.
```

## 3. v0.2 — Memory Delta Proposal

목표: 완료된 Quest와 evidence에서 사람이 검토할 수 있는 Memory Delta Proposal을 만든다.

포함:

- `.orange-hyper/proposals/memory-delta/`
- proposal markdown schema
- source Quest/evidence link
- pending/accepted/rejected status
- `orange remember propose/list/show/accept/reject`
- doctor checks for malformed proposals
- accept 시 graph node 후보와 provenance 생성

제외:

- automatic memory accept
- active Memory Graph search
- node/edge graph rendering
- hook-triggered proposal generation
- raw prompt 전체 저장
- L0/L1 Quest의 기본 proposal 활성화

완료 기준:

```text
완료된 L2+ Quest에서 decision/constraint/component/risk/verification 후보를
proposal file로 남기고, 사용자가 수동으로 accept/reject할 수 있다.
accept한 proposal만 graph node 후보를 생성한다.
```

## 4. v0.3 — Memory Graph Usability + Identity Graph Preview

목표: accepted memory를 실제 작업 context와 Identity Dashboard에서 탐색하기 시작한다.

포함:

- Memory Node markdown schema
- edges.jsonl
- index builder
- node search
- stale/superseded/conflict metadata
- memory budget 적용
- context capsule archive
- Identity Dashboard node/edge graph preview
- route trace 개선

제외:

- graph DB
- vector DB 필수화
- automatic role unlock
- automatic MCP install

완료 기준:

```text
반복 작업에서 이전 decision/constraint/verification node를 찾아 Context Capsule에 넣고,
identity build에서 node/edge graph preview를 볼 수 있다.
```

## 5. v0.4 — Minimal Hook Preview

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

## 6. v0.5 — MCP Advisor

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

## 7. v0.6 — Growth System

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

## 8. v0.7 — Adapter Layer

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

## 9. v0.8 — Eval and Reports

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

## 10. 다음 구현 순서

1. Memory Delta Proposal schema
2. proposal writer command
3. proposal list/show commands
4. source Quest/evidence link
5. accept/reject status
6. doctor validation for proposals
7. tests
8. README and examples

## 11. 다음 개발 목표

```text
Step 1: proposal schema and deterministic file naming
Step 2: proposal writer from completed Quest evidence
Step 3: proposal list/show UX
Step 4: manual review status workflow
Step 5: doctor checks and tests
Step 6: README examples for v0.2
```

## 12. 품질 기준

- 모든 schema는 test가 있어야 한다.
- 모든 generated file은 deterministic해야 한다.
- CLI는 실패 시 수정 가능한 메시지를 내야 한다.
- `.orange-hyper/local/`은 기본 gitignore해야 한다.
- memory write는 proposal-first여야 한다.
- L0/L1 작업에 overhead를 만들지 않는 설계여야 한다.

## 13. 절대 하지 말 것

- MVP에 hook을 넣지 말 것.
- MVP에 MCP를 넣지 말 것.
- MVP에 subagent를 넣지 말 것.
- MVP에 graph DB를 넣지 말 것.
- MVP에 role zoo를 넣지 말 것.
- MVP에 SDD workflow를 넣지 말 것.

MVP는 작아야 한다. 작아야 실제로 시작할 수 있다.
