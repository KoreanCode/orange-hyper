# MCP Advisor 설계

> Historical design note. v0.5.0-alpha.0의 구현 계약은
> [docs/18_MCP_ADVISOR.md](18_MCP_ADVISOR.md)를 기준으로 한다.
> v0.5는 MCP 설치/실행/config 수정 없이 `orange mcp list/show/suggest`
> read-only proposal card까지만 제공한다.

## 1. 결론

`orange-hyper`는 MCP를 포기하지 않는다. 하지만 MCP를 기본 장착하지도 않는다. MCP는 항상 capability proposal이어야 한다.

```text
No always-on MCP.
Suggest tools only when warranted.
Install/use only after user approval.
```

## 2. 왜 역제안인가

MCP는 강력하지만 무겁다. 외부 도구는 token, latency, security, permission 표면을 늘린다. 모든 프로젝트에 모든 MCP를 켜면 하네스가 무거워진다.

따라서 하네스는 상황을 보고 다음처럼 제안해야 한다.

```md
MCP Proposal

Tool: Context7
Why now: Spring Security 최신 API 확인이 필요함
Expected benefit: version-specific docs로 잘못된 API 사용 방지
Scope: read-only docs lookup
Token impact: medium
Risk: external documentation retrieval
Use mode: once
Install/use: user approval required
```

## 3. MCP Level

```text
M0: no MCP
M1: suggest MCP only
M2: use already-installed MCP once
M3: install/use after explicit approval
M4: persistent project MCP, explicit opt-in only
```

기본값은 M0이다.

## 4. MCP 제안 조건

MCP를 제안할 만한 경우:

- 필요한 context가 repo 밖에 있음
- 데이터가 자주 바뀜
- framework/API 최신성이 중요함
- 사용자가 반복해서 외부 시스템을 수동 조회함
- 도구 사용이 pasted instruction보다 정확함
- 여러 사용자/프로젝트에서 반복 가능한 통합임

MCP를 제안하지 말아야 하는 경우:

- 안정적인 일반 개념 질문
- repo 내부 파일만 보면 충분한 작업
- 작은 문구 수정
- 사용자가 빠른 답변을 원함
- 외부 도구가 token만 늘릴 가능성이 큼

## 5. Tool Capability Catalog

`.orange/proposals/mcp/catalog.yaml` 또는 package 내 기본 catalog로 관리한다.

```yaml
tools:
  context7:
    kind: docs
    summary: "version-specific library documentation lookup"
    useful_when:
      - framework_api_freshness
      - migration_between_versions
      - hallucinated_api_risk
    default_mode: suggest_only
    risk: medium
    token_impact: medium

  github:
    kind: repository
    summary: "issues, PRs, commits, code search"
    useful_when:
      - current_pr_review
      - issue_context_needed
    default_mode: suggest_only
    risk: medium
    token_impact: medium

  sentry:
    kind: observability
    summary: "runtime errors and traces"
    useful_when:
      - production_incident
      - stacktrace_needed
    default_mode: suggest_only
    risk: high
    token_impact: high
```

## 6. Proposal Card Schema

```yaml
proposal_id: mcp_20260616_001
tool: context7
why_now: "Spring Security 6 API 확인 필요"
expected_benefit: "version-specific docs 확인"
scope: read_only_docs_lookup
risk: medium
token_impact: medium
use_mode: once
install_command: "codex mcp add context7 -- npx -y @upstash/context7-mcp"
persistent: false
requires_approval: true
```

## 7. MCP와 Memory의 관계

MCP 결과를 그대로 memory에 넣지 않는다. MCP는 evidence source이고, memory는 압축된 durable knowledge다.

흐름:

```text
MCP lookup
→ evidence extracted
→ task completed
→ memory delta proposed if durable
```

나쁜 예:

```text
Context7에서 가져온 문서 전체를 memory node로 저장
```

좋은 예:

```text
Spring Security 6에서는 SecurityFilterChain bean style을 사용한다는 project convention node 제안
```

## 8. Security 원칙

- MCP install은 항상 사용자 승인 필요.
- 외부 시스템 credential은 memory에 저장하지 않음.
- MCP 결과는 source와 timestamp를 trace에 남김.
- persistent MCP는 project config에 명시되어야 함.
- high-risk MCP는 read-only mode를 우선한다.

## 9. CLI 명령 제안

```bash
orange mcp suggest --intent intent_001
orange mcp list
orange mcp proposal show mcp_001
orange mcp accept mcp_001
orange mcp reject mcp_001
orange mcp doctor
```

## 10. UX 예시

사용자:

```text
Spring Security 6에서 oauth2Login 설정이 자꾸 안 맞아.
```

Orange Hyper:

```text
Orange MCP proposal: Context7 may help here.
Reason: framework API freshness matters for Spring Security 6.
Scope: read-only documentation lookup.
Token impact: medium.
Install/use once?
```

## 11. 실패 조건

MCP Advisor가 실패한 상태:

- 모든 작업에 MCP를 제안한다.
- MCP 설치를 자동으로 수행한다.
- MCP 결과를 과도하게 memory에 저장한다.
- MCP가 없는 경우 작업을 못 한다고 말한다.
- tool 제안이 사용자의 작은 작업을 방해한다.

## 12. MVP 구현 범위

v0.1:

- MCP 없음

v0.2:

- static MCP catalog
- proposal card generation
- no install

v0.3:

- Codex adapter install command generation
- user-approved project config update

v0.4:

- actual MCP availability detection
- token impact trace
