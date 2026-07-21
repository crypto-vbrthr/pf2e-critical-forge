import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();
const { initializeEffectEngine } = await import("../scripts/effect-engine/effect-engine.js");
initializeEffectEngine();

const { PackRegistry } = await import("../scripts/critical-forge/registry/pack-registry.js");
const { CardRegistry } = await import("../scripts/critical-forge/registry/card-registry.js");
const { CardSelector } = await import("../scripts/critical-forge/selection/card-selector.js");
const { matchCard } = await import("../scripts/critical-forge/selection/card-matcher.js");
const { normalizeCardDefinition, normalizePackDefinition } = await import(
  "../scripts/critical-forge/schema/card-normalizer.js"
);
const { validateCardDefinition } = await import("../scripts/critical-forge/schema/card-validator.js");

function makeCard(id, conditions = undefined) {
  return normalizeCardDefinition({
    schemaVersion: 1,
    id,
    packId: "condition-test",
    category: "criticalHit",
    titleKey: `${id}.Title`,
    descriptionKey: `${id}.Description`,
    weight: 2,
    tags: [],
    filters: { damageTypes: ["slashing"] },
    conditions,
    effect: null
  });
}

function createSelector(...cardsToRegister) {
  const packs = new PackRegistry();
  packs.register(normalizePackDefinition({
    schemaVersion: 1,
    id: "condition-test",
    titleKey: "TEST.Pack.Title",
    descriptionKey: "TEST.Pack.Description",
    version: "1.0.0",
    sourceModule: "tests",
    cards: []
  }));
  const cards = new CardRegistry({ packRegistry: packs });
  cardsToRegister.forEach((card) => cards.register(card));
  return new CardSelector({ cardRegistry: cards });
}

const selectionContext = { category: "criticalHit", damageTypes: ["slashing"] };
const snapshot = {
  participants: { source: { hp: { ratio: 0.4 } } },
  battlefield: { hostileThreatCount: 3 }
};

test("legacy cards normalize to no conditions and remain eligible without a snapshot", () => {
  const card = makeCard("condition-test.legacy");
  assert.equal(card.conditions, null);
  const match = matchCard(card, selectionContext);
  assert.equal(match.eligible, true);
  assert.equal(match.conditionEvaluation.configured, false);
  assert.equal(match.effectiveWeight, 4);
});

test("conditioned cards require a matching runtime snapshot", () => {
  const card = makeCard("condition-test.bloodied", {
    field: "participants.source.hp.ratio",
    operator: "lte",
    value: 0.5
  });
  const unavailable = matchCard(card, selectionContext);
  assert.equal(unavailable.eligible, false);
  assert.equal(unavailable.rejectedBy.includes("conditions"), true);
  assert.equal(unavailable.conditionEvaluation.available, false);

  const matched = matchCard(card, selectionContext, { snapshot });
  assert.equal(matched.eligible, true);
  assert.equal(matched.conditionEvaluation.matched, true);
  assert.equal(matched.specificity, 1);
  assert.equal(matched.effectiveWeight, 4);
});

test("selector reports condition evidence for eligible and rejected cards", () => {
  const legacy = makeCard("condition-test.legacy");
  const bloodied = makeCard("condition-test.bloodied", {
    field: "participants.source.hp.ratio",
    operator: "lte",
    value: 0.5
  });
  const surrounded = makeCard("condition-test.surrounded", {
    field: "battlefield.hostileThreatCount",
    operator: "gte",
    value: 4
  });
  const result = createSelector(legacy, bloodied, surrounded).candidates(selectionContext, { snapshot });
  assert.deepEqual(result.eligible.map((entry) => entry.card.id).sort(), ["condition-test.bloodied", "condition-test.legacy"]);
  assert.deepEqual(result.rejected.map((entry) => entry.card.id), ["condition-test.surrounded"]);
  assert.equal(result.eligible.find((entry) => entry.card.id === "condition-test.bloodied").conditionEvaluation.root.actual, 0.4);
  assert.equal(result.rejected[0].conditionEvaluation.root.actual, 3);
});

test("card schema version 1 accepts optional immutable condition trees", () => {
  const card = makeCard("condition-test.valid", {
    mode: "all",
    conditions: [
      { field: "participants.source.hp.ratio", operator: "lte", value: 0.5 },
      { field: "battlefield.hostileThreatCount", operator: "gte", value: 2 }
    ]
  });
  assert.equal(card.schemaVersion, 1);
  assert.equal(validateCardDefinition(card).valid, true);
  assert.equal(Object.isFrozen(card.conditions), true);
});

test("card validation wraps invalid condition diagnostics without changing schema version", () => {
  const card = makeCard("condition-test.invalid", {
    field: "participants.source.hp.ratio",
    operator: "gte",
    value: "high"
  });
  const report = validateCardDefinition(card);
  assert.equal(report.valid, false);
  assert.equal(report.issues.some((entry) => entry.code === "CARD_CONDITIONS_INVALID"), true);
});
