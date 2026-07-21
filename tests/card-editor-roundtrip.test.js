import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock({
  skills: { athletics: "PF2E.SkillAthletics" },
  damageTypes: { slashing: "PF2E.Damage.RollFlavor.slashing" }
});

const stored = new Map();
game.user = { isGM: true, id: "gm" };
game.settings = {
  get: (_module, key) => stored.get(key) ?? { storageVersion: 1, packs: [] },
  set: async (_module, key, value) => {
    stored.set(key, structuredClone(value));
    return value;
  }
};

const { initializeEffectEngine } = await import("../scripts/effect-engine/effect-engine.js");
const { compileEffectDefinition } = await import("../scripts/effect-engine/compiler/effect-compiler.js");
const {
  initializeCriticalForge,
  criticalCardRegistry,
  criticalCardSelector
} = await import("../scripts/critical-forge/critical-forge.js");
const {
  cloneCardToPack,
  createEditablePack
} = await import("../scripts/critical-forge/editor/card-editor-model.js");
const {
  cardEffectToForgeDefinition,
  forgeDefinitionToCardEffect
} = await import("../scripts/critical-forge/editor/card-effect-bridge.js");
const {
  parseCardPackImport,
  serializeCardPackExport
} = await import("../scripts/critical-forge/editor/card-pack-transfer.js");
const {
  deleteCustomCardPack,
  hydrateRegisteredPack,
  saveCustomCardPack
} = await import("../scripts/critical-forge/editor/card-pack-store.js");
const { prepareCriticalCardPreview } = await import("../scripts/critical-forge/presentation/critical-card-preview.js");
const { validatePackDefinition } = await import("../scripts/critical-forge/schema/card-validator.js");
const { normalizePackDefinition } = await import("../scripts/critical-forge/schema/card-normalizer.js");

initializeEffectEngine();
initializeCriticalForge();

test("core template survives Effect Forge, export/import, persistence, selection, preview, and compilation", async () => {
  const source = criticalCardRegistry.get("core.generic.spectacular-hit");
  assert.ok(source);
  assert.equal(source.effect, null);

  const pack = createEditablePack({ id: "roundtrip-forge", title: "Roundtrip Forge" });
  const card = cloneCardToPack(source, pack.id, {
    id: "roundtrip-forge.spectacular-hit",
    titleSuffix: ""
  });
  card.fallbackTitle = "Spectacular Follow-up";
  card.fallbackDescription = "A copied core card with a custom mechanical consequence.";
  card.weight = 100;
  card.filters.damageTypes = ["slashing"];
  card.filters.excludedAttackTraits = ["spell"];
  card.conditions = {
    type: "group",
    mode: "all",
    conditions: [
      { type: "condition", field: "roller.hpRatio", operator: "lte", value: 0.5 }
    ]
  };

  const forgeDefinition = cardEffectToForgeDefinition(card);
  forgeDefinition.duration = { value: 1, unit: "rounds", expiry: "turn-end" };
  forgeDefinition.components.push({
    type: "modifier",
    selector: "attack-roll",
    value: 1,
    modifierType: "circumstance",
    predicate: []
  });
  card.effect = forgeDefinitionToCardEffect(card, forgeDefinition, {
    target: "source",
    fallbackName: "Spectacular Follow-up"
  });
  card.impact = "light";
  pack.cards.push(card);

  const normalized = normalizePackDefinition(pack);
  assert.equal(validatePackDefinition(normalized).valid, true);

  const imported = parseCardPackImport(serializeCardPackExport(normalized));
  assert.deepEqual(imported, normalized);
  assert.deepEqual(imported.cards[0].filters.excludedAttackTraits, ["spell"]);
  assert.deepEqual(imported.cards[0].conditions, card.conditions);

  await saveCustomCardPack(imported);
  const livePack = hydrateRegisteredPack(pack.id);
  assert.equal(livePack.cards.length, 1);
  assert.equal(criticalCardRegistry.get(card.id)?.effect?.target, "source");

  const coreIds = criticalCardRegistry
    .list({ packId: "core", enabledPacksOnly: false })
    .map((entry) => entry.id);
  const selection = criticalCardSelector.select({
    category: "criticalHit",
    damageTypes: ["slashing"],
    weaponGroups: [],
    attackTraits: [],
    sourceTraits: [],
    targetTraits: [],
    requiredTags: [],
    excludedTags: []
  }, {
    excludeCardIds: coreIds,
    random: () => 0,
    snapshot: { roller: { hpRatio: 0.4 } }
  });
  assert.equal(selection.selected?.id, card.id);

  const preview = prepareCriticalCardPreview(card.id, {
    metadata: {
      source: { name: "Tester" },
      target: { name: "Target" }
    }
  });
  assert.equal(preview.title, "Spectacular Follow-up");
  assert.equal(preview.effect.target, "source");
  assert.equal(preview.effect.definition.components.length, 1);

  const compiled = await compileEffectDefinition(preview.effect.definition);
  assert.equal(compiled.components[0].rules[0].key, "FlatModifier");
  assert.equal(compiled.components[0].rules[0].selector, "attack-roll");

  const reexported = parseCardPackImport(serializeCardPackExport(livePack));
  assert.deepEqual(reexported.cards[0].effect.definition.components, card.effect.definition.components);
  assert.deepEqual(reexported.cards[0].conditions, card.conditions);

  await deleteCustomCardPack(pack.id);
  assert.equal(criticalCardRegistry.get(card.id), null);
});

test("copying a protected core pack produces distinct editable card ids under a repeated random source", () => {
  const previousRandom = foundry.utils.randomID;
  foundry.utils.randomID = () => "repeat";
  try {
    const sourceCards = criticalCardRegistry.list({ packId: "core", enabledPacksOnly: false }).slice(0, 3);
    const usedIds = new Set();
    const copies = sourceCards.map((source) => {
      const copy = cloneCardToPack(source, "copied-core", { usedIds });
      usedIds.add(copy.id);
      return copy;
    });
    assert.equal(new Set(copies.map((entry) => entry.id)).size, copies.length);
    assert.ok(copies.every((entry) => entry.packId === "copied-core"));
    assert.ok(copies.every((entry) => entry.metadata.managedBy === "pf2e-critical-forge"));
  } finally {
    if (previousRandom === undefined) delete foundry.utils.randomID;
    else foundry.utils.randomID = previousRandom;
  }
});
