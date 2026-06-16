# Orange Hyper 프로젝트 정의서

## 1. 프로젝트명

`orange-hyper`

## 2. 제품 정의

`orange-hyper`는 coding agent를 위한 RPG식 성장형 adaptive memory harness이다.

사용자는 평소처럼 가볍게 대화하고 작업을 요청한다. `orange-hyper`는 사용자의 요청을 Intent Capsule로 컴파일하고, 프로젝트의 기억을 sequential SPEC이 아니라 node/edge 기반 memory graph로 관리하며, 현재 작업에 필요한 memory slice만 Context Capsule로 조립한다. 작업 난이도에 따라 검증 강도를 올리고, 반복되는 작업 패턴이 실제 증거로 확인될 때만 role, MCP, subagent, loop capability를 성장시킨다.

## 3. 왜 필요한가

기존 강한 하네스는 작은 수정에도 branch 생성, SPEC 문서화, 검토, 검증, PR, 병합, 정리 loop를 요구한다. 이 구조는 큰 작업에는 안전하지만, 대부분의 작은 작업에서는 ceremony fatigue를 만든다.

반대로 완전한 하네스리스 방식은 가볍고 피로도가 낮지만, 장기 프로젝트 기억, 검증 강제력, 반복 학습, 역할 성장, tool 제안의 한계가 있다.

`orange-hyper`는 이 양극단 사이에 위치한다.

- 강한 SDD 하네스처럼 처음부터 절차를 강제하지 않는다.
- 완전한 하네스리스처럼 기억과 검증을 모델 지침에만 맡기지 않는다.
- 시작은 초보자 캐릭터처럼 가볍게 한다.
- 프로젝트를 진행하며 필요한 능력만 unlock한다.

## 4. 핵심 문제 정의

`orange-hyper`가 해결하려는 문제는 다음이다.

> 사용자가 가볍게 요청해도, agent가 의도, 제약, 기억, 검증 수준을 과대하거나 과소 해석하지 않고, 프로젝트가 진행될수록 필요한 지식과 능력만 누적하여 성장하도록 만드는 것.

## 5. 핵심 철학

### 5.1 Intent first, ceremony later

모든 작업은 SPEC 작성이 아니라 의도 컴파일에서 시작한다. 사용자의 자연어 요청을 바로 절차에 밀어 넣지 않는다. 먼저 무엇을 원하는지, 산출물은 무엇인지, 변경 범위는 어디인지, 검증은 어느 정도 필요한지 판단한다.

### 5.2 Memory as graph, not sequence

프로젝트 기억은 `SPEC-001 → SPEC-002 → SPEC-003`처럼 순차 문서로만 쌓이지 않는다. 결정, 제약, 컴포넌트, 위험, 검증, 도구, 역할을 node로 저장하고 관계를 edge로 표현한다.

### 5.3 Grow only from evidence

역할, MCP, hook, loop는 처음부터 제공하지 않는다. 반복 작업에서 실제로 유용성이 관찰될 때만 unlock한다. 프로젝트가 백엔드 중심이면 backend role이 자라고, 모바일 작업이 없으면 mobile role은 생성되지 않는다.

### 5.4 Verification by level

검증은 모든 작업에 동일하게 강제하지 않는다. 1줄 수정은 가볍게, production-risk 변경은 엄격하게 다룬다. 검증하지 않은 것은 성공이라고 말하지 않는다.

### 5.5 User stays light

사용자는 하네스를 운영하기 위해 일하지 않는다. 하네스가 사용자의 반복 설명량을 줄여야 한다. 사용자가 매번 SPEC을 관리해야 한다면 실패다.

## 6. codex-fable-mode와의 관계

`codex-fable-mode`는 documentation-only intent-locking operating mode였다. 그것은 Fable clone, provider bridge, runtime harness, automation framework가 아니며, visible route, delegation budget, verification gate 같은 작업 판단 철학을 제공했다.

`orange-hyper`는 `codex-fable-mode`를 수정한 버전이 아니다. `codex-fable-mode`의 결론을 kernel philosophy로 삼되, 별도 프로젝트에서 memory graph, minimal hook, MCP advisor, growth telemetry를 구현한다.

정확한 관계는 다음과 같다.

```text
codex-fable-mode
= 작업을 어떻게 생각하고 라우팅할 것인가

orange-hyper
= 프로젝트가 그 생각을 어떻게 기억하고 성장시킬 것인가
```

## 7. Non-goals

`orange-hyper`는 다음을 목표로 하지 않는다.

- Fable 5, Claude, Codex 같은 특정 모델의 clone
- 특정 provider bridge
- 모든 작업에 SPEC을 강제하는 SDD framework
- 모든 작업에 branch/PR/review loop를 강제하는 workflow manager
- 처음부터 모든 role을 제공하는 multi-agent zoo
- 모든 MCP를 기본 연결하는 tool bundle
- 자동으로 사용자의 repo에 대규모 설정을 주입하는 installer
- 모든 프로젝트에 같은 방법론을 강제하는 process framework

## 8. 성공 기준

`orange-hyper`가 성공했다는 기준은 다음이다.

- 사용자는 이전보다 반복 설명을 덜 한다.
- 작은 작업은 여전히 작게 끝난다.
- 큰 작업은 필요한 기억과 검증을 갖고 진행된다.
- memory가 쌓일수록 agent가 프로젝트 맥락을 더 정확히 이해한다.
- stale memory가 감지되고 갱신된다.
- MCP와 subagent는 필요할 때 제안되며 기본값이 아니다.
- role은 프로젝트 증거에서 자라며 유지보수되지 않는 role zoo가 되지 않는다.
- 토큰 사용량과 성공률을 비교할 수 있다.

## 9. Tagline 후보

- RPG-style adaptive memory harness for coding agents.
- Start light. Grow from evidence.
- Compile intent. Slice memory. Verify by level. Grow only when useful.
- A project memory harness that levels up with your codebase.

## 10. 첫 공개 버전의 제품 약속

v0.2 alpha는 완성형 하네스가 아니다. v0.2 alpha는 다음만 보장한다.

- repo-local `.orange-hyper/` 구조 생성
- Quest 생성/완료
- Route Contract 기록
- Current Capsule 생성
- Memory Delta Proposal 생성
- 사용자 accept 시 graph node 후보 생성
- Doctor 검증
- Identity placeholder count 생성
- 자동 hook 없음
- 자동 MCP 없음
- 자동 subagent 없음
