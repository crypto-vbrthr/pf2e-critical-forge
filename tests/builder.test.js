import test from "node:test";
import assert from "node:assert/strict";
import { assertDeepFrozen, installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();
const { EffectBuilder, createEffectBuilder } = await import(
  "../scripts/effect-engine/builder/effect-builder.js"
);

test("EffectBuilder creates an immutable normalized definition", () => {
  const definition = createEffectBuilder()
    .setId("  example.effect  ")
    .setName("  Test Effect  ")
    .setDescription("<p>Text</p>")
    .setImage("")
    .setDuration(2, "rounds", "turn-end")
    .addCondition("frightened", "2")
    .addModifier({
      selector: "will",
      value: "-1",
      modifierType: "circumstance",
      predicate: ["self:condition:frightened"]
    })
    .addPersistentDamage({
      formula: "1d6",
      damageType: "bleed",
      dc: "17"
    })
    .addResistance({
      resistanceType: "fire",
      value: "5"
    })
    .addWeakness({
      weaknessType: "cold",
      value: "3"
    })
    .addImmunity({
      immunityType: "poison"
    })
    .addFastHealing({ value: "4" })
    .addRegeneration({ value: "5", deactivatedBy: ["acid", "fire", "acid"] })
    .addTemporaryHitPoints({ value: "7" })
    .setMetadata({ originModule: "tests", nested: { enabled: true } })
    .build();

  assert.equal(definition.schemaVersion, 1);
  assert.equal(definition.id, "example.effect");
  assert.equal(definition.name, "Test Effect");
  assert.equal(definition.img, "icons/svg/aura.svg");
  assert.deepEqual(definition.duration, {
    value: 2,
    unit: "rounds",
    expiry: "turn-end"
  });
  assert.deepEqual(definition.components[0], {
    type: "condition",
    slug: "frightened",
    value: 2
  });
  assert.equal(definition.components[1].value, -1);
  assert.deepEqual(definition.components[2], {
    type: "persistentDamage",
    formula: "1d6",
    damageType: "bleed",
    dc: 17
  });
  assert.deepEqual(definition.components[3], {
    type: "resistance",
    resistanceType: "fire",
    value: 5
  });
  assert.deepEqual(definition.components[4], {
    type: "weakness",
    weaknessType: "cold",
    value: 3
  });
  assert.deepEqual(definition.components[5], {
    type: "immunity",
    immunityType: "poison"
  });
  assert.deepEqual(definition.components[6], {
    type: "fastHealing",
    value: 4
  });
  assert.deepEqual(definition.components[7], {
    type: "regeneration",
    value: 5,
    deactivatedBy: ["acid", "fire"]
  });
  assert.deepEqual(definition.components[8], {
    type: "temporaryHitPoints",
    value: 7
  });
  assertDeepFrozen(definition);
});

test("EffectBuilder.from clones the source and never mutates it", () => {
  const source = {
    schemaVersion: 0,
    id: "source",
    name: "Source",
    duration: { value: -1, unit: "unlimited", expiry: null },
    components: [{ type: "condition", slug: "prone" }],
    application: {},
    metadata: { nested: { value: 1 } }
  };

  const result = EffectBuilder.from(source)
    .setName("Changed")
    .mergeMetadata({ nested: { extra: 2 } })
    .build();

  assert.equal(source.name, "Source");
  assert.deepEqual(source.metadata, { nested: { value: 1 } });
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.name, "Changed");
  assert.deepEqual(result.metadata, { nested: { value: 1, extra: 2 } });
});

test("component list operations are deterministic", () => {
  const builder = createEffectBuilder()
    .setName("List")
    .addCondition("prone")
    .addCondition("frightened", 1);

  assert.equal(builder.componentCount, 2);
  builder.removeComponent(0);
  assert.equal(builder.componentCount, 1);
  assert.equal(builder.build().components[0].slug, "frightened");

  builder.clearComponents();
  assert.equal(builder.componentCount, 0);
  assert.throws(() => builder.removeComponent(0), RangeError);
});

test("builder rejects malformed component and duration input", () => {
  assert.throws(() => createEffectBuilder().addCondition("", 1), TypeError);
  assert.throws(() => createEffectBuilder().addCondition("frightened", -1), TypeError);
  assert.throws(
    () => createEffectBuilder().addModifier({ selector: "", value: 1 }),
    TypeError
  );
  assert.throws(
    () => createEffectBuilder().setDuration(1, "centuries", "turn-end"),
    TypeError
  );
  assert.throws(
    () => createEffectBuilder().addPersistentDamage({ formula: "", damageType: "fire" }),
    TypeError
  );
  assert.throws(
    () => createEffectBuilder().addPersistentDamage({ formula: "1d6", damageType: "fire", dc: 0 }),
    TypeError
  );
  assert.throws(
    () => createEffectBuilder().addResistance({ resistanceType: "", value: 5 }),
    TypeError
  );
  assert.throws(
    () => createEffectBuilder().addResistance({ resistanceType: "fire", value: 0 }),
    TypeError
  );
  assert.throws(
    () => createEffectBuilder().addWeakness({ weaknessType: "", value: 5 }),
    TypeError
  );
  assert.throws(
    () => createEffectBuilder().addWeakness({ weaknessType: "fire", value: 0 }),
    TypeError
  );
  assert.throws(
    () => createEffectBuilder().addImmunity({ immunityType: "" }),
    TypeError
  );
  assert.throws(
    () => createEffectBuilder().addFastHealing({ value: 0 }),
    TypeError
  );
  assert.throws(
    () => createEffectBuilder().addRegeneration({ value: 0, deactivatedBy: ["fire"] }),
    TypeError
  );
  assert.throws(
    () => createEffectBuilder().addRegeneration({ value: 5, deactivatedBy: [] }),
    TypeError
  );
});


test("temporary hit points builder rejects non-positive values", () => {
  assert.throws(
    () => createEffectBuilder().addTemporaryHitPoints({ value: 0 }),
    /positive integer/
  );
});

test("movement builder normalizes speed type, value, and modifier type", () => {
  const definition = createEffectBuilder()
    .setName("Fleet Step")
    .addMovement({ movementType: "land", value: "10", modifierType: "status" })
    .build();

  assert.deepEqual(definition.components[0], {
    type: "movement",
    movementType: "land",
    value: 10,
    modifierType: "status"
  });
  assert.throws(
    () => createEffectBuilder().addMovement({ movementType: "land", value: 0 }),
    /non-zero integer/
  );
});
