import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();

const { PackRegistry } = await import("../scripts/critical-forge/registry/pack-registry.js");
const { CardRegistry } = await import("../scripts/critical-forge/registry/card-registry.js");
const { CardSelector } = await import("../scripts/critical-forge/selection/card-selector.js");
const { matchCard } = await import("../scripts/critical-forge/selection/card-matcher.js");
const { normalizeCardDefinition, normalizePackDefinition } = await import(
  "../scripts/critical-forge/schema/card-normalizer.js"
);

function makeCard(id, filters = {}, weight = 1) {
  return normalizeCardDefinition({
    schemaVersion: 1,
    id,
    packId: "test",
    category: "criticalHit",
    titleKey: `${id}.Title`,
    descriptionKey: `${id}.Description`,
    weight,
    tags: [],
    filters,
    effect: null
  });
}

function selectorWith(...cardsToRegister) {
  const packs = new PackRegistry();
  packs.register(normalizePackDefinition({
    schemaVersion: 1,
    id: "test",
    titleKey: "TEST.Pack.Title",
    descriptionKey: "TEST.Pack.Description",
    version: "1.0.0",
    sourceModule: "tests",
    cards: []
  }));
  const cards = new CardRegistry({ packRegistry: packs });
  for (const card of cardsToRegister) cards.register(card);
  return new CardSelector({ cardRegistry: cards });
}

test("matcher applies any, all, and exclusion filter semantics", () => {
  const card = makeCard("test.specific", {
    damageTypes: ["slashing"],
    attackTraits: ["agile"],
    excludedTargetTraits: ["incorporeal"]
  });
  const match = matchCard(card, {
    category: "criticalHit",
    damageTypes: ["slashing"],
    attackTraits: ["agile", "finesse"],
    targetTraits: ["humanoid"]
  });
  assert.equal(match.eligible, true);
  assert.equal(match.specificity, 3);
  assert.equal(match.effectiveWeight, 4);

  const rejected = matchCard(card, {
    category: "criticalHit",
    damageTypes: ["slashing"],
    attackTraits: ["agile"],
    targetTraits: ["incorporeal"]
  });
  assert.equal(rejected.eligible, false);
  assert.equal(rejected.rejectedBy.includes("excludedTargetTraits"), true);
});

test("candidate service keeps generic fallback cards and reports rejected cards", () => {
  const generic = makeCard("test.generic");
  const slashing = makeCard("test.slashing", { damageTypes: ["slashing"] });
  const selector = selectorWith(generic, slashing);
  const result = selector.candidates({ category: "criticalHit", damageTypes: ["fire"] });
  assert.deepEqual(result.eligible.map((entry) => entry.card.id), ["test.generic"]);
  assert.deepEqual(result.rejected.map((entry) => entry.card.id), ["test.slashing"]);
});

test("weighted selection is deterministic with an injected random source", () => {
  const generic = makeCard("test.generic", {}, 1);
  const specific = makeCard("test.specific", { damageTypes: ["slashing"] }, 1);
  const selector = selectorWith(generic, specific);
  const context = { category: "criticalHit", damageTypes: ["slashing"] };

  assert.equal(selector.select(context, { random: () => 0 }).selected.id, "test.generic");
  assert.equal(selector.select(context, { random: () => 0.99 }).selected.id, "test.specific");
  assert.equal(selector.select(context, { excludeCardIds: ["test.specific"], random: () => 0.99 }).selected.id, "test.generic");
});
