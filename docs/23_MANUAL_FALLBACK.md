# Manual Fallback

Orange Hyper는 CLI-first 도구가 아니다. 일반 사용자는 보통 CLI 명령을 직접 외우거나 반복 실행하지 않는다.

기본 사용 모델은 AI-first다. 사용자는 AI에게 평소처럼 말하고, AI/agent/adapter가 필요한 경우 `orange ... --json` kernel command를 호출한다.

이 문서는 다음 경우에만 참고한다.

- AI가 터미널이나 tool access를 갖고 있지 않다.
- 사용자가 설치 상태나 package surface를 직접 확인해야 한다.
- adapter author가 kernel command 예시를 빠르게 확인해야 한다.
- repo-local 상태를 수동으로 점검해야 하지만 `.orange-hyper/` 파일을 직접 수정해서는 안 된다.

## Quick Package Check

Node 20 이상에서 설치 없이 package와 CLI help를 확인할 수 있다.

```bash
npx -y --package orange-hyper@latest orange --help
```

이 명령은 계속 직접 쓰라는 뜻이 아니다. 설치 이후에는 AI가 필요한 kernel command를 호출하는 흐름으로 돌아간다.

## Local Installation

프로젝트에 dev dependency로 설치한다.

```bash
npm install -D orange-hyper
```

package name은 `orange-hyper`이고 primary CLI command는 `orange`다. `orange-hyper` bin alias는 호환용이다.

## Source Checkout

repo checkout에서 직접 확인할 때는 다음처럼 실행한다.

```bash
node bin/orange.js --help
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
npx -y --package orange-hyper@latest orange quest list --json
npx -y --package orange-hyper@latest orange route "검색 결과 정렬 버그 원인 찾아줘" --json
npx -y --package orange-hyper@latest orange capsule --json
npx -y --package orange-hyper@latest orange quest done <quest-id> --evidence "npm test passed" --json
npx -y --package orange-hyper@latest orange doctor --json
npx -y --package orange-hyper@latest orange graph list --json
npx -y --package orange-hyper@latest orange hook preview --json
npx -y --package orange-hyper@latest orange mcp suggest --query "Spring Security 최신 문서 확인이 필요해" --json
npx -y --package orange-hyper@latest orange growth status --json
npx -y --package orange-hyper@latest orange growth suggest --json
npx -y --package orange-hyper@latest orange adapter dry-run project-status --json
npx -y --package orange-hyper@latest orange eval snapshot --json
npx -y --package orange-hyper@latest orange eval report --json
npx -y --package orange-hyper@latest orange identity build --json
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
- MCP는 자동 설치하지 않는다.
- Hook, Growth, Eval은 자동 수정이 아니라 경고와 요약으로 다룬다.
- project memory/config는 직접 파일 편집이 아니라 Orange Kernel command로만 변경한다.
