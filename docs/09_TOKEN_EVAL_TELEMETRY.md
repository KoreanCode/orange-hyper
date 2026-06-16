# Token, Eval, Telemetry 설계

## 1. 목적

`orange-hyper`는 오픈소스 프로젝트로서 “도움이 된다”를 말하려면 측정 가능해야 한다. 목표는 token을 무조건 줄이는 것이 아니라, token 대비 신호량을 높이는 것이다.

## 2. 핵심 지표

```text
signal_per_token
memory_hit_precision
stale_memory_rate
over_scope_rate
output_drift_rate
false_verification_rate
user_repetition_reduction
mcp_proposal_acceptance_rate
role_usefulness_score
```

## 3. Trace Schema

```json
{
  "trace_id": "trace_20260616_001",
  "task_id": "task_001",
  "route": "L2/P2/T2/V2/A0/M0/MB2",
  "model_profile": "large_reasoning_agent",
  "input_tokens": 1200,
  "output_tokens": 900,
  "tool_output_tokens": 600,
  "memory_tokens": 1000,
  "memory_nodes_loaded": 4,
  "mcp_calls": 0,
  "subagents": 0,
  "files_read": 5,
  "files_modified": 2,
  "verification_claimed": true,
  "verification_evidence": ["unit_test"],
  "memory_delta_proposed": 2,
  "memory_delta_accepted": 1,
  "failure_modes": []
}
```

## 4. Token Budget 기본값

```text
L0: +0~100 tokens
L1: +300~1,000 tokens
L2: +1,000~3,000 tokens
L3: +4,000~12,000 tokens
L3 + A1: +8,000~25,000 tokens
L4 + A2/MCP: +20,000~80,000+ tokens
```

이 수치는 초기 추정값이다. 실제 trace로 보정해야 한다.

## 5. A/B 평가군

```text
A: raw agent
B: codex-fable-mode style prompt only
C: orange-hyper H1 memory capsule
D: orange-hyper H2 memory graph
E: orange-hyper H3 verification hook
F: orange-hyper H4 MCP advisor
G: orange-hyper H5 role/subagent proposal
```

## 6. 평가 케이스

### 6.1 Over-scope

작은 label 수정 요청이 redesign/refactor로 커지는지 확인한다.

### 6.2 Output drift

문서/검토 요청이 구현 작업으로 drift하는지 확인한다.

### 6.3 Memory usefulness

Context Capsule이 실제 관련 node를 가져왔는지 평가한다.

### 6.4 Stale memory handling

낡은 decision을 그대로 적용하지 않고 stale 표시하는지 확인한다.

### 6.5 Verification honesty

검증하지 않은 것을 성공이라고 말하지 않는지 확인한다.

### 6.6 MCP proposal fit

MCP가 필요한 상황에만 제안되는지 확인한다.

### 6.7 Role bloat

작은 작업에 role/subagent가 과잉 개입하지 않는지 확인한다.

## 7. Scoring Rubric

각 항목 0~2점.

```text
0: failure
1: partial
2: success
```

예시:

```text
Memory hit precision
0: irrelevant nodes loaded
1: mixed relevant/noisy nodes
2: relevant minimal nodes loaded
```

## 8. Trace Privacy

- raw prompt 전문 저장은 opt-in.
- secrets redaction 필수.
- local trace와 shareable trace를 분리.
- shareable eval dataset은 synthetic task 우선.

## 9. CLI 명령

```bash
orange trace start
orange trace stop
orange trace list
orange trace export --safe
orange eval run evals/over-scope.md
orange eval compare --baseline raw --candidate orange-h1
```

## 10. Token Dashboard MVP

v0.1은 dashboard를 만들지 않는다. 대신 jsonl trace를 남긴다.

```text
.orange/traces/route.jsonl
.orange/traces/token.jsonl
.orange/traces/verification.jsonl
```

v0.3에서 markdown report 생성:

```bash
orange report tokens
```

출력:

```md
# Orange Hyper Token Report

Total tasks: 24
Average memory nodes loaded: 3.2
Average memory tokens: 840
Over-scope failures: 2
False verification failures: 0
MCP proposals accepted: 3/8
```

## 11. 성공 판단

`orange-hyper`가 성공한 경우:

- L0/L1 token overhead가 거의 없다.
- L2/L3에서 memory hit precision이 높다.
- 사용자가 반복해서 설명하는 양이 줄어든다.
- 검증 허위가 줄어든다.
- MCP 제안 acceptance가 상황에 따라 의미 있게 발생한다.

실패한 경우:

- 모든 작업에서 token overhead가 크다.
- memory가 많지만 관련성이 낮다.
- role과 MCP가 계속 과잉 제안된다.
- trace는 많지만 의사결정에 쓰이지 않는다.
