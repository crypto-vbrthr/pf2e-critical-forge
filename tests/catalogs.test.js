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

installFoundryMock({
  packs,
  skills: {
    athletics: { label: "PF2E.Skill.Athletics" },
    society: { label: "PF2E.Skill.Society" }
  },
  damageTypes: {
    fire: "PF2E.TraitFire",
    bleed: "PF2E.TraitBleed",
    "custom-energy": "MY_MODULE.CustomEnergy"
  },
  resistanceTypes: {
    fire: "PF2E.TraitFire",
    physical: "PF2E.Damage.IWR.Type.physical",
    "all-damage": "PF2E.Damage.IWR.Type.all-damage",
    "custom-resistance": "MY_MODULE.CustomResistance"
  }
});

const selectors = await import(
  "../scripts/effect-engine/catalogs/selector-catalog.js"
);
const conditions = await import(
  "../scripts/effect-engine/catalogs/condition-catalog.js"
);
const damageTypes = await import(
  "../scripts/effect-engine/catalogs/damage-type-catalog.js"
);
const resistanceTypes = await import(
  "../scripts/effect-engine/catalogs/resistance-type-catalog.js"
);

test("selector catalog includes configured PF2e skills and stable groups", () => {
  const list = selectors.listSelectorDefinitions();
  assert.equal(list.some((entry) => entry.value === "athletics"), true);
  assert.equal(list.some((entry) => entry.value === "society"), true);
  assert.equal(selectors.isKnownSelector("saving-throw"), true);
  assert.equal(selectors.isValidSelectorSyntax("my-module-check"), true);
  assert.equal(selectors.isValidSelectorSyntax("My Module Check"), false);

  const groups = selectors.getSelectorGroups("athletics");
  assert.equal(groups.some((group) => group.id === "skills"), true);
  assert.equal(groups.at(-1).id, "custom");
});

test("condition catalog reads valued metadata from the PF2e compendium", async () => {
  await conditions.initializeConditionCatalog({ force: true });

  assert.equal(conditions.isValuedCondition("frightened"), true);
  assert.equal(conditions.isValuedCondition("prone"), false);
  assert.equal(
    conditions.getConditionDefinition("prone").uuid,
    "Compendium.pf2e.conditionitems.Item.prone"
  );
});

test("damage type catalog groups PF2e and fallback damage types", () => {
  assert.equal(damageTypes.isKnownDamageType("fire"), true);
  assert.equal(damageTypes.isKnownDamageType("spirit"), true);
  assert.equal(damageTypes.isKnownDamageType("not-a-damage-type"), false);

  const groups = damageTypes.getDamageTypeGroups("bleed");
  assert.equal(groups.find((group) => group.id === "physical")
    ?.options.some((option) => option.value === "bleed" && option.selected), true);
  assert.equal(groups.find((group) => group.id === "additional")
    ?.options.some((option) => option.value === "custom-energy"), true);
});

test("resistance type catalog groups damage, category, and system types", () => {
  assert.equal(resistanceTypes.isKnownResistanceType("fire"), true);
  assert.equal(resistanceTypes.isKnownResistanceType("physical"), true);
  assert.equal(resistanceTypes.isKnownResistanceType("not-a-resistance"), false);

  const groups = resistanceTypes.getResistanceTypeGroups("all-damage");
  assert.equal(groups.find((group) => group.id === "damage-types")
    ?.options.some((option) => option.value === "fire"), true);
  assert.equal(groups.find((group) => group.id === "damage-categories")
    ?.options.some((option) => option.value === "all-damage" && option.selected), true);
  assert.equal(groups.find((group) => group.id === "additional")
    ?.options.some((option) => option.value === "custom-resistance"), true);
});
