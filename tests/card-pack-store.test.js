import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();
const stored = new Map();
game.user = { isGM: true };
game.settings = {
  get: (_module, key) => stored.get(key) ?? { storageVersion: 1, packs: [] },
  set: async (_module, key, value) => {
    stored.set(key, structuredClone(value));
    return value;
  }
};

const { initializeEffectEngine } = await import("../scripts/effect-engine/effect-engine.js");
const { initializeCriticalForge, criticalCardRegistry } = await import("../scripts/critical-forge/critical-forge.js");
const { createEditableCard, createEditablePack } = await import("../scripts/critical-forge/editor/card-editor-model.js");
const {
  deleteCustomCardPack,
  hydrateRegisteredPack,
  listStoredCustomPacks,
  saveCustomCardPack
} = await import("../scripts/critical-forge/editor/card-pack-store.js");

initializeEffectEngine();
initializeCriticalForge();

test("custom card packs persist and immediately join the live registries", async () => {
  const pack = createEditablePack({ id: "store-test", title: "Store Test" });
  pack.cards.push(createEditableCard({ packId: pack.id, id: "store-test.card" }));

  await saveCustomCardPack(pack);
  assert.equal(listStoredCustomPacks().length, 1);
  assert.equal(hydrateRegisteredPack("store-test").cards.length, 1);
  assert.equal(criticalCardRegistry.get("store-test.card")?.packId, "store-test");

  await deleteCustomCardPack("store-test");
  assert.equal(listStoredCustomPacks().length, 0);
  assert.equal(hydrateRegisteredPack("store-test"), null);
});

test("custom packs cannot overwrite the protected core pack", async () => {
  const pack = createEditablePack({ id: "core" });
  assert.rejects(() => saveCustomCardPack(pack), /protected pack/u);
});
