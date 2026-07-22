import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();
globalThis.Hooks = { callAll() {} };

const { initializeEffectEngine } = await import("../scripts/effect-engine/effect-engine.js");
const { initializeCriticalForge, criticalCardRegistry, criticalPackRegistry } = await import("../scripts/critical-forge/critical-forge.js");
const { createCardApi } = await import("../scripts/api/card-api.js");
const { createCriticalForgeExtensionApi } = await import("../scripts/critical-forge/extensions/extension-service.js");
const { criticalContextProviderRegistry } = await import("../scripts/critical-forge/context/context-provider-registry.js");
const { criticalConditionProviderRegistry } = await import("../scripts/critical-forge/conditions/condition-provider-registry.js");
const { criticalDiagnosticProviderRegistry } = await import("../scripts/critical-forge/diagnostics/diagnostic-provider-registry.js");
const { createDiagnosticEvaluationReport } = await import("../scripts/critical-forge/diagnostics/diagnostic-report.js");

initializeEffectEngine();
initializeCriticalForge();
const SOURCE = "against-all-odds-test";
const OTHER = "other-extension-test";

function pack() {
  return {
    schemaVersion: 1,
    id: `${SOURCE}.moments`,
    titleKey: "TEST.Pack.Title",
    descriptionKey: "TEST.Pack.Description",
    fallbackTitle: "Moments",
    fallbackDescription: "Contract fixture.",
    version: "1.0.0",
    enabled: true,
    decks: {
      attack: { cards: [card("attack", "criticalHit")] },
      reflex: { cards: [card("reflex", "savingThrowCriticalSuccess")] }
    }
  };
}

function card(slug, category) {
  return {
    schemaVersion: 1,
    id: `${SOURCE}.moments.${slug}`,
    packId: `${SOURCE}.moments`,
    category,
    tone: "dramatic",
    impact: "light",
    titleKey: `TEST.Card.${slug}.Title`,
    descriptionKey: `TEST.Card.${slug}.Description`,
    fallbackTitle: slug,
    fallbackDescription: slug,
    weight: 1,
    tags: ["contract"],
    filters: {},
    conditions: null,
    effect: null,
    metadata: {}
  };
}

function cleanup() {
  createCriticalForgeExtensionApi(SOURCE).unregisterAll();
  createCriticalForgeExtensionApi(OTHER).unregisterAll();
}

test("the bound extension controller keeps the legacy pack contract and adds providers", () => {
  cleanup();
  const extension = createCriticalForgeExtensionApi(SOURCE, {
    version: "1.0.0",
    requirements: {
      apiVersion: ">=0.9.4",
      capabilities: ["cards.multiDeckPacks", "extensions.conditionProviders"]
    }
  });

  assert.equal(extension.sourceModule, SOURCE);
  assert.equal(typeof extension.registerPack, "function");
  assert.equal(typeof extension.registerContextProvider, "function");
  assert.equal(typeof extension.registerConditionProvider, "function");
  assert.equal(typeof extension.registerDiagnosticProvider, "function");
  assert.equal(extension.checkCompatibility().compatible, true);
});

test("one extension can safely register a multi-deck pack and all provider types", () => {
  cleanup();
  const extension = createCriticalForgeExtensionApi(SOURCE);
  extension.registerPack(pack());
  extension.registerContextProvider({
    id: `${SOURCE}.context`,
    system: "test-system",
    version: "1.0.0",
    priority: 20,
    createContext: (input) => ({ valid: true, context: input, snapshot: input.snapshot ?? null, diagnostics: [] })
  });
  extension.registerConditionProvider({
    id: `${SOURCE}.fields`,
    version: "1.0.0",
    fields: [{
      path: "extensions.againstAllOdds.dangerScore",
      type: "number",
      fallbackLabel: "Danger score",
      fallbackGroup: "Against All Odds"
    }]
  });
  extension.registerDiagnosticProvider({
    id: `${SOURCE}.diagnostics`,
    version: "1.0.0",
    inspect: (diagnostic) => ({ dangerScore: diagnostic.snapshot?.extensions?.againstAllOdds?.dangerScore ?? null })
  });

  const registrations = extension.listRegistrations();
  assert.equal(registrations.packs.length, 1);
  assert.equal(registrations.contextProviders.length, 1);
  assert.equal(registrations.conditionProviders.length, 1);
  assert.equal(registrations.diagnosticProviders.length, 1);
  assert.equal(criticalPackRegistry.get(`${SOURCE}.moments`).sourceModule, SOURCE);
  assert.equal(criticalCardRegistry.get(`${SOURCE}.moments.reflex`).deckType, "reflex");
  assert.equal(criticalContextProviderRegistry.get("test-system", `${SOURCE}.context`).sourceModule, SOURCE);
});

test("registered condition fields appear in the public Card Editor catalog", () => {
  cleanup();
  const extension = createCriticalForgeExtensionApi(SOURCE);
  extension.registerConditionProvider({
    id: `${SOURCE}.fields`,
    fields: [{
      path: "extensions.againstAllOdds.tier",
      type: "enum",
      values: ["low", "high"],
      fallbackLabel: "Danger tier",
      fallbackGroup: "Against All Odds"
    }]
  });

  const api = createCardApi();
  const field = api.conditions.editor.getField("extensions.againstAllOdds.tier");
  assert.equal(field.providerId, `${SOURCE}.fields`);
  assert.deepEqual(field.values, ["low", "high"]);
  assert.equal(api.conditions.editor.fields.some((entry) => entry.path === field.path), true);
  assert.deepEqual(api.conditions.editor.operatorsForField(field.path), ["eq", "neq", "exists", "notExists"]);
});

test("diagnostic providers enrich reports and isolate provider failures", () => {
  cleanup();
  const extension = createCriticalForgeExtensionApi(SOURCE);
  extension.registerDiagnosticProvider({
    id: `${SOURCE}.ok`,
    priority: 10,
    inspect: () => ({ matchedTheme: "bloodied" })
  });
  extension.registerDiagnosticProvider({
    id: `${SOURCE}.broken`,
    inspect: () => { throw new Error("fixture failure"); }
  });

  const report = createDiagnosticEvaluationReport({
    valid: true,
    context: { category: "criticalHit" },
    snapshot: {},
    eligible: [],
    rejected: [],
    diagnostics: []
  }, { createdAt: 42 });

  assert.equal(report.extensions.diagnostics.length, 2);
  assert.equal(report.extensions.diagnostics.find((entry) => entry.id.endsWith(".ok")).data.matchedTheme, "bloodied");
  assert.equal(report.extensions.diagnostics.find((entry) => entry.id.endsWith(".broken")).status, "error");
  assert.doesNotThrow(() => JSON.stringify(report));
});

test("provider replacement and removal are restricted to the owning extension", () => {
  cleanup();
  const owner = createCriticalForgeExtensionApi(SOURCE);
  const foreign = createCriticalForgeExtensionApi(OTHER);
  owner.registerConditionProvider({
    id: `${SOURCE}.owned`,
    fields: [{ path: "extensions.owner.value", type: "number" }]
  });

  assert.throws(
    () => foreign.registerConditionProvider({
      id: `${SOURCE}.owned`,
      fields: [{ path: "extensions.foreign.value", type: "number" }]
    }, { replace: true }),
    /owned by/u
  );
  assert.throws(
    () => criticalConditionProviderRegistry.unregister(`${SOURCE}.owned`, { sourceModule: OTHER }),
    /owned by/u
  );
  assert.equal(criticalConditionProviderRegistry.get(`${SOURCE}.owned`).sourceModule, SOURCE);
});

test("registration conflicts are exposed through structured extension diagnostics", () => {
  cleanup();
  const extension = createCriticalForgeExtensionApi(SOURCE);
  extension.registerConditionProvider({
    id: `${SOURCE}.one`,
    fields: [{ path: "extensions.shared.value", type: "number" }]
  });

  assert.throws(() => extension.registerConditionProvider({
    id: `${SOURCE}.two`,
    fields: [{ path: "extensions.shared.value", type: "number" }]
  }), (error) => error.code === "CONDITION_FIELD_CONFLICT" && error.extensionDiagnostic?.status === "error");

  const diagnostics = extension.diagnostics.list({ status: "error" });
  assert.equal(diagnostics.some((entry) => entry.code === "CONDITION_FIELD_CONFLICT"), true);
  assert.equal(diagnostics.every((entry) => entry.sourceModule === SOURCE), true);
});

test("incompatible extensions fail before modifying any registry", () => {
  cleanup();
  const extension = createCriticalForgeExtensionApi(SOURCE, {
    requirements: { capabilities: ["not.available"] }
  });
  assert.throws(() => extension.registerPack(pack()), /requirements are not satisfied/u);
  assert.equal(criticalPackRegistry.get(`${SOURCE}.moments`), null);
  assert.equal(extension.diagnostics.list({ status: "error" }).some((entry) => entry.code === "EXTENSION_INCOMPATIBLE"), true);
});


test("extensions cannot replace unowned providers or shadow core condition fields", () => {
  cleanup();
  criticalContextProviderRegistry.register({
    id: "unowned",
    system: "test-system",
    createContext: () => ({})
  });
  const extension = createCriticalForgeExtensionApi(SOURCE);

  assert.throws(() => extension.registerContextProvider({
    id: "unowned",
    system: "test-system",
    createContext: () => ({ replaced: true })
  }, { replace: true }), /owned by/u);

  assert.throws(() => extension.registerConditionProvider({
    id: `${SOURCE}.core-shadow`,
    fields: [{ path: "roll.category", type: "string" }]
  }), (error) => error.code === "CONDITION_FIELD_CORE_CONFLICT");

  criticalContextProviderRegistry.unregister("test-system", "unowned");
});

test("pack and card collisions use stable diagnostic codes", () => {
  cleanup();
  const extension = createCriticalForgeExtensionApi(SOURCE);
  extension.registerPack(pack());
  assert.throws(() => extension.registerPack(pack()), (error) => error.code === "EXTENSION_PACK_CONFLICT");

  const collision = pack();
  collision.id = `${SOURCE}.other`;
  collision.decks.attack.cards[0].packId = collision.id;
  collision.decks.attack.cards[0].id = "core.generic.spectacular-hit";
  collision.decks.reflex.cards[0].packId = collision.id;
  assert.throws(() => extension.registerPack(collision), (error) => error.code === "EXTENSION_CARD_CONFLICT");

  const codes = extension.diagnostics.list({ status: "error" }).map((entry) => entry.code);
  assert.equal(codes.includes("EXTENSION_PACK_CONFLICT"), true);
  assert.equal(codes.includes("EXTENSION_CARD_CONFLICT"), true);
});

test("unregisterAll removes only resources owned by the bound module", () => {
  cleanup();
  const extension = createCriticalForgeExtensionApi(SOURCE);
  extension.registerPack(pack());
  extension.registerContextProvider({ id: `${SOURCE}.context`, system: "test-system", createContext: () => ({}) });
  extension.registerConditionProvider({ id: `${SOURCE}.fields`, fields: [{ path: "extensions.cleanup.value", type: "number" }] });
  extension.registerDiagnosticProvider({ id: `${SOURCE}.diagnostics`, inspect: () => ({}) });

  const result = extension.unregisterAll();
  assert.equal(result.packsRemoved, 1);
  assert.equal(result.contextProvidersRemoved, 1);
  assert.equal(result.conditionProvidersRemoved, 1);
  assert.equal(result.diagnosticProvidersRemoved, 1);
  assert.equal(criticalPackRegistry.get(`${SOURCE}.moments`), null);
  assert.equal(criticalContextProviderRegistry.get("test-system", `${SOURCE}.context`), null);
  assert.equal(criticalConditionProviderRegistry.get(`${SOURCE}.fields`), null);
  assert.equal(criticalDiagnosticProviderRegistry.get(`${SOURCE}.diagnostics`), null);
});
