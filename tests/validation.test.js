import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";
import { proneEffect, shakenNerves } from "./fixtures/effects.js";

installFoundryMock({
  skills: {
    athletics: { label: "PF2E.Skill.Athletics" },
    stealth: { label: "PF2E.Skill.Stealth" }
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
