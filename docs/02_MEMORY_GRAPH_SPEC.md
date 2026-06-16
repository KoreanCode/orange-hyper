# Memory Graph Specification

## 1. 목표

`orange-hyper`의 memory system은 SDD의 sequential SPEC 한계를 피하기 위해 설계된다. 기억은 순차 문서가 아니라 node와 edge로 저장한다. 현재 작업은 전체 history를 읽지 않고 필요한 memory slice만 읽는다.

## 2. 핵심 원칙

- Memory는 raw conversation dump가 아니다.
- Memory는 프로젝트에 반복적으로 필요한 압축된 지식이다.
- 모든 memory에는 provenance가 있어야 한다.
- stale 가능성이 있는 memory는 validity metadata를 가져야 한다.
- memory write는 기본적으로 proposal-first다.
- retrieval은 token budget을 가져야 한다.

## 2.1 v0.2 Memory Delta Proposal 범위

v0.2는 Memory Graph 전체 구현이 아니라 "기억 후보 제안/승인" 단계다.

포함:

```text
orange remember propose --quest <completed-quest-id>
orange remember list [--status pending|accepted|rejected] [--type decision|constraint|component|risk|verification] [--quest <quest-id>]
orange remember show <proposal-id>
orange remember accept <proposal-id>
orange remember reject <proposal-id>
```

제외:

```text
Memory Graph rendering
Obsidian-style dashboard graph
MCP/hooks/subagents/role evolution
auto planner / auto execution loop
raw prompt 전체 저장
사용자 승인 없는 graph node 생성
L0/L1 작업의 기본 memory proposal 활성화
```

Proposal 저장 구조:

```text
.orange-hyper/
  proposals/
    memory-delta/
      pending/
      accepted/
      rejected/
```

`accept`가 처음 실행되면 graph node 후보 저장소를 만든다.

```text
.orange-hyper/
  graph/
    nodes/
      decision/
      constraint/
      component/
      risk/
      verification/
    edges.jsonl
    index.json
```

Memory Delta Proposal은 Markdown + YAML frontmatter다. 필수
frontmatter:

```yaml
schema_version: 1
id: mem_delta_...
status: pending
source_quest: quest_...
node_type: decision
confidence: medium
created_at: 2026-06-16T00:00:00.000Z
updated_at: 2026-06-16T00:00:00.000Z
```

필수 본문 섹션:

```text
## Candidate Memory
## Why this should be remembered
## Evidence
## Suggested Node
```

`propose`는 completed Quest만 대상으로 하며, source Quest에는
verification evidence 또는 unverified reason이 있어야 한다. `L0`/`L1`
Quest는 기본적으로 proposal 대상이 아니다.

중복 정책:

- 같은 `source_quest`, `node_type`, `Candidate Memory` 내용이 동일한 pending
  proposal이 이미 있으면 새 파일을 만들지 않고 기존 proposal을 반환한다.
- JSON 출력은 `data.duplicated`로 이 상태를 표시한다.
- accepted/rejected proposal은 과거 사용자 결정을 나타내므로 v0.2에서는
  중복 제거 대상이 아니다. 같은 Quest를 다시 제안해야 하면 새 pending id를
  할당할 수 있다.

품질 검증:

- `Candidate Memory`는 비어 있으면 안 된다.
- `Why this should be remembered`는 비어 있으면 안 된다.
- `Evidence`는 source Quest 또는 verification/unverified 정보를 참조해야 한다.
- `Suggested Node`에 명시된 type은 frontmatter `node_type`과 충돌하면 안 된다.
- `confidence`는 `low`, `medium`, `high`만 허용한다.
- 너무 짧거나 일반적인 `Candidate Memory`는 v0.2 alpha에서 warning으로만
  처리한다.

`accept`는 pending proposal을 accepted로 옮기고 graph node 후보를 생성한다.
이 node는 accepted memory node 후보이며, 확정된 자동 기억 저장 결과가 아니다.
`reject`는 rejected로 옮기며 graph node를 생성하지 않는다.

accepted graph node 후보 frontmatter에는 다음 provenance를 남긴다.

```yaml
schema_version: 1
id: decision.mem_delta_...
kind: decision
node_type: decision
status: candidate
confidence: medium
created_at: 2026-06-16T00:05:00.000Z
updated_at: 2026-06-16T00:05:00.000Z
accepted_at: 2026-06-16T00:05:00.000Z
origin: memory-delta-proposal
source_proposal: mem_delta_...
source_quest: quest_...
source_proposal_hash: sha256...
provenance:
  proposal_id: mem_delta_...
  source_proposal: mem_delta_...
  source_quest: quest_...
  accepted_at: 2026-06-16T00:05:00.000Z
  node_type: decision
  origin: memory-delta-proposal
  source_proposal_hash: sha256...
```

`doctor`는 accepted proposal과 graph node의 `source_proposal`, `source_quest`,
`accepted_at`, `node_type`, `origin`, `source_proposal_hash` provenance가
일치하는지 확인한다.

## 3. Node 타입

### 3.1 Intent Node

반복되는 사용자 의도 패턴을 저장한다.

```yaml
id: intent.signup_policy_change
kind: intent
summary: "회원가입 정책 변경"
triggers:
  - "탈퇴한 이메일 재가입"
  - "signup policy"
expected_output: code_change
usual_components:
  - component.auth
  - component.user
risk_hint: medium
```

### 3.2 Decision Node

프로젝트에서 이미 결정된 설계 판단이다.

```yaml
id: decision.deleted_user_can_rejoin
kind: decision
summary: "탈퇴 사용자는 같은 이메일로 재가입 가능하다"
rationale: "개인정보 삭제 후 재가입 UX를 단순화하기 위함"
status: active
created_from: episode.20260616_signup
valid_from: 2026-06-16
valid_to: null
```

### 3.3 Constraint Node

항상 지켜야 하는 제약이다.

```yaml
id: constraint.no_plain_password_log
kind: constraint
summary: "비밀번호와 토큰은 로그에 남기지 않는다"
severity: high
applies_to:
  - component.auth
  - component.logging
```

### 3.4 Component Node

코드베이스의 의미 단위다.

```yaml
id: component.auth
kind: component
summary: "인증/인가 및 회원가입 영역"
paths:
  - src/main/java/.../auth
  - src/test/java/.../auth
owners: []
```

### 3.5 Risk Node

변경 시 주의할 위험이다.

```yaml
id: risk.oauth_signup_regression
kind: risk
summary: "일반 회원가입 정책 변경이 OAuth 가입 흐름을 깨뜨릴 수 있음"
severity: medium
signals:
  - "OAuth user provisioning path touches UserService"
```

### 3.6 Verification Node

검증 명령, 절차, evidence를 저장한다.

```yaml
id: verification.auth_signup_tests
kind: verification
summary: "회원가입 정책 변경 후 실행할 테스트"
commands:
  - ./gradlew test --tests '*Signup*'
  - ./gradlew test --tests '*UserService*'
confidence: medium
```

### 3.7 Convention Node

프로젝트 관습이다.

```yaml
id: convention.service_transaction_boundary
kind: convention
summary: "트랜잭션은 Service 계층에 둔다"
applies_to:
  - component.backend
```

### 3.8 Tool Node

도구나 MCP의 유용 조건을 저장한다.

```yaml
id: tool.context7
kind: tool
summary: "라이브러리 최신 문서 확인용 MCP"
useful_when:
  - "framework API freshness matters"
  - "version-specific docs are needed"
default_state: suggested_only
```

### 3.9 Role Node

반복 증거에서 성장한 project-specific role이다.

```yaml
id: role.spring_backend_reviewer
kind: role
summary: "Spring backend 변경 검토 role"
unlocked_by:
  - episode.20260601_auth
  - episode.20260605_transaction
scope:
  - component.backend
status: active
```

### 3.10 Episode Node

작업 단위의 요약이다. raw log가 아니라 압축된 사건 기록이다.

```yaml
id: episode.20260616_signup
kind: episode
summary: "탈퇴 이메일 재가입 정책 변경"
intent: intent.signup_policy_change
result: completed
verification:
  - verification.auth_signup_tests
memory_deltas:
  - decision.deleted_user_can_rejoin
```

## 4. Edge 타입

```text
touches        A가 B를 변경/참조한다
depends_on     A가 B에 의존한다
conflicts_with A와 B가 충돌한다
supersedes     A가 B를 대체한다
verified_by    A가 B로 검증된다
caused_by      A가 B로 인해 발생했다
requires_tool  A가 B 도구를 요구한다
useful_for     A가 B 작업에 유용하다
stale_after    A가 특정 조건 이후 낡는다
applies_to     A가 B에 적용된다
derived_from   A가 B에서 유래했다
```

`edges.jsonl` 예시:

```jsonl
{"from":"decision.deleted_user_can_rejoin","type":"applies_to","to":"component.auth","confidence":0.9}
{"from":"risk.oauth_signup_regression","type":"verified_by","to":"verification.auth_signup_tests","confidence":0.8}
{"from":"tool.context7","type":"useful_for","to":"intent.framework_upgrade","confidence":0.7}
```

## 5. Node 파일 형식

각 node는 markdown frontmatter + 본문으로 저장한다.

```md
---
id: decision.deleted_user_can_rejoin
kind: decision
status: active
confidence: 0.8
created_at: 2026-06-16
updated_at: 2026-06-16
source: episode.20260616_signup
valid_from: 2026-06-16
valid_to: null
---

# 탈퇴 사용자는 같은 이메일로 재가입 가능하다

## Rationale
...

## Evidence
...

## Caveats
...
```

## 6. Retrieval 정책

retrieval은 다음 순서로 수행한다.

```text
1. Intent Capsule에서 핵심 entity와 action 추출
2. component/path 후보 찾기
3. 직접 연결된 decision/constraint/risk/verification node 수집
4. stale/superseded/conflict node 제거 또는 별도 표시
5. route level에 따라 node 수와 token budget 제한
6. Context Capsule 생성
```

## 7. Memory Budget

```text
MB0: memory 사용 없음
MB1: index만 확인, node 본문 읽지 않음
MB2: 최대 3~5 node
MB3: 최대 10~20 node
MB4: 사용자 고지 후 deep memory retrieval
```

기본값:

```text
L0 -> MB0
L1 -> MB1
L2 -> MB2
L3 -> MB3
L4 -> MB4
```

## 8. Staleness 처리

memory는 시간이 지나면 틀릴 수 있다. 특히 framework version, API behavior, business policy, deployment command, team convention은 stale 위험이 높다.

node는 다음 필드를 가진다.

```yaml
stability: stable | slow_change | volatile
stale_after: null | 30d | 90d | condition
superseded_by: null | node_id
last_verified_at: 2026-06-16
```

retrieval 시 stale node는 Context Capsule에 그대로 넣지 않는다. 다음처럼 표시한다.

```md
Potentially stale:
- decision.x: last_verified_at=2025-12-01, stale_after=90d
```

## 9. Memory Delta Lifecycle

작업 후 memory update는 자동 commit하지 않는다.

```text
1. Agent proposes memory delta
2. User or policy reviews
3. Accepted delta becomes node/edge
4. Index rebuild
5. Future retrieval can use it
```

proposal 예시:

```md
---
schema_version: 1
id: mem_delta_quest_20260616_000000Z_signup-policy_decision
status: pending
source_quest: quest_20260616_000000Z_signup-policy
node_type: decision
confidence: medium
created_at: 2026-06-16T00:00:00.000Z
updated_at: 2026-06-16T00:00:00.000Z
---

# Memory Delta Proposal: 탈퇴 이메일 재가입 정책

## Candidate Memory

탈퇴 사용자는 같은 이메일로 재가입 가능하다.

## Why this should be remembered

반복될 가능성이 있는 프로젝트 정책 결정이다.

## Evidence

- Source Quest: quest_20260616_000000Z_signup-policy
- Evidence: UserServiceTest passed

## Suggested Node

- Type: decision
- Confidence: medium
```

## 10. Privacy 원칙

- secrets는 memory에 저장하지 않는다.
- token, password, private key, customer PII는 redaction 대상이다.
- `.orange-hyper/local/`은 기본적으로 gitignore한다.
- team-shared memory와 personal memory를 분리한다.

## 11. 좋은 memory와 나쁜 memory

좋은 memory:

```text
이 프로젝트에서는 transaction boundary를 Service layer에 둔다.
회원 탈퇴 user는 status=DELETED로 유지된다.
AuthIntegrationTest는 embedded redis가 필요하다.
```

나쁜 memory:

```text
오늘 기분상 이 방식이 나아 보였다.
아마도 UserService가 중요할 것이다.
전체 대화 로그 전문.
일회성 파일 경로 without durable meaning.
```

## 12. v0.2 구현 기준

v0.2는 다음만 구현한다.

- Memory Delta proposal writer
- proposal list/show
- manual accept/reject
- accepted graph node candidate writer
- doctor validation for proposal/provenance state
- identity placeholder counts

active retrieval, graph rendering, vector DB, graph DB, embeddings는 v0.2에서 제외한다.
