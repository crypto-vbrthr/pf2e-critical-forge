import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

installFoundryMock();
const { initializeEffectEngine } = await import("../scripts/effect-engine/effect-engine.js");
initializeEffectEngine();

const {
  cloneCardToPack,
  createEditableCard,
  createEditablePack,
  parseDelimitedList,
  sanitizeIdentifier
} = await import("../scripts/critical-forge/editor/card-editor-model.js");
const {
  CARD_PACK_EXPORT_FORMAT,
  createCardPackExport,
  parseCardPackImport,
  serializeCardPackExport
} = await import("../scripts/critical-forge/editor/card-pack-transfer.js");
const {
  cardEffectToForgeDefinition,
  forgeDefinitionToCardEffect
} = await import("../scripts/critical-forge/editor/card-effect-bridge.js");
const { normalizePackDefinition } = await import("../scripts/critical-forge/schema/card-normalizer.js");
const { validatePackDefinition } = await import("../scripts/critical-forge/schema/card-validator.js");

test("editor model creates a valid custom pack and card", () => {
  const pack = createEditablePack({ id: "My Wild Cards", title: "My Wild Cards" });
  const card = createEditableCard({ packId: pack.id, title: "Bent Helmet" });
  pack.cards.push(card);

  const normalized = normalizePackDefinition(pack);
  assert.equal(normalized.id, "my-wild-cards");
  assert.equal(normalized.cards[0].packId, normalized.id);
  assert.equal(validatePackDefinition(normalized).valid, true);
});

test("copying a card into another pack replaces ownership and localization keys", () => {
  const source = createEditableCard({ packId: "source", id: "source.deep-cut" });
  source.effect = {
    target: "target",
    nameKey: "SOURCE.Effect",
    fallbackName: "Deep Cut",
    definition: {
      schemaVersion: 2,
      duration: { value: 1, unit: "rounds", expiry: "turn-end" },
      components: [{ type: "condition", slug: "frightened", value: 1 }]
    }
  };

  const copy = cloneCardToPack(source, "destination", { id: "destination.deep-cut-copy" });
  assert.equal(copy.packId, "destination");
  assert.equal(copy.id, "destination.deep-cut-copy");
  assert.match(copy.titleKey, /USERCONTENT/i);
  assert.notEqual(copy.effect.nameKey, source.effect.nameKey);
  assert.deepEqual(copy.effect.definition.components, source.effect.definition.components);
});

test("card pack export round-trips wrapped and raw pack JSON", () => {
  const pack = createEditablePack({ id: "roundtrip" });
  pack.cards.push(createEditableCard({ packId: pack.id, id: "roundtrip.card" }));

  const wrapper = createCardPackExport(pack);
  assert.equal(wrapper.format, CARD_PACK_EXPORT_FORMAT);
  const imported = parseCardPackImport(serializeCardPackExport(pack));
  assert.equal(imported.id, "roundtrip");
  assert.equal(imported.cards.length, 1);

  const raw = parseCardPackImport(JSON.stringify(pack));
  assert.equal(raw.cards[0].packId, "roundtrip");
});

test("card pack import rejects unsupported wrappers", () => {
  assert.throws(
    () => parseCardPackImport(JSON.stringify({ format: "other", formatVersion: 1, pack: {} })),
    (error) => error.code === "CARD_PACK_IMPORT_FORMAT_UNSUPPORTED"
  );
});

test("effect bridge preserves card metadata while round-tripping Effect Forge definitions", () => {
  const card = createEditableCard({ packId: "bridge", id: "bridge.card", title: "Bridge Card" });
  const definition = cardEffectToForgeDefinition(card);
  assert.equal(definition.name, "Bridge Card");
  definition.components.push({
    type: "modifier",
    selector: "ac",
    value: -1,
    modifierType: "circumstance",
    duration: { value: 1, unit: "rounds", expiry: "turn-end" }
  });

  const effect = forgeDefinitionToCardEffect(card, definition, { target: "source" });
  assert.equal(effect.target, "source");
  assert.equal("name" in effect.definition, false);
  assert.equal(effect.definition.components.length, 1);
  assert.deepEqual(effect.definition.components[0].duration, {
    value: 1, unit: "rounds", expiry: "turn-end"
  });
});

test("editor parsing normalizes identifiers and comma-separated fields", () => {
  assert.equal(sanitizeIdentifier(" My Odd Pack! "), "my-odd-pack");
  assert.deepEqual(parseDelimitedList("fire, cold; fire\nacid"), ["fire", "cold", "acid"]);
});

test("editor-generated card ids remain unique even when the random source repeats", async () => {
  const { ensureUniqueIdentifier } = await import("../scripts/critical-forge/editor/card-editor-model.js");
  assert.equal(ensureUniqueIdentifier("pack.card", []), "pack.card");
  assert.equal(ensureUniqueIdentifier("pack.card", ["pack.card"]), "pack.card-2");
  assert.equal(
    ensureUniqueIdentifier("pack.card", ["pack.card", "pack.card-2", "pack.card-3"]),
    "pack.card-4"
  );

  const first = createEditableCard({ packId: "stable", id: "stable.card" });
  const second = createEditableCard({
    packId: "stable",
    id: "stable.card",
    usedIds: [first.id]
  });
  const copy = cloneCardToPack(first, "stable", {
    id: "stable.card",
    usedIds: [first.id, second.id]
  });

  assert.deepEqual([first.id, second.id, copy.id], ["stable.card", "stable.card-2", "stable.card-3"]);
});

test("Card Pack Editor exposes the excluded attack-trait field", () => {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const template = readFileSync(join(root, "templates/critical-forge/card-pack-editor.hbs"), "utf8");
  assert.match(template, /name="card\.filters\.excludedAttackTraits"/u);
  assert.match(template, /FilterExcludedAttackTraits/u);
});
