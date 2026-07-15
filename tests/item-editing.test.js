import test from "node:test";
import assert from "node:assert/strict";
import {
  createConditionPack,
  installFoundryMock
} from "./helpers/foundry-mock.js";
import { fireResistance, shakenNerves } from "./fixtures/effects.js";

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
        slug: "persistent-damage",
        isValued: false,
        uuid: "Compendium.pf2e.conditionitems.Item.persistent-damage"
      }
    ])
  ]
]);

installFoundryMock({
  packs,
  damageTypes: { bleed: "PF2E.TraitBleed", fire: "PF2E.TraitFire" },
  resistanceTypes: { fire: "PF2E.TraitFire" }
});

const { initializeEffectEngine } = await import(
  "../scripts/effect-engine/effect-engine.js"
);
const { initializeConditionCatalog } = await import(
  "../scripts/effect-engine/catalogs/condition-catalog.js"
);
const { compileEffectDefinition } = await import(
  "../scripts/effect-engine/compiler/effect-compiler.js"
);
const { buildPf2eEffectSource } = await import(
  "../scripts/effect-engine/compiler/pf2e-item-builder.js"
);
const {
  extractEffectDefinitionFromItem,
  parseEffectItemRules
} = await import("../scripts/effect-engine/item-definition-adapter.js");
const {
  createWorldEffectItem,
  updateEffectItem
} = await import(
  "../scripts/effect-engine/effect-application.js"
);

initializeEffectEngine();
await initializeConditionCatalog({ force: true });

function itemFromSource(source, { id = "world-effect-1" } = {}) {
  const data = structuredClone(source);
  data._id = id;
  return {
    id,
    uuid: `Item.${id}`,
    type: data.type,
    name: data.name,
    img: data.img,
    flags: data.flags,
    system: data.system,
    toObject: () => structuredClone(data)
  };
}

test("newly compiled Items store the complete Effect Definition in flags", async () => {
  const definition = shakenNerves();
  const compiled = await compileEffectDefinition(definition);
  const source = buildPf2eEffectSource(compiled);
  const stored = source.flags["pf2e-critical-forge"].definition;

  assert.equal(stored.id, definition.id);
  assert.deepEqual(stored.components, definition.components);
  assert.deepEqual(stored.duration, definition.duration);
});

test("Effect Items round-trip into editable components", async () => {
  const compiled = await compileEffectDefinition(shakenNerves());
  const item = itemFromSource(buildPf2eEffectSource(compiled));
  const result = await extractEffectDefinitionFromItem(item);

  assert.equal(result.definition.name, "Erschütterte Nerven");
  assert.equal(result.definition.description, "Das Ziel ist erschüttert.");
  assert.deepEqual(result.definition.components, [
    { type: "condition", slug: "frightened", value: 2 },
    {
      type: "modifier",
      selector: "will",
      value: -1,
      modifierType: "circumstance"
    }
  ]);
  assert.deepEqual(result.unmanagedRules, []);
});

test("legacy and foreign Items preserve unsupported Rule Elements", async () => {
  const source = {
    _id: "legacy-effect",
    name: "Alter Schutz",
    type: "effect",
    img: "icons/svg/shield.svg",
    system: {
      description: { value: "<p>Ein alter Effekt.</p>" },
      duration: { value: 10, unit: "minutes", expiry: "turn-end" },
      rules: [
        { key: "Resistance", type: "fire", value: 5 },
        { key: "FlatModifier", selector: "land-speed", value: 10, type: "status" },
        { key: "Aura", radius: 10, effects: [] }
      ]
    },
    flags: {
      "pf2e-critical-forge": {
        definitionId: "legacy.fire-shield",
        definition: {
          schemaVersion: 1,
          id: "legacy.fire-shield",
          application: {},
          metadata: { originModule: "pf2e-critical-forge" }
        }
      }
    }
  };

  const result = await extractEffectDefinitionFromItem(itemFromSource(source, { id: "legacy-effect" }));

  assert.deepEqual(result.definition.components, [
    { type: "resistance", resistanceType: "fire", value: 5 },
    { type: "movement", movementType: "land", value: 10, modifierType: "status" }
  ]);
  assert.deepEqual(result.unmanagedRules, [
    { key: "Aura", radius: 10, effects: [] }
  ]);
  assert.equal(result.warnings[0].code, "ITEM_UNMANAGED_RULES_PRESERVED");
});

test("rule parser recognizes persistent damage and granted conditions", async () => {
  const result = await parseEffectItemRules([
    {
      key: "GrantItem",
      uuid: "Compendium.pf2e.conditionitems.Item.frightened",
      allowDuplicate: false,
      alterations: [{ mode: "override", property: "badge-value", value: 3 }]
    },
    {
      key: "GrantItem",
      uuid: "Compendium.pf2e.conditionitems.Item.persistent-damage",
      allowDuplicate: true,
      alterations: [
        {
          mode: "override",
          property: "persistent-damage",
          value: { formula: "1d6", damageType: "bleed" }
        },
        { mode: "override", property: "pd-recovery-dc", value: 19 }
      ]
    }
  ]);

  assert.deepEqual(result.components, [
    { type: "condition", slug: "frightened", value: 3 },
    { type: "persistentDamage", formula: "1d6", damageType: "bleed", dc: 19 }
  ]);
  assert.deepEqual(result.unmanagedRules, []);
});

test("updating an Item preserves unmanaged rules and refreshes definition flags", async () => {
  let captured = null;
  const item = {
    id: "editable-effect",
    type: "effect",
    async update(changes, options) {
      captured = { changes, options };
      return this;
    }
  };
  const unmanagedRules = [{ key: "Aura", radius: 15, effects: [] }];

  await updateEffectItem(item, fireResistance({ value: 7 }), {
    unmanagedRules,
    render: false
  });

  assert.equal(captured.options.render, false);
  assert.equal(captured.changes.type, undefined);
  assert.deepEqual(captured.changes.system.rules, [
    { key: "Resistance", type: "fire", value: 7 },
    unmanagedRules[0]
  ]);
  assert.deepEqual(
    captured.changes.flags["pf2e-critical-forge"].unmanagedRules,
    unmanagedRules
  );
  assert.deepEqual(
    captured.changes.flags["pf2e-critical-forge"].definition.components,
    fireResistance({ value: 7 }).components
  );
});


test("creating a copy also preserves unmanaged rules", async () => {
  let captured = null;
  const previousItem = globalThis.Item;
  globalThis.Item = {
    async create(source, options) {
      captured = { source, options };
      return { id: "created-copy", ...source };
    }
  };

  try {
    const unmanagedRules = [{ key: "Aura", radius: 20, effects: [] }];
    await createWorldEffectItem(fireResistance({ value: 4 }), {
      unmanagedRules,
      renderSheet: false
    });

    assert.deepEqual(captured.source.system.rules, [
      { key: "Resistance", type: "fire", value: 4 },
      unmanagedRules[0]
    ]);
    assert.deepEqual(
      captured.source.flags["pf2e-critical-forge"].unmanagedRules,
      unmanagedRules
    );
    assert.equal(captured.options.renderSheet, false);
  } finally {
    globalThis.Item = previousItem;
  }
});
