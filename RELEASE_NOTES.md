# Release Notes

## v0.1.0-alpha.0

Orange Hyper Seed Kernel의 첫 alpha 릴리즈입니다. 이 릴리즈는 강한 자동화 하네스가 아니라 repo-local Quest, Route, Capsule 기록을 남기는 최소 커널입니다.

### Included CLI

- `orange init`
- `orange quest new`
- `orange quest list`
- `orange quest show`
- `orange quest done`
- `orange route`
- `orange capsule`
- `orange doctor`
- `orange identity build`

### Core Concepts

- Quest as editable intent capsule
- Route contract as public work contract
- verified/unverified completion
- path traversal protection
- identity placeholder

### Explicitly Not Included

- hooks
- MCP
- subagents
- role evolution
- auto planner
- auto loop
- branch/PR/spec workflow enforcement
- forced Quest creation for every request
- runtime automation
- telemetry/network behavior
- postinstall mutation
- provider/model bridge
- Memory Graph rendering

### Verification Results

- `npm test`: passed, 19 tests
- `git diff --check`: passed
- CLI smoke: `node bin/orange.js --help` passed
- `npm pack --dry-run`: passed package contents check

### Manual Release Commands

Do not run these until the release is explicitly approved.

```bash
npm test
git diff --check
npm pack --dry-run
git add -A
git commit -m "chore: prepare v0.1.0-alpha.0 seed kernel release"
git tag v0.1.0-alpha.0
git push origin main
git push origin v0.1.0-alpha.0
npm publish --tag alpha
```
