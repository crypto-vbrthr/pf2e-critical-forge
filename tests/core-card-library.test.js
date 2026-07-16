import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { installFoundryMock, createConditionPack } from "./helpers/foundry-mock.js";

installFoundryMock();

const { initializeEffectEngine } = await import("../scripts/effect-engine/effect-engine.js");
initializeEffectEngine();

const { CORE_CRITICAL_CARD_PACK } = await import(
  "../scripts/critical-forge/core/core-pack.js"
);
const { validatePackDefinition } = await import(
  "../scripts/critical-forge/schema/card-validator.js"
);
const { matchCard } = await import(
  "../scripts/critical-forge/selection/card-matcher.js"
);
const { materializeCardEffect } = await import(
  "../scripts/critical-forge/localization/card-localizer.js"
);
const { compileEffectDefinition } = await import(
  "../scripts/effect-engine/compiler/effect-compiler.js"
);
const { initializeConditionCatalog } = await import(
  "../scripts/effect-engine/catalogs/condition-catalog.js"
);

const cards = CORE_CRITICAL_CARD_PACK.cards;

function countBy(values, key) {
  return Object.fromEntries(values.map((value) => [
    value,
    cards.filter((card) => card[key] === value).length
  ]));
}

function localizeValue(tree, key) {
  return key.split(".").reduce((value, segment) => value?.[segment], tree);
}

test("core test library contains the intended hit and fumble matrix", () => {
  assert.equal(cards.length, 48);
  assert.equal(cards.filter((card) => card.category === "criticalHit").length, 30);
  assert.equal(cards.filter((card) => card.category === "criticalFumble").length, 18);

  for (const damageType of ["slashing", "piercing", "bludgeoning"]) {
    assert.equal(cards.filter((card) =>
      card.category === "criticalHit" && card.filters.damageTypes.includes(damageType)
    ).length, 8);
  }
  assert.equal(cards.filter((card) =>
    card.category === "criticalHit" && card.filters.damageTypes.length === 0
  ).length, 6);

  assert.equal(cards.filter((card) =>
    card.category === "criticalFumble" && card.filters.attackTraits.includes("melee")
  ).length, 6);
  assert.equal(cards.filter((card) =>
    card.category === "criticalFumble" && card.filters.attackTraits.includes("ranged")
  ).length, 6);
  assert.equal(cards.filter((card) =>
    card.category === "criticalFumble" && card.filters.attackTraits.length === 0
  ).length, 6);
});

test("melee and ranged fumble filters keep their own six cards plus generic fallbacks", () => {
  const eligibleIds = (attackTrait) => cards
    .filter((card) => matchCard(card, {
      category: "criticalFumble",
      attackTraits: attackTrait ? [attackTrait] : []
    }).eligible)
    .map((card) => card.id);

  const melee = eligibleIds("melee");
  const ranged = eligibleIds("ranged");
  const unresolved = eligibleIds(null);

  assert.equal(melee.length, 12);
  assert.equal(ranged.length, 12);
  assert.equal(unresolved.length, 6);
  assert.equal(melee.some((id) => id.includes(".ranged.")), false);
  assert.equal(ranged.some((id) => id.includes(".melee.")), false);
});

test("core test library has enough material for every tone and impact profile", () => {
  assert.deepEqual(countBy(["neutral", "serious", "dramatic", "humorous"], "tone"), {
    neutral: 8,
    serious: 12,
    dramatic: 12,
    humorous: 16
  });
  assert.deepEqual(countBy(["narrative", "light", "moderate", "strong"], "impact"), {
    narrative: 8,
    light: 18,
    moderate: 14,
    strong: 8
  });
});

test("every bundled core card and effect template validates", () => {
  const report = validatePackDefinition(CORE_CRITICAL_CARD_PACK);
  assert.equal(report.valid, true, JSON.stringify(report.issues, null, 2));
  assert.equal(new Set(cards.map((card) => card.id)).size, cards.length);
  assert.ok(cards.some((card) => card.effect === null));
  assert.ok(cards.some((card) => card.effect?.target === "source"));
  assert.ok(cards.some((card) => card.effect?.target === "target"));
});

test("every mechanical core card materializes and compiles through the Effect Engine", async () => {
  const valued = new Set(["clumsy", "enfeebled", "frightened", "slowed", "stunned"]);
  const conditionSlugs = [
    "persistent-damage",
    "off-guard",
    "dazzled",
    "clumsy",
    "slowed",
    "stunned",
    "prone",
    "enfeebled",
    "frightened"
  ];
  game.packs.set("pf2e.conditionitems", createConditionPack(
    conditionSlugs.map((slug) => ({ slug, isValued: valued.has(slug) }))
  ));
  await initializeConditionCatalog({ force: true });

  for (const card of cards.filter((entry) => entry.effect)) {
    const materialized = materializeCardEffect(card, { localize: () => null });
    const compiled = await compileEffectDefinition(materialized.definition);
    assert.ok(compiled.components.some((component) => component.rules.length > 0), card.id);
  }
});

test("all bundled card localization keys exist in German and English", async () => {
  for (const language of ["de", "en"]) {
    const tree = JSON.parse(await readFile(
      new URL(`../lang/${language}.json`, import.meta.url),
      "utf8"
    ));
    for (const card of cards) {
      assert.equal(typeof localizeValue(tree, card.titleKey), "string", `${language}: ${card.titleKey}`);
      assert.equal(typeof localizeValue(tree, card.descriptionKey), "string", `${language}: ${card.descriptionKey}`);
      if (card.effect) {
        assert.equal(typeof localizeValue(tree, card.effect.nameKey), "string", `${language}: ${card.effect.nameKey}`);
      }
    }
  }
});

test("published sample card ids remain stable", () => {
  const ids = new Set(cards.map((card) => card.id));
  for (const id of [
    "core.slashing.deep-cut",
    "core.piercing.puncture",
    "core.bludgeoning.ringing-blow",
    "core.generic.off-balance",
    "core.fumble.overextended",
    "core.fumble.weapon-jolt"
  ]) {
    assert.equal(ids.has(id), true, id);
  }
});
