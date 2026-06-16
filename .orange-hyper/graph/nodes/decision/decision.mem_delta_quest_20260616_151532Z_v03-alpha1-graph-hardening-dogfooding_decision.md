---
schema_version: 1
project_id: project_921341cf-feb0-4009-8da6-e1d0c8131e6f
project_name: orange-hyper
id: decision.mem_delta_quest_20260616_151532Z_v03-alpha1-graph-hardening-dogfooding_decision
kind: decision
node_type: decision
status: candidate
confidence: high
created_at: 2026-06-16T15:16:08.320Z
updated_at: 2026-06-16T15:16:08.320Z
accepted_at: 2026-06-16T15:16:08.320Z
origin: memory-delta-proposal
source_proposal: mem_delta_quest_20260616_151532Z_v03-alpha1-graph-hardening-dogfooding_decision
source_quest: quest_20260616_151532Z_v03-alpha1-graph-hardening-dogfooding
source_proposal_hash: 2cd6191552cbf7fd112d779e8561954b815a480896242c843bfafce962eec28a
provenance:
  project_id: project_921341cf-feb0-4009-8da6-e1d0c8131e6f
  project_name: orange-hyper
  proposal_id: mem_delta_quest_20260616_151532Z_v03-alpha1-graph-hardening-dogfooding_decision
  source_proposal: mem_delta_quest_20260616_151532Z_v03-alpha1-graph-hardening-dogfooding_decision
  source_quest: quest_20260616_151532Z_v03-alpha1-graph-hardening-dogfooding
  accepted_at: 2026-06-16T15:16:08.320Z
  node_type: decision
  origin: memory-delta-proposal
  source_proposal_hash: 2cd6191552cbf7fd112d779e8561954b815a480896242c843bfafce962eec28a
---

# Suggested Memory Node

## Summary

Before v0.4 hook work, v0.3 graph usability must be dogfooded in the real orange-hyper repo with idempotent init, project-boundary repair, graph filters, deterministic search, readable doctor diagnostics, identity preview hardening, and accepted memory nodes.

## Evidence

- Source Quest: quest_20260616_151532Z_v03-alpha1-graph-hardening-dogfooding
- Verification status: verified
- Evidence: npm test passed: 59 tests
- Evidence: npm run check:readme-sync passed
- Evidence: git diff --check passed
- Evidence: node bin/orange.js --help passed
- Evidence: npm pack --dry-run --cache /private/tmp/orange-hyper-npm-cache passed

## Source Proposal

- Proposal: mem_delta_quest_20260616_151532Z_v03-alpha1-graph-hardening-dogfooding_decision
- File: .orange-hyper/proposals/memory-delta/accepted/mem_delta_quest_20260616_151532Z_v03-alpha1-graph-hardening-dogfooding_decision.md
