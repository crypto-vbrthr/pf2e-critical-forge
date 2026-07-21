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
  assert.equal(api.list({ packId: "core" }).length, 96);
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
  assert.equal(api.adapters.pf2e.version, "1.3.0");
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
  assert.equal(api.contexts.snapshotVersion, 1);
  assert.equal(api.contexts.listProviders({ system: "pf2e" })[0].id, "core-pf2e");
  assert.equal(api.adapters.pf2e.createSnapshot({ category: "criticalHit" }).schemaVersion, 1);
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
  assert.equal(api.previewVersion, 4);
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
  assert.equal(typeof api.redrawPreview, "function");
  assert.equal(typeof api.summarizeEffect, "function");
  assert.deepEqual(api.tones, ["neutral", "serious", "dramatic", "humorous"]);
  assert.deepEqual(api.impacts, ["narrative", "light", "moderate", "strong"]);
  assert.equal(typeof api.triggers.evaluate, "function");
  assert.equal(api.automation.version, 1);
  assert.equal(typeof api.automation.processMessage, "function");
  assert.equal(typeof api.automation.inspectMessage, "function");
  assert.equal(typeof api.automation.isAttackReport, "function");
});

test("public card API exposes additive context-provider capabilities", () => {
  assert.equal(api.capabilities.contextSnapshots, true);
  assert.equal(api.capabilities.contextProviders, true);
  assert.equal(api.capabilities.contextConditions, true);

  assert.deepEqual(api.conditions.modes, ["all", "any"]);
  assert.deepEqual(api.conditions.valueTypes, ["string", "number", "boolean", "stringArray"]);
  assert.equal(api.conditions.operators.includes("lte"), true);
  const condition = api.conditions.normalize({ field: "participants.source.hp.ratio", operator: "lte", value: 0.5 });
  assert.equal(api.conditions.validate(condition).valid, true);
  assert.equal(api.conditions.evaluate(condition, { participants: { source: { hp: { ratio: 0.4 } } } }).matched, true);

  const builder = api.contexts.createBuilder({ system: "test-system", provider: "test-provider" });
  assert.equal(builder.build().schemaVersion, 1);

  api.contexts.registerProvider({
    id: "test-provider",
    system: "test-system",
    version: "1.0.0",
    createContext: (input) => Object.freeze({ valid: true, context: input, metadata: {}, diagnostics: [] })
  });
  const resolved = api.contexts.resolve({ marker: true }, { system: "test-system" });
  assert.equal(resolved.context.marker, true);
  assert.equal(api.contexts.unregisterProvider("test-system", "test-provider"), true);
});

test("public card API exposes the Phase-3 condition editor catalog and simulator", () => {
  assert.equal(api.capabilities.conditionEditor, true);
  assert.equal(api.conditions.editor.fields.length > 30, true);
  assert.equal(api.conditions.editor.getField("participants.source.hp.ratio").type, "number");
  assert.equal(api.conditions.editor.operatorsForField("participants.source.level").includes("gte"), true);

  const tree = api.conditions.normalize({
    mode: "all",
    conditions: [
      { field: "participants.source.hp.ratio", operator: "lte", value: 0.5 },
      { field: "battlefield.hostileThreatCount", operator: "gte", value: 2 }
    ]
  });
  const tested = api.conditions.editor.evaluateTest(tree, {
    sourceHpRatio: 0.4,
    hostileThreatCount: 2
  });
  assert.equal(tested.evaluation.matched, true);
});
