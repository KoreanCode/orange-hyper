# Release Notes

## v0.1.0

Seed Kernel stable release.

This stable release does not add new core features after `v0.1.0-alpha.4`.
It promotes the frozen Seed Kernel CLI and Adapter Contract to `0.1.0`.

- Package version is `0.1.0`.
- Adapter JSON `contract_version` remains `"0.1"` and is the stable v0.1 contract.
- Stable usage is `npx orange-hyper ...` after publish.
- Alpha usage remains `npx orange-hyper@alpha ...` for the alpha channel.
- This release keeps the Seed Kernel boundary: no Memory Graph, MCP, hooks,
  subagents, role system, auto planner, or auto execution loop.

### Stable Publish Method

`0.1.0` is stable, so publish it to npm without an explicit prerelease tag.
The npm `publish` command uses the
[`tag` config](https://docs.npmjs.com/cli/v11/commands/npm-publish#tag) to
decide which dist-tag to apply, and its default is `latest`; alpha releases
should continue to use `npm publish --tag alpha`.

Do not run the publishing commands until the release is explicitly approved.

```bash
npm version 0.1.0 --no-git-tag-version

npm test
git diff --check
node bin/orange.js --help
npm pack --dry-run --cache /private/tmp/orange-hyper-npm-cache

git add -A
git commit -m "chore: release orange-hyper v0.1.0 seed kernel stable"

git tag -a v0.1.0 -m "orange-hyper v0.1.0"
git push origin main
git push origin v0.1.0

gh release create v0.1.0 \
  --title "orange-hyper v0.1.0" \
  --notes-file RELEASE_NOTES.md

npm publish
```

After publish:

```bash
npm dist-tag ls orange-hyper
npx orange-hyper --help
```

Expected dist-tags:

```text
latest: 0.1.0
alpha: 0.1.0-alpha.4
```

### Alpha Dogfooding Evidence

The alpha channel was used to harden the stable Seed Kernel contract before
`0.1.0`:

- `v0.1.0-alpha.2` added adapter-friendly JSON output for `quest new` and
  `route --quest`.
- `v0.1.0-alpha.3` added JSON output for `capsule`, `quest done`, `doctor`, and
  `identity build`.
- `v0.1.0-alpha.4` froze the adapter envelope with `contract_version: "0.1"`,
  dot-notation command ids, and explicit stdout/stderr behavior.
- `npx orange-hyper@alpha --help` returned the Seed Kernel command list.
- `npx orange-hyper@alpha` dogfooding in a fresh temp directory verified:
  `init`, `quest new --json`, `route --json`, `capsule --json`,
  `quest done --json`, `doctor --json`, and `identity build --json`.
- The alpha dogfood JSON outputs returned `contract_version: "0.1"` with
  command ids `quest.new`, `route.show`, `capsule.build`, `quest.done`,
  `doctor.run`, and `identity.build`.
- Pre-stable package dry-run produced `orange-hyper@0.1.0`; after publish,
  `0.1.0` should become `latest` while `alpha` remains `0.1.0-alpha.4`.

## v0.1.0-alpha.4

Adapter Contract Freeze release.

- JSON success and failure envelopes now include `"contract_version": "0.1"`.
- JSON envelope `command` values now use dot notation such as `quest.new`, `route.show`, `capsule.build`, `quest.done`, `doctor.run`, and `identity.build`.
- `docs/16_ADAPTER_CONTRACT.md` now fixes stdout/stderr behavior for JSON and human modes.
- README points to the adapter contract instead of repeating JSON envelope details.
- This release keeps the v0.1 Seed Kernel scope: no Memory Graph, MCP, hooks, subagents, role system, auto planner, or auto execution loop.

## v0.1.0-alpha.3

Seed Kernel Adapter Contract release.

- `orange capsule --quest <id> --json`, `orange quest done ... --json`, `orange doctor --json`, and `orange identity build --json` now provide machine-readable output.
- JSON success payloads use the `{ ok, command, data }` envelope.
- JSON failures use the `{ ok, command, error }` envelope when the executable catches an error in `--json` mode.
- `docs/16_ADAPTER_CONTRACT.md` defines adapter rules, command examples, error shape, and exit codes.
- README clarifies that skills/adapters should call JSON mode and that users are not expected to manually drive every command long-term.

## v0.1.0-alpha.2

Seed Kernel UX/API hardening release.

- `orange quest new` now prints a copy-friendly quest id line, file path, and next kernel commands.
- `orange quest new --json` and `orange route --quest <id> --json` provide machine-readable output for skills and adapters without mixing human text.
- `orange quest done` accepts `--evidence-file <path>` for longer UTF-8 verification evidence.
- Completion now rejects evidence and `--unverified` together.
- README clarifies that the CLI is the Seed Kernel interface, not the final user experience.

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
