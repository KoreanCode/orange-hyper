# Intent Compiler 설계

## 1. 목적

Intent Compiler는 사용자의 자연어 요청을 작업 가능한 구조로 변환한다. 목표는 사용자의 요청을 무겁게 SPEC으로 만드는 것이 아니다. 사용자의 의도, 산출물, 범위, 불확실성, 검증 필요성을 작고 명확한 `Intent Capsule`로 만드는 것이다.

## 2. 왜 SPEC이 아니라 Intent Capsule인가

SPEC은 명확하지만 시작 비용이 크다. 작은 수정도 SPEC으로 시작하면 피로도가 높아진다. Intent Capsule은 작업 전 필요한 최소 정보만 담는다.

```text
SPEC: 절차 중심 문서
Intent Capsule: 현재 작업을 위한 최소 의도 계약
```

## 3. Intent Capsule 필드

```yaml
intent_id: intent_20260616_001
raw_request: "탈퇴한 이메일도 다시 가입 가능하게 바꿔줘"
normalized_intent: "회원 탈퇴 상태의 이메일 재가입 허용"
primary_outcome: code_change
output_contract: implementation
scope_hint:
  components:
    - auth
    - user
  paths: []
constraints:
  - "OAuth 가입 흐름 영향 확인"
  - "보안 로그에 개인정보 남기지 않기"
unknowns:
  - "탈퇴 상태를 어떤 필드로 표현하는지 확인 필요"
risk_level: medium
expected_verification:
  - unit_test
  - integration_test_if_available
memory_query:
  keywords:
    - signup
    - deleted user
    - email uniqueness
  node_kinds:
    - decision
    - constraint
    - component
    - verification
```

## 4. Compile 단계

### 4.1 Normalize

사용자 표현을 작업 가능한 표현으로 정규화한다.

```text
"이거 좀 이상한데 고쳐줘"
-> normalized_intent: bug_fix, unknown cause
```

### 4.2 Output Contract 결정

다음 중 하나를 선택한다.

```text
answer
edit
implementation
review
audit
design_artifact
research
validation
clarification
```

### 4.3 Scope 추정

가능한 경우 관련 component/path를 추정한다. 확실하지 않으면 추정이라고 표시한다.

```yaml
scope_hint:
  certainty: low | medium | high
```

### 4.4 Unknowns 추출

모르는 것을 숨기지 않는다. Unknowns는 memory retrieval과 tool use의 근거가 된다.

### 4.5 Risk Level 산정

```text
low: 문서, label, 작은 refactor, local-only
medium: bounded code change, test 필요
high: auth, payment, data migration, security, production behavior
critical: destructive, irreversible, external side effect
```

## 5. Ask-or-act 규칙

Intent Compiler는 사용자를 불필요하게 막지 않아야 한다.

질문해야 하는 경우:

- destructive action
- 요구사항이 서로 충돌
- 산출물 형식이 불명확하고 잘못 선택하면 비용 큼
- 권한/보안/외부 side effect 존재

바로 행동해도 되는 경우:

- reasonable default가 있음
- 수정 범위가 작음
- 검증 가능함
- 불확실성을 작업 중 확인 가능함

## 6. Intent Confidence

```yaml
confidence:
  intent: 0.85
  scope: 0.6
  verification: 0.7
```

confidence가 낮다고 항상 질문하지 않는다. 낮은 confidence는 route, memory, verification budget을 올리는 근거가 될 수 있다.

## 7. 예시

### 예시 1: 단순 질문

사용자:

```text
@Transactional이 왜 Service에 있어야 해?
```

Intent Capsule:

```yaml
primary_outcome: answer
output_contract: answer
risk_level: low
route_hint: L0
memory_budget: MB0
verification: none
```

### 예시 2: 작은 수정

사용자:

```text
회원가입 버튼 문구를 시작하기로 바꿔줘
```

Intent Capsule:

```yaml
primary_outcome: edit
output_contract: edit
risk_level: low
route_hint: L1
memory_budget: MB1
verification: touched_surface_check
```

### 예시 3: 원인 불명 버그

사용자:

```text
결제 완료했는데 주문 상태가 계속 PENDING이야. 원인 찾아줘.
```

Intent Capsule:

```yaml
primary_outcome: investigation
output_contract: diagnosis_then_fix_if_safe
risk_level: high
route_hint: L3
memory_budget: MB3
expected_verification:
  - reproduce_or_observe
  - hypothesis_comparison
  - targeted_tests
```

## 8. Intent Compiler의 금지 행동

- 사용자의 모든 요청을 SPEC으로 확장하지 않는다.
- 단순 질문을 implementation으로 바꾸지 않는다.
- 사용자가 원하지 않은 branch/PR workflow를 시작하지 않는다.
- uncertainty를 숨기지 않는다.
- confidence가 낮다는 이유만으로 항상 질문하지 않는다.

## 9. CLI MVP

```bash
orange intent "탈퇴한 이메일도 다시 가입 가능하게 바꿔줘"
```

출력:

```text
.orange/capsules/intent_20260616_001.yaml
```

## 10. 구현 우선순위

v0.1:

- rule-based + template-based compiler
- optional LLM assisted compiler
- YAML output
- confidence 필드
- no memory write

v0.2:

- memory graph query 생성
- repeated intent pattern 학습
- route engine 연동

v0.3:

- role unlock signal 연결
- MCP proposal signal 연결
