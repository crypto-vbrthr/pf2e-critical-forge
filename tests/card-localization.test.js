import test from "node:test";
import assert from "node:assert/strict";
import { assertDeepFrozen, installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();
const { initializeEffectEngine } = await import("../scripts/effect-engine/effect-engine.js");
initializeEffectEngine();

const { normalizeCardDefinition } = await import("../scripts/critical-forge/schema/card-normalizer.js");
const { localizeCard, materializeCardEffect } = await import(
  "../scripts/critical-forge/localization/card-localizer.js"
);

const card = normalizeCardDefinition({
  schemaVersion: 1,
  id: "test.deep-cut",
  packId: "test",
  category: "criticalHit",
  titleKey: "TEST.Title",
  descriptionKey: "TEST.Description",
  fallbackTitle: "Fallback Title",
  fallbackDescription: "Fallback Description",
  weight: 1,
  filters: {},
  effect: {
    target: "target",
    nameKey: "TEST.EffectName",
    fallbackName: "Fallback Effect",
    definition: {
      schemaVersion: 2,
      duration: { value: -1, unit: "unlimited", expiry: null },
      components: [{ type: "persistentDamage", formula: "1d6", damageType: "bleed" }]
    }
  }
});

test("card localization prefers translations and falls back cleanly", () => {
  const translated = localizeCard(card, {
    localize: (key) => ({
      "TEST.Title": "Tiefe Schnittwunde",
      "TEST.Description": "Eine tiefe Wunde.",
      "TEST.EffectName": "Blutende Wunde"
    })[key] ?? null
  });
  assert.equal(translated.title, "Tiefe Schnittwunde");
  assert.equal(translated.effectName, "Blutende Wunde");

  const fallback = localizeCard(card, { localize: () => null });
  assert.equal(fallback.title, "Fallback Title");
  assert.equal(fallback.description, "Fallback Description");
});

test("materialized card effects become valid immutable Effect Definitions", () => {
  const result = materializeCardEffect(card, { localize: () => null });
  assert.equal(result.target, "target");
  assert.equal(result.definition.name, "Fallback Effect");
  assert.equal(result.definition.metadata.criticalForge.cardId, card.id);
  assert.equal(result.definition.components[0].type, "persistentDamage");
  assertDeepFrozen(result.definition);
});

test("narrative-only cards materialize no effect", () => {
  const narrative = normalizeCardDefinition({ ...card, id: "test.narrative", effect: null });
  assert.equal(materializeCardEffect(narrative), null);
});
