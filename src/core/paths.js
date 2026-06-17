import path from "node:path";

export const ORANGE_DIR = ".orange-hyper";

export function workspacePaths(cwd = process.cwd()) {
  const root = path.join(cwd, ORANGE_DIR);
  return {
    cwd,
    root,
    config: path.join(root, "config.json"),
    orangeGitignore: path.join(root, ".gitignore"),
    quests: path.join(root, "quests"),
    activeQuests: path.join(root, "quests", "active"),
    completedQuests: path.join(root, "quests", "completed"),
    capsules: path.join(root, "capsules"),
    currentCapsule: path.join(root, "capsules", "current.md"),
    proposals: path.join(root, "proposals"),
    memoryDeltaProposals: path.join(root, "proposals", "memory-delta"),
    pendingMemoryDeltaProposals: path.join(root, "proposals", "memory-delta", "pending"),
    acceptedMemoryDeltaProposals: path.join(root, "proposals", "memory-delta", "accepted"),
    rejectedMemoryDeltaProposals: path.join(root, "proposals", "memory-delta", "rejected"),
    graph: path.join(root, "graph"),
    graphNodes: path.join(root, "graph", "nodes"),
    graphDecisionNodes: path.join(root, "graph", "nodes", "decision"),
    graphConstraintNodes: path.join(root, "graph", "nodes", "constraint"),
    graphComponentNodes: path.join(root, "graph", "nodes", "component"),
    graphRiskNodes: path.join(root, "graph", "nodes", "risk"),
    graphVerificationNodes: path.join(root, "graph", "nodes", "verification"),
    graphEdges: path.join(root, "graph", "edges.jsonl"),
    graphIndex: path.join(root, "graph", "index.json"),
    identity: path.join(root, "identity"),
    identityHtml: path.join(root, "identity", "orange-hyper.html"),
    identitySummaryJson: path.join(root, "identity", "summary.json"),
    hooks: path.join(root, "hooks"),
    hookReports: path.join(root, "hooks", "reports"),
    traces: path.join(root, "traces"),
    routeTrace: path.join(root, "traces", "route.jsonl")
  };
}
