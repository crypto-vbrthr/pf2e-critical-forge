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
  }
});

const selectors = await import(
  "../scripts/effect-engine/catalogs/selector-catalog.js"
);
const conditions = await import(
  "../scripts/effect-engine/catalogs/condition-catalog.js"
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
