# Security Policy

## Supported Versions

| Version | Supported |
| --- | --- |
| Latest npm release | Yes |
| `main` branch | Best effort |
| Older alpha releases | No |

Orange Hyper is still an alpha project. Security fixes are prioritized for the
latest published package and the current development branch.

## Reporting a Vulnerability

Please do not open a public issue for an active vulnerability.

Use GitHub Security Advisories for this repository when possible, or contact
the maintainer through the official repository:

https://github.com/KoreanCode/orange-hyper

Include:

- affected Orange Hyper version
- Node.js version and operating system
- reproduction steps
- expected impact
- whether `.orange-hyper/` data contains secrets or private project memory

## Security Scope

Relevant issues include:

- path traversal outside `.orange-hyper/`
- unsafe parsing of Quest, proposal, graph node, or frontmatter data
- generated HTML or script injection in identity output
- accidental exposure of local memory, capsules, traces, or secrets
- npm package publishing, provenance, or official-source confusion
- future adapter, hook, or MCP behavior that runs tools without clear user approval

## Out of Scope

- social engineering
- issues requiring full local machine control before Orange Hyper runs
- spam, rate-limit-only reports, or non-actionable scanner output
- reports against unofficial forks unless the issue also affects the official source

## Disclosure

The project aims to acknowledge valid reports within 7 days and coordinate a fix
before public disclosure when practical.

