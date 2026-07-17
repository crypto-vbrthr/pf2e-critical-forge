import test from "node:test";
import assert from "node:assert/strict";
import {
  createConditionPack,
  installFoundryMock
} from "./helpers/foundry-mock.js";

const packs = new Map([
  [
    "pf2e.conditionitems",
    createConditionPack([
      {
        slug: "frightened",
        isValued: true,
        uuid: "Compendium.pf2e.conditionitems.Item.frightened"
      }
    ])
  ]
]);

installFoundryMock({ packs });
game.user = { id: "gm-1", isGM: true };
foundry.utils.randomID = () => "expanded-bundle";

let createItemHook = null;
globalThis.Hooks = {
  on(name, callback) {
    if (name === "createItem") createItemHook = callback;
  }
};

const { initializeEffectEngine } = await import("../scripts/effect-engine/effect-engine.js");
const { initializeConditionCatalog } = await import(
  "../scripts/effect-engine/catalogs/condition-catalog.js"
);
const { createEffectBuilder } = await import(
  "../scripts/effect-engine/builder/effect-builder.js"
);
const { compileEffectDefinition } = await import(
  "../scripts/effect-engine/compiler/effect-compiler.js"
);
const { buildPf2eEffectSources } = await import(
  "../scripts/effect-engine/compiler/pf2e-item-builder.js"
);
const { initializeDurationBundleHooks } = await import(
  "../scripts/effect-engine/duration-bundle-hooks.js"
);

initializeEffectEngine();
await initializeConditionCatalog({ force: true });
initializeDurationBundleHooks();

function definition() {
  return createEffectBuilder()
    .setId("test.manual-drop")
    .setName("Manual Drop Bundle")
    .setDuration(2, "rounds", "turn-end")
    .addModifier({ selector: "ac", value: -1, modifierType: "status" })
    .addCondition("frightened", 1, {
      duration: { value: 1, unit: "rounds", expiry: "turn-end" }
    })
    .build();
}

test("manually dropping one duration segment expands it into the complete Actor bundle", async () => {
  assert.equal(typeof createItemHook, "function");

  const logicalDefinition = definition();
  const compiled = await compileEffectDefinition(logicalDefinition);
  const [source] = buildPf2eEffectSources(compiled, { bundleId: "drag-bundle" });
  const calls = [];
  let deleted = 0;
  const actor = {
    id: "actor-1",
    documentName: "Actor",
    items: [],
    async createEmbeddedDocuments(type, sources, options) {
      calls.push({ type, sources: structuredClone(sources), options: structuredClone(options) });
      return sources.map((entry, index) => ({ id: `created-${index}`, ...entry }));
    }
  };
  const dropped = {
    id: "dropped-segment",
    uuid: "Actor.actor-1.Item.dropped-segment",
    documentName: "Item",
    parent: actor,
    flags: structuredClone(source.flags),
    async delete() {
      deleted += 1;
      actor.items = actor.items.filter((item) => item !== this);
    }
  };
  actor.items = [dropped];

  await createItemHook(dropped, {}, "gm-1");

  assert.equal(deleted, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "Item");
  assert.equal(calls[0].sources.length, 2);
  assert.equal(
    calls[0].options["pf2e-critical-forge"].durationBundleComplete,
    true
  );
  assert.deepEqual(
    calls[0].sources.map((entry) => entry.flags["pf2e-critical-forge"].durationSegment.segmentIndex),
    [0, 1]
  );

  await createItemHook(dropped, {
    "pf2e-critical-forge": { durationBundleComplete: true }
  }, "gm-1");
  assert.equal(calls.length, 1);
});
