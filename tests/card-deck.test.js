import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock, assertDeepFrozen } from "./helpers/foundry-mock.js";

installFoundryMock();

const {
  CARD_DECK_TYPES,
  categorySupportsCardDeck,
  resolvePackCardDeck,
  resolveRequestedCardDeck
} = await import("../scripts/critical-forge/decks/card-deck.js");
const { normalizePackDefinition } = await import("../scripts/critical-forge/schema/card-normalizer.js");
const { validatePackDefinition } = await import("../scripts/critical-forge/schema/card-validator.js");

function rawCard(id, category = "criticalHit") {
  return {
    schemaVersion: 1,
    id,
    packId: "multi",
    category,
    titleKey: `${id}.Title`,
    descriptionKey: `${id}.Description`,
    weight: 1,
    tags: [],
    filters: {},
    effect: null
  };
}

function rawPack(overrides = {}) {
  return {
    schemaVersion: 1,
    id: "multi",
    titleKey: "MULTI.Title",
    descriptionKey: "MULTI.Description",
    version: "1.0.0",
    sourceModule: "tests",
    cards: [],
    ...overrides
  };
}

test("legacy packs normalize into an immutable default deck without migration", () => {
  const pack = normalizePackDefinition(rawPack({ cards: [rawCard("multi.legacy")] }));
  assert.equal(pack.cards[0].deckType, "default");
  assert.deepEqual(pack.decks.default.cardIds, ["multi.legacy"]);
  assert.deepEqual(pack.decks.attack.cardIds, []);
  assert.equal(validatePackDefinition(pack).valid, true);
  assertDeepFrozen(pack);
});

test("nested multi-deck input flattens into cards and a deterministic deck index", () => {
  const pack = normalizePackDefinition(rawPack({
    cards: [rawCard("multi.default-save", "savingThrowCriticalSuccess")],
    decks: {
      attack: { cards: [rawCard("multi.attack")] },
      fortitude: [rawCard("multi.fortitude", "savingThrowCriticalFailure")],
      reflex: { cards: [rawCard("multi.reflex", "savingThrowCriticalSuccess")] },
      will: { cards: [rawCard("multi.will", "savingThrowCriticalFailure")] }
    }
  }));

  assert.equal(pack.cards.length, 5);
  assert.deepEqual(pack.cards.map((card) => card.deckType), [
    "default", "attack", "fortitude", "reflex", "will"
  ]);
  for (const type of CARD_DECK_TYPES) {
    assert.equal(pack.decks[type].cardIds.length, 1);
  }
  assert.equal(validatePackDefinition(pack).valid, true);
});

test("deck resolution distinguishes attack and the three saving throws", () => {
  assert.equal(resolveRequestedCardDeck({ category: "criticalHit" }), "attack");
  assert.equal(resolveRequestedCardDeck({ category: "spellCriticalFumble" }), "attack");
  assert.equal(resolveRequestedCardDeck({
    category: "savingThrowCriticalSuccess",
    saveTypes: ["fortitude"]
  }), "fortitude");
  assert.equal(resolveRequestedCardDeck({
    category: "savingThrowCriticalFailure",
    saveTypes: ["reflex"]
  }), "reflex");
  assert.equal(resolveRequestedCardDeck({
    category: "savingThrowCriticalSuccess",
    saveTypes: ["will"]
  }), "will");
  assert.equal(resolveRequestedCardDeck({
    category: "savingThrowCriticalSuccess",
    saveTypes: ["fortitude", "will"]
  }), "default");
});

test("a specialized deck wins inside its pack while default remains the fallback", () => {
  const pack = normalizePackDefinition(rawPack({
    cards: [rawCard("multi.default")],
    decks: { attack: [rawCard("multi.attack")] }
  }));
  assert.equal(resolvePackCardDeck(pack, "attack"), "attack");
  assert.equal(resolvePackCardDeck(pack, "reflex"), "default");

  const noFallback = normalizePackDefinition(rawPack({
    decks: { reflex: [rawCard("multi.reflex", "savingThrowCriticalSuccess")] }
  }));
  assert.equal(resolvePackCardDeck(noFallback, "will"), null);
});

test("specialized deck categories are validated", () => {
  assert.equal(categorySupportsCardDeck("criticalHit", "attack"), true);
  assert.equal(categorySupportsCardDeck("savingThrowCriticalSuccess", "reflex"), true);
  assert.equal(categorySupportsCardDeck("criticalHit", "will"), false);

  const pack = normalizePackDefinition(rawPack({
    decks: { will: [rawCard("multi.invalid", "criticalHit")] }
  }));
  const report = validatePackDefinition(pack);
  assert.equal(report.valid, false);
  assert.equal(JSON.stringify(report.issues).includes("CARD_DECK_CATEGORY_MISMATCH"), true);
});
