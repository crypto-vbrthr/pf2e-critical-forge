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

function threatScene() {
  return { id: "threat-scene", uuid: "Scene.threat-scene", grid: { size: 100, distance: 5, units: "ft" }, tokens: [] };
}

function threatActor(id, { alliance, attacks = [], canAttack = true, isDead = false } = {}) {
  return {
    id,
    uuid: `Actor.${id}`,
    name: id,
    type: alliance === "party" ? "character" : "npc",
    alliance,
    canAttack,
    isDead,
    statuses: new Set(),
    dimensions: { height: 5 },
    level: 5,
    system: {
      details: { alliance, level: { value: 5 } },
      traits: { value: [], size: { value: "med" } },
      attributes: { hp: { value: 30, max: 30, temp: 0 }, reach: { base: 5 } },
      actions: attacks.map((entry, index) => ({
        type: "strike",
        ready: entry.ready ?? true,
        item: {
          id: `${id}-strike-${index}`,
          name: entry.name ?? "Strike",
          type: "melee",
          isMelee: true,
          reach: entry.reach ?? 5,
          system: { traits: { value: [] }, range: null },
          isOfType(type) { return type === "melee"; }
        }
      }))
    },
    getReach({ weapon } = {}) { return weapon?.reach ?? 5; }
  };
}

function threatToken(id, actor, scene, { x = 0, y = 0 } = {}) {
  const document = { id, uuid: `Scene.${scene.id}.Token.${id}`, x, y, width: 1, height: 1, elevation: 0, hidden: false, parent: scene, combatant: { defeated: false } };
  const result = {
    id,
    uuid: document.uuid,
    name: actor.name,
    actor,
    x,
    y,
    elevation: 0,
    document,
    scene,
    combatant: document.combatant,
    checkCollision: () => false,
    getCenterPoint: () => ({ x: x + 50, y: y + 50, elevation: 0 })
  };
  document.object = result;
  return result;
}

test("PF2e snapshot automatically records scene-derived melee threats", () => {
  const map = threatScene();
  const hero = threatActor("hero-threat", { alliance: "party" });
  const goblin = threatActor("goblin-threat", { alliance: "opposition", attacks: [{ name: "Dogslicer", reach: 5 }] });
  const archer = threatActor("archer-threat", { alliance: "opposition", attacks: [{ name: "Dagger", reach: 5 }] });
  const heroToken = threatToken("hero-threat", hero, map, { x: 0, y: 0 });
  const goblinToken = threatToken("goblin-threat", goblin, map, { x: 100, y: 0 });
  const archerToken = threatToken("archer-threat", archer, map, { x: 300, y: 0 });
  map.tokens = [heroToken, goblinToken, archerToken];

  const report = createPf2eSelectionContext({
    category: "criticalHit",
    sourceActor: hero,
    sourceToken: heroToken,
    sceneTokens: map.tokens
  });

  assert.equal(report.snapshot.battlefield.threatEvaluation, "scene-analysis");
  assert.equal(report.snapshot.battlefield.hostileThreatCount, 1);
  assert.equal(report.snapshot.battlefield.hostileThreats.length, 2);
  assert.equal(report.snapshot.battlefield.hostileThreats.find((entry) => entry.actorId === goblin.id).counted, true);
  assert.equal(report.snapshot.battlefield.hostileThreats.find((entry) => entry.actorId === archer.id).rejectedBy.includes("out-of-reach"), true);
  assertDeepFrozen(report.snapshot);
});

test("explicit threat counts remain an authoritative compatibility override", () => {
  const map = threatScene();
  const hero = threatActor("hero-explicit", { alliance: "party" });
  const enemy = threatActor("enemy-explicit", { alliance: "opposition", attacks: [{ reach: 5 }] });
  const heroToken = threatToken("hero-explicit", hero, map);
  const enemyToken = threatToken("enemy-explicit", enemy, map, { x: 100 });

  const report = createPf2eSelectionContext({
    category: "criticalHit",
    sourceActor: hero,
    sourceToken: heroToken,
    sceneTokens: [heroToken, enemyToken],
    hostileThreatCount: 4
  });

  assert.equal(report.snapshot.battlefield.hostileThreatCount, 4);
  assert.equal(report.snapshot.battlefield.threatEvaluation, "explicit");
});
