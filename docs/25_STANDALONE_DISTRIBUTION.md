# Standalone Distribution

v1.1.0-alpha.7 makes standalone binary distribution the default user-facing
installation path for Orange Hyper.

The goal is simple: a project can use Orange Hyper without becoming a Node/npm
project. Installing Orange must not create or modify project `package.json`,
`package-lock.json`, or `node_modules`.

## Tag-Driven Release Policy

Standalone distribution is release-owned by the single GitHub Actions Release
workflow. A `v*` tag push must complete the whole release path:

1. test, typecheck, README sync, whitespace, CLI smoke, and npm pack gate;
2. platform matrix standalone binary builds;
3. workflow artifact upload for each platform binary;
4. release job download of those workflow artifacts;
5. `install.sh` and `install.ps1` copy into the release asset directory;
6. `checksums.txt` and `release-manifest.json` generation;
7. GitHub Release create-or-update;
8. Release asset upload with clobber for backfills;
9. npm publish through Trusted Publishing, skipped only when the exact version
   already exists during a backfill;
10. required Release asset verification;
11. hosted installer smoke from the actual Release asset URLs.

`workflow_dispatch` accepts a required `tag` input so an existing release such
as `v1.1.0-alpha.7` can be checked out and backfilled by the same pipeline.
Routine releases must not require manual `gh release upload`.

## Supported Assets

Supported binary assets:

- `orange-windows-x64.exe`
- `orange-macos-arm64`
- `orange-macos-x64`
- `orange-linux-x64`

`orange-macos-x64` is built and uploaded for every release. The manifest may
keep its `experimental` flag until Intel macOS coverage has enough external
validation, but it is still a required Release asset.

Release metadata assets:

- `checksums.txt`
- `release-manifest.json`
- `install.sh`
- `install.ps1`

`release-manifest.json` contains top-level `version` plus an `assets` array.
Each binary asset entry contains:

- `version`
- `platform`
- `arch`
- `filename`
- `sha256`
- `download_url`
- `signed`
- `experimental`

`signed` is `false` until release signing is backed by a real signing key or
certificate. macOS ad-hoc signing used during SEA generation is a build
requirement, not a release-signing claim.

## Bundle

The source CLI remains ESM for the npm/source channel:

```text
bin/orange.js
src/**
```

The standalone channel bundles that surface into one CommonJS file:

```text
dist/standalone/orange.cjs
```

Build command:

```bash
npm run build:standalone
```

Bundle requirements:

- no runtime npm dependency remains outside Node built-ins;
- no dynamic filesystem import is required to load `src/**`;
- the same CLI commands and JSON envelopes are preserved;
- Adapter JSON `contract_version` remains `"0.1"`.

## Node SEA

SEA binaries are built on the matching GitHub Actions runner for each platform.
Orange does not cross-build binaries locally.

Node 24 LTS SEA configuration:

```json
{
  "main": "dist/standalone/orange.cjs",
  "output": "dist/standalone/orange-<platform>-<arch>.blob",
  "disableExperimentalSEAWarning": true,
  "useSnapshot": false,
  "useCodeCache": false
}
```

`useSnapshot` and `useCodeCache` stay `false` so platform-specific binaries do
not depend on incompatible snapshot or code-cache state. The injected entry is
the bundled CommonJS file.

Build command on a target runner:

```bash
npm run build:sea -- --platform macos --arch arm64
```

The final executable must run without a user-installed `node`, `npm`, or
`node_modules`.

## Installers

### macOS/Linux

`install.sh` installs to:

```text
~/.local/bin/orange
```

Policy:

- no admin privileges;
- no current-project mutation;
- no npm usage;
- no project `package.json`, `package-lock.json`, or `node_modules`;
- SHA-256 verification before copying the binary;
- checksum mismatch stops installation;
- rerunning the installer is idempotent.

### Windows

`install.ps1` installs to:

```text
$env:LOCALAPPDATA\OrangeHyper\bin\orange.exe
```

Policy:

- no admin privileges;
- no current-project mutation;
- no npm usage;
- SHA-256 verification before copying the binary;
- checksum mismatch stops installation;
- rerunning the installer is idempotent;
- user PATH registration is shown after install and can be performed with the
  explicit `-AddToPath` option.

## AI-First Install Policy

When a user asks an AI to set up Orange Hyper, the AI should:

1. Check PATH first with `orange --version` and `orange env --json`.
2. If missing, suggest standalone binary installation.
3. Install to the user-local location only after user approval.
4. Never run `npm init -y`.
5. Never use `npm install -D orange-hyper` as the default install path.
6. Never create or modify project `package.json`, `package-lock.json`, or
   `node_modules`.
7. Use npm only when the user explicitly requests the npm path.
8. If npm fallback is used, specify `orange-hyper@alpha` or an exact version
   such as `orange-hyper@1.1.0-alpha.7`.
9. After install, run `orange init --json`, then the Project Sync recipe:
   `orange sync plan --json`, explicit user approval, `orange sync apply --json`,
   and `orange sync status --json`.

## Distribution Priority

README install order is:

1. Standalone binary
2. Future package manager channel such as Homebrew or Scoop
3. `npx` exact-version fallback
4. Project-local npm install as an advanced/manual option

The npm package is not removed. It remains the developer and fallback channel.

## Environment Command

`orange env --json` returns command id `environment.show`:

```json
{
  "ok": true,
  "contract_version": "0.1",
  "command": "environment.show",
  "data": {
    "version": "1.1.0-alpha.7",
    "distribution": "standalone",
    "executable": "/path/to/orange",
    "platform": "darwin",
    "arch": "arm64",
    "node_runtime_embedded": true,
    "project_initialized": false,
    "project_root": null
  }
}
```

`distribution` is one of:

- `standalone`
- `npm`
- `source`

## Verification

Required checks:

- standalone binary runs without `node` on PATH;
- standalone binary runs without `npm` on PATH;
- release installer smoke downloads `install.sh` or `install.ps1` from the
  actual GitHub Release URL;
- fresh non-Node project passes `init`, `sync plan`, `sync apply`,
  `sync status`, `identity build`, and `doctor`;
- fresh non-Node project creates `.orange-hyper/` only;
- no `package.json`, `package-lock.json`, or `node_modules` is created;
- npm CLI and standalone JSON envelopes remain compatible;
- installer rerun is idempotent;
- checksum mismatch blocks installation;
- current project files are not modified by installers;
- Release asset gate requires `install.sh`, `install.ps1`, `checksums.txt`,
  `release-manifest.json`, `orange-macos-arm64`, `orange-macos-x64`,
  `orange-linux-x64`, and `orange-windows-x64.exe`;
- Adapter JSON `contract_version` remains `"0.1"`.
