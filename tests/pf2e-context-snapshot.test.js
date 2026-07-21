import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock, assertDeepFrozen } from "./helpers/foundry-mock.js";

installFoundryMock();

const { createPf2eSelectionContext } = await import(
  "../scripts/critical-forge/adapters/pf2e/pf2e-context-adapter.js"
);

function actor({ id, name, level, hp, traits = [], conditions = [] }) {
  return {
    id,
    uuid: `Actor.${id}`,
    name,
    type: "character",
    level,
    conditions,
    system: {
      details: { level: { value: level } },
      traits: { value: traits, size: { value: "med" } },
      attributes: { hp: { value: hp.current, max: hp.max, temp: hp.temp ?? 0 } }
    }
  };
}

function token(id, actor, { x = 0, y = 0, disposition = 1 } = {}) {
  return {
    id,
    uuid: `Scene.scene.Token.${id}`,
    actor,
    x,
    y,
    document: { x, y, elevation: 0, disposition, parent: { id: "scene", uuid: "Scene.scene" } }
  };
}

test("PF2e context snapshot records actor health, conditions, and positions", () => {
  const source = actor({
    id: "hero",
    name: "Hero",
    level: 10,
    hp: { current: 40, max: 100, temp: 6 },
    traits: ["human"],
    conditions: [
      { slug: "wounded", system: { value: { value: 2 } } },
      { slug: "frightened", system: { value: { value: 1 } } }
    ]
  });
  const target = actor({ id: "dragon", name: "Dragon", level: 13, hp: { current: 200, max: 200 } });
  const sourceToken = token("hero", source, { x: 100, y: 200 });
  const targetToken = token("dragon", target, { x: 300, y: 200, disposition: -1 });

  const report = createPf2eSelectionContext({
    category: "criticalHit",
    sourceActor: source,
    targetActor: target,
    sourceToken,
    targetToken,
    hostileThreatCount: 3,
    contextTimestamp: 9001
  });

  assert.equal(report.snapshot.schemaVersion, 1);
  assert.equal(report.snapshot.capturedAt, 9001);
  assert.equal(report.snapshot.participants.source.hp.ratio, 0.4);
  assert.equal(report.snapshot.participants.source.hp.temp, 6);
  assert.equal(report.snapshot.participants.source.conditions.wounded, 2);
  assert.equal(report.snapshot.participants.source.conditions.frightened, 1);
  assert.equal(report.snapshot.participants.source.position.x, 100);
  assert.equal(report.snapshot.participants.target.level, 13);
  assert.equal(report.snapshot.battlefield.hostileThreatCount, 3);
  assert.equal(report.snapshot.battlefield.threatEvaluation, "explicit");
  assertDeepFrozen(report.snapshot);
});

test("saving-throw snapshots keep the roller and hostile origin in distinct roles", () => {
  const defender = actor({ id: "defender", name: "Defender", level: 8, hp: { current: 25, max: 50 } });
  const caster = actor({ id: "caster", name: "Caster", level: 11, hp: { current: 70, max: 70 } });

  const report = createPf2eSelectionContext({
    rollFamily: "savingThrow",
    degreeOfSuccess: 3,
    saveType: "will",
    sourceActor: defender,
    targetActor: caster
  });

  assert.equal(report.context.category, "savingThrowCriticalSuccess");
  assert.equal(report.snapshot.roles.roller, "source");
  assert.equal(report.snapshot.roles.opponent, "target");
  assert.equal(report.snapshot.participants.source.uuid, defender.uuid);
  assert.equal(report.snapshot.participants.target.uuid, caster.uuid);
  assert.equal(report.snapshot.roll.saveType, "will");
});

test("reference-only PF2e contexts still create a complete snapshot", () => {
  const report = createPf2eSelectionContext({
    message: {
      id: "message-1",
      uuid: "ChatMessage.message-1",
      timestamp: 123,
      flags: {
        pf2e: {
          context: {
            type: "attack-roll",
            outcome: "criticalSuccess",
            actor: "Actor.hero",
            target: { actor: "Actor.enemy" },
            options: []
          }
        }
      },
      rolls: []
    }
  });

  assert.equal(report.snapshot.message.uuid, "ChatMessage.message-1");
  assert.equal(report.snapshot.participants.source.uuid, "Actor.hero");
  assert.equal(report.snapshot.participants.target.uuid, "Actor.enemy");
  assert.equal(report.snapshot.battlefield.hostileThreatCount, null);
  assert.equal(report.snapshot.battlefield.threatEvaluation, "not-evaluated");
});
