# Repository Scaffold

이 문서는 v0.2.0-alpha.0 Seed Kernel의 실제 저장소와 생성 파일 구조를 기준으로 한다. Memory Graph rendering, MCP, Hook, Subagent, Role Evolution, 자동 planner, 자동 execution loop는 이 버전에 포함하지 않는다.

## 1. 현재 repo 구조

```text
orange-hyper/
  bin/
    orange.js
  src/
    cli/
      index.js
    core/
      capsule.js
      config.js
      doctor.js
      frontmatter.js
      identity.js
      memory.js
      paths.js
      quest.js
      route.js
      text.js
      time.js
      yaml.js
  tests/
    quest-flow.test.js
    route.test.js
  docs/
  README.md
  LICENSE
  package.json
```

v0.2 alpha는 build step 없이 Node ESM source를 그대로 package에 포함한다. 외부 runtime dependency는 없다.

## 2. `orange init` 생성 결과

```text
.orange-hyper/
  .gitignore
  config.json
  quests/
    active/
    completed/
  capsules/
    current.md
  proposals/
    memory-delta/
      pending/
      accepted/
      rejected/
  traces/
    route.jsonl
```

`orange remember accept` 실행 후에는 다음 graph candidate artifact가 추가된다.

```text
.orange-hyper/
  graph/
    nodes/
      decision/
      constraint/
      component/
      risk/
      verification/
    edges.jsonl
    index.json
```

`orange identity build` 실행 후에는 다음 generated artifact가 추가된다.

```text
.orange-hyper/
  identity/
    orange-hyper.html
```

## 3. `.orange-hyper/.gitignore`

`orange init`은 `.orange-hyper/.gitignore`를 생성한다.

```gitignore
capsules/
traces/
proposals/
identity/
local/
```

`config.json`과 `quests/`는 기본 ignore하지 않는다. 팀이 Quest 기록을 공유할지 여부는 프로젝트 정책으로 선택한다.

## 4. package metadata

```json
{
  "name": "orange-hyper",
  "version": "0.2.0-alpha.0",
  "type": "module",
  "bin": {
    "orange": "./bin/orange.js"
  },
  "engines": {
    "node": ">=20"
  },
  "files": [
    "bin",
    "src",
    "docs",
    "RELEASE_NOTES.md",
    "README.md",
    "LICENSE"
  ]
}
```

`postinstall`은 사용하지 않는다. npm package에는 `.orange-hyper/`, `.DS_Store`, coverage, local traces, generated identity HTML, test output을 포함하지 않는다.

## 5. CLI 명령

```text
orange init
orange quest new <request>
orange quest list
orange quest show <quest-id>
orange route <request>
orange route --quest <quest-id>
orange capsule --quest <quest-id>
orange quest done <quest-id> (--evidence <text> | --unverified <reason>)
orange remember propose --quest <quest-id>
orange remember list
orange remember show <proposal-id>
orange remember accept <proposal-id>
orange remember reject <proposal-id>
orange doctor
orange identity build
```

## 6. v0.2 Release Checklist

```text
[ ] .DS_Store not tracked and not present in worktree
[ ] root .gitignore includes node/macOS/build basics
[ ] orange init creates .orange-hyper/.gitignore
[ ] node bin/orange.js --help works
[ ] quest lifecycle works
[ ] route trace is JSONL
[ ] capsule current.md generation works
[ ] quest done requires evidence or unverified reason
[ ] remember propose works only for completed L2+ quests
[ ] remember accept creates graph node provenance
[ ] remember reject does not create graph nodes
[ ] doctor catches broken Quest/frontmatter/verification state
[ ] doctor catches broken memory proposal/provenance state
[ ] path traversal selectors fail safely
[ ] identity build creates placeholder HTML with memory proposal counts
[ ] npm test passes
[ ] git diff --check passes
[ ] npm pack --dry-run excludes generated/local files
[ ] no hook/MCP/subagent/role/runtime automation/postinstall/network behavior
```
