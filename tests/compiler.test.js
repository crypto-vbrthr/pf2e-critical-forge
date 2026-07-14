import test from "node:test";
import assert from "node:assert/strict";
import {
  createConditionPack,
  installFoundryMock
} from "./helpers/foundry-mock.js";
import { baseSpeed, fastHealing, fireImmunity, fireResistance, fireWeakness, movement, persistentBleed, proneEffect, regeneration, shakenNerves, temporaryHitPoints } from "./fixtures/effects.js";

const packs = new Map([
  [
    "pf2e.conditionitems",
    createConditionPack([
      {
        slug: "frightened",
        isValued: true,
        uuid: "Compendium.pf2e.conditionitems.Item.frightened"
      },
      {
        slug: "prone",
        isValued: false,
        uuid: "Compendium.pf2e.conditionitems.Item.prone"
      },
      {
        slug: "persistent-damage",
        isValued: false,
        uuid: "Compendium.pf2e.conditionitems.Item.persistent-damage"
      }
    ])
  ]
]);
installFoundryMock({
  packs,
  damageTypes: {
    bleed: "PF2E.TraitBleed",
    fire: "PF2E.TraitFire"
  },
  resistanceTypes: {
    fire: "PF2E.TraitFire",
    physical: "PF2E.Damage.IWR.Type.physical"
  },
  weaknessTypes: {
    fire: "PF2E.TraitFire",
    physical: "PF2E.Damage.IWR.Type.physical"
  },
  immunityTypes: {
    fire: "PF2E.TraitFire",
    frightened: "PF2E.Damage.IWR.Type.frightened"
  }
});

const { initializeEffectEngine } = await import(
  "../scripts/effect-engine/effect-engine.js"
);
const { initializeConditionCatalog } = await import(
  "../scripts/effect-engine/catalogs/condition-catalog.js"
);
const { compileEffectDefinition } = await import(
  "../scripts/effect-engine/compiler/effect-compiler.js"
);
const { buildPf2eEffectSource } = await import(
  "../scripts/effect-engine/compiler/pf2e-item-builder.js"
);
const { EffectValidationError } = await import("../scripts/core/errors.js");

initializeEffectEngine();
await initializeConditionCatalog({ force: true });

test("valued conditions compile with a badge-value alteration", async () => {
  const compiled = await compileEffectDefinition(shakenNerves());
  const conditionRule = compiled.components[0].rules[0];

  assert.equal(conditionRule.key, "GrantItem");
  assert.deepEqual(conditionRule.alterations, [
    { mode: "override", property: "badge-value", value: 2 }
  ]);
});

test("non-valued conditions never compile a badge-value alteration", async () => {
  const compiled = await compileEffectDefinition(
    proneEffect({ includeLegacyValue: true })
  );
  const conditionRule = compiled.components[0].rules[0];

  assert.equal(conditionRule.key, "GrantItem");
  assert.equal("alterations" in conditionRule, false);
  assert.equal(compiled.components[0].value, null);
});


test("persistent damage compiles to a GrantItem alteration", async () => {
  const compiled = await compileEffectDefinition(persistentBleed());
  const component = compiled.components[0];

  assert.equal(component.kind, "persistentDamage");
  assert.equal(component.dc, null);
  assert.deepEqual(component.rules[0], {
    key: "GrantItem",
    uuid: "Compendium.pf2e.conditionitems.Item.persistent-damage",
    allowDuplicate: true,
    alterations: [{
      mode: "override",
      property: "persistent-damage",
      value: { damageType: "bleed", formula: "1d6" }
    }]
  });
});

test("persistent damage adds a recovery DC alteration only when supplied", async () => {
  const compiled = await compileEffectDefinition(persistentBleed({ dc: 19 }));
  assert.deepEqual(compiled.components[0].rules[0].alterations[1], {
    mode: "override",
    property: "pd-recovery-dc",
    value: 19
  });
});

test("resistance components compile to Resistance rule elements", async () => {
  const compiled = await compileEffectDefinition(fireResistance({ value: 7 }));
  const component = compiled.components[0];

  assert.equal(component.kind, "resistance");
  assert.equal(component.resistanceType, "fire");
  assert.equal(component.value, 7);
  assert.deepEqual(component.rules[0], {
    key: "Resistance",
    type: "fire",
    value: 7
  });
});

test("weakness components compile to Weakness rule elements", async () => {
  const compiled = await compileEffectDefinition(fireWeakness({ value: 7 }));
  const component = compiled.components[0];

  assert.equal(component.kind, "weakness");
  assert.equal(component.weaknessType, "fire");
  assert.equal(component.value, 7);
  assert.deepEqual(component.rules[0], {
    key: "Weakness",
    type: "fire",
    value: 7
  });
});

test("immunity components compile to Immunity rule elements without a value", async () => {
  const compiled = await compileEffectDefinition(fireImmunity());
  const component = compiled.components[0];

  assert.equal(component.kind, "immunity");
  assert.equal(component.immunityType, "fire");
  assert.deepEqual(component.rules[0], {
    key: "Immunity",
    type: "fire"
  });
});

test("fast healing components compile to FastHealing rule elements", async () => {
  const compiled = await compileEffectDefinition(fastHealing({ value: 6 }));
  const component = compiled.components[0];

  assert.equal(component.kind, "fastHealing");
  assert.equal(component.value, 6);
  assert.deepEqual(component.rules[0], {
    key: "FastHealing",
    value: 6
  });
});

test("regeneration compiles through FastHealing with type and deactivation array", async () => {
  const compiled = await compileEffectDefinition(regeneration({
    value: 8,
    deactivatedBy: ["acid", "fire"]
  }));
  const component = compiled.components[0];

  assert.equal(component.kind, "regeneration");
  assert.equal(component.value, 8);
  assert.deepEqual(component.deactivatedBy, ["acid", "fire"]);
  assert.deepEqual(component.rules[0], {
    key: "FastHealing",
    value: 8,
    type: "regeneration",
    deactivatedBy: ["acid", "fire"]
  });
});

test("modifier components compile to FlatModifier rule elements", async () => {
  const compiled = await compileEffectDefinition(shakenNerves());
  assert.deepEqual(compiled.components[1].rules[0], {
    key: "FlatModifier",
    selector: "will",
    value: -1,
    type: "circumstance"
  });
});

test("PF2e Item source contains duration, rules, and origin flags", async () => {
  const compiled = await compileEffectDefinition(shakenNerves());
  const source = buildPf2eEffectSource(compiled);

  assert.equal(source.type, "effect");
  assert.deepEqual(source.system.duration, {
    value: 2,
    unit: "rounds",
    expiry: "turn-end",
    sustained: false
  });
  assert.equal(source.system.rules.length, 2);
  assert.equal(
    source.flags["pf2e-critical-forge"].definitionId,
    "example.shaken-nerves"
  );
  assert.equal(
    source.flags["pf2e-critical-forge"].originModule,
    "test-suite"
  );
});

test("compiler rejects invalid definitions with EffectValidationError", async () => {
  const invalid = shakenNerves();
  invalid.name = "";

  await assert.rejects(
    () => compileEffectDefinition(invalid),
    (error) => {
      assert.equal(error instanceof EffectValidationError, true);
      assert.equal(error.result.valid, false);
      return true;
    }
  );
});


test("temporary hit points compile to the native TempHP Rule Element", async () => {
  const compiled = await compileEffectDefinition(temporaryHitPoints({ value: 7 }));
  assert.deepEqual(compiled.components[0].rules, [{
    key: "TempHP",
    value: 7
  }]);
});

test("movement components compile to native Speed FlatModifiers", async () => {
  const compiled = await compileEffectDefinition(movement({
    movementType: "fly",
    value: -10,
    modifierType: "circumstance"
  }));
  const component = compiled.components[0];

  assert.equal(component.kind, "movement");
  assert.equal(component.selector, "fly-speed");
  assert.deepEqual(component.rules[0], {
    key: "FlatModifier",
    selector: "fly-speed",
    value: -10,
    type: "circumstance"
  });
});


test("base Speed components compile to native BaseSpeed Rule Elements", async () => {
  const compiled = await compileEffectDefinition(baseSpeed({
    movementType: "swim",
    value: 25
  }));
  const component = compiled.components[0];

  assert.equal(component.kind, "baseSpeed");
  assert.equal(component.selector, "swim");
  assert.deepEqual(component.rules[0], {
    key: "BaseSpeed",
    selector: "swim",
    value: 25
  });
});
