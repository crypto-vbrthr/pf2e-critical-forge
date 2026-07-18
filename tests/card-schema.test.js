import test from "node:test";
import assert from "node:assert/strict";
import { assertDeepFrozen, installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();
const { initializeEffectEngine } = await import("../scripts/effect-engine/effect-engine.js");
initializeEffectEngine();

const { normalizeCardDefinition, normalizePackDefinition } = await import(
  "../scripts/critical-forge/schema/card-normalizer.js"
);
const { validateCardDefinition, validatePackDefinition } = await import(
  "../scripts/critical-forge/schema/card-validator.js"
);

function card(overrides = {}) {
  return {
    schemaVersion: 1,
    id: "test.deep-cut",
    packId: "test",
    category: "criticalHit",
    titleKey: "TEST.DeepCut.Title",
    descriptionKey: "TEST.DeepCut.Description",
    fallbackTitle: "Deep Cut",
    fallbackDescription: "A deep wound.",
    weight: 2,
    tags: ["bleed", "bleed"],
    filters: { damageTypes: ["slashing", "slashing"] },
    effect: {
      target: "target",
      nameKey: "TEST.DeepCut.Effect",
      fallbackName: "Deep Cut",
      definition: {
        schemaVersion: 2,
        duration: { value: -1, unit: "unlimited", expiry: null },
        components: [{ type: "persistentDamage", formula: "1d6", damageType: "bleed" }]
      }
    },
    ...overrides
  };
}

test("card definitions normalize and freeze nested values", () => {
  const normalized = normalizeCardDefinition(card());
  assert.deepEqual(normalized.tags, ["bleed"]);
  assert.deepEqual(normalized.filters.damageTypes, ["slashing"]);
  assert.deepEqual(normalized.filters.excludedAttackTraits, []);
  assert.equal("name" in normalized.effect.definition, false);
  assertDeepFrozen(normalized);
  assert.equal(validateCardDefinition(normalized).valid, true);
});

test("card validation rejects unsupported categories, tone, impact, and invalid weights", () => {
  const normalized = normalizeCardDefinition(card({ category: "criticalDance", tone: "silly", impact: "catastrophic", weight: 0 }));
  const result = validateCardDefinition(normalized);
  assert.equal(result.valid, false);
  assert.equal(result.issues.some((issue) => issue.code === "CARD_CATEGORY_INVALID"), true);
  assert.equal(result.issues.some((issue) => issue.code === "CARD_WEIGHT_INVALID"), true);
  assert.equal(result.issues.some((issue) => issue.code === "CARD_TONE_INVALID"), true);
  assert.equal(result.issues.some((issue) => issue.code === "CARD_IMPACT_INVALID"), true);
});

test("card validation rejects malformed effect templates", () => {
  const normalized = normalizeCardDefinition(card({
    effect: {
      target: "somewhere",
      nameKey: "",
      definition: {
        schemaVersion: 2,
        duration: { value: 1, unit: "rounds", expiry: "turn-end" },
        components: [{ type: "persistentDamage", formula: "", damageType: "fire" }]
      }
    }
  }));
  const result = validateCardDefinition(normalized);
  assert.equal(result.valid, false);
  assert.equal(result.issues.some((issue) => issue.code === "CARD_EFFECT_TARGET_INVALID"), true);
  assert.equal(result.issues.some((issue) => issue.code === "CARD_EFFECT_NAME_KEY_MISSING"), true);
  assert.equal(result.issues.some((issue) => issue.code === "CARD_EFFECT_DEFINITION_INVALID"), true);
});

test("pack normalization assigns its id to contained cards", () => {
  const pack = normalizePackDefinition({
    schemaVersion: 1,
    id: "test",
    titleKey: "TEST.Pack.Title",
    descriptionKey: "TEST.Pack.Description",
    version: "1.0.0",
    sourceModule: "tests",
    cards: [{ ...card(), packId: "wrong" }]
  });
  assert.equal(pack.cards[0].packId, "test");
  assert.equal(validatePackDefinition(pack).valid, true);
});
