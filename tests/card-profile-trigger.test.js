import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();

const {
  cardProfileMultiplier,
  resolveCardProfile
} = await import("../scripts/critical-forge/profile/card-profile.js");
const { evaluateCriticalTrigger } = await import("../scripts/critical-forge/trigger/critical-trigger-policy.js");

test("card profiles weight tone and impact independently", () => {
  const humorousLight = { tone: "humorous", impact: "light", effect: {} };
  const dramaticStrong = { tone: "dramatic", impact: "strong", effect: {} };
  assert.ok(cardProfileMultiplier(humorousLight, "relaxed") > cardProfileMultiplier(dramaticStrong, "relaxed"));
  assert.ok(cardProfileMultiplier(dramaticStrong, "brutal") > cardProfileMultiplier(humorousLight, "brutal"));
  assert.equal(resolveCardProfile("balanced").id, "balanced");
});

test("natural trigger requires both the natural die and the final critical result", () => {
  const natural20Critical = evaluateCriticalTrigger({
    context: { category: "criticalHit" },
    metadata: { degreeOfSuccess: { index: 3 }, roll: { dieResult: 20 } }
  }, { behavior: "prompt", scope: "natural" });
  assert.equal(natural20Critical.matched, true);
  assert.equal(natural20Critical.action, "prompt");

  const natural20OnlySuccess = evaluateCriticalTrigger({
    context: { category: "criticalHit" },
    metadata: { degreeOfSuccess: { index: 2 }, roll: { dieResult: 20 } }
  }, { behavior: "automatic", scope: "natural" });
  assert.equal(natural20OnlySuccess.matched, false);
  assert.equal(natural20OnlySuccess.reason, "final-result-not-critical");

  const criticalWithoutNatural20 = evaluateCriticalTrigger({
    context: { category: "criticalHit" },
    metadata: { degreeOfSuccess: { index: 3 }, roll: { dieResult: 17 } }
  }, { behavior: "automatic", scope: "natural" });
  assert.equal(criticalWithoutNatural20.matched, false);
  assert.equal(criticalWithoutNatural20.reason, "natural-result-mismatch");
});

test("natural 1 fumble policy mirrors the hit policy", () => {
  const result = evaluateCriticalTrigger({
    context: { category: "criticalFumble" },
    metadata: { degreeOfSuccess: { index: 0 }, roll: { dieResult: 1 } }
  }, { behavior: "automatic", scope: "natural" });
  assert.equal(result.matched, true);
  assert.equal(result.action, "automatic");
});
