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

## 3. Commit / Ignore Policy

Root `.gitignore`는 최소 다음 항목을 독립 줄로 유지한다.

```gitignore
.DS_Store
node_modules/
dist/
build/
coverage/
.env
.env.*
.orange-hyper/capsules/
.orange-hyper/traces/
.orange-hyper/identity/
.orange-hyper/local/
.orange-hyper/proposals/memory-delta/pending/
.orange-hyper/proposals/memory-delta/rejected/
```

`orange init`은 `.orange-hyper/.gitignore`를 생성한다. 기존 프로젝트에서 init을
다시 실행하면 config나 accepted memory를 덮어쓰지 않고, legacy `proposals/`
전체 ignore만 shared memory 정책에 맞게 보강한다.

```gitignore
capsules/
traces/
identity/
local/
proposals/memory-delta/pending/
proposals/memory-delta/rejected/
```

Git에 남길 수 있는 shared memory state:

- `.orange-hyper/config.json`
- `.orange-hyper/quests/completed/*.md`
- `.orange-hyper/proposals/memory-delta/accepted/*.md`
- `.orange-hyper/graph/**`

기본 ignore 대상인 local/generated state:

- `.orange-hyper/capsules/`
- `.orange-hyper/traces/`
- `.orange-hyper/identity/`
- `.orange-hyper/local/`
- `.orange-hyper/proposals/memory-delta/pending/`
- `.orange-hyper/proposals/memory-delta/rejected/`

`config.json`과 completed Quest, accepted proposal, graph read model/node는 기본
ignore하지 않는다. Pending/rejected proposal은 local review queue다. accepted
proposal은 accepted graph node의 provenance이므로 graph node와 함께 공유되어야
한다.

공개 repo에서는 `.orange-hyper/` 전체를 무조건 commit하지 않는다. accepted
memory만 공유 가능한 project knowledge이며, public repo에 올리기 전
`orange doctor`의 public memory audit을 통과해야 한다. `project_id`는 secret이
아니지만 local path, `.env`, credential, token, secret, auth, npm token 계열
문자열은 commit하지 않는다.

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
