# Orange Hyper Provenance

This file identifies the official source and release surfaces for Orange Hyper.

## Official Source

- Source repository: https://github.com/KoreanCode/orange-hyper
- npm package: https://www.npmjs.com/package/orange-hyper
- CLI commands: `orange`, `orange-hyper`
- License: MIT
- Copyright: Copyright (c) 2026 nambanote

## Release Identity

Official releases should keep the package name `orange-hyper` and should point
back to the source repository above through package metadata, release notes, and
generated artifacts.

When publishing through npm, releases should use npm provenance or trusted
publishing where available so consumers can verify where the package was built.

## Generated Artifacts

Orange Hyper generated artifacts may include transparent origin metadata such as:

- `generated_by`
- `generator_package`
- `generator_version`
- `source_repository`
- `official_package`

These fields are informational. They help users identify the official upstream
project without restricting the MIT license.

## Unofficial Forks

Forks and modified distributions are allowed under the MIT license. Unofficial
distributions should preserve the license notice and should not represent
themselves as the official Orange Hyper release surface unless they are published
from the official source repository above.

