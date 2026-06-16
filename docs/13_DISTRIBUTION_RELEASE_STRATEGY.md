# Orange Hyper 배포 및 릴리즈 전략

## 1. 결론

`orange-hyper`의 1차 배포 구조는 **npm 기반 CLI**로 잡는다.

```bash
npx orange-hyper@latest init
npx orange-hyper@latest quest new "..."
npx orange-hyper@latest identity build
```

이 구조가 가장 적합한 이유는 다음이다.

- `orange-hyper`는 CLI, 로컬 파일 생성, Markdown/JSONL 처리, 단일 HTML export가 핵심이다.
- TypeScript/Node 생태계는 `npx` 기반 one-shot 실행 UX가 좋다.
- 사용자는 전역 설치 없이 바로 프로젝트에서 실험할 수 있다.
- 나중에 Codex, Claude Code, generic CLI adapter를 붙이기 쉽다.
- curl installer나 plugin 배포보다 초기에 신뢰 장벽이 낮다.

## 2. 배포 채널 결정

### 2.1 Primary: npm package

패키지명 후보:

```text
orange-hyper
```

CLI command:

```text
orange
```

`package.json` 예시:

```json
{
  "name": "orange-hyper",
  "version": "0.2.0-alpha.0",
  "type": "module",
  "bin": {
    "orange": "./bin/orange.js"
  },
  "files": [
    "bin",
    "src",
    "docs",
    "RELEASE_NOTES.md",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=20"
  }
}
```

사용 방식:

```bash
npx orange-hyper@latest init
npm i -g orange-hyper
pnpm add -D orange-hyper
```

정책:

- `postinstall` 금지.
- 자동 dotfile 수정 금지.
- `orange init`도 기본적으로 생성 파일을 명확히 보여준다.
- 위험 작업은 `--yes` 또는 명시 승인 필요.
- alpha package에는 `.orange-hyper/`, `.DS_Store`, tests, coverage, local traces, generated identity HTML을 포함하지 않는다.

### 2.2 Secondary: GitHub Releases

GitHub Release는 npm 배포의 보조 채널이다.

릴리즈에 포함할 것:

```text
- npm version/tag
- changelog
- migration notes
- generated schema files
- docs archive
- example .orange project archive
```

릴리즈 이름 예시:

```text
v0.1.0-alpha.0 — Seed Kernel
v0.1.0 — Seed Kernel Stable
v0.2.0-alpha.0 — Memory Delta Proposal
v0.3.0 — Memory Graph Usability + Identity Graph Preview
v0.4.0 — Minimal Hook Preview
v0.5.0 — MCP Advisor
```

### 2.3 Later: curl installer

`curl | sh`는 초기 주 배포 방식으로 쓰지 않는다.

이유:

- 신뢰 장벽이 높다.
- 플랫폼별 shell 차이를 처리해야 한다.
- 보안 검증, checksum, signature가 필요하다.
- `orange-hyper` 초기 목표에는 과하다.

도입 시점:

```text
v0.4 이후, 사용자가 npm 없는 환경에서 설치하고 싶다는 수요가 생겼을 때.
```

원칙:

```bash
curl -fsSL https://orange-hyper.dev/install.sh | sh
```

단, installer는 반드시 다음을 만족해야 한다.

- 실행 전 설치 대상/버전/경로 표시.
- checksum 검증.
- `--dry-run` 지원.
- shell profile 자동 수정 금지 또는 승인 필요.
- GitHub Release artifact만 다운로드.

### 2.4 Later: Codex/Claude plugin adapter

plugin은 primary 배포가 아니다. adapter다.

이유:

- `orange-hyper`의 core는 특정 agent client에 종속되면 안 된다.
- plugin은 Codex/Claude 환경에 묶인다.
- core CLI와 memory graph가 먼저 안정화되어야 한다.

권장 구조:

```bash
orange adapter codex install --dry-run
orange adapter codex install
orange adapter codex uninstall
```

생성 후보:

```text
.codex/
  agents/
  hooks/
  skills/
AGENTS.md snippet
```

정책:

- adapter 설치는 사용자 명시 승인 필요.
- hooks는 기본 off.
- MCP도 기본 off.
- adapter는 core memory graph를 읽는 역할만 한다.

## 3. 릴리즈 형식

SemVer를 사용한다.

```text
MAJOR.MINOR.PATCH
```

0.x 단계에서는 다음처럼 운용한다.

```text
0.1.x: Seed Kernel bugfix
0.2.x: Memory Graph usability
0.3.x: Identity Dashboard
0.4.x: Minimal Hooks
0.5.x: MCP Advisor
0.6.x: Role/Growth System
```

Pre-release:

```text
0.1.0-alpha.0
0.1.0-alpha.1
0.1.0-beta.0
0.1.0
```

npm dist-tag:

```text
latest: 안정 버전
next: 다음 minor beta
canary: commit 단위 실험 버전
```

예시:

```bash
npm publish --tag next
npm publish --tag latest
```

## 4. 릴리즈 게이트

릴리즈 전 반드시 통과할 기준:

```text
1. npm package dry-run 통과 및 다국어 README 포함 확인
2. CLI smoke test 통과
3. schema validation 통과
4. generated files deterministic 확인
5. doctor command 통과
6. identity html export 통과
7. no postinstall 확인
8. no network-by-default 확인
9. no auto hook/MCP/subagent 확인
10. changelog/release note 작성
```

릴리즈 전 명령 예시:

```bash
npm test
git diff --check
node bin/orange.js --help
node bin/orange.js init
node bin/orange.js quest new "회원가입 정책을 바꿔줘"
node bin/orange.js quest list
node bin/orange.js route --quest <quest-id>
node bin/orange.js capsule --quest <quest-id>
node bin/orange.js quest done <quest-id> --unverified "Manual verification is not available in seed test"
node bin/orange.js doctor
node bin/orange.js identity build
npm pack --dry-run --cache /private/tmp/orange-hyper-npm-cache
```

`npm pack --dry-run` 출력에 `README.md`, `README.en.md`,
`README.zh-CN.md`, `README.ja.md`가 모두 포함되어야 한다.

## 5. CI/CD 제안

GitHub Actions 단계:

```text
pull_request:
  - install
  - typecheck
  - lint
  - test
  - build
  - package dry-run
  - generated fixture diff check

push tag v*:
  - install
  - test
  - build
  - npm publish
  - github release
```

초기에는 완전 자동 release보다 manual approval이 낫다.

권장:

```text
v0.1~v0.2: 수동 release
v0.3 이후: release workflow 반자동
v1.0 이후: semantic-release 검토
```

## 6. Repository 구조 권장

초기에는 단일 package로 시작한다.

```text
orange-hyper/
  src/
    cli/
    core/
    storage/
    dashboard/
    adapters/
  schemas/
  templates/
  examples/
  docs/
  tests/
  package.json
```

나중에 커지면 workspace로 분리한다.

```text
packages/
  core/
  cli/
  dashboard/
  adapter-codex/
  adapter-claude/
```

초기부터 monorepo로 과하게 나누지 않는다.

## 7. 명령어 배포 UX

초기 공개 README의 설치 섹션은 이렇게 간다.

```md
## Quick start

```bash
npx orange-hyper@latest init
npx orange-hyper@latest quest new "Fix signup policy"
npx orange-hyper@latest identity build --open
```

## Local install

```bash
pnpm add -D orange-hyper
pnpm orange init
```

## Global install

```bash
npm i -g orange-hyper
orange init
```
```

## 8. 보안/신뢰 원칙

`orange-hyper`는 사용자의 repo memory를 다룬다. 따라서 설치 신뢰가 중요하다.

금지:

```text
- postinstall script
- hidden network call
- automatic telemetry
- automatic MCP install
- automatic hook install
- automatic global config mutation
- private local memory export
```

허용:

```text
- user-approved file creation
- local-first static dashboard generation
- dry-run preview
- explicit adapter install
- explicit MCP proposal
- local trace collection
```

## 9. 최종 판단

배포 우선순위:

```text
1. npm/npx CLI
2. GitHub Releases
3. adapter generator
4. curl installer
5. plugin marketplace류 배포
```

`orange-hyper`는 하네스이므로 plugin보다 CLI가 먼저다. plugin은 특정 agent client에 붙는 adapter로 남겨야 한다.
