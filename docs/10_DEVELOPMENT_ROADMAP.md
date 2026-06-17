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

목표: accepted memory를 현재 프로젝트 안에서 read-only로 탐색하고 Identity Dashboard에서 미리보기 시작한다.

포함:

- Memory Node markdown schema와 provenance
- `graph/index.json` read model과 deterministic index builder
- `orange graph list/show/search/rebuild-index`
- current-project accepted node filter
- deterministic plain-text node search
- Project Boundary Guard
- shared memory state policy
- doctor graph/project-boundary diagnostics
- Identity Dashboard read-only graph preview

제외:

- graph editing
- semantic/vector search
- graph DB
- vector DB 필수화
- hooks/MCP/subagents/role system
- automatic memory write
- automatic role unlock
- automatic MCP install
- automatic planner / automatic execution loop

완료 기준:

```text
현재 project_id와 일치하는 accepted memory node를 list/show/search로 탐색하고,
identity build에서 read-only graph preview와 source provenance를 볼 수 있다.
```

## 5. v0.4 — Minimal Hook Preview (stable)

목표: hook을 강한 하네스가 아니라 read-only / warning-first preview로 도입한다.

포함:

- `orange hook preview`
- `orange hook status`
- `orange hook run session-start`
- `orange hook run stop`
- `--json` Adapter JSON Contract 유지
- `--write-report` 명시 옵션에서만 local report 생성
- session-start read-only 관찰
- stop read-only 관찰
- missing project_id, stale capsule/identity, project boundary, doctor quick warning/hint

제외:

- hook 설치
- 자동 Quest 생성
- 자동 memory proposal 생성
- 자동 accept/reject
- 자동 graph rebuild
- 자동 doctor repair
- 자동 memory accept
- 자동 SPEC 생성
- 자동 branch/PR workflow
- MCP 구현/설치
- subagent 실행
- role evolution
- auto planner / auto execution loop

완료 기준:

```text
사용자는 hook preview로 session-start/stop에서 무엇을 관찰할지 확인할 수 있다.
hook run은 warning과 hint만 반환하고 Quest/Proposal/Graph/Identity/Project Boundary를 자동 수정하지 않는다.
report는 --write-report를 명시했을 때만 .orange-hyper/hooks/reports/ 아래에 생성된다.
v0.4 stable은 이 preview-only boundary를 고정하고, MCP는 v0.5로 넘긴다.
```

## 6. v0.5 — MCP Advisor (stable)

목표: MCP를 기본 장착이 아니라 read-only recommendation layer로 제공한다. v0.5는 MCP integration이 아니라 MCP Advisor다.

포함:

- MCP catalog
- MCP proposal card
- `orange mcp list`
- `orange mcp show <mcp-id>`
- `orange mcp suggest [--quest <quest-id>] [--query <text>]`
- Adapter JSON Contract를 따르는 `mcp.list`, `mcp.show`, `mcp.suggest`
- deterministic score/confidence/matched_signals ranking
- no-suggestion 상태
- Korean/English signal matching
- Quest-based suggestion
- install command/hint generation
- use once / persistent 구분
- risk/token impact 표시

제외:

- MCP 자동 설치
- MCP 자동 실행
- MCP config 자동 수정
- API key 저장
- 외부 네트워크 호출
- hook에서 MCP 자동 제안/설치/실행
- subagent 실행
- role evolution
- auto planner / auto execution loop
- 사용자의 승인 없는 Quest/Proposal/Graph/config/project memory 변경

완료 기준:

```text
framework docs freshness 같은 상황에서 Context7 등 MCP를 제안하되, 설치/사용은 사용자 승인 뒤에만 진행한다.
proposal card는 tool, why_now, expected_benefit, scope, risk, token_impact, install_command,
use_once_or_persist, requires_user_approval, not_executed, config_mutation를 제공한다.
```

## 7. v0.6 — Growth Signal Preview (current alpha)

목표: Quest, Route, accepted Memory Graph, Hook warning, MCP advisor signal을
read-only로 읽어 프로젝트가 어떤 방향으로 성장 중인지 요약하고 성장 후보를
제안한다. v0.6.0-alpha.0은 자동 성장 시스템이 아니라 preview다.

포함:

- `orange growth status`
- `orange growth suggest`
- `orange growth explain`
- Adapter JSON Contract를 따르는 `growth.status`, `growth.suggest`, `growth.explain`
- accepted memory node count/type distribution/dominant type
- route/layer distribution
- verified/unverified Quest ratio
- pending memory proposal count
- Hook warning summary
- MCP advisor signal summary
- decorative `growthLevel`: `seed`, `sprout`, `branch`, `canopy`
- Identity Dashboard의 Growth Signal Preview summary
- deterministic evidence explanation

제외:

- role 자동 생성
- MCP 자동 설치/실행
- hook 정책 자동 변경
- subagent 실행/추천 자동화
- auto planner / auto execution loop
- project memory 자동 mutation
- graph node 자동 생성
- workflow 강제

완료 기준:

```text
반복 증거를 읽어 growth candidate를 제안하되, 모든 candidate는
auto_unlock: false 및 requires_user_approval: true를 유지한다.
growthLevel은 장식적 preview label이며 자동 unlock을 의미하지 않는다.
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

1. v0.6 Growth Signal Preview alpha
2. deterministic evidence rules for growth status/suggest/explain
3. Identity Dashboard growth preview summary
4. docs and smoke checks that preserve explicit user approval
5. future growth profile design only after preview evidence stabilizes
6. future role proposal boundary only after explicit user approval

## 11. 다음 개발 목표

```text
Step 1: keep v0.5 MCP Advisor stable as recommendation-only
Step 2: require user approval before MCP install or use
Step 3: start v0.6 Growth Signal Preview without auto role evolution
Step 4: keep reports local/generated and opt-in
Step 5: preserve the v0.3 read-only graph and identity surface
Step 6: defer real adapter layer to v0.7
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
