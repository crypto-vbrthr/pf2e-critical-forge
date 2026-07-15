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

test("public card API exposes the headless PF2e context adapter", () => {
  assert.equal(api.adapters.pf2e.version, "1.0.0");
  const direct = api.adapters.pf2e.createContext({
    category: "criticalHit",
    damageTypes: ["slashing"]
  });
  const generic = api.createContext({
    category: "criticalHit",
    damageTypes: ["slashing"]
  });
  assert.equal(direct.valid, true);
  assert.deepEqual(generic.context, direct.context);
  assert.throws(() => api.createContext({}, { system: "other" }), /Unsupported/);
});


test("public card API exposes manual diagnostics", () => {
  const report = api.diagnose({
    category: "criticalHit",
    damageTypes: ["slashing"],
    targetTraits: ["humanoid"]
  });
  assert.equal(report.valid, true);
  assert.ok(report.eligible.length >= 1);
  assert.equal(typeof api.diagnostics.listMessages, "function");
  assert.equal(typeof api.diagnostics.resolveMessageInput, "function");
  assert.throws(() => api.diagnose({}, { system: "other" }), /Unsupported/);
});

test("public card API exposes manual chat-card previews", async () => {
  assert.equal(api.previewVersion, 2);
  const preview = api.preparePreview("core.generic.off-balance", {
    context: { category: "criticalHit" }
  });
  assert.equal(preview.cardId, "core.generic.off-balance");
  assert.equal(preview.hasEffect, true);

  const published = await api.publishPreview("core.generic.off-balance", {
    context: { category: "criticalHit" },
    renderTemplateFn: async (_path, data) => `<article>${data.title}</article>`,
    createMessageFn: async (data) => ({ id: "chat-preview", data })
  });
  assert.equal(published.message.id, "chat-preview");
  assert.equal(api.normalizeVisibilityMode("invalid"), "blind");
  assert.equal(api.visibilityModes.BLIND, "blind");
  assert.equal(typeof api.inspectPreviewApplication, "function");
  assert.equal(typeof api.applyPreviewEffect, "function");
  assert.equal(typeof api.summarizeEffect, "function");
});
