import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock, assertDeepFrozen } from "./helpers/foundry-mock.js";

installFoundryMock();

const {
  createPf2eSelectionContext,
  PF2E_CONTEXT_ADAPTER_VERSION
} = await import("../scripts/critical-forge/adapters/pf2e/pf2e-context-adapter.js");

function actor({
  id,
  uuid = `Actor.${id}`,
  name = id,
  type = "npc",
  traits = [],
  level = 1,
  size = "med"
}) {
  return {
    id,
    uuid,
    name,
    type,
    level,
    size,
    system: {
      traits: { value: traits, size: { value: size } },
      details: { level: { value: level } }
    }
  };
}

function weapon(overrides = {}) {
  return {
    id: "weapon-1",
    uuid: "Actor.source.Item.weapon-1",
    name: "Longsword",
    type: "weapon",
    isMelee: true,
    isRanged: false,
    system: {
      category: "martial",
      group: "sword",
      baseItem: "longsword",
      damage: { damageType: "slashing" },
      range: null,
      traits: {
        value: ["versatile-p"],
        otherTags: [],
        toggles: { versatile: { selected: null }, modular: { selected: null } }
      }
    },
    ...overrides
  };
}

test("adapter creates a frozen neutral context from explicit data", () => {
  const report = createPf2eSelectionContext({
    category: "criticalHit",
    damageTypes: ["fire"],
    weaponGroups: ["bomb"],
    attackTraits: ["splash"],
    saveTypes: [],
    spellTraditions: [],
    spellTraits: [],
    sourceTraits: ["human"],
    targetTraits: ["undead"],
    requiredTags: ["elemental"]
  });

  assert.equal(report.valid, true);
  assert.deepEqual(report.context, {
    category: "criticalHit",
    damageTypes: ["fire"],
    weaponGroups: ["bomb"],
    attackTraits: ["splash"],
    saveTypes: [],
    spellTraditions: [],
    spellTraits: [],
    sourceTraits: ["human"],
    targetTraits: ["undead"],
    requiredTags: ["elemental"],
    excludedTags: []
  });
  assert.equal(report.metadata.adapterVersion, PF2E_CONTEXT_ADAPTER_VERSION);
  assertDeepFrozen(report);
});

test("adapter reads PF2e weapon, actor, and roll data", () => {
  const source = actor({ id: "source", type: "character", traits: ["human", "humanoid"], level: 8 });
  const target = actor({ id: "target", traits: ["undead"], level: 9, size: "lg" });
  const item = weapon();
  item.actor = source;

  const report = createPf2eSelectionContext({
    roll: { options: { degreeOfSuccess: 3, type: "attack-roll", identifier: "weapon-1.longsword.melee" } },
    item,
    sourceActor: source,
    targetActor: target
  });

  assert.equal(report.valid, true);
  assert.equal(report.context.category, "criticalHit");
  assert.deepEqual(report.context.damageTypes, ["slashing"]);
  assert.deepEqual(report.context.weaponGroups, ["sword"]);
  assert.deepEqual(report.context.attackTraits, ["versatile-p", "melee"]);
  assert.deepEqual(report.context.sourceTraits, ["human", "humanoid"]);
  assert.deepEqual(report.context.targetTraits, ["undead"]);
  assert.equal(report.metadata.source.level, 8);
  assert.equal(report.metadata.target.size, "lg");
  assert.equal(report.metadata.attack.category, "martial");
  assert.equal(report.metadata.attack.isMelee, true);
  assert.equal(report.metadata.roll.type, "attack-roll");
});

test("selected versatile or modular damage replaces the weapon base damage type", () => {
  const item = weapon();
  item.system.traits.toggles.versatile.selected = "piercing";

  const report = createPf2eSelectionContext({ category: "criticalHit", item });
  assert.deepEqual(report.context.damageTypes, ["piercing"]);
  assert.equal(report.metadata.attack.selectedDamageType, "piercing");
});

test("adapter reads all NPC melee damage types", () => {
  const item = {
    id: "jaws",
    uuid: "Actor.dragon.Item.jaws",
    name: "Jaws",
    type: "melee",
    isMelee: true,
    system: {
      traits: { value: ["reach-10"], otherTags: [] },
      range: null,
      damageRolls: {
        first: { damage: "2d10+8", damageType: "piercing" },
        second: { damage: "1d6", damageType: "fire" }
      }
    }
  };

  const report = createPf2eSelectionContext({ category: "criticalHit", item });
  assert.deepEqual(report.context.damageTypes, ["piercing", "fire"]);
  assert.deepEqual(report.context.attackTraits, ["reach-10", "melee"]);
});

test("chat roll options provide a fallback when documents are unavailable", () => {
  const message = {
    flags: {
      pf2e: {
        context: {
          type: "attack-roll",
          outcome: "criticalSuccess",
          options: [
            "item:damage:type:fire",
            "item:group:bomb",
            "item:trait:agile",
            "self:trait:human",
            "target:trait:undead"
          ],
          actor: "Actor.source",
          token: "Scene.scene.Token.source",
          target: {
            actor: "Actor.target",
            token: "Scene.scene.Token.target"
          }
        }
      }
    },
    rolls: []
  };

  const report = createPf2eSelectionContext({ message });
  assert.equal(report.valid, true);
  assert.deepEqual(report.context.damageTypes, ["fire"]);
  assert.deepEqual(report.context.weaponGroups, ["bomb"]);
  assert.deepEqual(report.context.attackTraits, ["agile"]);
  assert.deepEqual(report.context.sourceTraits, ["human"]);
  assert.deepEqual(report.context.targetTraits, ["undead"]);
  assert.equal(report.metadata.source.uuid, "Actor.source");
  assert.equal(report.metadata.target.token, "Scene.scene.Token.target");
});

test("critical failure maps to the fumble category", () => {
  const report = createPf2eSelectionContext({
    message: {
      flags: { pf2e: { context: { outcome: "criticalFailure", options: [] } } },
      rolls: []
    }
  });
  assert.equal(report.context.category, "criticalFumble");
  assert.equal(report.metadata.degreeOfSuccess.index, 0);
});

test("non-critical outcomes produce a structured unusable report", () => {
  const report = createPf2eSelectionContext({ degreeOfSuccess: 2 });
  assert.equal(report.valid, false);
  assert.equal(report.context.category, "");
  assert.equal(report.errors.some((entry) => entry.code === "PF2E_CONTEXT_CATEGORY_UNRESOLVED"), true);
  assert.equal(report.information.some((entry) => entry.code === "PF2E_CONTEXT_OUTCOME_NOT_CRITICAL"), true);
});

test("adapter exposes the natural d20 result separately from the final degree", () => {
  const report = createPf2eSelectionContext({
    roll: {
      dice: [{ total: 20, results: [{ result: 20, active: true }] }],
      options: { degreeOfSuccess: 3 }
    }
  });
  assert.equal(report.metadata.roll.dieResult, 20);
  assert.equal(report.metadata.roll.isNatural20, true);
  assert.equal(report.metadata.roll.isNatural1, false);
});

test("invalid adapter input never throws", () => {
  const report = createPf2eSelectionContext(null);
  assert.equal(report.valid, false);
  assert.equal(report.errors[0].code, "PF2E_CONTEXT_INPUT_INVALID");
});

test("adapter adds stable melee, ranged, and spell attack-mode traits", () => {
  const melee = createPf2eSelectionContext({ category: "criticalFumble", item: weapon() });
  const ranged = createPf2eSelectionContext({
    category: "criticalFumble",
    item: weapon({
      isMelee: false,
      isRanged: true,
      system: {
        ...weapon().system,
        range: { increment: 60 }
      }
    })
  });
  const spell = createPf2eSelectionContext({
    category: "criticalFumble",
    isRanged: true,
    isSpell: true,
    attackTraits: ["attack"]
  });

  assert.equal(melee.context.attackTraits.includes("melee"), true);
  assert.equal(ranged.context.attackTraits.includes("ranged"), true);
  assert.equal(spell.context.attackTraits.includes("ranged"), true);
  assert.equal(spell.context.attackTraits.includes("spell"), true);
});


test("spell attack rolls receive dedicated categories and spell metadata", () => {
  const source = actor({ id: "caster", type: "character", traits: ["human", "humanoid"] });
  const target = actor({ id: "target", traits: ["fiend"] });
  const spell = {
    id: "spell-1",
    uuid: "Actor.caster.Item.spell-1",
    name: "Ignition",
    type: "spell",
    actor: source,
    system: {
      level: { value: 1 },
      traits: { value: ["attack", "fire"], traditions: ["arcane", "primal"] },
      damage: { first: { formula: "2d4", type: "fire" } },
      range: { value: 30 }
    }
  };

  const report = createPf2eSelectionContext({
    roll: { options: { degreeOfSuccess: 3, type: "attack-roll", identifier: "spell-attack" } },
    item: spell,
    sourceActor: source,
    targetActor: target
  });

  assert.equal(report.valid, true);
  assert.equal(report.context.category, "spellCriticalHit");
  assert.deepEqual(report.context.damageTypes, ["fire"]);
  assert.deepEqual(report.context.spellTraditions, ["arcane", "primal"]);
  assert.deepEqual(report.context.spellTraits, ["attack", "fire"]);
  assert.equal(report.context.attackTraits.includes("spell"), true);
  assert.equal(report.metadata.roll.family, "spellAttack");
  assert.equal(report.metadata.spell.rank, 1);
});

test("critical saving throws receive dedicated categories and save types", () => {
  const roller = actor({ id: "roller", type: "character", traits: ["elf", "humanoid"] });
  const origin = actor({ id: "origin", traits: ["dragon"] });
  const message = {
    actor: roller,
    flags: {
      pf2e: {
        context: {
          type: "saving-throw",
          outcome: "criticalFailure",
          statistic: "reflex",
          actor: roller.uuid,
          origin: { actor: origin.uuid },
          options: ["check:statistic:reflex", "self:trait:elf", "target:trait:dragon"]
        }
      }
    },
    rolls: []
  };

  const report = createPf2eSelectionContext({
    message,
    sourceActor: roller,
    targetActor: origin
  });

  assert.equal(report.valid, true);
  assert.equal(report.context.category, "savingThrowCriticalFailure");
  assert.deepEqual(report.context.saveTypes, ["reflex"]);
  assert.equal(report.metadata.roll.family, "savingThrow");
  assert.equal(report.metadata.save.type, "reflex");
  assert.deepEqual(report.context.sourceTraits, ["elf", "humanoid"]);
  assert.deepEqual(report.context.targetTraits, ["dragon"]);
});

test("natural saving throw results remain separate from the final degree", () => {
  const report = createPf2eSelectionContext({
    rollFamily: "savingThrow",
    saveType: "will",
    degreeOfSuccess: 3,
    dieResult: 20
  });
  assert.equal(report.context.category, "savingThrowCriticalSuccess");
  assert.equal(report.metadata.roll.isNatural20, true);
  assert.deepEqual(report.context.saveTypes, ["will"]);
});

test("resolved saving-throw participants outrank contradictory PF2e flag references", () => {
  const caster = actor({ id: "caster-authoritative", traits: ["human", "humanoid"] });
  const defender = actor({ id: "defender-authoritative", traits: ["elf", "humanoid"] });
  const casterToken = { id: "caster-token-authoritative", uuid: "Scene.scene.Token.caster-token-authoritative", actor: caster };
  const defenderToken = { id: "defender-token-authoritative", uuid: "Scene.scene.Token.defender-token-authoritative", actor: defender };
  const message = {
    actor: caster,
    token: casterToken,
    flags: {
      pf2e: {
        context: {
          type: "saving-throw",
          outcome: "criticalSuccess",
          statistic: "will",
          actor: caster.uuid,
          token: casterToken.uuid,
          origin: { actor: caster.uuid, token: casterToken.uuid }
        }
      }
    },
    rolls: [{ degreeOfSuccess: 3 }]
  };

  const report = createPf2eSelectionContext({
    message,
    sourceActor: defender,
    sourceToken: defenderToken,
    targetActor: caster,
    targetToken: casterToken
  });

  assert.equal(report.context.category, "savingThrowCriticalSuccess");
  assert.equal(report.metadata.source.uuid, defender.uuid);
  assert.equal(report.metadata.source.token, defenderToken.uuid);
  assert.equal(report.metadata.target.uuid, caster.uuid);
  assert.equal(report.metadata.target.token, casterToken.uuid);
});
