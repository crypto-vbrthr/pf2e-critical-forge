import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();
const stored = new Map();
let failNextPersist = false;
game.user = { isGM: true };
game.settings = {
  get: (_module, key) => stored.get(key) ?? { storageVersion: 1, packs: [] },
  set: async (_module, key, value) => {
    if (failNextPersist) {
      failNextPersist = false;
      throw new Error("Simulated settings persistence failure");
    }
    stored.set(key, structuredClone(value));
    return value;
  }
};

const { SETTINGS } = await import("../scripts/constants.js");
const { initializeEffectEngine } = await import("../scripts/effect-engine/effect-engine.js");
const {
  initializeCriticalForge,
  criticalCardRegistry,
  criticalCardSelector,
  criticalPackRegistry
} = await import("../scripts/critical-forge/critical-forge.js");
const { createEditableCard, createEditablePack } = await import("../scripts/critical-forge/editor/card-editor-model.js");
const {
  deleteCustomCardPack,
  hydrateRegisteredPack,
  initializeCustomCardPacks,
  listStoredCustomPacks,
  saveCustomCardPack
} = await import("../scripts/critical-forge/editor/card-pack-store.js");

initializeEffectEngine();
initializeCriticalForge();

function makePack(id, { enabled = true, cardId = `${id}.card`, title = id } = {}) {
  const pack = createEditablePack({ id, title });
  pack.enabled = enabled;
  pack.cards.push(createEditableCard({ packId: pack.id, id: cardId }));
  return pack;
}

function excludeCoreCardIds() {
  return criticalCardRegistry
    .list({ packId: "core", enabledPacksOnly: false })
    .map((card) => card.id);
}

test("custom card packs persist and immediately join the live registries", async () => {
  const pack = makePack("store-test", { title: "Store Test" });

  await saveCustomCardPack(pack);
  assert.equal(listStoredCustomPacks().length, 1);
  assert.equal(hydrateRegisteredPack("store-test").cards.length, 1);
  assert.equal(criticalCardRegistry.get("store-test.card")?.packId, "store-test");

  await deleteCustomCardPack("store-test");
  assert.equal(listStoredCustomPacks().length, 0);
  assert.equal(hydrateRegisteredPack("store-test"), null);
});

test("Paket aktivieren controls live selection without hiding the editable pack", async () => {
  const pack = makePack("activation-test", { enabled: false });
  pack.cards[0].weight = 100;

  await saveCustomCardPack(pack);
  assert.equal(criticalPackRegistry.get(pack.id)?.enabled, false);
  assert.equal(criticalCardRegistry.list({ packId: pack.id }).length, 0);
  assert.equal(criticalCardRegistry.list({ packId: pack.id, enabledPacksOnly: false }).length, 1);
  assert.equal(hydrateRegisteredPack(pack.id)?.cards.length, 1);

  const disabledSelection = criticalCardSelector.select({ category: "criticalHit" }, {
    excludeCardIds: excludeCoreCardIds(),
    random: () => 0
  });
  assert.equal(disabledSelection.selected, null);

  pack.enabled = true;
  await saveCustomCardPack(pack, { previousId: pack.id });
  const enabledSelection = criticalCardSelector.select({ category: "criticalHit" }, {
    excludeCardIds: excludeCoreCardIds(),
    random: () => 0
  });
  assert.equal(enabledSelection.selected?.id, pack.cards[0].id);

  await deleteCustomCardPack(pack.id);
});

test("a settings write failure restores the previous live registry state", async () => {
  const original = makePack("rollback-test", {
    cardId: "rollback-test.original",
    title: "Original"
  });
  await saveCustomCardPack(original);

  const replacement = makePack("rollback-test", {
    cardId: "rollback-test.replacement",
    title: "Replacement"
  });
  failNextPersist = true;
  await assert.rejects(
    () => saveCustomCardPack(replacement, { previousId: original.id }),
    /Simulated settings persistence failure/u
  );

  const live = hydrateRegisteredPack(original.id);
  assert.equal(live?.fallbackTitle, "Original");
  assert.equal(criticalCardRegistry.get("rollback-test.original")?.packId, original.id);
  assert.equal(criticalCardRegistry.get("rollback-test.replacement"), null);
  assert.equal(listStoredCustomPacks()[0]?.fallbackTitle, "Original");

  await deleteCustomCardPack(original.id);
});

test("corrupt stored data cannot replace the protected core pack", async () => {
  const corrupt = makePack("core", { cardId: "core.intruder", title: "Intruder" });
  stored.set(SETTINGS.CRITICAL_CUSTOM_CARD_PACKS, {
    storageVersion: 1,
    packs: [corrupt]
  });

  const previousError = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args);
  try {
    await initializeCustomCardPacks();
  } finally {
    console.error = previousError;
  }

  assert.equal(criticalPackRegistry.get("core")?.sourceModule, "pf2e-critical-forge");
  assert.equal(criticalCardRegistry.list({ packId: "core", enabledPacksOnly: false }).length, 96);
  assert.equal(criticalCardRegistry.get("core.intruder"), null);
  assert.equal(errors.length, 1);

  stored.set(SETTINGS.CRITICAL_CUSTOM_CARD_PACKS, { storageVersion: 1, packs: [] });
  await initializeCustomCardPacks();
});

test("custom packs cannot overwrite the protected core pack", async () => {
  const pack = createEditablePack({ id: "core" });
  await assert.rejects(() => saveCustomCardPack(pack), /protected pack/u);
});
