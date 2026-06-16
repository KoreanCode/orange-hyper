# Repository Scaffold

## 1. 추천 repo 구조

```text
orange-hyper/
  README.md
  LICENSE
  package.json
  tsconfig.json
  vitest.config.ts
  src/
    cli/
      index.ts
      commands/
        init.ts
        intent.ts
        route.ts
        capsule.ts
        remember.ts
        trace.ts
        doctor.ts
    core/
      intent/
        intent-capsule.ts
        intent-compiler.ts
      route/
        route-contract.ts
        route-engine.ts
      memory/
        node-schema.ts
        edge-store.ts
        index-builder.ts
        retrieval.ts
      capsule/
        context-capsule.ts
      verification/
        verification-policy.ts
      growth/
        growth-profile.ts
        unlock-rules.ts
      trace/
        trace-writer.ts
    adapters/
      codex/
        codex-adapter.ts
        templates/
      generic/
        generic-adapter.ts
    utils/
      fs.ts
      time.ts
      yaml.ts
  templates/
    orange/
      config.yaml
      gitignore.snippet
      nodes/
      examples/
  evals/
    over-scope.md
    stale-memory.md
    false-verification.md
  docs/
    PROJECT_DEFINITION.md
    ARCHITECTURE.md
    MEMORY_GRAPH.md
    ROADMAP.md
  examples/
    spring-auth/
    ui-chart/
  tests/
    intent.test.ts
    route.test.ts
    memory-node.test.ts
    edge-store.test.ts
    capsule.test.ts
    doctor.test.ts
```

## 2. `.orange/` 생성 결과

`orange init` 후 repo에 생성되는 구조:

```text
.orange/
  config.yaml
  graph/
    nodes/
      intent/
      decision/
      constraint/
      component/
      risk/
      verification/
      convention/
      tool/
      role/
      episode/
    edges.jsonl
    index.json
  capsules/
    current.md
    archive/
  traces/
    route.jsonl
    token.jsonl
    verification.jsonl
  proposals/
    memory-delta/
    mcp/
    role/
    hook/
  growth/
    profile.yaml
    unlocks.jsonl
  local/
    .gitkeep
```

## 3. 기본 `.gitignore` snippet

```gitignore
# Orange Hyper local/private state
.orange/local/
.orange/capsules/current.md
.orange/traces/*.local.jsonl
```

팀이 공유할 수 있는 것:

```text
.orange/config.yaml
.orange/graph/nodes/**
.orange/graph/edges.jsonl
.orange/graph/index.json
.orange/growth/profile.yaml
```

팀 공유 여부는 프로젝트 정책에 따라 조절한다.

## 4. config.yaml 예시

```yaml
version: 0.1
project:
  name: my-project
  default_language: ko

route:
  expose_from: L2
  default_max_layer: L3

memory:
  default_budget: MB2
  max_nodes:
    MB1: 0
    MB2: 5
    MB3: 20
    MB4: 50
  proposal_first: true

verification:
  require_claim_from: L2
  source_only_completion_allowed: false

hooks:
  enabled: false
  strictness: advisory

mcp:
  enabled: false
  proposal_only: true

subagents:
  enabled: false
  proposal_only: true

growth:
  enabled: true
  unlocks_require_approval: true
```

## 5. package.json 초안

```json
{
  "name": "orange-hyper",
  "version": "0.1.0-alpha.0",
  "description": "RPG-style adaptive project-memory harness for coding agents.",
  "type": "module",
  "bin": {
    "orange": "dist/cli/index.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "lint": "eslint src tests",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "commander": "latest",
    "zod": "latest",
    "yaml": "latest",
    "gray-matter": "latest"
  },
  "devDependencies": {
    "typescript": "latest",
    "vitest": "latest",
    "eslint": "latest"
  }
}
```

버전은 실제 개발 시 고정 버전을 선택한다.

## 6. CLI 명령 정의

```text
orange init
orange intent "<prompt>"
orange route <intent-file>
orange capsule <intent-file>
orange remember propose --from <trace-id>
orange remember list
orange remember accept <proposal-id>
orange remember reject <proposal-id>
orange trace list
orange trace show <trace-id>
orange doctor
```

v0.2 이후:

```text
orange mcp suggest <intent-file>
orange growth status
orange growth proposals
orange adapter codex export
```

## 7. 테스트 우선순위

### 7.1 Schema tests

- Intent Capsule 유효성
- Route Contract 유효성
- Memory Node frontmatter 유효성
- Edge JSONL 유효성

### 7.2 Behavior tests

- L0은 memory를 읽지 않음
- L1은 node 본문을 읽지 않음
- L2는 max 5 nodes
- stale node는 표시됨
- memory delta는 자동 accept되지 않음

### 7.3 Snapshot tests

- generated `.orange/config.yaml`
- generated Context Capsule
- generated Memory Delta proposal

## 8. 첫 README 구조

```md
# Orange Hyper

RPG-style adaptive project-memory harness for coding agents.

## Why
## Core idea
## Install
## Quick start
## How it works
## What it does not do
## Memory graph
## Growth system
## Roadmap
## License
```

## 9. License 제안

채택성을 높이려면 MIT 또는 Apache-2.0이 적절하다.

- MIT: 간단하고 채택 마찰 낮음
- Apache-2.0: patent grant 포함, 기업 친화적

하네스가 오픈소스 생태계에서 넓게 쓰이길 원하면 Apache-2.0을 우선 고려한다.

## 10. v0.1 Release Checklist

```text
[ ] npm package name 확인
[ ] orange CLI 동작
[ ] init/intent/route/capsule/remember/doctor 테스트
[ ] README quickstart 검증
[ ] .orange/local gitignore 확인
[ ] no default hook
[ ] no default MCP
[ ] no default subagent
[ ] memory proposal-first 확인
[ ] token/eval trace schema 포함
```
