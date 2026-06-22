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

Backfills should run the current workflow from `main` with the target tag as
input, for example `gh workflow run release.yml --ref main -f
tag=v1.1.0-alpha.7`. The package source, installers, manifest generation, and
binary builds still check out the selected tag, but Release asset verification
is kept inline in `.github/workflows/release.yml`. That keeps the backfill path
from depending on helper scripts that may have been added after the target tag.

npm Trusted Publisher settings must point at `.github/workflows/release.yml`.
If npm still points at the old split publish workflow filename, update that
setting rather than adding a token-based publish fallback. Existing npm package
versions are skipped during backfills so GitHub Release assets can be repaired
without republishing the same version.

## v1.1.0-alpha.7 Backfill Closeout

Status: resolved on 2026-06-19.

Current Blocking Issue: resolved. The existing `v1.1.0-alpha.7` GitHub Release
needed the required standalone assets and hosted installer smoke to be produced
by the single Release workflow without recreating the tag, creating a new
version tag, or making manual `gh release upload` part of routine release
operations.

GitHub CLI-confirmed operating evidence:

- Release: `v1.1.0-alpha.7`
- GitHub Actions run: `27802310416`
- Run status: `completed`
- Run conclusion: `success`
- Run event: `workflow_dispatch`
- Run head branch: `main`
- Run head SHA: `7acbd71bae6c27c35240b5d2473cb16e97bf1df9`
- Release URL:
  `https://github.com/KoreanCode/orange-hyper/releases/tag/v1.1.0-alpha.7`
- Actions URL:
  `https://github.com/KoreanCode/orange-hyper/actions/runs/27802310416`

Merge commits confirmed with `gh pr view`:

- PR #1 `Harden release backfill workflow`:
  `65a57e2e7f5e8faa43157852fede1b6876706149`
- PR #2 `Use supported macOS Intel runner`:
  `7eee9187c0804e3780d705350af536011478a9be`
- PR #3 `Pass repo to release asset verification`:
  `7acbd71bae6c27c35240b5d2473cb16e97bf1df9`

Required Release assets confirmed with `gh release view`:

- `install.sh`
- `install.ps1`
- `checksums.txt`
- `release-manifest.json`
- `orange-macos-arm64`
- `orange-macos-x64`
- `orange-linux-x64`
- `orange-windows-x64.exe`

Hosted installer smoke jobs confirmed successful in run `27802310416`:

- `Installer smoke linux-x64`
- `Installer smoke macos-arm64`
- `Installer smoke macos-x64`
- `Installer smoke windows-x64`

Local dogfooding used the actual hosted macOS/Linux installer URL:

```bash
curl -fsSL https://github.com/KoreanCode/orange-hyper/releases/download/v1.1.0-alpha.7/install.sh -o /private/tmp/orange-hyper-alpha7-dogfood.6e9dvp/hosted-install.sh
env HOME=/private/tmp/orange-hyper-alpha7-dogfood.6e9dvp/home ORANGE_HYPER_INSTALL_DIR=/private/tmp/orange-hyper-alpha7-dogfood.6e9dvp/home/.local/bin TMPDIR=/private/tmp/orange-hyper-alpha7-dogfood.6e9dvp sh /private/tmp/orange-hyper-alpha7-dogfood.6e9dvp/hosted-install.sh
```

The local dogfood project was a clean non-Node fixture under:

```text
/private/tmp/orange-hyper-alpha7-dogfood.6e9dvp/project-non-node
```

With PATH restricted to the installed standalone binary plus system directories,
`which node` and `which npm` returned no command. The installed standalone
reported:

- `orange --version`: `1.1.0-alpha.7`
- `orange env --json`: `distribution: "standalone"`,
  `node_runtime_embedded: true`, and the temp install path as executable

Dogfooding command results:

- `orange init --project alpha7-standalone-dogfood --json`: success,
  command id `project.init`
- `orange sync plan --json`: success, read-only, planned 8 nodes and 9 edges
- `orange sync apply --json`: success, wrote generated structure state and
  refreshed Identity
- `orange sync status --json`: success, `freshness.status: "current"`,
  `changed: false`, `identity_status: "current"`
- `orange identity build --json`: success, wrote
  `.orange-hyper/identity/orange-hyper.html` and
  `.orange-hyper/identity/summary.json`
- `orange doctor --json`: success, `data.ok: true`, no errors, no warnings

The dogfood project did not create `package.json`, `package-lock.json`, or
`node_modules` anywhere under the temp dogfood root.

Residual risks after closeout:

- Local hands-on dogfooding was performed on macOS arm64 only; Linux x64,
  macOS x64, and Windows x64 are covered by hosted GitHub Actions installer
  smoke in run `27802310416`.
- Release binaries remain unsigned at the release-signing layer; manifest
  entries must continue to report `signed: false` until a real signing key or
  certificate exists.
- The Python non-Node fixture exposed scanner metadata that still labels
  `src/app.py` and `tests/test_app.py` with `framework: "node"`. That did not
  block standalone installation, Project Sync, Identity, or Doctor, but the
  scanner label should be treated as follow-up semantic hardening rather than
  evidence that the project became an npm project.

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
- `binding status --host codex --json` works from the standalone bundle without
  creating project package files;
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
8. If npm fallback is used, specify `orange-hyper@beta` or an exact version
   such as `orange-hyper@1.1.0-beta.1`.
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
    "version": "1.1.0-beta.1",
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
