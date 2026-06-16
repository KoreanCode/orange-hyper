# Model Adapters and Subagents

## 1. 목표

`orange-hyper`는 특정 모델이나 특정 agent client에 종속되지 않아야 한다. Codex에서 먼저 잘 작동할 수는 있지만, core 개념은 모델 독립적이어야 한다.

## 2. Core와 Adapter 분리

```text
core/
  intent-compiler
  route-contract
  memory-graph
  context-capsule
  verification-policy
  growth-system

adapters/
  codex/
  claude-code/
  generic-cli/
  future/
```

Core는 다음을 모른다.

- Codex config 위치
- Claude Code command 형식
- MCP 설치 방식
- subagent TOML 형식
- 특정 모델명

Core는 capability만 다룬다.

## 3. Model Capability Profile

모델명 대신 capability profile로 추상화한다.

```yaml
profile_id: large_reasoning_agent
context_budget: large
reasoning_budget: high
tool_use: true
file_edit: true
subagents: true
mcp: true
max_default_layer: L4
recommended_memory_budget: MB3
```

가벼운 모델:

```yaml
profile_id: lightweight_agent
context_budget: small
reasoning_budget: low
tool_use: limited
file_edit: true
subagents: false
mcp: optional
max_default_layer: L2
recommended_memory_budget: MB1
```

## 4. 모델별 동작 원칙

좋은 모델:

- 더 깊은 L3/L4 추론 허용
- 더 많은 memory node slice 허용
- 더 복잡한 verification planning 허용
- subagent orchestration 가능

가벼운 모델:

- L0/L1/L2 중심
- memory slice 작게 유지
- L3 이상은 confirmation 요구
- 큰 설계 판단은 human-in-the-loop

## 5. Adapter Contract

각 adapter는 다음 interface를 구현한다.

```ts
interface AgentAdapter {
  name: string;
  detect(): Promise<AdapterStatus>;
  buildContextCapsule(input: CapsuleInput): Promise<string>;
  installHook?(hook: HookSpec): Promise<void>;
  suggestMcp?(proposal: McpProposal): Promise<AdapterAction>;
  createSubagentTemplate?(role: RoleNode): Promise<string>;
  readTokenUsage?(): Promise<TokenUsage | null>;
}
```

## 6. Codex Adapter 범위

Codex adapter는 다음을 제공할 수 있다.

- `AGENTS.md` snippet 생성
- `.codex/config.toml` hint 생성
- optional hook script 생성
- optional custom agent TOML template 생성
- MCP install command proposal 생성

Codex adapter가 하면 안 되는 것:

- 자동 hook 활성화
- 자동 MCP 설치
- 자동 subagent 실행
- project memory 전체 주입

## 7. Subagent 정책

Subagent는 기본값이 아니다. 성장형 capability다.

```text
A0: no delegation
A1: one read-only specialist
A2: parallel read-only lanes
A3: controlled worker split
A4: raid mode, explicit opt-in
```

## 8. Subagent를 써야 하는 경우

- 큰 PR review
- 원인 불명 버그 조사
- security/test/API/maintainability lane이 독립적인 경우
- 대형 migration 사전 분석
- 로그/문서/코드 탐색을 main thread와 분리해야 하는 경우

## 9. Subagent를 쓰면 안 되는 경우

- L0 direct answer
- 작은 문구 수정
- 단일 파일의 명확한 버그 수정
- 사용자가 빠른 답변을 원함
- write-heavy 작업이 서로 충돌할 가능성이 높음

## 10. Role Evolution

역할은 처음부터 설치하지 않는다. 반복 증거에서 role proposal을 만든다.

예시:

```yaml
proposal_id: role_20260616_backend_reviewer
role_name: spring_backend_reviewer
why_now:
  - "최근 8개 작업 중 5개가 Spring transaction/auth 변경"
  - "반복된 검토 포인트: transaction boundary, security log, integration test"
scope:
  - component.backend
  - component.auth
default_mode: read_only_review
```

## 11. Custom Agent Template 예시

```toml
name = "orange_spring_backend_reviewer"
description = "Read-only reviewer for Spring backend changes in this project."
model_reasoning_effort = "medium"
sandbox_mode = "read-only"

developer_instructions = """
Stay read-only.
Review only Spring backend changes.
Focus on correctness, transaction boundary, security, tests, and regression risk.
Return distilled evidence, not raw logs.
Do not propose broad redesign unless asked by the parent agent.
"""
```

이 파일은 자동 설치하지 않고 template/proposal로 제공한다.

## 12. Token Cost 원칙

Subagent는 main thread보다 token을 더 쓴다. 따라서 route가 A1 이상으로 올라갈 때 trace에 기록한다.

```json
{
  "delegation": "A2",
  "subagents": 3,
  "estimated_extra_tokens": 18000,
  "reason": "large PR review with independent audit lanes"
}
```

## 13. MVP 구현 범위

v0.1:

- model profile schema
- generic adapter interface
- no subagent execution

v0.2:

- Codex adapter templates
- role proposal format

v0.3:

- custom agent template generation
- token estimate for delegation

v0.4:

- adapter plugin system
