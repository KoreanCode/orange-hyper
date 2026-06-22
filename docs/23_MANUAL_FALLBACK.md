# Manual Fallback

Orange Hyper는 CLI-first 도구가 아니다. 일반 사용자는 보통 CLI 명령을 직접 외우거나 반복 실행하지 않는다.

기본 사용 모델은 AI-first다. 사용자는 AI에게 평소처럼 말하고, AI/agent/adapter가 필요한 경우 `orange ... --json` kernel command를 호출한다.

이 문서는 다음 경우에만 참고한다.

- AI가 터미널이나 tool access를 갖고 있지 않다.
- 사용자가 설치 상태나 package surface를 직접 확인해야 한다.
- adapter author가 kernel command 예시를 빠르게 확인해야 한다.
- repo-local 상태를 수동으로 점검해야 하지만 `.orange-hyper/` 파일을 직접 수정해서는 안 된다.

## Quick Standalone Check

먼저 PATH에서 user-local `orange` 실행 파일을 확인한다.

```bash
orange --version
orange env --json
```

`orange env --json`의 command id는 `environment.show`이고,
`distribution`은 `standalone`, `npm`, `source` 중 하나다.

## Standalone Installation

macOS/Linux:

```bash
curl -fsSL https://github.com/KoreanCode/orange-hyper/releases/download/v1.1.0-beta.1/install.sh | sh
"$HOME/.local/bin/orange" --version
```

Windows PowerShell:

```powershell
$Installer = Join-Path $env:TEMP "orange-install.ps1"
Invoke-WebRequest "https://github.com/KoreanCode/orange-hyper/releases/download/v1.1.0-beta.1/install.ps1" -OutFile $Installer
powershell -NoProfile -ExecutionPolicy Bypass -File $Installer -Version "1.1.0-beta.1" -AddToPath
& (Join-Path $env:LOCALAPPDATA "OrangeHyper\bin\orange.exe") --version
```

Windows에서 `-AddToPath`를 사용한 뒤 새 PowerShell 창을 열면 PATH에서
`orange --version`을 실행할 수 있다. 설치기는 checksum을 검증하고 실패 시
중단한다. 설치 위치는 사용자 범위다:

```text
macOS/Linux: ~/.local/bin/orange
Windows: $env:LOCALAPPDATA\OrangeHyper\bin\orange.exe
```

설치기는 현재 프로젝트를 수정하지 않는다. `npm`, `package.json`,
`package-lock.json`, `node_modules`를 사용하지 않는다.

## npm Fallback

npm은 기본 설치가 아니다. 사용자가 명시적으로 npm fallback을 요청했을 때만
정확한 버전 또는 `@beta`를 지정한다.

```bash
npx -y --package orange-hyper@1.1.0-beta.1 orange --help
npx -y --package orange-hyper@beta orange --help
```

프로젝트에 dev dependency로 설치하는 방식은 Node 프로젝트에서 사용자가 명시적으로
요청한 경우에만 사용한다.

```bash
npm install -D orange-hyper@1.1.0-beta.1
```

## Source Checkout

repo checkout에서 직접 확인할 때는 다음처럼 실행한다.

```bash
node bin/orange.js --help
node bin/orange.js env --json
```

local linked development가 필요할 때만 다음을 사용한다.

```bash
npm link
orange --help
```

## Manual Kernel Examples

adapter는 human-readable output이 아니라 `--json` output을 파싱해야 한다. `.orange-hyper/` 파일을 직접 수정하지 말고 Orange Kernel command를 사용한다.

자주 쓰는 수동 확인 예시는 다음과 같다.

```bash
orange env --json
orange binding plan --host codex --scope user --json
orange binding install --host codex --scope user --json
orange binding status --host codex --json
orange activate plan --host codex --scope project --json
orange activate apply --host codex --scope project --json
orange activate status --host codex --json
orange quest list --json
orange route "검색 결과 정렬 버그 원인 찾아줘" --json
orange capsule --json
orange quest done <quest-id> --evidence "npm test passed" --json
orange doctor --json
orange graph list --json
orange hook preview --json
orange mcp suggest --query "Spring Security 최신 문서 확인이 필요해" --json
orange growth status --json
orange growth suggest --json
orange adapter dry-run project-status --json
orange eval snapshot --json
orange eval report --json
orange identity build --json
```

Full adapter-facing command details live in [Adapter JSON Contract](16_ADAPTER_CONTRACT.md). Adapter authors should also read [Adapter Layer](20_ADAPTER_LAYER.md).

## Project Boundary Repair

v0.2.0 project state를 v0.2.1 Project Boundary Guard 이후 상태로 확인할 때는 먼저 doctor를 실행한다.

```bash
orange doctor --json
orange doctor --repair-project-id
orange doctor
```

`--repair-project-id`는 누락된 legacy project identity만 채운다. 이미 다른 프로젝트에 속한 파일은 덮어쓰지 않는다.

## Manual Fallback Boundaries

- Manual fallback은 일반 사용자 UX가 아니다.
- Manual fallback은 runtime 확장이나 자동화 설치 절차가 아니다.
- 설치된 binary만으로 project active가 아니다.
- Host Binding은 user scope이고 Project Activation은 repo scope다.
- marketplace 등록은 plugin install, enable, hook review, operational 상태가 아니다.
- `orange activate status --host codex --json`은 project activation과 current fingerprint의 필수 lifecycle heartbeat 전까지 active를 보고하면 안 된다.
- AI는 `npm init -y`를 자동 실행하지 않는다.
- AI는 `npm install -D orange-hyper`를 기본 설치로 사용하지 않는다.
- fallback npm 명령은 `@beta` 또는 exact version을 지정한다.
- 설치 과정은 현재 프로젝트 `package.json`, `package-lock.json`,
  `node_modules`를 만들거나 수정하지 않는다.
- MCP는 자동 설치하지 않는다.
- Hook, Growth, Eval은 자동 수정이 아니라 경고와 요약으로 다룬다.
- project memory/config는 직접 파일 편집이 아니라 Orange Kernel command로만 변경한다.
