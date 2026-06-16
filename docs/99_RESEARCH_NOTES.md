# Research Notes

이 문서는 `orange-hyper` 설계에 참고한 외부 자료와, 해당 자료에서 가져온 설계 판단을 정리한다.

## 1. Codex customization layers

Codex는 AGENTS.md, memories, skills, MCP, subagents를 서로 경쟁하는 기능이 아니라 상호 보완 layer로 설명한다. 이 관점은 `orange-hyper`가 core와 adapter를 분리하는 근거가 된다.

Design impact:

- AGENTS.md는 durable project guidance로 작게 유지한다.
- memory는 local recall layer로 본다.
- skill은 reusable workflow로 본다.
- MCP는 외부 시스템 access로 본다.
- subagent는 delegation capability로 본다.

Source:
https://developers.openai.com/codex/concepts/customization

## 2. Codex skills

Codex skills는 progressive disclosure를 사용하며, 선택된 skill의 SKILL.md만 전체 로드된다. 많은 skill이 설치되면 description budget 문제가 생긴다.

Design impact:

- `orange-hyper`는 처음부터 많은 skill/role을 만들지 않는다.
- role은 project evidence에서 unlock되는 template이어야 한다.

Source:
https://developers.openai.com/codex/skills

## 3. Codex hooks

Codex hooks는 deterministic script를 agent lifecycle에 주입할 수 있다. prompt scan, memory summary, turn stop validation 같은 용도에 적합하다.

Design impact:

- hook은 optional safety layer로만 쓴다.
- v0.1은 hook 없이 시작한다.
- hook은 workflow 강제 장치가 아니라 observe/warn/propose 역할이어야 한다.

Source:
https://developers.openai.com/codex/hooks

## 4. Codex memories

Codex memories는 prior thread의 useful context를 future work에 가져오지만, required team guidance는 AGENTS.md나 checked-in documentation에 두라고 설명한다.

Design impact:

- `orange-hyper`는 shared project memory와 local private memory를 분리한다.
- `.orange/local/`은 gitignore한다.
- 팀 규칙은 checked-in memory node 또는 docs에 둔다.

Source:
https://developers.openai.com/codex/memories

## 5. Codex subagents

Codex subagents는 explicit ask가 있을 때 spawn되며, 각 subagent가 별도 model/tool work를 하기 때문에 token을 더 쓴다. 개념 문서는 read-heavy exploration, tests, triage, summarization에는 유리하지만 write-heavy parallel work는 coordination risk가 있다고 설명한다.

Design impact:

- subagent는 기본값이 아니다.
- A1/A2는 read-only 중심이다.
- A3 이상은 explicit opt-in이다.

Sources:
https://developers.openai.com/codex/subagents
https://developers.openai.com/codex/concepts/subagents

## 6. Codex MCP best practices

Codex best practices는 context가 repo 밖에 있거나, 데이터가 자주 바뀌거나, 반복 가능한 integration이 필요할 때 MCP를 쓰라고 하며, 처음부터 모든 tool을 연결하지 말고 실제 workflow를 unlock하는 tool부터 추가하라고 설명한다.

Design impact:

- MCP는 기본 장착이 아니라 Advisor proposal이다.
- M0 기본값, M1 suggest only.

Source:
https://developers.openai.com/codex/learn/best-practices

## 7. Model Context Protocol

MCP는 AI application을 external systems에 연결하는 open-source standard이다.

Design impact:

- MCP는 포기하지 않는다.
- 그러나 permission, token, security 표면 때문에 explicit proposal로 다룬다.

Source:
https://modelcontextprotocol.io/docs/getting-started/intro

## 8. Karpathy LLM Wiki

LLM Wiki는 RAG처럼 매번 knowledge를 rediscover하는 대신, LLM이 유지하는 structured/interlinked markdown wiki를 통해 knowledge가 누적되도록 하는 pattern이다.

Design impact:

- sequential SPEC 대신 node/wiki memory 구조를 채택한다.
- memory는 raw chunk retrieval이 아니라 축적/정제된 project knowledge여야 한다.

Source:
https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f

## 9. Graphiti / Zep temporal knowledge graph

Graphiti는 AI agent를 위한 temporal context graph engine이고, Zep 논문은 facts와 relationships의 validity period를 포함하는 dynamic knowledge graph를 memory layer로 설명한다.

Design impact:

- Orange memory node는 valid_from, valid_to, stale_after, superseded_by를 가진다.
- stale memory 처리는 핵심 기능이어야 한다.

Sources:
https://github.com/getzep/graphiti
https://arxiv.org/html/2501.13956v1

## 10. codex-fable-mode v0.3에서 계승한 힌트

사용자가 제공한 v0.3 보고서에 따르면 `codex-fable-mode`는 documentation-only intent-locking operating mode를 유지했고, Visible Route Contract, Delegation Budget, verification gate, no runtime extensions를 강화했다.

Design impact:

- `orange-hyper`는 codex-fable-mode를 수정하지 않는다.
- route contract, level-based verification, delegation budget은 kernel idea로 계승한다.
- runtime harness는 별도 프로젝트인 orange-hyper에서만 다룬다.

Source:
User-provided codex-fable-mode v0.3 report.
