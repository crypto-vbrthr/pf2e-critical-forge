import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";
import { fireResistance, fireWeakness, persistentBleed, proneEffect, shakenNerves } from "./fixtures/effects.js";

installFoundryMock({
  skills: {
    athletics: { label: "PF2E.Skill.Athletics" },
    stealth: { label: "PF2E.Skill.Stealth" }
  },
  damageTypes: {
    bleed: "PF2E.TraitBleed",
    fire: "PF2E.TraitFire"
  },
  resistanceTypes: {
    fire: "PF2E.TraitFire",
    physical: "PF2E.Damage.IWR.Type.physical",
    "all-damage": "PF2E.Damage.IWR.Type.all-damage"
  },
  weaknessTypes: {
    fire: "PF2E.TraitFire",
    physical: "PF2E.Damage.IWR.Type.physical",
    "all-damage": "PF2E.Damage.IWR.Type.all-damage"
  }
});

const { initializeEffectEngine } = await import(
  "../scripts/effect-engine/effect-engine.js"
);
const { analyzeEffectDefinition } = await import(
  "../scripts/effect-engine/validation/validation-engine.js"
);
initializeEffectEngine();

test("circumstance penalty alongside frightened is valid and informative", () => {
  const report = analyzeEffectDefinition(shakenNerves());

  assert.equal(report.valid, true);
  assert.equal(report.errors.length, 0);
  assert.equal(report.warnings.length, 0);
  assert.equal(
    report.information.some((issue) => issue.code === "STACKING_FRIGHTENED_CIRCUMSTANCE"),
    true
  );
});

test("status penalty alongside frightened produces a stacking warning", () => {
  const report = analyzeEffectDefinition(
    shakenNerves({ modifierType: "status" })
  );

  assert.equal(report.valid, true);
  assert.equal(
    report.warnings.some((issue) => issue.code === "STACKING_FRIGHTENED_STATUS"),
    true
  );
});

test("legacy values on non-valued conditions are reported but remain valid", () => {
  const report = analyzeEffectDefinition(proneEffect({ includeLegacyValue: true }));

  assert.equal(report.valid, true);
  const issue = report.warnings.find(
    (candidate) => candidate.code === "CONDITION_VALUE_IGNORED"
  );
  assert.equal(issue?.componentIndex, 0);
  assert.deepEqual(issue?.data, { slug: "prone", value: 1 });
});

test("invalid selector syntax is an error", () => {
  const definition = shakenNerves();
  definition.components[1].selector = "Will Save";
  const report = analyzeEffectDefinition(definition);

  assert.equal(report.valid, false);
  assert.equal(
    report.errors.some((issue) => issue.code === "MODIFIER_SELECTOR_FORMAT"),
    true
  );
});

test("unknown but well-formed selectors are accepted as custom selectors", () => {
  const definition = shakenNerves();
  definition.components[1].selector = "my-module-special-check";
  const report = analyzeEffectDefinition(definition);

  assert.equal(report.valid, true);
  assert.equal(
    report.information.some((issue) => issue.code === "MODIFIER_SELECTOR_CUSTOM"),
    true
  );
});

test("schema failure stops later validation phases", () => {
  const definition = shakenNerves();
  definition.name = "";
  definition.components[1].selector = "Not Valid";
  const report = analyzeEffectDefinition(definition, { target: { name: "Target" } });

  assert.equal(report.valid, false);
  assert.equal(report.errors.some((issue) => issue.code === "SCHEMA_NAME_REQUIRED"), true);
  assert.equal(report.issues.some((issue) => issue.code === "MODIFIER_SELECTOR_FORMAT"), false);
  assert.equal(report.issues.some((issue) => issue.code === "COMPATIBILITY_TARGET_PRESENT"), false);
});

test("target context reaches the compatibility phase", () => {
  const report = analyzeEffectDefinition(shakenNerves(), {
    target: { name: "Test Actor" }
  });

  const issue = report.information.find(
    (candidate) => candidate.code === "COMPATIBILITY_TARGET_PRESENT"
  );
  assert.equal(issue?.data.targetName, "Test Actor");
});

test("persistent damage validates formula, damage type, and recovery DC", () => {
  const missingFormula = analyzeEffectDefinition(persistentBleed({ formula: "" }));
  assert.equal(missingFormula.valid, false);
  assert.equal(missingFormula.errors.some(
    (issue) => issue.code === "PERSISTENT_DAMAGE_FORMULA_MISSING"
  ), true);

  const invalidType = analyzeEffectDefinition(persistentBleed({ damageType: "rainbow" }));
  assert.equal(invalidType.errors.some(
    (issue) => issue.code === "PERSISTENT_DAMAGE_TYPE_INVALID"
  ), true);

  const invalidDc = analyzeEffectDefinition(persistentBleed({ dc: 0 }));
  assert.equal(invalidDc.errors.some(
    (issue) => issue.code === "PERSISTENT_DAMAGE_DC_INVALID"
  ), true);
});

test("duplicate persistent damage types produce a stacking warning", () => {
  const definition = persistentBleed();
  definition.components.push({
    type: "persistentDamage",
    formula: "2d6",
    damageType: "bleed"
  });

  const report = analyzeEffectDefinition(definition);
  assert.equal(report.valid, true);
  assert.equal(report.warnings.some(
    (issue) => issue.code === "PERSISTENT_DAMAGE_DUPLICATE_TYPE"
  ), true);
});

test("resistance validates type and positive integer value", () => {
  const invalidType = analyzeEffectDefinition(fireResistance({ resistanceType: "rainbow" }));
  assert.equal(invalidType.valid, false);
  assert.equal(invalidType.errors.some(
    (issue) => issue.code === "RESISTANCE_TYPE_INVALID"
  ), true);

  const invalidValue = analyzeEffectDefinition(fireResistance({ value: 0 }));
  assert.equal(invalidValue.valid, false);
  assert.equal(invalidValue.errors.some(
    (issue) => issue.code === "RESISTANCE_VALUE_INVALID"
  ), true);
});

test("weakness validates type and positive integer value", () => {
  const invalidType = analyzeEffectDefinition(fireWeakness({ weaknessType: "rainbow" }));
  assert.equal(invalidType.valid, false);
  assert.equal(invalidType.errors.some(
    (issue) => issue.code === "WEAKNESS_TYPE_INVALID"
  ), true);

  const invalidValue = analyzeEffectDefinition(fireWeakness({ value: 0 }));
  assert.equal(invalidValue.valid, false);
  assert.equal(invalidValue.errors.some(
    (issue) => issue.code === "WEAKNESS_VALUE_INVALID"
  ), true);
});

test("duplicate weakness types produce a stacking warning", () => {
  const definition = fireWeakness();
  definition.components.push({
    type: "weakness",
    weaknessType: "fire",
    value: 10
  });

  const report = analyzeEffectDefinition(definition);
  assert.equal(report.valid, true);
  assert.equal(report.warnings.some(
    (issue) => issue.code === "WEAKNESS_DUPLICATE_TYPE"
  ), true);
});

test("duplicate resistance types produce a stacking warning", () => {
  const definition = fireResistance();
  definition.components.push({
    type: "resistance",
    resistanceType: "fire",
    value: 10
  });

  const report = analyzeEffectDefinition(definition);
  assert.equal(report.valid, true);
  assert.equal(report.warnings.some(
    (issue) => issue.code === "RESISTANCE_DUPLICATE_TYPE"
  ), true);
});
