import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock, assertDeepFrozen } from "./helpers/foundry-mock.js";

installFoundryMock();
const { simulateDiagnosticCard } = await import("../scripts/critical-forge/diagnostics/diagnostic-simulation.js");

const card = { id: "test.card", packId: "test" };

test("diagnostic simulation validates an effect without applying documents", async () => {
  const actor = { id: "actor-1", uuid: "Actor.actor-1", name: "Hero" };
  let analyzedTarget = null;
  const result = await simulateDiagnosticCard(card, {
    input: { sourceActor: actor },
    materializeEffectFn: () => ({ target: "source", definition: { name: "Test", duration: { value: 1, unit: "rounds" }, components: [] } }),
    analyzeFn: (_definition, { target }) => {
      analyzedTarget = target;
      return { valid: true, issues: [] };
    },
    summarizeFn: () => ({ duration: "1 round", components: [] })
  });

  assert.equal(analyzedTarget, actor);
  assert.equal(result.valid, true);
  assert.equal(result.targetActorName, "Hero");
  assert.equal(result.mutatedDocuments, false);
  assertDeepFrozen(result);
});

test("diagnostic simulation keeps narrative cards safe and explicit", async () => {
  const result = await simulateDiagnosticCard(card, {
    materializeEffectFn: () => null
  });
  assert.equal(result.valid, true);
  assert.equal(result.status, "narrative-only");
  assert.equal(result.mutatedDocuments, false);
});

test("diagnostic simulation reports unresolved target roles", async () => {
  const result = await simulateDiagnosticCard(card, {
    input: {},
    materializeEffectFn: () => ({ target: "target", definition: { name: "Test", components: [] } })
  });
  assert.equal(result.valid, false);
  assert.equal(result.code, "CRITICAL_DIAGNOSTIC_SIMULATION_TARGET_UNRESOLVED");
  assert.equal(result.targetRole, "target");
});
