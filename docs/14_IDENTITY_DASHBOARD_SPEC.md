# Orange Hyper Identity Dashboard Spec

## 1. 기능 정의

`orange-hyper`의 identity 기능은 프로젝트가 어떻게 성장하고 있는지 보여주는 **단일 HTML 대시보드**다.

v0.2.0 stable의 identity 기능은 graph dashboard가 아니라 **Seed Kernel placeholder**다. 현재 기준은 `.orange-hyper/identity/orange-hyper.html` 단일 HTML에 Quest count, verification count, route distribution, memory proposal/node count, Seed mode 메시지를 보여주는 것이다.

v0.3.0 stable은 placeholder를 read-only graph preview로 확장하고 accepted
memory node detail, source columns, project-boundary summary를 보강한다. Heavy
graph engine, editor, graph state mutation은 포함하지 않는다.

v0.4 이후 후보 identity 기능은 hook preview 이후 반복 증거에 따라 더 풍부한 graph
view를 검토할 수 있다. 단, 목적은 예쁜 그래프가 아니다. 장기 목표는 다음이다.

v0.6.0 stable은 Identity Dashboard에 Growth Signal Preview summary를 제공한다.
이는 Quest, Route, accepted Memory Graph, Hook warning, MCP advisor signal을
read-only로 요약하는 섹션이며 graph editor, role system, automatic unlock
control은 포함하지 않는다.

v1.1.0-alpha.0은 Identity HTML 안의 read-only Knowledge Graph Preview를
single-HTML Knowledge Graph Dashboard로 확장한다. 이는 accepted memory node를
사용자가 시각적으로 탐색하기 위한 SVG/vanilla JS view이며, source graph state를
수정하지 않는다. Pending/rejected proposal, code dependency analysis, external
CDN, heavy graph dependency, LLM clustering, graph editing, MCP/hook/subagent
automation은 포함하지 않는다.

v1.1.0-alpha.2는 renderer 구현이 아니라 **Identity Graph Product Spec and
Redesign Plan**이다. alpha.0 결과는 dependency-free read-only graph state와
SVG preview를 증명했지만, 사용자가 기대한 brain-like full-screen Knowledge
Graph Dashboard에는 아직 도달하지 않았다.

v1.1.0-alpha.4는 Project Sync와 Identity Graph Foundation을 추가했다.
v1.1.0-alpha.5는 AI-first bootstrap, sync diff quality, role-based Structure
Graph, accepted-memory mapping, and stale Identity diagnostics를 보강한다. Identity
HTML의 first screen은 `100vw` x `100vh` full-screen dark SVG graph stage이며,
document-style report 정보는 sidebar/drawer/fallback으로 내려간다. HTML state는
`structureGraph`, `memoryGraph`, `identityGraph`를 분리한다. 기존 `sourceGraph`
는 호환 alias로 남을 수 있지만 accepted memory만 뜻한다.

현재 alpha 결과의 문제:

```text
1. HTML shell이 main max-width 중심의 document layout이다.
2. graph canvas는 100vh full-screen stage가 아니라 내부 430px preview 영역이다.
3. table/detail/report 정보가 본문에 항상 노출되어 graph-first 경험을 방해한다.
4. accepted memory node만으로는 기존 repo의 첫 sync 경험을 설명하기 어렵다.
5. keyword concept 확장은 저품질 token node를 만들 수 있으므로 alpha.5 기본값이 아니다.
```

v1.1 product decision:

```text
Primary:
  Single self-contained HTML Knowledge Graph Dashboard

Secondary:
  Export to Obsidian, JSON Canvas, orange graph JSON, or future apps

v1.1 focus:
  Single HTML brain-like Knowledge Graph Dashboard

Deferred to v1.2+:
  Explicit interoperability export commands and generated export artifacts
```

Identity HTML은 v1.1의 **primary product surface**다. Export는 generated
interoperability artifact이며 product의 기본 경험이 아니다.

v1.1 target UX:

```text
100vw x 100vh graph stage
full-screen dark neural field
hamburger sidebar
node detail drawer
search/filter drawer
no document-style main content
no always-visible table
non-graph information hidden in sidebar/drawer
graph first, report second
```

Structure graph, memory graph, identity graph는 분리한다.

```text
structureGraph:
  generated from repository structure
  stored in .orange-hyper/structure/index.json
  project root node is always present
  node types: project, module, domain, component, test, document, infrastructure, datastore
  edge types: contains, depends_on, tests, documents, configures

memoryGraph:
  accepted memory nodes only
  persisted in .orange-hyper/graph
  current-project scoped
  excludes pending/rejected proposals

identityGraph:
  structureGraph + memoryGraph composition
  project root stays central
  memory nodes connect by scope_paths or source path
  unmapped memory goes to unmapped-memory cluster
  orphaned memory goes to orphaned-memory cluster
```

Identity graph 규칙:

```text
readOnly: true
editingSupported: false
source: structure-plus-accepted-memory
pending/rejected proposals excluded
keyword concept expansion disabled by default
never written to .orange-hyper/graph
never accepted as memory automatically
```

Project Sync 규칙:

```text
orange init --json        idempotent project bootstrap
orange sync plan --json   read-only, writes nothing
user approval             required before apply
orange sync apply --json  writes generated structure state and refreshes identity
orange sync status --json read-only freshness/status

generated files:
.orange-hyper/structure/index.json
.orange-hyper/structure/status.json
```

Not in alpha.5:

```text
React/Sigma renderer migration
Obsidian/JSON Canvas export
full AST/class/function/call graph analysis
LLM-generated structure
Memory Proposal auto accept
postinstall mutation
graph editing
MCP/hook/subagent auto execution
```

Legacy visual-only derived node 규칙:

```text
displayOnly: true
derived: true
readOnly: true
never written to .orange-hyper/graph
exists only inside generated Identity HTML state
```

v1.1 alpha.5 visual node type 후보:

```text
project
module
domain
component
test
document
infrastructure
datastore
memory
memoryCluster
growthSignal optional
evalSignal optional
```

초기 alpha.5에서는 keyword concept 확장을 비활성화한다. `growthSignal`과
`evalSignal`은 optional/future display node이며 source graph node가 아니다.

Brain-like visual rules:

```text
- project root는 중심에 둔다.
- module/domain/component는 project 주변 cluster를 만든다.
- accepted memory node는 scope path가 있으면 해당 structure node에 연결한다.
- unmapped memory는 별도 cluster에 둔다.
- edge strength는 contains/configures/tests/documents/depends_on/scope relation에 따라 달라진다.
- node size는 degree/importance 기반이다.
- node color는 semantic category 기반이다.
- layout은 deterministic seed 기반이다.
```

v1.2+ export 후보:

```text
orange graph JSON
Obsidian Markdown Vault
JSON Canvas .canvas
```

Export 원칙:

```text
- export는 primary UX가 아니다.
- export는 명시 명령에서만 생성한다.
- export는 project memory를 수정하지 않는다.
- export 산출물은 generated interoperability layer다.
```

v1.1.0-alpha.5 acceptance criteria:

```text
1. first screen is full-screen graph
2. graph stage uses 100vh
3. sidebar hidden by default
4. node detail opens on click
5. table is fallback/sidebar only
6. structureGraph has project root
7. memoryGraph remains accepted memory only
8. identityGraph composes structureGraph + memoryGraph
9. no external CDN/dependency
10. no editing controls
11. pending/rejected proposals excluded
12. low-quality keyword concept nodes are absent
13. sync apply refreshes Identity HTML
14. init JSON is idempotent and reports created/preserved paths
15. sync plan/status expose added/changed/removed/unchanged diff fields
16. Structure Graph is role-based, not a flat source file list
17. Identity summary reports mapped/unmapped/orphaned accepted memory counts
18. Identity build failure leaves source state intact and reports stale diagnostics
```

v1.1 Dashboard가 HTML에 embed하는 graph state:

```text
readOnly: true
structureGraph:
  nodes: generated project structure nodes
  edges: generated structure relations
memoryGraph:
  nodes: current-project accepted memory nodes only
  edges: persisted accepted memory edges only
identityGraph:
  nodes: structure + memory + unmapped-memory cluster when needed
  edges: structure edges + memory scope edges
  edges: display-only derived relations
  deterministic seed-based force-like layout
node type / visual type
label
source quest/proposal
candidate memory summary
degree / importance
project_id
node type colors
```

v1.1 Dashboard UI 기준:

```text
full-screen dark SVG canvas
colored nodes by node type
node labels
edge lines
node size by degree
deterministic layout
node click detail panel
type filter
search box
show/hide derived nodes
show/hide labels
reset view
pan and zoom / fit-to-view
empty graph message when accepted nodes are 0
table fallback in sidebar or noscript
```

Important boundary:

> v1.1 Dashboard edges are read-only display edges derived for visualization.
> They are not persisted Memory Graph source edges and do not change
> `.orange-hyper/graph/edges.jsonl`.

이 summary는 automatic unlock UI가 아니다. Candidate를 보여주더라도 role,
tool, hook, MCP, subagent, workflow를 생성/설치/실행/변경하지 않으며,
project memory나 config도 수정하지 않는다. 사용자가 직접 `orange growth ...`
명령을 실행해 evidence를 확인하고 별도 승인 흐름을 선택해야 한다.

```text
1. 프로젝트가 어떤 기억을 쌓고 있는지 보여준다.
2. 어떤 컴포넌트/도메인에 작업이 편향되어 있는지 보여준다.
3. 검증이 부족한 영역을 보여준다.
4. stale/conflict/orphan memory를 보여준다.
5. role, MCP, verification routine의 성장 후보를 보여준다.
6. 사용자가 현재 프로젝트의 “성장 상태”를 한눈에 이해하게 한다.
```

한 문장 정의:

> v0.2 Identity Dashboard는 `.orange-hyper/` Quest, route trace, Memory Delta Proposal 상태를 읽어 Seed Kernel 상태를 단일 self-contained HTML로 보여주는 placeholder 산출물이다.

장기 정의:

> v0.3+ Identity Dashboard는 `.orange-hyper/` memory graph와 trace를 읽어 프로젝트의 성장 상태, 편향, 위험, 검증 건강도를 단일 self-contained HTML로 보여주는 로컬 우선 시각화 산출물이다.

## 2. 제품 원칙

### 2.1 Single HTML primary surface

초기 버전은 반드시 단일 HTML로 생성한다. v1.1 기준에서 이 HTML은 보조 report가
아니라 primary product surface다.

```text
.orange-hyper/identity/orange-hyper.html
```

원칙:

- 네트워크 없이 열려야 한다.
- CDN 의존 금지.
- 필요한 JSON data, CSS, JS를 HTML 안에 embed한다.
- deterministic하게 생성되어야 한다.
- private local memory는 기본 포함하지 않는다.
- first screen은 graph여야 한다.
- document-style report는 sidebar/drawer/fallback로 내려간다.

Obsidian, JSON Canvas, orange graph JSON export는 secondary interoperability
layer다. Export는 명시 명령에서만 생성하며, Identity HTML의 primary UX를
대체하지 않는다.

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

사용자는 평소처럼 작업하고, 하네스는 v0.2에서는 Quest/route trace/proposal 상태에서 placeholder를 생성하고 v0.3+에서는 traces와 memory graph에서 dashboard를 생성한다.

## 3. CLI 명령

v0.2 명령:

```bash
orange identity build
```

v0.3 stable 명령:

```bash
orange identity build
orange identity build --json
```

후속 후보 명령:

```bash
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
```

후속 후보 출력:

```text
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

v0.2에서는 최소 입력만 허용한다. 실제 stable 구현은 graph rendering을 하지 않는 placeholder이며, 아래 데이터에서 count, route distribution, Seed Kernel 상태 메시지만 계산한다.

v0.3.0 stable은 같은 단일 HTML 산출물에 current-project accepted memory node
preview를 추가한다. Graph view와 node/edge visualization은 작은 SVG/static table
수준으로 제한한다.

```text
config.json
quests/*
traces/route.jsonl
proposals/memory-delta/*
graph/index.json
graph/nodes/*
```

v0.3 stable이 표시하는 최소 항목:

```text
Project
project_id / project_name
Level: Seed
Active Quests count
Completed Quests count
Verified count
Unverified count
Route distribution
Pending Memory Proposals count
Accepted Memory Proposals count
Rejected Memory Proposals count
Accepted Memory Nodes count
Top Proposal Node Types
acceptedMemoryNodes
Node type distribution
Source quest/proposal connection table
Simple SVG node-link preview
Selected node detail panel
Graph preview is read-only
Graph editing is not supported
Growth Signal Preview summary
Growth preview is read-only
Growth level does not unlock roles/tools/hooks/MCPs/subagents/workflows
```

v1.1.0-alpha.0은 위 항목에 더해 Knowledge Graph Dashboard state와 interactive
SVG view를 포함한다. 그래도 source input은 current-project accepted graph nodes와
그 provenance에 한정된다. `graph/index.json`은 read model이고, pending/rejected
proposal은 graph node가 아니며, Identity Dashboard는 graph source state를 edit
하지 않는다.

v1.1.0-alpha.2부터 구현 기준은 sourceGraph/visualGraph 분리를 전제로 한다.
sourceGraph는 accepted memory node만 포함하고, visualGraph는 HTML 내부에서만
존재하는 display-only derived node를 추가할 수 있다.

## 5. Dashboard 화면 구조

### 5.0 v1.1 Knowledge Graph Dashboard target

v1.1의 첫 화면은 document가 아니라 full-screen graph stage다.

```text
┌────────────────────────────────────────────────────────────┐
│  full-screen dark neural field (100vw x 100vh)             │
│                                                            │
│  [hamburger]        memory / concept / source clusters     │
│                                                            │
│                         selected node -> detail drawer     │
│                                                            │
│                         search/filter drawer hidden        │
└────────────────────────────────────────────────────────────┘
```

Target structure:

```text
Graph Stage:
  primary full-screen surface
  deterministic brain-like visualGraph
  no document-style main content

Hamburger Sidebar:
  project summary
  graph legend
  non-graph report sections

Node Detail Drawer:
  opens on node click
  shows memory detail, source quest/proposal, provenance, confidence

Search/Filter Drawer:
  hidden until requested
  supports type/category/search filtering

Fallback:
  table remains available only in sidebar/fallback/no-JS mode
```

UX priority:

```text
graph first
report second
editing never
export later
```

### 5.1 Legacy/future document dashboard sketch

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

이 sketch는 early document dashboard thinking이다. v1.1 target UX supersedes it
for the Identity HTML primary surface.

### 5.2 Header

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

### 5.3 Graph View

Future graph capabilities. These are not v1.1 acceptance criteria unless they
fit the full-screen Identity HTML target without external dependencies.

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

### 5.4 Insight Panel

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

### 5.5 Timeline

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

### 5.6 Bias Radar

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

### 7.1 Source graph vs visual graph

The Identity HTML state must distinguish persisted graph source from generated
display state.

```text
sourceGraph:
  persisted project memory
  accepted memory nodes only
  no pending/rejected proposals
  no derived visual-only nodes

visualGraph:
  render-time graph state
  sourceGraph memory nodes
  + display-only derived nodes
  + display-only derived edges
  never persisted back to .orange-hyper/graph
```

Derived visual nodes must carry:

```json
{
  "displayOnly": true,
  "derived": true,
  "readOnly": true
}
```

### 7.2 Legacy/future state sketch

HTML 안에 다음 형태로 embed한다.

```html
<script id="orange-hyper-state" type="application/json">
{
  "schemaVersion": "0.3.0",
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

### 8.1 v0.2

Vanilla HTML/CSS only placeholder.

목표:

```text
- dependency 최소화
- single HTML 보장
- Quest, verification, route, memory proposal/node count만 표시
- Seed Kernel mode 메시지 표시
- CI에서 snapshot test 가능
```

제외:

```text
- SVG/Canvas node graph
- force simulation
- stale/conflict/orphan health 계산
- bias/risk health 계산
```

### 8.2 v0.3 stable

Vanilla HTML/CSS/SVG only read-only preview.

목표:

```text
- single self-contained HTML 유지
- 현재 project_id의 accepted memory node만 표시
- node type별 table
- source quest/proposal 연결 table
- 간단한 SVG node-link preview
- selected node detail panel
- Graph preview is read-only 문구 표시
- Graph editing is not supported 문구 표시
```

제외:

```text
- graph editing
- force simulation
- D3/Cytoscape/Sigma
- external source import
- automatic memory write
```

### 8.3 v1.1 renderer target and future candidates

v1.1 renderer target:

```text
single self-contained HTML
vanilla SVG/JS or canvas/SVG hybrid
no external CDN
no external dependency
no D3/Cytoscape/Sigma
no graph editing
```

Future candidates, only if graph scale and maintenance cost justify a later
version:

```text
D3 force: Obsidian-like force graph에 적합.
Cytoscape.js: graph analysis/filter/layout이 중요해질 때 적합.
Sigma.js: 수천 node 이상 large graph가 필요할 때 적합.
```

권장:

```text
v0.2: vanilla placeholder
v0.3 stable: vanilla static read-only preview
v1.1: vanilla dependency-free full-screen Knowledge Graph Dashboard
v1.2+: export/interoperability layer
v1.3+: graph scale evidence가 충분할 때만 bundled renderer 검토
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

### 10.1 v0.2 placeholder 기준

```text
1. orange identity build가 단일 HTML을 생성한다.
2. HTML은 네트워크 없이 열린다.
3. Active Quest count가 표시된다.
4. Completed Quest count가 표시된다.
5. Verified/Unverified count가 표시된다.
6. Route distribution이 표시된다.
7. Pending/Accepted/Rejected Memory Proposal count가 표시된다.
8. Accepted Memory Node count가 표시된다.
9. Top Proposal Node Types가 표시된다.
10. Seed Kernel mode 메시지가 표시된다.
11. Memory graph is not active yet 문구가 표시된다.
12. empty project에서도 깨지지 않는다.
13. 생성 결과가 deterministic하다.
```

### 10.2 v0.3 stable graph preview 기준

```text
1. `orange identity build`가 단일 HTML을 생성한다.
2. HTML state가 `orange-hyper-state` script에 embed된다.
3. `project_id`와 `project_name`이 표시된다.
4. `acceptedMemoryNodes`가 표시된다.
5. node type distribution이 표시된다.
6. source quest/proposal 연결 table이 표시된다.
7. 간단한 SVG node-link preview가 표시된다.
8. selected node detail panel이 표시된다.
9. `Graph preview is read-only`가 표시된다.
10. `Graph editing is not supported`가 표시된다.
11. pending/rejected proposal은 graph preview node로 표시되지 않는다.
12. 현재 config의 `project_id`와 일치하는 accepted node만 표시된다.
```

### 10.3 v0.3.0 stable identity preview hardening 기준

```text
1. graph summary에 현재 accepted memory node 수가 표시된다.
2. graph summary에 node type distribution이 표시된다.
3. graph summary에 project boundary active 상태가 표시된다.
4. accepted node table은 node id, type, title, source quest, source proposal을 표시한다.
5. node id는 detail section으로 이동할 수 있는 anchor 역할을 한다.
6. detail section은 candidate memory, source quest, source proposal, tags를 표시한다.
7. identity preview는 read-only이며 graph editing control을 제공하지 않는다.
8. D3, Cytoscape, heavy graph dependency를 도입하지 않는다.
9. pending/rejected proposal은 preview node로 표시하지 않는다.
10. current project_id와 다른 node는 preview node로 표시하지 않는다.
```

### 10.4 v1.1 full-screen Knowledge Graph Dashboard 기준

```text
1. first screen is full-screen graph
2. graph stage uses 100vh
3. graph stage spans 100vw
4. sidebar is hidden by default behind hamburger control
5. node detail opens on click
6. search/filter UI is hidden in a drawer until requested
7. no document-style main content is visible on first screen
8. no always-visible table is present in the main graph stage
9. table is fallback/sidebar/no-JS only
10. structureGraph includes project.root
11. memoryGraph remains accepted memory nodes only
12. identityGraph composes structureGraph and memoryGraph
13. low-quality keyword concept nodes are absent by default
14. pending/rejected proposals are excluded
15. no external CDN or dependency is introduced
16. D3/Cytoscape/Sigma are not introduced
17. no graph editing controls are present
18. export controls are absent from v1.1 primary UX
19. sync apply refreshes Identity HTML
```

## 11. 구현 단계

### Phase 0: v0.2 Seed Placeholder

```text
- single HTML template
- Quest count
- verified/unverified count
- route distribution
- memory proposal/node counts
- Seed Kernel mode notice
- no node/edge graph
```

### Phase 1: Static Graph Identity

```text
- state builder
- HTML template
- basic node list
- basic SVG graph
- summary cards
- no force simulation
```

### Phase 2: Full-screen Knowledge Graph Stage

```text
- 100vw x 100vh graph stage
- dark neural field
- structureGraph / memoryGraph / identityGraph split
- project root centered in identityGraph
- accepted memory mapped by scope path, unmapped-memory cluster, or orphaned-memory cluster
- hamburger sidebar
- node detail drawer
- search/filter drawer
- table only as fallback/sidebar
- no external dependencies
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

### Phase 5: Interoperability Export

v1.2+ 후보이며 v1.1 primary UX가 아니다.

```text
- orange graph JSON
- Obsidian Markdown Vault
- JSON Canvas .canvas
- explicit command only
- no project memory mutation
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
- Obsidian/JSON Canvas export as default UX
- export command execution during identity build
- D3/Cytoscape/Sigma dependency for v1.1
- graph editing controls
```

## 13. 한 줄 요약

Identity Dashboard는 `orange-hyper`의 얼굴이다. v1.1의 목표는 프로젝트가 어떤
지식으로 자라고 있는지 full-screen brain-like Knowledge Graph로 먼저 보여주고,
report와 export는 그 다음 계층으로 미루는 single HTML primary surface다.
