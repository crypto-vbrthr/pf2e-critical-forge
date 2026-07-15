import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();

const { PackRegistry } = await import("../scripts/critical-forge/registry/pack-registry.js");
const { CardRegistry } = await import("../scripts/critical-forge/registry/card-registry.js");
const { normalizeCardDefinition, normalizePackDefinition } = await import(
  "../scripts/critical-forge/schema/card-normalizer.js"
);

function setup() {
  const packs = new PackRegistry();
  const cards = new CardRegistry({ packRegistry: packs });
  const pack = normalizePackDefinition({
    schemaVersion: 1,
    id: "test",
    titleKey: "TEST.Pack.Title",
    descriptionKey: "TEST.Pack.Description",
    version: "1.0.0",
    sourceModule: "tests",
    cards: []
  });
  packs.register(pack);
  return { packs, cards };
}

function makeCard(id, category = "criticalHit") {
  return normalizeCardDefinition({
    schemaVersion: 1,
    id,
    packId: "test",
    category,
    titleKey: `${id}.Title`,
    descriptionKey: `${id}.Description`,
    weight: 1,
    tags: ["test"],
    filters: {},
    effect: null
  });
}

test("card registry requires a registered pack and rejects duplicate ids", () => {
  const { cards } = setup();
  const first = makeCard("test.first");
  cards.register(first);
  assert.equal(cards.get(first.id), first);
  assert.throws(() => cards.register(first), /already registered/);
  assert.throws(() => cards.register(normalizeCardDefinition({ ...first, id: "orphan", packId: "missing" })), /Unknown/);
});

test("registry lists cards by pack, category, and tags", () => {
  const { cards } = setup();
  cards.register(makeCard("test.hit", "criticalHit"));
  cards.register(makeCard("test.fumble", "criticalFumble"));
  assert.deepEqual(cards.list({ category: "criticalHit" }).map((card) => card.id), ["test.hit"]);
  assert.equal(cards.list({ tags: ["test"] }).length, 2);
});

test("unregisterPack removes every card belonging to the pack", () => {
  const { cards } = setup();
  cards.register(makeCard("test.one"));
  cards.register(makeCard("test.two"));
  assert.equal(cards.unregisterPack("test"), 2);
  assert.equal(cards.list().length, 0);
});
