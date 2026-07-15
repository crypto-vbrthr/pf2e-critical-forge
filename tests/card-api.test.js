import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();
const { initializeEffectEngine } = await import("../scripts/effect-engine/effect-engine.js");
initializeEffectEngine();
const { initializeCriticalForge } = await import("../scripts/critical-forge/critical-forge.js");
initializeCriticalForge();
const { createCardApi } = await import("../scripts/api/card-api.js");
const api = createCardApi();

test("public card API exposes registered packs, cards, and schema versions", () => {
  assert.equal(api.schemaVersion, 1);
  assert.equal(api.packSchemaVersion, 1);
  assert.equal(api.getPack("core").id, "core");
  assert.equal(api.list({ packId: "core" }).length, 6);
});

test("public card API validates malformed input without throwing", () => {
  const cardReport = api.validate({ filters: { damageTypes: "fire" } });
  const packReport = api.validatePack(null);
  assert.equal(cardReport.valid, false);
  assert.equal(cardReport.issues[0].code, "CARD_NORMALIZATION_FAILED");
  assert.equal(packReport.valid, false);
  assert.equal(packReport.issues[0].code, "CARD_PACK_NORMALIZATION_FAILED");
});

test("public card API selects, localizes, and materializes cards", () => {
  const selected = api.select({
    category: "criticalHit",
    damageTypes: ["slashing"],
    targetTraits: ["humanoid"]
  }, { random: () => 0.99 }).selected;
  assert.ok(selected);

  const localized = api.localize(selected.id, { localize: () => null });
  assert.ok(localized.title);
  const effect = api.materializeEffect(selected.id, { localize: () => null });
  assert.ok(effect.definition.name);
});
