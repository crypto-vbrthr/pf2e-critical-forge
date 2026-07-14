import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";
import { fastHealing, fireImmunity, fireResistance, fireWeakness, persistentBleed, proneEffect, regeneration, shakenNerves, temporaryHitPoints } from "./fixtures/effects.js";

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
  },
  immunityTypes: {
    fire: "PF2E.TraitFire",
    frightened: "PF2E.Damage.IWR.Type.frightened"
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


test("immunity validates its type and requires no numeric value", () => {
  const valid = analyzeEffectDefinition(fireImmunity());
  assert.equal(valid.valid, true);

  const invalidType = analyzeEffectDefinition(fireImmunity({ immunityType: "rainbow" }));
  assert.equal(invalidType.valid, false);
  assert.equal(invalidType.errors.some(
    (issue) => issue.code === "IMMUNITY_TYPE_INVALID"
  ), true);
});

test("duplicate immunity types produce a redundancy warning", () => {
  const definition = fireImmunity();
  definition.components.push({
    type: "immunity",
    immunityType: "fire"
  });

  const report = analyzeEffectDefinition(definition);
  assert.equal(report.valid, true);
  assert.equal(report.warnings.some(
    (issue) => issue.code === "IMMUNITY_DUPLICATE_TYPE"
  ), true);
});

test("fast healing requires a positive integer value", () => {
  const valid = analyzeEffectDefinition(fastHealing({ value: 3 }));
  assert.equal(valid.valid, true);

  const invalid = analyzeEffectDefinition(fastHealing({ value: 0 }));
  assert.equal(invalid.valid, false);
  assert.equal(invalid.errors.some(
    (issue) => issue.code === "FAST_HEALING_VALUE_INVALID"
  ), true);
});

test("multiple fast healing components produce an interaction warning", () => {
  const definition = fastHealing({ value: 2 });
  definition.components.push({ type: "fastHealing", value: 5 });

  const report = analyzeEffectDefinition(definition);
  assert.equal(report.valid, true);
  assert.equal(report.warnings.some(
    (issue) => issue.code === "FAST_HEALING_MULTIPLE_SOURCES"
  ), true);
});


test("regeneration validates value and deactivating damage types", () => {
  const valid = analyzeEffectDefinition(regeneration());
  assert.equal(valid.valid, true);

  const invalidValue = analyzeEffectDefinition(regeneration({ value: 0 }));
  assert.equal(invalidValue.errors.some(
    (issue) => issue.code === "REGENERATION_VALUE_INVALID"
  ), true);

  const missingTypes = analyzeEffectDefinition(regeneration({ deactivatedBy: [] }));
  assert.equal(missingTypes.errors.some(
    (issue) => issue.code === "REGENERATION_DEACTIVATION_REQUIRED"
  ), true);

  const invalidType = analyzeEffectDefinition(regeneration({ deactivatedBy: ["rainbow"] }));
  assert.equal(invalidType.errors.some(
    (issue) => issue.code === "REGENERATION_DEACTIVATION_TYPE_INVALID"
  ), true);
});

test("multiple regeneration components produce an interaction warning", () => {
  const definition = regeneration({ value: 5 });
  definition.components.push({
    type: "regeneration",
    value: 10,
    deactivatedBy: ["cold"]
  });

  const report = analyzeEffectDefinition(definition);
  assert.equal(report.valid, true);
  assert.equal(report.warnings.some(
    (issue) => issue.code === "REGENERATION_MULTIPLE_SOURCES"
  ), true);
});


test("temporary hit points require a positive integer value", () => {
  const valid = analyzeEffectDefinition(temporaryHitPoints({ value: 5 }));
  assert.equal(valid.valid, true);

  const invalid = analyzeEffectDefinition(temporaryHitPoints({ value: 0 }));
  assert.equal(invalid.valid, false);
  assert.equal(invalid.errors.some(
    (issue) => issue.code === "TEMPORARY_HIT_POINTS_VALUE_INVALID"
  ), true);
});

test("multiple temporary-hit-point components produce a non-stacking warning", () => {
  const definition = temporaryHitPoints({ value: 5 });
  definition.components.push({ type: "temporaryHitPoints", value: 9 });

  const report = analyzeEffectDefinition(definition);
  assert.equal(report.valid, true);
  assert.equal(report.warnings.some(
    (issue) => issue.code === "TEMPORARY_HIT_POINTS_MULTIPLE_SOURCES"
  ), true);
});
