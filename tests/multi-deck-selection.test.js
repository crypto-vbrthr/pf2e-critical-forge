import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();

const { PackRegistry } = await import("../scripts/critical-forge/registry/pack-registry.js");
const { CardRegistry } = await import("../scripts/critical-forge/registry/card-registry.js");
const { CardSelector } = await import("../scripts/critical-forge/selection/card-selector.js");
const { matchCard } = await import("../scripts/critical-forge/selection/card-matcher.js");
const { normalizePackDefinition } = await import("../scripts/critical-forge/schema/card-normalizer.js");

function card(id, category, filters = {}) {
  return {
    schemaVersion: 1,
    id,
    category,
    titleKey: `${id}.Title`,
    descriptionKey: `${id}.Description`,
    weight: 1,
    tags: [],
    filters,
    effect: null
  };
}

function pack(id, { cards = [], decks = {} } = {}) {
  return normalizePackDefinition({
    schemaVersion: 1,
    id,
    titleKey: `${id}.Title`,
    descriptionKey: `${id}.Description`,
    version: "1.0.0",
    sourceModule: "tests",
    cards,
    decks
  });
}

function selectorFor(...packsToRegister) {
  const packs = new PackRegistry();
  const cards = new CardRegistry({ packRegistry: packs });
  for (const definition of packsToRegister) {
    packs.register(definition);
    for (const entry of definition.cards) cards.register(entry);
  }
  return new CardSelector({ cardRegistry: cards, packRegistry: packs });
}

test("specialized attack cards replace only their own pack default attack pool", () => {
  const multi = pack("multi", {
    cards: [
      card("multi.default-attack", "criticalHit"),
      card("multi.default-save", "savingThrowCriticalSuccess", { saveTypes: ["will"] })
    ],
    decks: {
      attack: [card("multi.attack", "criticalHit")],
      reflex: [card("multi.reflex", "savingThrowCriticalSuccess")]
    }
  });
  const selector = selectorFor(multi);

  const attack = selector.candidates({ category: "criticalHit" });
  assert.deepEqual(attack.eligible.map((entry) => entry.card.id), ["multi.attack"]);
  assert.equal(attack.requestedDeckType, "attack");
  assert.equal(attack.rejected.find((entry) => entry.card.id === "multi.default-attack")?.rejectedBy.includes("deckType"), true);

  const reflex = selector.candidates({
    category: "savingThrowCriticalSuccess",
    saveTypes: ["reflex"]
  });
  assert.deepEqual(reflex.eligible.map((entry) => entry.card.id), ["multi.reflex"]);

  const will = selector.candidates({
    category: "savingThrowCriticalSuccess",
    saveTypes: ["will"]
  });
  assert.deepEqual(will.eligible.map((entry) => entry.card.id), ["multi.default-save"]);
  assert.equal(will.eligible[0].activeDeckType, "default");
});

test("fortitude, reflex, and will decks never leak into each other", () => {
  const saves = pack("saves", {
    decks: {
      fortitude: [card("saves.fortitude", "savingThrowCriticalFailure")],
      reflex: [card("saves.reflex", "savingThrowCriticalFailure")],
      will: [card("saves.will", "savingThrowCriticalFailure")]
    }
  });
  const selector = selectorFor(saves);

  for (const type of ["fortitude", "reflex", "will"]) {
    const result = selector.candidates({
      category: "savingThrowCriticalFailure",
      saveTypes: [type]
    });
    assert.deepEqual(result.eligible.map((entry) => entry.card.id), [`saves.${type}`]);
  }
});

test("packs without a requested deck or default fallback contribute no candidates", () => {
  const reflexOnly = pack("reflex-only", {
    decks: { reflex: [card("reflex-only.card", "savingThrowCriticalSuccess")] }
  });
  const result = selectorFor(reflexOnly).candidates({
    category: "savingThrowCriticalSuccess",
    saveTypes: ["will"]
  });
  assert.equal(result.eligible.length, 0);
  assert.equal(result.rejected[0].activeDeckType, null);
  assert.equal(result.rejected[0].rejectedBy.includes("deckType"), true);
});

test("legacy default packs remain eligible beside specialized packs", () => {
  const legacy = pack("legacy", {
    cards: [card("legacy.attack", "criticalHit")]
  });
  const specialized = pack("specialized", {
    decks: { attack: [card("specialized.attack", "criticalHit")] }
  });
  const result = selectorFor(legacy, specialized).candidates({ category: "criticalHit" });
  assert.deepEqual(result.eligible.map((entry) => entry.card.id), [
    "legacy.attack",
    "specialized.attack"
  ]);
});

test("normal filters and conditions still apply inside the resolved deck", () => {
  const specialized = pack("filtered", {
    decks: {
      attack: [
        card("filtered.generic", "criticalHit"),
        card("filtered.slashing", "criticalHit", { damageTypes: ["slashing"] })
      ]
    }
  });
  const selector = selectorFor(specialized);
  const result = selector.candidates({ category: "criticalHit", damageTypes: ["fire"] });
  assert.deepEqual(result.eligible.map((entry) => entry.card.id), ["filtered.generic"]);
  assert.equal(result.rejected.find((entry) => entry.card.id === "filtered.slashing")?.rejectedBy.includes("damageTypes"), true);
});

test("direct card matching understands specialized deck assignments", () => {
  const reflexCard = pack("direct", {
    decks: { reflex: [card("direct.reflex", "savingThrowCriticalSuccess")] }
  }).cards[0];
  assert.equal(matchCard(reflexCard, {
    category: "savingThrowCriticalSuccess",
    saveTypes: ["reflex"]
  }).eligible, true);
  assert.equal(matchCard(reflexCard, {
    category: "savingThrowCriticalSuccess",
    saveTypes: ["fortitude"]
  }).rejectedBy.includes("deckType"), true);
});
