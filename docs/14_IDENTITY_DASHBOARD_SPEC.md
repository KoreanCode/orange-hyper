# Orange Hyper Identity Dashboard Spec

## 1. 기능 정의

`orange-hyper`의 identity 기능은 프로젝트가 어떻게 성장하고 있는지 보여주는 **단일 HTML 대시보드**다.

이 HTML은 Obsidian graph view처럼 프로젝트 기억을 node/edge로 시각화한다. 단, 목적은 예쁜 그래프가 아니다. 목적은 다음이다.

```text
1. 프로젝트가 어떤 기억을 쌓고 있는지 보여준다.
2. 어떤 컴포넌트/도메인에 작업이 편향되어 있는지 보여준다.
3. 검증이 부족한 영역을 보여준다.
4. stale/conflict/orphan memory를 보여준다.
5. role, MCP, verification routine의 성장 후보를 보여준다.
6. 사용자가 현재 프로젝트의 “성장 상태”를 한눈에 이해하게 한다.
```

한 문장 정의:

> Identity Dashboard는 `.orange-hyper/` memory graph와 trace를 읽어 프로젝트의 성장 상태, 편향, 위험, 검증 건강도를 단일 self-contained HTML로 보여주는 로컬 우선 시각화 산출물이다.

## 2. 제품 원칙

### 2.1 Single HTML first

초기 버전은 반드시 단일 HTML로 export한다.

```text
.orange-hyper/identity/orange-hyper.html
```

원칙:

- 네트워크 없이 열려야 한다.
- CDN 의존 금지.
- JSON data, CSS, JS를 HTML 안에 embed한다.
- deterministic하게 생성되어야 한다.
- private local memory는 기본 포함하지 않는다.

### 2.2 Dashboard is identity, not analytics vanity

대시보드는 단순 chart 모음이 아니다. 프로젝트의 현재 성격을 보여줘야 한다.

예시:

```text
이 프로젝트는 backend/auth 중심으로 성장하고 있다.
verification node가 부족하다.
Decision node는 많지만 Risk node가 적다.
Context7 MCP 제안 후보가 반복되고 있다.
UserService 주변 memory만 과밀하다.
3개 decision이 stale 상태다.
```

### 2.3 User stays light

사용자가 대시보드를 직접 편집할 필요가 없어야 한다.

사용자는 평소처럼 작업하고, 하네스는 traces와 memory graph에서 dashboard를 생성한다.

## 3. CLI 명령

권장 명령:

```bash
orange identity build
orange identity build --open
orange identity build --scope project
orange identity build --scope local --depth 2
orange identity build --redact-local
```

별칭:

```bash
orange dashboard build
```

출력:

```text
.orange-hyper/identity/orange-hyper.html
.orange-hyper/identity/state.json        # optional debug artifact
.orange-hyper/identity/summary.md        # optional text summary
```

## 4. 입력 데이터

대시보드는 다음 파일을 읽는다.

```text
.orange-hyper/
  config.yaml
  graph/
    nodes/**/*.md
    edges.jsonl
    index.json
  traces/
    route.jsonl
    token.jsonl
    verification.jsonl
  proposals/
    memory-delta/
    mcp/
    role/
  growth/
    profile.yaml
    unlocks.jsonl
```

v0.1에서는 최소 입력만 허용한다. 실제 alpha 구현은 graph rendering을 하지 않는 placeholder이며, 아래 데이터에서 count와 route distribution만 계산한다.

```text
quests/*
traces/route.jsonl
capsules/current.md
```

v0.1 placeholder가 표시하는 최소 항목:

```text
Project
Level: Seed
Active Quests count
Completed Quests count
Verified count
Unverified count
Route distribution
This project is still in Seed Kernel mode. Memory graph is not active yet.
```

## 5. Dashboard 화면 구조

```text
┌────────────────────────────────────────────────────────────┐
│ Header: Project Identity / Level / Health / Last Updated   │
├───────────────┬──────────────────────────────┬─────────────┤
│ Filters       │ Graph View                   │ Insight     │
│               │                              │ Panel       │
├───────────────┴──────────────────────────────┴─────────────┤
│ Timeline / Route Heatmap / Verification Coverage           │
└────────────────────────────────────────────────────────────┘
```

### 5.1 Header

표시 항목:

```text
Project Name
Orange Level
Dominant Class
Memory Health
Verification Health
Bias Alert Count
Last Generated At
```

### 5.2 Graph View

Obsidian-like project graph.

기능:

```text
- 전체 graph 보기
- 선택 node 중심 local graph 보기
- depth 조절
- node type filter
- edge type filter
- stale/conflict/risk 강조
- orphan node 표시
- search
```

Node type:

```text
Intent
Quest
Decision
Constraint
Component
Risk
Verification
Convention
Tool
Role
Episode
MCPProposal
```

Edge type:

```text
touches
depends_on
supersedes
conflicts_with
verified_by
caused_by
requires_tool
useful_for
stale_after
unlocks
```

### 5.3 Insight Panel

node 선택 시 오른쪽에 보여준다.

```text
Title
Type
Status
Summary
Incoming edges
Outgoing edges
Related quests
Verification evidence
Risks
Staleness
Suggested action
```

### 5.4 Timeline

프로젝트 성장 흐름을 보여준다.

```text
Quest created
Quest completed
Memory accepted
Decision superseded
Risk resolved
MCP proposed
Role proposed
Verification failed
```

### 5.5 Bias Radar

프로젝트가 어디로 치우치는지 보여준다.

축 후보:

```text
Backend
Frontend
Mobile
Infra
Docs
Testing
Security
Product
Research
Refactor
```

초기에는 고정 축보다 memory node tag 기반으로 계산한다.

## 6. 핵심 지표

### 6.1 Orange Level

프로젝트 성장 수준.

계산 예시:

```text
XP =
  accepted_memory_nodes * 2
+ completed_verified_quests * 5
+ resolved_risks * 4
+ stale_nodes_cleaned * 3
+ verification_routines_added * 3
- unresolved_conflicts * 5
- stale_high_impact_decisions * 4
```

Level mapping:

```text
Level 0: Seed
Level 1: Sprout
Level 2: Adventurer
Level 3: Specialist
Level 4: Guild
Level 5: Hyper
```

### 6.2 Memory Health

```text
accepted_nodes / total_nodes
stale_nodes / total_nodes
conflict_nodes / total_nodes
orphan_nodes / total_nodes
nodes_without_summary / total_nodes
```

### 6.3 Verification Health

```text
verified_quests / completed_quests
V0/V1/V2/V3/V4 distribution
source-only completion claims
unverified high-risk quests
verification nodes per component
```

### 6.4 Bias Score

편향은 나쁜 것이 아니다. 보이지 않는 편향이 문제다.

예시:

```text
component_focus_score = max(component_task_count) / total_task_count
verification_imbalance = components_without_verification / total_components
risk_blindness = high_change_components_without_risk_nodes
role_bias = dominant_role_events / total_role_events
```

표현:

```text
Bias: Auth module is 42% of recent memory activity.
Risk: Auth has 8 decisions but only 1 verification node.
Suggestion: Add verification routine for signup/login policy changes.
```

### 6.5 Token/Context Cost

```text
average_memory_nodes_loaded
average_capsule_tokens
mcp_context_tokens
subagent_context_tokens
trace_tokens_by_route
```

## 7. HTML State Contract

HTML 안에 다음 형태로 embed한다.

```html
<script id="orange-hyper-state" type="application/json">
{
  "schemaVersion": "0.1.0",
  "project": {
    "name": "example-project",
    "generatedAt": "2026-06-16T00:00:00+09:00",
    "orangeLevel": 2,
    "dominantClass": "backend/auth"
  },
  "nodes": [
    {
      "id": "decision.auth.signup-rejoin-policy",
      "type": "Decision",
      "title": "탈퇴 이메일 재가입 허용 정책",
      "status": "accepted",
      "tags": ["auth", "signup"],
      "summary": "Soft-deleted users may rejoin with the same email."
    }
  ],
  "edges": [
    {
      "source": "decision.auth.signup-rejoin-policy",
      "target": "component.UserService",
      "type": "touches"
    }
  ],
  "metrics": {
    "memoryHealth": {},
    "verificationHealth": {},
    "bias": {},
    "tokenCost": {}
  },
  "timeline": []
}
</script>
```

## 8. Rendering 선택

### 8.1 v0.1

Vanilla HTML/CSS/JS + SVG 또는 Canvas.

목표:

```text
- dependency 최소화
- single HTML 보장
- 작은 graph 렌더링
- CI에서 snapshot test 가능
```

### 8.2 v0.2+

선택지:

```text
D3 force: Obsidian-like force graph에 적합.
Cytoscape.js: graph analysis/filter/layout이 중요해질 때 적합.
Sigma.js: 수천 node 이상 large graph가 필요할 때 적합.
```

권장:

```text
v0.1: vanilla renderer
v0.2: bundled D3 force renderer
v0.4+: graph가 커지면 Cytoscape.js 또는 Sigma.js 검토
```

CDN은 사용하지 말고 bundle해서 single HTML에 포함한다.

## 9. Privacy / Redaction

기본 포함:

```text
shared graph nodes
accepted memory
public project traces
aggregated metrics
```

기본 제외:

```text
.orange-hyper/local/**
private user preferences
raw prompts
raw tool logs
secret-looking values
.env content
credentials
```

redaction 규칙:

```text
- key/token/secret/password 패턴 마스킹
- email/URL/path는 config에 따라 보존 또는 마스킹
- raw prompt는 기본 제외, summary만 포함
```

옵션:

```bash
orange identity build --include-raw-prompts
orange identity build --include-local
```

위 옵션은 warning과 confirmation 필요.

## 10. Acceptance Criteria

v0.1 identity 기능 완료 기준:

```text
1. orange identity build가 단일 HTML을 생성한다.
2. HTML은 네트워크 없이 열린다.
3. node/edge state가 HTML에 embed된다.
4. project summary, graph, metrics panel이 보인다.
5. private local memory는 기본 제외된다.
6. stale/conflict/orphan count가 표시된다.
7. completed quest의 verification status가 표시된다.
8. 생성 결과가 deterministic하다.
9. empty project에서도 깨지지 않는다.
10. orange doctor가 identity build 가능 여부를 검사한다.
```

## 11. 구현 단계

### Phase 1: Static Identity

```text
- state builder
- HTML template
- basic node list
- basic SVG graph
- summary cards
- no force simulation
```

### Phase 2: Obsidian-like Graph

```text
- force graph
- local depth view
- filters
- search
- node detail panel
```

### Phase 3: Bias and Health

```text
- memory health metrics
- verification health metrics
- bias radar
- risk debt
- stale decision alerts
```

### Phase 4: Growth Identity

```text
- level/class system
- role unlock candidates
- MCP proposal history
- project growth timeline
```

### Phase 5: Shareable Report

```text
- redacted export
- static docs embed
- CI artifact mode
- release report mode
```

## 12. Non-goals

Identity Dashboard는 다음을 하지 않는다.

```text
- agent 실행
- memory 자동 수정
- MCP 자동 설치
- subagent 자동 실행
- cloud sync
- telemetry upload
- full raw conversation archive
```

## 13. 한 줄 요약

Identity Dashboard는 `orange-hyper`의 얼굴이다. 프로젝트가 어떤 지식으로 자라고 있고, 어디에 치우치고 있으며, 어떤 검증 부채를 갖고 있는지 단일 HTML로 보여준다.
