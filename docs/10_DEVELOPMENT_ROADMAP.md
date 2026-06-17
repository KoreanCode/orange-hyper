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

## 7. v0.6 — Growth Signal Preview (stable)

목표: Quest, Route, accepted Memory Graph, Hook warning, MCP advisor signal을
read-only로 읽어 프로젝트가 어떤 방향으로 성장 중인지 요약하고 성장 후보를
제안한다. v0.6.0 stable은 자동 성장 시스템이 아니라 stable preview surface다.

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

## 8. v0.7 — Adapter Invocation Contract (stable)

목표: 실제 adapter runtime을 만들기 전에 natural-language layer, skill layer,
agent adapter가 Orange Kernel을 안전하게 호출하는 command recipe와 JSON
contract를 고정한다.

포함:

- `orange adapter list`
- `orange adapter show <recipe-id>`
- `orange adapter dry-run <recipe-id>`
- Adapter JSON Contract를 따르는 `adapter.list`, `adapter.show`, `adapter.dryRun`
- built-in recipe: `quest-capture`, `work-complete-to-memory`, `project-status`,
  `hook-check`, `mcp-advice`
- recipe command sequence와 required input/output metadata
- no-direct-file-mutation guard
- `--json` only parsing guard
- human output parsing 금지
- kernel state logic duplication 금지
- safety flags: `direct_file_mutation: false`, `parses_human_output: false`,
  `requires_json_mode: true`, `auto_accept: false`, `auto_install: false`,
  `auto_unlock: false`

제외:

- Codex/Claude 전용 adapter 자동 설치
- 실제 adapter runtime 구현
- 자동 Quest 생성
- 자동 memory proposal 생성
- 자동 accept/reject
- 자동 graph rebuild
- 자동 hook 실행
- MCP 자동 설치/실행
- subagent orchestration
- `.orange-hyper` 직접 파일 수정
- auto planner / auto execution loop

완료 기준:

```text
adapter는 Orange CLI --json command만 호출한다.
adapter는 .orange-hyper를 직접 수정하지 않고 human output을 파싱하지 않는다.
dry-run은 command sequence만 보여주며 실제 state mutation command를 실행하지 않는다.
v0.7 stable은 runtime이 아니라 invocation contract까지만 제공한다.
```

## 9. v0.8 — Eval and Reports (stable)

목표: 외부 telemetry 없이 `.orange-hyper` local project state를 읽어
Orange Hyper가 남긴 Quest, verification, proposal, graph, doctor, hook,
MCP Advisor, growth, adapter, identity 신호를 보수적으로 요약한다.

포함:

- `orange eval snapshot`
- `orange eval report`
- `orange eval explain`
- Adapter JSON Contract를 따르는 `eval.snapshot`, `eval.report`,
  `eval.explain`
- Quest count, completed Quest count, verified/unverified count
- Memory proposal accepted/rejected/pending flow
- accepted graph node count
- doctor errors/warnings count
- latest local hook report warning summary when available
- MCP Advisor availability and local MCP-shaped signal summary
- growth candidate count
- adapter recipe count
- identity report existence
- `schema_version: 2` report payload
- section `status`, `reason`, `evidence_count`
- `known_gaps`와 `unavailable_metrics`
- `local_only: true`, `telemetry: false`, `network_upload: false`,
  `llm_judge: false`
- `--write-report` 명시 옵션에서만 `.orange-hyper/evals/reports/` local
  Markdown report 생성
- unavailable metric을 추정하지 않는 explain surface

완료 기준:

```text
사용자는 local-only eval snapshot/report/explain으로 현재 프로젝트의 신호를 확인할 수 있다.
report는 --write-report를 명시하지 않으면 파일을 만들지 않는다.
token savings, success-rate improvement, model capability improvement는 수집 근거가 없으면 unavailable로 남긴다.
외부 telemetry, network upload, LLM judge, MCP 실행, hook 자동 실행, project memory/config 자동 수정은 없다.
```

## 10. v1.0 — Stabilization Candidate (current)

목표: v0.1~v0.8에서 구현한 기능을 새 runtime feature 추가 없이 v1.0 후보로
안정화한다. boundary audit, Adapter JSON Contract audit, command surface audit,
shared/local state audit, package surface audit, README/docs 정리, readiness
report, regression test 보강이 범위다.

포함:

- v0.1~v0.8 boundary summary
- Adapter JSON `contract_version: "0.1"` 유지 확인
- README 4종 `1.0-doc.1` 동기화
- `docs/22_V1_STABILIZATION.md`
- `RELEASE_NOTES.md` v1.0.0-alpha.1 섹션
- package version `1.0.0-alpha.1`
- package surface dry-run 검증
- shared/local `.orange-hyper` state policy 재검증

제외:

- 새 CLI feature
- MCP 자동 설치/실행
- hook 자동 mutation 또는 설치
- role 자동 생성
- subagent orchestration
- auto planner / auto execution loop
- LLM judge
- telemetry/network upload
- adapter runtime 구현
- project memory/config 자동 mutation

완료 기준:

```text
v1.0-alpha는 새 기능이 아니라 안정화 후보로 설명된다.
v0.1~v0.8의 경계가 문서와 테스트로 재확인된다.
Adapter JSON Contract는 contract_version "0.1"을 유지한다.
package surface는 bin/src/docs/README/RELEASE_NOTES/LICENSE/metadata만 포함하고 tests/local artifacts를 제외한다.
v1.0 stable로 넘어가기 전 남은 검증 기준이 명확하다.
```

## 11. 다음 구현 순서

1. v1.0 stabilization candidate validation and published alpha smoke
2. Adapter recipe validation from real user workflows
3. Adapter interface stabilization only after the stable invocation contract
   keeps holding
4. Codex adapter and generic CLI adapter proof only after explicit adapter
   runtime scope is opened
5. Claude Code adapter draft only after explicit adapter runtime scope is opened
6. model capability profile
7. future growth profile design only after preview evidence remains stable
8. future role proposal boundary only after explicit user approval

## 12. 다음 개발 목표

```text
Step 1: keep v0.6 Growth Signal Preview stable as preview-only
Step 2: keep user approval before MCP install/use and growth candidate action
Step 3: preserve no automatic role, hook, subagent, planner, workflow, config, graph, or project-memory mutation
Step 4: keep reports local/generated and opt-in
Step 5: preserve the v0.3 read-only graph and identity surface
Step 6: keep v0.7 stable as Adapter Invocation Contract only
Step 7: keep v0.8 stable as local-only Eval and Reports only
Step 8: defer real adapter runtime until a separate explicit runtime scope is opened
Step 9: move toward v1.0 through stabilization, not automatic planner/runtime expansion
```

## 13. 품질 기준

- 모든 schema는 test가 있어야 한다.
- 모든 generated file은 deterministic해야 한다.
- CLI는 실패 시 수정 가능한 메시지를 내야 한다.
- `.orange-hyper/local/`은 기본 gitignore해야 한다.
- memory write는 proposal-first여야 한다.
- L0/L1 작업에 overhead를 만들지 않는 설계여야 한다.

## 14. 절대 하지 말 것

- MVP에 hook을 넣지 말 것.
- MVP에 MCP를 넣지 말 것.
- MVP에 subagent를 넣지 말 것.
- MVP에 graph DB를 넣지 말 것.
- MVP에 role zoo를 넣지 말 것.
- MVP에 SDD workflow를 넣지 말 것.

MVP는 작아야 한다. 작아야 실제로 시작할 수 있다.
