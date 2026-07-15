import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";
import { shakenNerves } from "./fixtures/effects.js";

installFoundryMock();

const {
  EffectMigrationError,
  migrateEffectDefinition
} = await import("../scripts/effect-engine/migration/migration-engine.js");
const { parseEffectImport } = await import("../scripts/effect-forge/effect-transfer.js");

test("current Effect Definitions pass through migration unchanged", () => {
  const source = shakenNerves();
  const result = migrateEffectDefinition(source);

  assert.equal(result.migrated, false);
  assert.equal(result.fromVersion, 1);
  assert.equal(result.toVersion, 1);
  assert.deepEqual(result.definition, source);
  assert.notEqual(result.definition, source);
});

test("legacy schema 0 aliases migrate to schema 1", () => {
  const legacy = {
    id: "legacy.effect",
    name: "Legacy Effect",
    image: "icons/svg/fire.svg",
    duration: 3,
    effects: [
      { type: "condition", condition: "frightened", value: 1 },
      {
        type: "persistent-damage",
        damageFormula: "1d6",
        damage_type: "fire"
      },
      {
        type: "modifier",
        selector: "will",
        value: -1,
        bonusType: "circumstance"
      }
    ]
  };

  const result = migrateEffectDefinition(legacy);

  assert.equal(result.migrated, true);
  assert.equal(result.fromVersion, 0);
  assert.equal(result.toVersion, 1);
  assert.equal(result.definition.schemaVersion, 1);
  assert.equal(result.definition.img, "icons/svg/fire.svg");
  assert.deepEqual(result.definition.duration, {
    value: 3,
    unit: "rounds",
    expiry: "turn-end"
  });
  assert.deepEqual(result.definition.components, [
    { type: "condition", slug: "frightened", value: 1 },
    { type: "persistentDamage", formula: "1d6", damageType: "fire" },
    {
      type: "modifier",
      selector: "will",
      value: -1,
      modifierType: "circumstance"
    }
  ]);
  assert.equal(Object.hasOwn(legacy, "schemaVersion"), false);
  assert.equal(Object.hasOwn(legacy, "image"), true);
});

test("imports automatically migrate legacy raw definitions", () => {
  const imported = parseEffectImport(JSON.stringify({
    name: "Old Prone",
    components: [{ type: "condition", condition: "prone" }]
  }));

  assert.equal(imported.migration.migrated, true);
  assert.equal(imported.definition.schemaVersion, 1);
  assert.deepEqual(imported.definition.components, [
    { type: "condition", slug: "prone" }
  ]);
});

test("future schema versions fail with a stable migration error", () => {
  assert.throws(
    () => migrateEffectDefinition({
      schemaVersion: 999,
      name: "Future",
      components: []
    }),
    (error) => error instanceof EffectMigrationError
      && error.code === "MIGRATION_FUTURE_VERSION"
  );
});
