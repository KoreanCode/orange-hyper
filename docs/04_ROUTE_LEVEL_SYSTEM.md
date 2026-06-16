# Route and Level System

## 1. 목적

`orange-hyper`는 모든 작업에 같은 절차를 적용하지 않는다. 작업 난이도, 위험도, 검증 필요성에 따라 route를 결정한다. route는 chain-of-thought가 아니라 작업 계약이다.

## 2. Route Contract 형식

```yaml
route: L2/P2/T2/V2/A0/M0/MB2
layer: L2
procedure: P2
tool_budget: T2
verification: V2
delegation: A0
mcp: M0
memory: MB2
reason_summary: "bounded auth policy change with related tests"
```

사용자에게 보여줄 compact line:

```text
Orange route: L2 · P2 · T2 · V2 · A0 · M0 · MB2
```

## 3. Layer Level

```text
L0: direct answer
- stable concept answer
- no memory
- no hook
- no route line unless explicitly requested

L1: small edit or simple task
- one narrow target
- optional memory index
- touched surface check

L2: bounded implementation
- small-to-medium code change
- related files and related tests
- Context Capsule required

L3: investigation/design/review
- unknown cause
- multi-component reasoning
- hypothesis or audit lanes
- stronger verification

L4: high-risk or broad change
- migration, auth/payment/security, destructive operations
- explicit confirmation
- deep memory retrieval
- strict verification

L5: long-running loop / raid mode
- explicit opt-in only
- subagents and MCP likely
- trace-heavy
```

## 4. Procedure Budget

```text
P0: answer only
P1: inspect small surface, respond or edit
P2: plan small, implement bounded, verify touched surface
P3: investigate/design with hypotheses or audit lanes
P4: staged execution with approval checkpoints
P5: long-running loop, explicit opt-in
```

## 5. Tool Budget

```text
T0: no tool
T1: read-only local files
T2: scoped edit + targeted verification
T3: runtime/browser/external docs allowed
T4: approval-required tools or risky operations
T5: long loop tool use, explicit opt-in
```

## 6. Verification Level

```text
V0: no verification needed
V1: sanity/touched surface check
V2: targeted test or equivalent evidence
V3: reproduce-first + regression check
V4: high-risk verification plan with explicit gaps
V5: repeated loop with trace and failure mode tracking
```

## 7. Delegation Level

```text
A0: no delegation
A1: one read-only specialist
A2: parallel read-only audit lanes
A3: controlled worker split, approval required
A4: raid mode, explicit opt-in only
```

Delegation은 기본값이 아니다. Subagent는 context isolation, evidence separation, parallel audit를 위해서만 사용한다.

## 8. MCP Level

```text
M0: no MCP
M1: suggest MCP only
M2: use already-installed MCP once
M3: install/use after approval
M4: persistent project MCP, explicit opt-in
```

## 9. Memory Budget

```text
MB0: no memory
MB1: index only
MB2: 3~5 nodes
MB3: 10~20 nodes
MB4: deep retrieval with user-visible context expansion
```

## 10. 기본 매핑

| Layer | Procedure | Tool | Verification | Delegation | MCP | Memory |
|---|---|---|---|---|---|---|
| L0 | P0 | T0 | V0 | A0 | M0 | MB0 |
| L1 | P1 | T1/T2 | V1 | A0 | M0 | MB1 |
| L2 | P2 | T2 | V2 | A0 | M0/M1 | MB2 |
| L3 | P3 | T2/T3 | V3 | A0/A1/A2 | M1/M2 | MB3 |
| L4 | P4 | T3/T4 | V4 | A1/A2/A3 | M2/M3 | MB4 |
| L5 | P5 | T4/T5 | V5 | A3/A4 | M3/M4 | MB4+ |

## 11. Route 공개 규칙

- L0: 숨긴다.
- L1: 파일 수정/검증/tool 사용이 있으면 선택 노출.
- L2 이상: 기본 노출.
- L4 이상: 노출 + 확인.

route 공개는 사용자가 과잉 절차를 막거나, 반대로 더 강한 검증을 요구할 수 있게 하기 위한 장치다.

## 12. 좋은 route 예시

```text
Orange route: L2 · P2 · T2 · V2 · A0 · M0 · MB2
```

해석:

```text
bounded implementation이며, 작은 계획과 좁은 수정, 관련 테스트, subagent 없음, MCP 없음, 최대 3~5개 memory node만 사용한다.
```

## 13. 나쁜 route 예시

단순 개념 질문에:

```text
Orange route: L3 · P3 · T3 · V3 · A2 · M2 · MB3
```

이건 실패다. 작은 작업에 ceremony를 붙인 것이다.

## 14. Escalation 규칙

다음이면 level을 올린다.

- 원인 불명 failure
- auth/payment/security/data migration
- 테스트가 없거나 검증 불확실
- UI/runtime artifact 검증 필요
- 외부 API 최신 정보 필요
- 여러 컴포넌트 영향
- 사용자가 “철저히”, “분석해”, “리뷰해”라고 요청

다음이면 level을 내린다.

- 단순 질문
- 문구 수정
- 좁은 코드 수정
- 이미 충분한 context 제공
- 사용자가 빠른 답변을 원함

## 15. 구현 주의

route engine은 완벽한 classifier가 아니다. 처음에는 rule-based로 시작하고, trace를 쌓아 개선한다. 중요한 것은 예측 정확도보다 과잉 절차 방지와 검증 정직성이다.
