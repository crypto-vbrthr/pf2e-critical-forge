import test from "node:test";
import assert from "node:assert/strict";
import { assertDeepFrozen } from "./helpers/foundry-mock.js";
import {
  CriticalContextBuilder,
  CRITICAL_CONTEXT_SNAPSHOT_VERSION
} from "../scripts/critical-forge/context/context-builder.js";

test("context builder creates an immutable serializable snapshot", () => {
  const snapshot = new CriticalContextBuilder({
    system: "PF2E",
    provider: "Core-PF2E",
    providerVersion: "1.0.0",
    capturedAt: 1234
  })
    .setMessage({ id: "message-1", uuid: "ChatMessage.message-1", speaker: "Hero" })
    .setRoll({ category: "criticalHit", family: "attack", dieResult: 20, isNatural20: true })
    .setParticipant("source", {
      id: "hero",
      uuid: "Actor.hero",
      name: "Hero",
      level: 7,
      hp: { current: 35, max: 70, temp: 5 },
      traits: ["human", "human"]
    })
    .setRoles({ roller: "source", opponent: "target", legacySource: "source", legacyTarget: "target" })
    .setSelection({ category: "criticalHit", damageTypes: ["slashing"] })
    .build();

  assert.equal(snapshot.schemaVersion, CRITICAL_CONTEXT_SNAPSHOT_VERSION);
  assert.equal(snapshot.system, "pf2e");
  assert.equal(snapshot.provider, "core-pf2e");
  assert.equal(snapshot.participants.source.hp.ratio, 0.5);
  assert.deepEqual(snapshot.participants.source.traits, ["human"]);
  assert.equal(snapshot.roll.isNatural20, true);
  assertDeepFrozen(snapshot);
  assert.doesNotThrow(() => JSON.stringify(snapshot));
});

test("context builder clamps hit-point ratios and normalizes condition values", () => {
  const snapshot = new CriticalContextBuilder({ system: "pf2e", provider: "test" })
    .setParticipant("roller", {
      hp: { current: 120, max: 100, ratio: 1.2 },
      conditions: { wounded: 2, dying: -1, frightened: "3" }
    })
    .build();

  assert.equal(snapshot.participants.roller.hp.ratio, 1);
  assert.equal(snapshot.participants.roller.conditions.wounded, 2);
  assert.equal(snapshot.participants.roller.conditions.dying, 0);
  assert.equal(snapshot.participants.roller.conditions.frightened, 3);
});

test("context builder preserves explicit battlefield placeholders", () => {
  const snapshot = new CriticalContextBuilder({ system: "pf2e", provider: "test" })
    .setBattlefield({
      sceneUuid: "Scene.scene",
      round: 4,
      turn: 2,
      selectedTargetCount: 3,
      hostileThreatCount: null,
      threatEvaluation: "not-evaluated"
    })
    .build();

  assert.equal(snapshot.battlefield.sceneUuid, "Scene.scene");
  assert.equal(snapshot.battlefield.round, 4);
  assert.equal(snapshot.battlefield.selectedTargetCount, 3);
  assert.equal(snapshot.battlefield.hostileThreatCount, null);
  assert.equal(snapshot.battlefield.threatEvaluation, "not-evaluated");
});
