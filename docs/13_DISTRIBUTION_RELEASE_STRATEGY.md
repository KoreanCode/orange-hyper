# Orange Hyper Distribution And Release Strategy

## 1. Conclusion

Orange Hyper's primary user-facing distribution path is the standalone `orange`
binary.

The npm package remains available, but it is no longer the default onboarding
path for end-user projects. This protects Python, Go, Java, Rust, documentation,
and other non-Node projects from becoming accidental npm projects.

Default install policy:

```text
PATH orange -> standalone binary -> future package manager -> npx exact fallback -> manual project-local npm
```

An AI or adapter must not run:

```bash
npm init -y
npm install -D orange-hyper
```

unless the user explicitly asks for the npm path.

## 2. Distribution Channels

### 2.1 Primary: Standalone Binary

Release assets:

```text
orange-windows-x64.exe
orange-macos-arm64
orange-linux-x64
orange-macos-x64
checksums.txt
release-manifest.json
install.sh
install.ps1
```

The macOS x64 asset is experimental until it is regularly verified on a macOS
x64 runner and external user hardware.

Install locations:

```text
macOS/Linux: ~/.local/bin/orange
Windows:     $env:LOCALAPPDATA\OrangeHyper\bin\orange.exe
```

Installer requirements:

- user-local only;
- no admin privilege;
- no npm;
- no current project mutation;
- no `package.json`, `package-lock.json`, or `node_modules` creation;
- SHA-256 verification before install;
- checksum mismatch stops installation;
- rerun is idempotent.

### 2.2 Future: Package Managers

Homebrew, Scoop, and similar user-scope package managers are future convenience
channels. They must keep the same no-project-mutation policy.

### 2.3 Fallback: `npx` Exact Version

`npx` is a fallback, not the default install path.

Allowed fallback examples:

```bash
npx -y --package orange-hyper@1.1.0-alpha.7 orange --help
npx -y --package orange-hyper@alpha orange --help
```

Do not use unpinned `@latest` for alpha onboarding. It can resolve to an older
stable release and hide the intended prerelease behavior.

### 2.4 Advanced: Project-Local npm

Project-local npm install remains available only when the user explicitly asks
for a Node-project-local dependency.

```bash
npm install -D orange-hyper@1.1.0-alpha.7
```

This path is advanced/manual because it intentionally writes project npm files.

## 3. Standalone Build

The source CLI remains:

```text
bin/orange.js
src/**
```

The standalone bundle is:

```text
dist/standalone/orange.cjs
```

Build command:

```bash
npm run build:standalone
```

The bundle is CommonJS, uses Node built-ins only at runtime, and does not load
`src/**` through filesystem imports after bundling.

Node SEA binaries are generated on the matching platform runner:

```bash
npm run build:sea -- --platform linux --arch x64
```

SEA config:

```json
{
  "main": "dist/standalone/orange.cjs",
  "disableExperimentalSEAWarning": true,
  "useSnapshot": false,
  "useCodeCache": false
}
```

`useSnapshot` and `useCodeCache` stay disabled because cross-platform snapshot
or code-cache state is not portable.

## 4. Release Manifest

`release-manifest.json` has top-level `version` and an `assets` array. Each
binary asset entry includes:

- `version`
- `platform`
- `arch`
- `filename`
- `sha256`
- `download_url`
- `signed`
- `experimental`

`checksums.txt` includes every binary plus installer scripts.

## 5. CI/CD

Two release workflows stay separate:

- npm Trusted Publishing workflow: publishes the npm package through OIDC and
  npm provenance.
- Standalone binary release workflow: builds platform binaries, checksums,
  manifest, and installers, then uploads GitHub Release assets.

Standalone platform jobs:

```text
npm ci
npm test
npm run typecheck
npm run build:standalone
npm run build:sea
binary --version
binary --help
fresh temp project smoke
artifact upload
```

Release job:

```text
download binary artifacts
copy install.sh and install.ps1
generate checksums.txt
generate release-manifest.json
upload GitHub Release assets
```

## 6. Release Gates

Before tagging a standalone release, verify:

```bash
npm test
npm run typecheck
npm run check:readme-sync
git diff --check
node bin/orange.js --help
node bin/orange.js env --json
npm run build:standalone
node dist/standalone/orange.cjs --version
node dist/standalone/orange.cjs --help
npm pack --dry-run --cache /private/tmp/orange-hyper-npm-cache
```

On each platform runner, verify the binary with `PATH` stripped of `node` and
`npm`, then run a fresh non-Node project smoke:

```text
orange --version
orange --help
orange env --json
orange init --json
orange sync plan --json
orange sync apply --json
orange sync status --json
orange identity build --json
orange doctor --json
```

The smoke must leave only `.orange-hyper/` in the target project and must not
create `package.json`, `package-lock.json`, or `node_modules`.

## 7. Non-Goals

The standalone distribution foundation does not include:

- Go or Rust rewrite;
- core feature redesign;
- Identity renderer change;
- postinstall mutation;
- automatic project `package.json` mutation;
- MCP, hook, or subagent automatic execution;
- auto update.

Adapter JSON `contract_version` remains `"0.1"`.
