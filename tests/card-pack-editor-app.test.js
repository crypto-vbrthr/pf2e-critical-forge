import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();

class MockElement {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  querySelectorAll() { return []; }
  querySelector() { return null; }

  dispatch(type, event) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}
class MockFormElement extends MockElement {
  constructor(entries = {}) {
    super();
    this.entries = new Map(Object.entries(entries));
  }
}

class MockFormData {
  constructor(form = null) {
    this.entries = new Map(form?.entries ?? []);
  }

  get(key) {
    return this.entries.has(key) ? this.entries.get(key) : null;
  }

  set(key, value) {
    this.entries.set(key, value);
  }
}

class MockApplicationV2 {
  constructor() {
    this.element = null;
    this.renderCount = 0;
  }

  async render() {
    this.renderCount += 1;
    return this;
  }

  _onRender() {}
  async close() { return this; }
  bringToFront() {}
}

globalThis.HTMLElement = MockElement;
globalThis.HTMLFormElement = MockFormElement;
globalThis.FormData = MockFormData;
globalThis.foundry.applications = {
  api: {
    ApplicationV2: MockApplicationV2,
    HandlebarsApplicationMixin: (Base) => class extends Base {},
    DialogV2: { confirm: async () => true }
  }
};
globalThis.game.settings = {
  get: () => ({ storageVersion: 1, packs: [] }),
  set: async () => undefined
};
globalThis.game.user = { isGM: true };

const { initializeEffectEngine } = await import("../scripts/effect-engine/effect-engine.js");
initializeEffectEngine();
const { initializeCriticalForge } = await import("../scripts/critical-forge/critical-forge.js");
initializeCriticalForge();
const { createEditableCard, createEditablePack } = await import("../scripts/critical-forge/editor/card-editor-model.js");
const { CardPackEditorApp } = await import("../scripts/critical-forge/editor/card-pack-editor-app.js");

function createAppWithConditionCard() {
  const pack = createEditablePack({ id: "phase-three-editor" });
  const card = createEditableCard({ packId: pack.id, id: "phase-three-editor.card" });
  card.conditions = {
    type: "group",
    mode: "all",
    conditions: [
      { type: "condition", field: "participants.source.hp.ratio", operator: "lte", value: 0.5 }
    ]
  };
  pack.cards.push(card);

  const app = new CardPackEditorApp();
  app.draftPack = pack;
  app.selectedPackId = pack.id;
  app.selectedCardId = card.id;
  return { app, pack, card };
}

test("Card Pack Editor application prepares condition controls, warnings, and synthetic test data", async () => {
  const { app, card } = createAppWithConditionCard();
  card.conditions.conditions.push({
    type: "condition",
    field: "participants.source.hp.ratio",
    operator: "gte",
    value: 0.75
  });

  const context = await app._prepareContext();
  assert.equal(context.packEditable, true);
  assert.equal(context.card.conditionEditor.enabled, true);
  assert.equal(context.card.conditionEditor.nodes.length, 3);
  assert.equal(context.card.conditionWarnings.length, 1);
  assert.equal(context.card.conditionTest.hasResult, false);
});

test("Card Pack Editor actions build, clear, and test conditions without touching Foundry documents", async () => {
  const { app, card } = createAppWithConditionCard();
  const actions = CardPackEditorApp.DEFAULT_OPTIONS.actions;

  await actions.clearConditions.call(app);
  assert.equal(card.conditions, null);

  await actions.enableConditions.call(app);
  await actions.addCondition.call(app, null, { dataset: { conditionPath: "" } });
  assert.equal(card.conditions.conditions.length, 1);

  app.conditionTestInput = { ...app.conditionTestInput, sourceHpRatio: "0.4" };
  await actions.testConditions.call(app);
  assert.equal(app.conditionTestResult.evaluation.matched, true);
  assert.equal(app.conditionTestResult.snapshot.provider, "card-editor-test");
  assert.equal(app.renderCount >= 4, true);
});


test("condition test inputs do not mark a Card Pack dirty", () => {
  const { app } = createAppWithConditionCard();
  const root = new MockElement();
  app.element = root;
  app.isDirty = false;
  app._onRender({}, {});

  root.dispatch("input", { target: { closest: () => ({ dataset: { conditionTestPanel: "" } }) } });
  assert.equal(app.isDirty, false);

  root.dispatch("input", { target: { closest: () => null } });
  assert.equal(app.isDirty, true);
});

test("Card Pack Editor synchronizes custom provider field types before testing", async () => {
  const { app, card } = createAppWithConditionCard();
  const actions = CardPackEditorApp.DEFAULT_OPTIONS.actions;
  app.element = new MockFormElement({
    "pack.enabled": "on",
    "condition.root.mode": "all",
    "condition.0.fieldSelection": "__custom__",
    "condition.0.customField": "provider.danger.score",
    "condition.0.customType": "number",
    "condition.0.operator": "gte",
    "condition.0.value": "3",
    "conditionTest.category": "criticalHit",
    "conditionTest.sourceHpRatio": "0.4"
  });

  await actions.testConditions.call(app);
  assert.deepEqual(card.conditions.conditions[0], {
    type: "condition",
    field: "provider.danger.score",
    operator: "gte",
    valueType: "number",
    value: 3
  });
  assert.equal(app.conditionTestResult.evaluation.available, false);
  assert.equal(app.conditionTestResult.evaluation.counts.unavailable, 1);
});
