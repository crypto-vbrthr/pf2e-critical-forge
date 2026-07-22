import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();
const { createPf2eSelectionContext } = await import("../scripts/critical-forge/adapters/pf2e/pf2e-context-adapter.js");
const { matchCard } = await import("../scripts/critical-forge/selection/card-matcher.js");
const { normalizeCardDefinition } = await import("../scripts/critical-forge/schema/card-normalizer.js");

function makeActor(id, alliance, strikes = []) {
  return {
    id,
    uuid: `Actor.${id}`,
    name: id,
    type: alliance === "party" ? "character" : "npc",
    alliance,
    canAttack: true,
    isDead: false,
    statuses: new Set(),
    dimensions: { height: 5 },
    level: 5,
    system: {
      details: { alliance, level: { value: 5 } },
      traits: { value: [], size: { value: "med" } },
      attributes: { hp: { value: 30, max: 30, temp: 0 }, reach: { base: 5 } },
      actions: strikes.map((reach, index) => ({
        type: "strike",
        ready: true,
        item: {
          id: `${id}-strike-${index}`,
          name: `Strike ${index + 1}`,
          type: "melee",
          isMelee: true,
          reach,
          system: { traits: { value: [] }, range: null },
          isOfType(type) { return type === "melee"; }
        }
      }))
    },
    getReach({ weapon } = {}) { return weapon?.reach ?? 5; }
  };
}

function makeToken(id, actor, scene, x) {
  const document = { id, uuid: `Scene.${scene.id}.Token.${id}`, x, y: 0, width: 1, height: 1, elevation: 0, hidden: false, parent: scene, combatant: { defeated: false } };
  const result = {
    id,
    uuid: document.uuid,
    name: actor.name,
    actor,
    x,
    y: 0,
    elevation: 0,
    scene,
    document,
    combatant: document.combatant,
    checkCollision: () => false,
    getCenterPoint: () => ({ x: x + 50, y: 50, elevation: 0 })
  };
  document.object = result;
  return result;
}

test("scene-derived melee threat count unlocks a conditioned card", () => {
  const scene = { id: "selection-scene", uuid: "Scene.selection-scene", grid: { size: 100, distance: 5, units: "ft" }, tokens: [] };
  const hero = makeActor("selection-hero", "party");
  const enemyOne = makeActor("selection-enemy-1", "opposition", [5]);
  const enemyTwo = makeActor("selection-enemy-2", "opposition", [10]);
  const heroToken = makeToken("selection-hero", hero, scene, 0);
  const enemyOneToken = makeToken("selection-enemy-1", enemyOne, scene, 100);
  const enemyTwoToken = makeToken("selection-enemy-2", enemyTwo, scene, 200);
  scene.tokens = [heroToken, enemyOneToken, enemyTwoToken];

  const adapted = createPf2eSelectionContext({
    category: "criticalHit",
    sourceActor: hero,
    sourceToken: heroToken,
    sceneTokens: scene.tokens
  });
  const card = normalizeCardDefinition({
    schemaVersion: 1,
    id: "battlefield-test.surrounded",
    packId: "battlefield-test",
    category: "criticalHit",
    titleKey: "TEST.Title",
    descriptionKey: "TEST.Description",
    weight: 1,
    tags: [],
    filters: {},
    conditions: { field: "battlefield.hostileThreatCount", operator: "gte", value: 2 },
    effect: null
  });

  const result = matchCard(card, adapted.context, { snapshot: adapted.snapshot });
  assert.equal(adapted.snapshot.battlefield.hostileThreatCount, 2);
  assert.equal(result.eligible, true);
  assert.equal(result.conditionEvaluation.root.actual, 2);
});
