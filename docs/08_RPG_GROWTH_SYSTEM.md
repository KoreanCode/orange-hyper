# RPG Growth System

## 1. 목표

`orange-hyper`의 성장 시스템은 게임적 은유를 사용하지만 장난감이 아니다. 목적은 하네스가 처음부터 무거워지는 것을 막고, 프로젝트가 실제로 필요로 하는 capability만 unlock하게 만드는 것이다.

## 2. 핵심 비유

사용자는 초보자 캐릭터를 받는다. 전사, 마법사, 궁수, 도적은 처음부터 정해지지 않는다. 어떤 몬스터를 자주 만나는지, 어떤 무기를 자주 쓰는지, 어떤 퀘스트를 반복하는지에 따라 class가 열린다.

프로젝트도 같다.

- auth 작업이 많으면 auth reviewer가 열린다.
- UI 검증 실패가 반복되면 visual verification routine이 열린다.
- framework docs 조회가 반복되면 Context7 proposal이 자주 뜬다.
- 큰 PR review가 많으면 A2 audit lanes가 열린다.

## 3. Growth Level

```text
H0: Beginner
- intent compile
- route contract
- no memory write
- no hook
- no MCP

H1: Adventurer
- repo memory index
- Context Capsule
- manual memory delta proposal

H2: Class Unlock
- 반복 작업 기반 role proposal
- project-specific role만 생성

H3: Guild Memory
- decision/constraint/risk/verification graph
- stale/superseded/conflict 처리

H4: Tool Mastery
- MCP Advisor
- tool proposal card
- user-approved install/use

H5: Raid Mode
- A2/A3 subagent lanes
- large review, migration, incident 대응

H6: Legendary Loop
- long-running repair loop
- regression loop
- explicit opt-in only
```

## 4. Unlock 조건

Unlock은 사용자의 명시 요청 또는 반복 증거로만 발생한다.

```yaml
unlock_rule:
  id: unlock.spring_backend_reviewer
  requires:
    repeated_tasks:
      kind: backend_change
      count: 5
      within_days: 30
    recurring_concerns:
      - transaction_boundary
      - integration_test_gap
  proposal_only: true
```

## 5. Growth Profile

`.orange/growth/profile.yaml`

```yaml
project_level: H1
unlocked:
  memory_graph: true
  mcp_advisor: false
  role_evolution: false
  raid_mode: false
roles:
  active: []
  dormant: []
capabilities:
  context_capsule:
    level: 1
  verification_gate:
    level: 1
  mcp_advisor:
    level: 0
```

## 6. XP 개념

XP는 gamification 점수가 아니라 evidence count다.

```yaml
xp_events:
  - type: repeated_intent
    value: auth_change
  - type: verification_success
    value: signup_tests
  - type: memory_hit_useful
    value: decision.deleted_user_can_rejoin
  - type: stale_memory_detected
    value: decision.old_oauth_policy
```

## 7. Role 생성 원칙

역할은 다음 조건을 만족해야 한다.

- 반복되는 작업 증거가 있다.
- 역할 범위가 좁다.
- read-only 기본값이다.
- 유지보수할 가치가 있다.
- dormant 처리 가능하다.

나쁜 role:

```text
backend-worker, frontend-worker, mobile-worker, devops-worker, security-worker를 처음부터 모두 생성
```

좋은 role:

```text
이 프로젝트에서 반복된 Spring auth/transaction 변경을 검토하는 read-only reviewer
```

## 8. Skill Tree

예시:

```text
Beginner
 ├─ Intent Compile
 ├─ Route Contract
 └─ Basic Trace

Adventurer
 ├─ Memory Index
 ├─ Context Capsule
 └─ Memory Delta Proposal

Class Unlock
 ├─ Project Role Proposal
 ├─ Role Dormancy
 └─ Role Template Generation

Tool Mastery
 ├─ MCP Catalog
 ├─ MCP Proposal Card
 └─ Approved Install Hint

Raid Mode
 ├─ A2 Read-only Audit Lanes
 ├─ A3 Controlled Worker Split
 └─ Consolidated Evidence Report
```

## 9. Dormancy와 Pruning

성장은 무조건 누적되면 안 된다. 오래 쓰지 않는 role과 tool은 dormant가 되어야 한다.

```yaml
role:
  id: role.mobile_reviewer
  status: dormant
  dormant_reason: "not used in 60 days"
  last_used_at: 2026-04-01
```

Pruning 후보:

- 60일 이상 미사용 role
- low usefulness memory node
- stale decision
- rejected tool proposal이 반복된 MCP

## 10. Growth Proposal 예시

```md
# Growth Proposal

Unlock: spring_backend_reviewer role
Reason:
- 최근 30일간 backend auth 작업 6회
- transaction boundary 검토가 4회 반복됨
- 관련 memory node hit precision이 높음
Default behavior:
- read-only review only
- A1/A2에서만 사용
Risk:
- 작은 작업에 role이 과잉 적용될 수 있음
Accept:
orange growth accept proposal_012
```

## 11. 실패 조건

성장 시스템이 실패한 상태:

- 처음부터 만렙 캐릭터를 설치한다.
- 사용자가 role 문서를 관리하느라 피곤해진다.
- 작은 작업에도 성장 시스템이 개입한다.
- dormant/pruning이 없다.
- XP가 실제 유용성이 아니라 단순 사용량으로만 쌓인다.

## 12. MVP 구현 범위

v0.1:

- growth profile schema
- XP event log
- no unlock

v0.2:

- role proposal only
- no automatic role activation

v0.3:

- dormant/pruning proposal
- MCP proposal integration

v0.4:

- raid mode proposal
