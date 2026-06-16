# Implementation Prompts

이 문서는 `orange-hyper`를 Codex로 구현할 때 사용할 수 있는 작업 프롬프트 모음이다.

## 1. 프로젝트 스캐폴드 생성

```md
Goal: Create the initial orange-hyper TypeScript CLI scaffold.

Identity:
Orange Hyper is an RPG-style adaptive project-memory harness for coding agents. It starts lightweight and grows only from project evidence.

Constraints:
- Do not implement hooks yet.
- Do not implement MCP yet.
- Do not implement subagents yet.
- Do not create a role zoo.
- Use file-based markdown/jsonl/yaml storage.

Tasks:
1. Create package.json, tsconfig, vitest config.
2. Create src/cli/index.ts with commander.
3. Add commands: init, intent, route, capsule, remember, trace, doctor as stubs.
4. Add tests that CLI command registration works.
5. Add README quickstart draft.

Verification:
- npm test
- npm run typecheck
```

## 2. `.orange/` init 구현

```md
Goal: Implement `orange init`.

Behavior:
- Create .orange/config.yaml.
- Create graph/nodes directories.
- Create edges.jsonl and index.json.
- Create traces/proposals/growth/local directories.
- Add .gitignore snippet suggestion but do not modify .gitignore without user approval.

Constraints:
- Deterministic output.
- Safe if run twice.
- No hooks.
- No MCP.

Verification:
- Unit tests for generated tree.
- Snapshot test for config.yaml.
```

## 3. Intent Capsule 구현

```md
Goal: Implement Intent Capsule schema and `orange intent`.

Behavior:
- Accept raw prompt as CLI input.
- Produce YAML Intent Capsule.
- Use rule-based classification first.
- Classify primary outcome: answer/edit/implementation/review/audit/research/validation/clarification.
- Include unknowns and risk_level.

Constraints:
- Do not require LLM API.
- Do not create SPEC.
- Do not write memory.

Verification:
- Test L0 conceptual question.
- Test L1 small edit.
- Test L3 unknown-cause bug.
```

## 4. Route Contract 구현

```md
Goal: Implement route engine.

Behavior:
- Input: Intent Capsule.
- Output: Route Contract with L/P/T/V/A/M/MB budgets.
- L0 should produce MB0, A0, M0.
- L2 implementation should produce MB2, V2.
- High-risk auth/payment/security should escalate.

Constraints:
- Route is a task contract, not chain-of-thought.
- Do not expose hidden reasoning.

Verification:
- Unit tests for route mapping.
- Test that small tasks do not escalate to A1/M1.
```

## 5. Memory Node 구현

```md
Goal: Implement markdown memory node parser and edge store.

Behavior:
- Parse frontmatter.
- Validate node kind.
- Read/write edges.jsonl.
- Build index.json.

Constraints:
- No vector DB.
- No graph DB.
- File-based only.

Verification:
- Parse valid node.
- Reject invalid node.
- Build index from sample nodes.
```

## 6. Context Capsule 구현

```md
Goal: Implement Context Capsule builder.

Behavior:
- Input: Intent Capsule + Route Contract + Memory Graph.
- Retrieve minimal node slice within memory budget.
- Mark stale/superseded/conflict nodes.
- Write .orange/capsules/current.md.

Constraints:
- Do not dump full memory.
- Respect MB0/MB1/MB2 budgets.

Verification:
- L0 loads no memory.
- L2 loads max 5 nodes.
- stale node is marked, not silently applied.
```

## 7. Memory Delta Proposal 구현

```md
Goal: Implement memory delta proposal flow.

Behavior:
- Create proposal markdown after task trace.
- Proposal types: decision, constraint, risk, verification, convention, tool, role.
- Support accept/reject commands.

Constraints:
- Do not auto-accept.
- Do not store secrets.

Verification:
- Proposal created.
- Accept writes node.
- Reject records rejection.
```

## 8. Token/Eval Trace 구현

```md
Goal: Implement trace writer.

Behavior:
- Record route, memory nodes loaded, estimated tokens, files touched, verification claim.
- Store in jsonl.
- Provide `orange trace list` and `orange trace show`.

Constraints:
- Do not store raw prompt by default.
- Redact obvious secrets.

Verification:
- Trace written for route/capsule command.
- Safe export omits private fields.
```

## 9. Doctor 명령 구현

```md
Goal: Implement `orange doctor`.

Checks:
- .orange structure exists.
- config valid.
- nodes valid.
- edges valid.
- index not stale.
- local directory ignored or warning.
- hooks disabled by default.
- MCP disabled by default.

Verification:
- Passing sample repo.
- Failing sample repo with clear messages.
```
