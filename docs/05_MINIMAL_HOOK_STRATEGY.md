# Minimal Hook Strategy

## 1. 결론

`orange-hyper`는 하네스 프로젝트이므로 hook을 완전히 배제할 필요는 없다. 다만 hook은 절차 강제가 아니라 안전장치여야 한다.

좋은 hook은 작고 결정적이다. 나쁜 hook은 모든 작업을 거대한 workflow로 바꾼다.

## 2. Hook 철학

```text
Hook should observe, warn, summarize, and propose.
Hook should not force ceremony by default.
```

## 3. 허용되는 hook

### 3.1 SessionStart

목적:

- `.orange-hyper/graph/index.json` 확인
- 현재 repo의 minimal Context Capsule 후보 주입
- growth profile 요약

금지:

- full memory graph 주입
- role 문서 전체 주입
- 모든 MCP 활성화

### 3.2 UserPromptSubmit

목적:

- Intent Capsule 후보 생성
- route 후보 기록
- secrets/prompt risk scan

금지:

- 자동 SPEC 생성
- 자동 branch 생성
- 자동 role spawn

### 3.3 Stop

목적:

- L2 이상인데 route가 없으면 경고
- verification claim 누락 경고
- memory delta proposal 생성
- token trace 기록

금지:

- 자동 memory accept
- 자동 commit
- 자동 PR 생성

### 3.4 PostToolUse

목적:

- 테스트/빌드 결과 요약
- verification evidence 후보 기록

금지:

- 실패를 자동으로 성공 처리
- tool output 전체를 장기 memory에 저장

## 4. 금지되는 hook 사용

```text
- 모든 작업을 SPEC으로 변환
- 모든 작업에 branch 생성
- 모든 작업에 PR loop 강제
- 모든 작업에 subagent spawn
- 모든 작업에 full memory injection
- 모든 작업에 MCP lookup
- 모든 Stop에서 LLM planner 실행
```

## 5. Hook Strictness Ladder

v0.1에서는 hook을 넣지 않아도 된다. hook을 도입할 때는 강제 수준을 단계화한다.

```text
S0: off
S1: advisory note only
S2: warning with suggested fix
S3: soft block for high-risk missing verification
S4: hard block, explicit user opt-in only
```

초기 기본값은 S1 또는 S2다. S3 이상은 high-risk 작업에만 허용한다.

## 6. Hook 이벤트별 MVP

v0.4 후보:

```text
SessionStart:
  orange capsule --session-start

Stop:
  orange doctor --turn-end
  orange remember propose --quest <completed-quest-id>
```

v0.3 후보:

```text
UserPromptSubmit:
  orange intent --from-stdin --propose-route

PostToolUse:
  orange trace tool-result --from-stdin
```

## 7. Hook 출력 형식

Hook은 장황한 문장을 출력하지 않는다.

```text
Orange check: L2 route found, verification claim missing. Suggested: add tested/not-tested summary.
```

또는:

```text
Orange memory: 2 delta proposals created. Review with `orange remember list`.
```

## 8. Hook이 프로젝트 피로도를 만들지 않게 하는 규칙

- L0/L1에는 hook noise를 최소화한다.
- 경고는 한 번만 한다.
- 사용자가 끌 수 있어야 한다.
- config로 level별 hook strictness를 제어한다.
- hook은 실패해도 작업 자체를 망치지 않아야 한다.

## 9. Config 예시

```yaml
hooks:
  enabled: false
  strictness: advisory
  session_start:
    enabled: true
    max_context_tokens: 800
  stop:
    enabled: true
    require_verification_claim_from: L2
    memory_delta_proposal: true
  user_prompt_submit:
    enabled: false
```

## 10. Hook과 Skill의 관계

- Skill은 작업 방식과 절차를 설명한다.
- Hook은 실제 실행 중 누락을 감지한다.
- Hook은 skill을 대체하지 않는다.
- Hook은 하네스의 강제력을 최소한으로 보완한다.

## 11. 첫 구현 제안

1. v0.1: hook 없음, CLI만 구현
2. v0.2: Stop hook만 optional 제공
3. v0.3: SessionStart hook optional 제공
4. v0.4: UserPromptSubmit hook optional 제공

이 순서가 안전하다. 처음부터 hook으로 시작하면 다시 강한 하네스가 된다.
