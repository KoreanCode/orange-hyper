import test from "node:test";
import assert from "node:assert/strict";
import { buildRouteContract, formatRouteLine, questPolicyForLayer } from "../src/core/route.js";

test("L0/L1 do not recommend quest creation by default", () => {
  assert.equal(questPolicyForLayer("L0"), "not_recommended");
  assert.equal(questPolicyForLayer("L1"), "not_recommended");
});

test("L2 recommends quests and L3 requires them", () => {
  const l2 = buildRouteContract("implement a small CLI command");
  assert.equal(l2.layer, "L2");
  assert.equal(l2.quest_policy, "recommended");

  const l3 = buildRouteContract("investigate the unknown cause of failing checkout");
  assert.equal(l3.layer, "L3");
  assert.equal(l3.quest_policy, "required");
});

test("route line is a compact public contract", () => {
  const contract = buildRouteContract("implement quest capsules", { layer: "L2" });
  assert.equal(formatRouteLine(contract), "Orange route: L2 · P2 · T2 · V2 · A0 · M0 · MB2");
});
