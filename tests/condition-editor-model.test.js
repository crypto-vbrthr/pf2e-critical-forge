import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();

const {
  CONDITION_CUSTOM_FIELD,
  CONDITION_FIELD_CATALOG,
  addConditionEditorNode,
  analyzeConditionContradictions,
  conditionFieldDefinition,
  conditionOperatorsForField,
  createConditionRoot,
  createConditionTestSnapshot,
  evaluateConditionEditorTest,
  flattenConditionTree,
  prepareConditionEditor,
  removeConditionEditorNode,
  syncConditionTreeFromForm
} = await import("../scripts/critical-forge/editor/condition-editor-model.js");

test("condition editor exposes stable field metadata and type-specific operators", () => {
  assert.equal(CONDITION_FIELD_CATALOG.length > 30, true);
  assert.equal(conditionFieldDefinition("participants.source.hp.ratio").type, "number");
  assert.deepEqual(conditionOperatorsForField("participants.source.hp.ratio"), [
    "eq", "neq", "lt", "lte", "gt", "gte", "exists", "notExists"
  ]);
  assert.deepEqual(conditionOperatorsForField("participants.source.traits"), [
    "contains", "notContains", "eq", "neq", "exists", "notExists"
  ]);
});

test("condition editor adds and removes nested groups without mutating the source", () => {
  const root = createConditionRoot("all");
  const withLeaf = addConditionEditorNode(root, "", { type: "condition" });
  const withGroup = addConditionEditorNode(withLeaf, "", { type: "group" });
  const nested = addConditionEditorNode(withGroup, "1", { type: "condition" });

  assert.equal(root.conditions.length, 0);
  assert.equal(nested.conditions.length, 2);
  assert.equal(nested.conditions[1].conditions.length, 1);
  assert.deepEqual(flattenConditionTree(nested).map((entry) => entry.path), ["", "0", "1", "1.0"]);

  const removed = removeConditionEditorNode(nested, "1.0");
  assert.equal(removed.conditions[1].conditions.length, 0);
  assert.equal(removeConditionEditorNode(removed, ""), null);
});

test("form synchronization preserves nesting and parses typed values", () => {
  let tree = createConditionRoot("all");
  tree = addConditionEditorNode(tree, "", { type: "condition" });
  tree = addConditionEditorNode(tree, "", { type: "condition" });

  const data = new FormData();
  data.set("condition.root.mode", "any");
  data.set("condition.0.fieldSelection", "participants.source.level");
  data.set("condition.0.customField", "");
  data.set("condition.0.operator", "gte");
  data.set("condition.0.value", "12");
  data.set("condition.1.fieldSelection", "participants.target.traits");
  data.set("condition.1.customField", "");
  data.set("condition.1.operator", "contains");
  data.set("condition.1.value", "dragon, huge");

  const synced = syncConditionTreeFromForm(tree, data);
  assert.equal(synced.mode, "any");
  assert.deepEqual(synced.conditions[0], {
    type: "condition",
    field: "participants.source.level",
    operator: "gte",
    value: 12
  });
  assert.deepEqual(synced.conditions[1].value, ["dragon", "huge"]);
});

test("custom provider paths remain editable and visible", () => {
  const tree = {
    type: "condition",
    field: "provider.danger.score",
    operator: "gte",
    value: 3
  };
  const prepared = prepareConditionEditor(tree, { localize: (key) => key });
  assert.equal(prepared.nodes[0].fieldSelection, CONDITION_CUSTOM_FIELD);
  assert.equal(prepared.nodes[0].customField, "provider.danger.score");

  const data = new FormData();
  data.set("condition.root.fieldSelection", CONDITION_CUSTOM_FIELD);
  data.set("condition.root.customField", "provider.danger.total");
  data.set("condition.root.customType", "number");
  data.set("condition.root.operator", "gte");
  data.set("condition.root.value", "4");
  const synced = syncConditionTreeFromForm(tree, data);
  assert.equal(synced.field, "provider.danger.total");
  assert.equal(synced.valueType, "number");
  assert.equal(synced.value, 4);

  const stringData = new FormData();
  stringData.set("condition.root.fieldSelection", CONDITION_CUSTOM_FIELD);
  stringData.set("condition.root.customField", "provider.danger.label");
  stringData.set("condition.root.customType", "string");
  stringData.set("condition.root.operator", "eq");
  stringData.set("condition.root.value", "4");
  const stringValue = syncConditionTreeFromForm(synced, stringData);
  assert.equal(stringValue.valueType, "string");
  assert.equal(stringValue.value, "4");

  const unaryData = new FormData();
  unaryData.set("condition.root.fieldSelection", CONDITION_CUSTOM_FIELD);
  unaryData.set("condition.root.customField", "provider.danger.score");
  unaryData.set("condition.root.customType", "number");
  unaryData.set("condition.root.operator", "exists");
  const unary = syncConditionTreeFromForm(stringValue, unaryData);
  assert.equal(unary.valueType, "number");
  assert.equal(Object.hasOwn(unary, "value"), false);
  assert.equal(prepareConditionEditor(unary, { localize: (key) => key }).nodes[0].customType, "number");
});

test("editor test snapshots evaluate cards without Foundry documents", () => {
  const tree = {
    type: "group",
    mode: "all",
    conditions: [
      { type: "condition", field: "participants.source.hp.ratio", operator: "lte", value: 0.5 },
      { type: "condition", field: "battlefield.hostileThreatCount", operator: "gte", value: 3 },
      { type: "condition", field: "roll.saveType", operator: "eq", value: "reflex" }
    ]
  };
  const result = evaluateConditionEditorTest(tree, {
    category: "savingThrowCriticalSuccess",
    saveType: "reflex",
    sourceHpRatio: "0.4",
    hostileThreatCount: "3"
  });

  assert.equal(result.evaluation.matched, true);
  assert.equal(result.snapshot.provider, "card-editor-test");
  assert.equal(result.snapshot.participants.source.hp.ratio, 0.4);
  assert.equal(result.rows.length, 4);

  const missing = createConditionTestSnapshot({ sourceHpRatio: "" });
  assert.equal(missing.participants.source.hp.ratio, null);
});

test("contradiction analysis warns about impossible all-groups but not alternatives", () => {
  const impossible = {
    type: "group",
    mode: "all",
    conditions: [
      { type: "condition", field: "participants.source.hp.ratio", operator: "lte", value: 0.25 },
      { type: "condition", field: "participants.source.hp.ratio", operator: "gte", value: 0.75 }
    ]
  };
  assert.equal(analyzeConditionContradictions(impossible)[0].code, "CARD_CONDITION_CONTRADICTION");

  const alternatives = { ...impossible, mode: "any" };
  assert.deepEqual(analyzeConditionContradictions(alternatives), []);
});
