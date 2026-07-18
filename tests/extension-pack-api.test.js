import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();

const events = [];
globalThis.Hooks = {
  callAll(hook, payload) {
    events.push({ hook, payload });
  }
};

const { initializeEffectEngine } = await import("../scripts/effect-engine/effect-engine.js");
const {
  initializeCriticalForge,
  criticalCardRegistry,
  criticalPackRegistry
} = await import("../scripts/critical-forge/critical-forge.js");
const {
  createExtensionPackApi,
  CRITICAL_FORGE_PACKS_CHANGED_HOOK
} = await import("../scripts/critical-forge/extensions/extension-pack-service.js");
const { createCardApi } = await import("../scripts/api/card-api.js");

initializeEffectEngine();
initializeCriticalForge();

const SOURCE = "test-critical-extension";

function card(packId, suffix, { category = "criticalHit", filters = {} } = {}) {
  const id = `${packId}.${suffix}`;
  return {
    schemaVersion: 1,
    id,
    packId,
    category,
    tone: "neutral",
    impact: "narrative",
    titleKey: `TEST_EXTENSION.${suffix}.Title`,
    descriptionKey: `TEST_EXTENSION.${suffix}.Description`,
    fallbackTitle: suffix,
    fallbackDescription: `Extension result ${suffix}.`,
    weight: 1,
    tags: ["extension-api-test"],
    filters,
    effect: null,
    metadata: {}
  };
}

function pack(suffix, cardSuffixes = ["first"], options = {}) {
  const id = `${SOURCE}.${suffix}`;
  return {
    schemaVersion: 1,
    id,
    titleKey: `TEST_EXTENSION.Pack.${suffix}.Title`,
    descriptionKey: `TEST_EXTENSION.Pack.${suffix}.Description`,
    fallbackTitle: `Test ${suffix}`,
    fallbackDescription: `Test extension pack ${suffix}.`,
    version: options.version ?? "1.0.0",
    sourceModule: "spoofed-owner",
    priority: options.priority ?? 10,
    enabled: options.enabled ?? true,
    metadata: { supplied: true, managedBy: "pf2e-critical-forge" },
    cards: cardSuffixes.map((entry) => card(id, entry, options))
  };
}

function cleanup() {
  createExtensionPackApi(SOURCE).unregisterAll();
  events.length = 0;
}

test("the public card API exposes a module-bound extension registry", () => {
  const api = createCardApi();
  assert.equal(api.extensions.changedHook, CRITICAL_FORGE_PACKS_CHANGED_HOOK);
  assert.equal(typeof api.extensions.forModule, "function");
  assert.equal(api.extensions.forModule(SOURCE).sourceModule, SOURCE);
  assert.throws(
    () => api.extensions.forModule("pf2e-critical-forge"),
    /reserved for the Critical Forge core/u
  );
});

test("an extension module can register several protected packs transactionally", () => {
  cleanup();
  const extension = createExtensionPackApi(SOURCE);
  const registered = extension.registerPacks([
    pack("martial", ["sweep", "reversal"]),
    pack("arcane", ["surge"], { category: "spellCriticalHit", enabled: false })
  ]);

  assert.equal(registered.length, 2);
  assert.deepEqual(extension.listPacks().map((entry) => entry.id), [
    `${SOURCE}.arcane`,
    `${SOURCE}.martial`
  ]);
  assert.equal(criticalCardRegistry.get(`${SOURCE}.martial.sweep`)?.packId, `${SOURCE}.martial`);
  assert.equal(criticalCardRegistry.list({ packId: `${SOURCE}.arcane` }).length, 0);
  assert.equal(criticalCardRegistry.list({ packId: `${SOURCE}.arcane`, enabledPacksOnly: false }).length, 1);

  const stored = criticalPackRegistry.get(`${SOURCE}.martial`);
  assert.equal(stored.sourceModule, SOURCE);
  assert.equal(stored.metadata.extension, true);
  assert.equal(stored.metadata.extensionModule, SOURCE);
  assert.equal(stored.metadata.managedBy, SOURCE);

  assert.equal(events.at(-1)?.hook, CRITICAL_FORGE_PACKS_CHANGED_HOOK);
  assert.deepEqual(events.at(-1)?.payload.packIds, [
    `${SOURCE}.martial`,
    `${SOURCE}.arcane`
  ]);
  cleanup();
});


test("extension packs can exclude normalized attack traits", () => {
  cleanup();
  const extension = createExtensionPackApi(SOURCE);
  const definition = pack("weapon-only", ["ranged-not-spell"]);
  definition.cards[0].filters = {
    attackTraits: ["ranged"],
    excludedAttackTraits: ["spell"]
  };
  extension.registerPack(definition);

  const card = criticalCardRegistry.get(`${SOURCE}.weapon-only.ranged-not-spell`);
  assert.deepEqual(card.filters.attackTraits, ["ranged"]);
  assert.deepEqual(card.filters.excludedAttackTraits, ["spell"]);
  cleanup();
});

test("an extension can replace only packs it owns", () => {
  cleanup();
  const extension = createExtensionPackApi(SOURCE);
  extension.registerPack(pack("replaceable", ["old"]));

  const replaced = extension.registerPack(pack("replaceable", ["new"], { version: "2.0.0" }), {
    replace: true
  });
  assert.equal(replaced.version, "2.0.0");
  assert.equal(criticalCardRegistry.get(`${SOURCE}.replaceable.old`), null);
  assert.ok(criticalCardRegistry.get(`${SOURCE}.replaceable.new`));

  assert.throws(
    () => extension.registerPack({ ...pack("foreign"), id: "core" }, { replace: true }),
    /owned by pf2e-critical-forge/u
  );
  assert.equal(criticalPackRegistry.get("core")?.sourceModule, "pf2e-critical-forge");
  cleanup();
});

test("a failed batch leaves the registry unchanged", () => {
  cleanup();
  const extension = createExtensionPackApi(SOURCE);
  extension.registerPack(pack("stable", ["original"]));
  const before = extension.getPack(`${SOURCE}.stable`);

  const duplicate = pack("other", ["duplicate"]);
  duplicate.cards[0].id = "core.generic.spectacular-hit";

  assert.throws(
    () => extension.registerPacks([
      pack("stable", ["replacement"], { version: "2.0.0" }),
      duplicate
    ], { replace: true }),
    /already registered/u
  );

  assert.deepEqual(extension.getPack(`${SOURCE}.stable`), before);
  assert.equal(criticalPackRegistry.get(`${SOURCE}.other`), null);
  cleanup();
});

test("an extension controller cannot remove another source's pack", () => {
  cleanup();
  const extension = createExtensionPackApi(SOURCE);
  assert.throws(() => extension.unregisterPack("core"), /owned by pf2e-critical-forge/u);
  assert.equal(criticalPackRegistry.has("core"), true);
});

test("unregisterAll removes only packs owned by the extension", () => {
  cleanup();
  const extension = createExtensionPackApi(SOURCE);
  extension.registerPacks([pack("one"), pack("two", ["a", "b"])]);

  const result = extension.unregisterAll();
  assert.equal(result.packsRemoved, 2);
  assert.equal(result.cardsRemoved, 3);
  assert.equal(extension.listPacks().length, 0);
  assert.equal(criticalPackRegistry.has("core"), true);
  assert.equal(events.at(-1)?.payload.action, "unregister-all");
});
