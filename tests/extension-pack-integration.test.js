import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();

const { initializeEffectEngine } = await import("../scripts/effect-engine/effect-engine.js");
const {
  initializeCriticalForge,
  criticalCardRegistry,
  criticalCardSelector,
  criticalPackRegistry,
  registerCriticalPack,
  unregisterCriticalPack
} = await import("../scripts/critical-forge/critical-forge.js");

initializeEffectEngine();
initializeCriticalForge();

function extensionPack({ enabled = false, cardId = "example-expansion.arcane-overflow" } = {}) {
  return {
    schemaVersion: 1,
    id: "example-expansion",
    titleKey: "EXAMPLE_EXPANSION.Pack.Title",
    descriptionKey: "EXAMPLE_EXPANSION.Pack.Description",
    fallbackTitle: "Example Expansion",
    fallbackDescription: "Cards supplied by a separate optional module.",
    version: "1.0.0",
    sourceModule: "example-expansion",
    priority: 20,
    enabled,
    metadata: { extension: true },
    cards: [{
      schemaVersion: 1,
      id: cardId,
      packId: "example-expansion",
      category: "spellCriticalHit",
      tone: "dramatic",
      impact: "moderate",
      titleKey: "EXAMPLE_EXPANSION.Card.ArcaneOverflow.Title",
      descriptionKey: "EXAMPLE_EXPANSION.Card.ArcaneOverflow.Description",
      fallbackTitle: "Arcane Overflow",
      fallbackDescription: "The spell leaves a violent wake of energy.",
      weight: 10,
      tags: ["extension-test"],
      filters: {},
      effect: null,
      metadata: {}
    }]
  };
}

test("an optional module can register, activate, replace, and remove its own pack", () => {
  const disabled = extensionPack({ enabled: false });
  registerCriticalPack(disabled);

  assert.equal(criticalPackRegistry.list({ enabledOnly: true }).some((pack) => pack.id === disabled.id), false);
  assert.equal(criticalCardRegistry.list({ packId: disabled.id }).length, 0);
  assert.equal(criticalCardRegistry.list({ packId: disabled.id, enabledPacksOnly: false }).length, 1);

  const enabled = extensionPack({ enabled: true });
  registerCriticalPack(enabled, { replace: true });
  const coreSpellIds = criticalCardRegistry
    .list({ packId: "core", category: "spellCriticalHit", enabledPacksOnly: false })
    .map((card) => card.id);
  const selected = criticalCardSelector.select({ category: "spellCriticalHit" }, {
    excludeCardIds: coreSpellIds,
    random: () => 0
  });
  assert.equal(selected.selected?.id, enabled.cards[0].id);

  const conflicting = extensionPack({ enabled: true, cardId: "core.generic.spectacular-hit" });
  assert.throws(() => registerCriticalPack(conflicting, { replace: true }), /already registered/u);
  assert.equal(criticalCardRegistry.get(enabled.cards[0].id)?.packId, enabled.id);
  assert.equal(criticalPackRegistry.get(enabled.id)?.enabled, true);

  const removed = unregisterCriticalPack(enabled.id);
  assert.equal(removed.removed, true);
  assert.equal(removed.cardsRemoved, 1);
  assert.equal(criticalCardRegistry.get(enabled.cards[0].id), null);
  assert.equal(criticalCardRegistry.list({ packId: "core", enabledPacksOnly: false }).length, 96);
});
