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
      },
      {
        slug: "prone",
        isValued: false,
        uuid: "Compendium.pf2e.conditionitems.Item.prone"
      }
    ])
  ]
]);

installFoundryMock({ packs });
foundry.utils.randomID = () => "bundle-test";

const { initializeEffectEngine } = await import("../scripts/effect-engine/effect-engine.js");
const { initializeConditionCatalog } = await import(
  "../scripts/effect-engine/catalogs/condition-catalog.js"
);
const { createEffectBuilder } = await import(
  "../scripts/effect-engine/builder/effect-builder.js"
);
const { validateEffectDefinition } = await import(
  "../scripts/effect-engine/effect-validator.js"
);
const { compileEffectDefinition } = await import(
  "../scripts/effect-engine/compiler/effect-compiler.js"
);
const {
  buildPf2eEffectSource,
  buildPf2eEffectSources
} = await import("../scripts/effect-engine/compiler/pf2e-item-builder.js");
const {
  applyEffectToTargets,
  createWorldEffectItems,
  updateEffectItem,
  removeEffectsByDefinitionId
} = await import("../scripts/effect-engine/effect-application.js");
const { extractEffectDefinitionFromItem } = await import(
  "../scripts/effect-engine/item-definition-adapter.js"
);
const { EffectDurationSplitError } = await import("../scripts/core/errors.js");
const { createEffectApi } = await import("../scripts/api/effect-api.js");
const { migrateEffectDefinition } = await import(
  "../scripts/effect-engine/migration/migration-engine.js"
);
const {
  parseEffectImport,
  serializeEffectExport
} = await import("../scripts/effect-forge/effect-transfer.js");

initializeEffectEngine();
await initializeConditionCatalog({ force: true });

function multiDurationDefinition() {
  return createEffectBuilder()
    .setId("test.multi-duration")
    .setName("Layered Effect")
    .setDuration(2, "rounds", "turn-end")
    .addModifier({
      selector: "ac",
      value: -1,
      modifierType: "circumstance"
    })
    .addCondition("frightened", 1, {
      duration: { value: 1, unit: "rounds", expiry: "turn-end" }
    })
    .build();
}

function itemDocumentFromSource(source, {
  id = "effect-segment",
  parent = null,
  deleteFn = async () => undefined,
  updateFn = async () => undefined
} = {}) {
  const data = structuredClone(source);
  data._id = id;
  return {
    id,
    uuid: parent ? `Actor.${parent.id}.Item.${id}` : `Item.${id}`,
    documentName: "Item",
    type: data.type,
    name: data.name,
    img: data.img,
    flags: data.flags,
    system: data.system,
    parent,
    toObject: () => structuredClone(data),
    delete: deleteFn,
    update: updateFn
  };
}

test("components inherit the global duration unless they define an override", () => {
  const definition = multiDurationDefinition();

  assert.equal(definition.schemaVersion, 2);
  assert.equal(Object.hasOwn(definition.components[0], "duration"), false);
  assert.deepEqual(definition.components[1].duration, {
    value: 1,
    unit: "rounds",
    expiry: "turn-end"
  });
});

test("EffectBuilder can set and clear a component duration without mutating frozen components", () => {
  const builder = createEffectBuilder()
    .setName("Builder Duration")
    .addCondition("prone");

  builder.setComponentDuration(0, 3, "minutes", "turn-start");
  assert.deepEqual(builder.build().components[0].duration, {
    value: 3,
    unit: "minutes",
    expiry: "turn-start"
  });

  builder.clearComponentDuration(0);
  assert.equal(Object.hasOwn(builder.build().components[0], "duration"), false);
});

test("component duration validation reports the owning component index", () => {
  const definition = structuredClone(multiDurationDefinition());
  definition.components[1].duration = {
    value: -5,
    unit: "rounds",
    expiry: "turn-end"
  };

  const result = validateEffectDefinition(definition);
  const issue = result.issues.find((entry) => entry.code === "SCHEMA_DURATION_VALUE");

  assert.equal(result.valid, false);
  assert.equal(issue?.componentIndex, 1);
});

test("compiler resolves inherited and overridden durations into stable groups", async () => {
  const compiled = await compileEffectDefinition(multiDurationDefinition());

  assert.equal(compiled.requiresDurationSplit, true);
  assert.equal(compiled.durationGroups.length, 2);
  assert.deepEqual(compiled.durationGroups[0].componentIndexes, [0]);
  assert.deepEqual(compiled.durationGroups[0].duration, {
    value: 2,
    unit: "rounds",
    expiry: "turn-end"
  });
  assert.equal(compiled.components[0].durationSource, "global");
  assert.equal(compiled.components[1].durationSource, "component");
  assert.deepEqual(compiled.durationGroups[1].componentIndexes, [1]);
});

test("an override equal to the global duration stays in one native Effect Item", async () => {
  const definition = createEffectBuilder()
    .setName("Same Duration")
    .setDuration(2, "rounds", "turn-end")
    .addCondition("prone", undefined, {
      duration: { value: 2, unit: "rounds", expiry: "turn-end" }
    })
    .addModifier({ selector: "ac", value: -1, modifierType: "status" })
    .build();
  const compiled = await compileEffectDefinition(definition);

  assert.equal(compiled.requiresDurationSplit, false);
  assert.equal(compiled.durationGroups.length, 1);
  assert.deepEqual(compiled.durationGroups[0].componentIndexes, [0, 1]);
});

test("PF2e sources split Rule Elements by effective duration and retain one logical definition", async () => {
  const definition = multiDurationDefinition();
  const compiled = await compileEffectDefinition(definition);
  const sources = buildPf2eEffectSources(compiled, { bundleId: "bundle-1" });

  assert.equal(sources.length, 2);
  assert.deepEqual(sources[0].system.duration, {
    value: 2,
    unit: "rounds",
    expiry: "turn-end",
    sustained: false
  });
  assert.deepEqual(sources[0].system.rules, [{
    key: "FlatModifier",
    selector: "ac",
    value: -1,
    type: "circumstance"
  }]);
  assert.equal(sources[1].system.rules[0].key, "GrantItem");
  assert.equal(sources[0].flags["pf2e-critical-forge"].durationSegment.bundleId, "bundle-1");
  assert.equal(sources[1].flags["pf2e-critical-forge"].durationSegment.segmentIndex, 1);
  assert.deepEqual(
    sources[1].flags["pf2e-critical-forge"].definition,
    definition
  );

  assert.throws(
    () => buildPf2eEffectSource(compiled),
    (error) => error instanceof EffectDurationSplitError
      && error.code === "EFFECT_DURATION_SPLIT_REQUIRED"
  );
});

test("applying a logical effect creates one linked embedded Item per duration group", async () => {
  const calls = [];
  const actor = {
    id: "actor-1",
    documentName: "Actor",
    async createEmbeddedDocuments(type, sources, options) {
      calls.push({ type, sources: structuredClone(sources), options: structuredClone(options) });
      return sources.map((source, index) => ({ id: `created-${index}`, ...source }));
    }
  };

  const created = await applyEffectToTargets(multiDurationDefinition(), actor);

  assert.equal(created.length, 2);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].sources.length, 2);
  const segments = calls[0].sources.map(
    (source) => source.flags["pf2e-critical-forge"].durationSegment
  );
  assert.equal(segments[0].bundleId, "test.multi-duration.bundle-test");
  assert.equal(segments[1].bundleId, segments[0].bundleId);
  assert.deepEqual(segments.map((segment) => segment.segmentIndex), [0, 1]);
});

test("world creation returns every duration segment and opens only the primary sheet", async () => {
  const previousItem = globalThis.Item;
  const calls = [];
  globalThis.Item = {
    async create(source, options) {
      calls.push({ source: structuredClone(source), options: structuredClone(options) });
      return { id: `world-${calls.length}`, ...source };
    }
  };

  try {
    const created = await createWorldEffectItems(multiDurationDefinition(), { renderSheet: true });
    assert.equal(created.length, 2);
    assert.deepEqual(calls.map((call) => call.options.renderSheet), [true, false]);
    assert.equal(
      calls[0].source.flags["pf2e-critical-forge"].durationSegment.bundleId,
      calls[1].source.flags["pf2e-critical-forge"].durationSegment.bundleId
    );
  } finally {
    globalThis.Item = previousItem;
  }
});

test("updating one duration segment replaces stale siblings as one bundle", async () => {
  const definition = multiDurationDefinition();
  const compiled = await compileEffectDefinition(definition);
  const sources = buildPf2eEffectSources(compiled, { bundleId: "existing-bundle" });
  const deleted = [];
  const created = [];
  const parent = {
    id: "actor-2",
    documentName: "Actor",
    items: [],
    async createEmbeddedDocuments(type, newSources) {
      created.push({ type, sources: structuredClone(newSources) });
      return newSources;
    }
  };
  let updateChanges = null;
  const primary = itemDocumentFromSource(sources[0], {
    id: "primary",
    parent,
    updateFn: async function update(changes) {
      updateChanges = structuredClone(changes);
      this.flags = changes.flags;
      this.system = { ...this.system, ...changes.system };
      this.name = changes.name;
      return this;
    }
  });
  const sibling = itemDocumentFromSource(sources[1], {
    id: "secondary",
    parent,
    deleteFn: async () => deleted.push("secondary")
  });
  parent.items = [primary, sibling];

  const replacement = createEffectBuilder()
    .setId("test.multi-duration")
    .setName("Layered Effect")
    .setDuration(3, "rounds", "turn-end")
    .addModifier({ selector: "ac", value: -2, modifierType: "circumstance" })
    .addCondition("frightened", 2, {
      duration: { value: 1, unit: "rounds", expiry: "turn-end" }
    })
    .build();

  await updateEffectItem(primary, replacement, { render: false });

  assert.deepEqual(deleted, ["secondary"]);
  assert.equal(created.length, 1);
  assert.equal(created[0].sources.length, 1);
  assert.equal(updateChanges.flags["pf2e-critical-forge"].durationSegment.bundleId, "existing-bundle");
  assert.equal(updateChanges.system.duration.value, 3);
});

test("opening any duration segment restores the full logical Effect Definition", async () => {
  const definition = multiDurationDefinition();
  const compiled = await compileEffectDefinition(definition);
  const sources = buildPf2eEffectSources(compiled, { bundleId: "read-bundle" });
  const secondary = itemDocumentFromSource(sources[1], { id: "secondary-read" });

  const result = await extractEffectDefinitionFromItem(secondary);

  assert.equal(result.source, "stored-definition");
  assert.equal(result.definition.name, definition.name);
  assert.deepEqual(result.definition.duration, definition.duration);
  assert.deepEqual(result.definition.components[0], {
    type: "modifier",
    selector: "ac",
    value: -1,
    modifierType: "circumstance"
  });
  assert.deepEqual(result.definition.components[1], definition.components[1]);
});

test("schema migration and JSON transfer preserve duration inheritance semantics", () => {
  const legacy = {
    schemaVersion: 1,
    name: "Legacy",
    duration: { value: 2, unit: "rounds", expiry: "turn-end" },
    components: [
      { type: "condition", slug: "prone", duration: null },
      {
        type: "modifier",
        selector: "ac",
        value: -1,
        modifierType: "status",
        duration: { value: 1, unit: "rounds", expiry: "turn-end" }
      }
    ],
    application: {},
    metadata: {}
  };

  const migrated = migrateEffectDefinition(legacy);
  assert.equal(migrated.toVersion, 2);
  assert.equal(Object.hasOwn(migrated.definition.components[0], "duration"), false);
  assert.deepEqual(migrated.definition.components[1].duration, legacy.components[1].duration);

  const imported = parseEffectImport(serializeEffectExport(migrated.definition));
  assert.deepEqual(imported.definition, migrated.definition);
});


test("public effect API exposes strict singular and complete plural source methods", async () => {
  const effects = createEffectApi();
  const sources = await effects.toItemSources(multiDurationDefinition());
  assert.equal(sources.length, 2);
  await assert.rejects(
    () => effects.toItemSource(multiDurationDefinition()),
    (error) => error instanceof EffectDurationSplitError
  );
});

test("definition-based removal deletes every duration segment on an Actor", async () => {
  const deletedCalls = [];
  const actor = {
    documentName: "Actor",
    items: [
      { id: "segment-a", flags: { "pf2e-critical-forge": { definitionId: "test.multi-duration" } } },
      { id: "segment-b", flags: { "pf2e-critical-forge": { definitionId: "test.multi-duration" } } },
      { id: "other", flags: { "pf2e-critical-forge": { definitionId: "other.effect" } } }
    ],
    async deleteEmbeddedDocuments(type, ids) {
      deletedCalls.push({ type, ids: [...ids] });
      return ids.map((id) => ({ id }));
    }
  };

  const removed = await removeEffectsByDefinitionId("test.multi-duration", actor);
  assert.deepEqual(deletedCalls, [{ type: "Item", ids: ["segment-a", "segment-b"] }]);
  assert.deepEqual(removed.map((item) => item.id), ["segment-a", "segment-b"]);
});
