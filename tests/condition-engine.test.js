import test from "node:test";
import assert from "node:assert/strict";
import { assertDeepFrozen, installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();

const { normalizeConditionTree, emptyConditionGroup } = await import(
  "../scripts/critical-forge/conditions/condition-normalizer.js"
);
const { validateConditionTree } = await import(
  "../scripts/critical-forge/conditions/condition-validator.js"
);
const { evaluateConditionTree, resolveConditionField } = await import(
  "../scripts/critical-forge/conditions/condition-evaluator.js"
);

const snapshot = Object.freeze({
  roll: { saveType: "reflex", dc: 31 },
  participants: {
    source: {
      level: 10,
      traits: ["humanoid", "dwarf"],
      hp: { current: 42, max: 105, ratio: 0.4 },
      conditions: { wounded: 1, frightened: 0 }
    },
    target: { level: 13, traits: ["dragon", "fire"] }
  },
  battlefield: { hostileThreatCount: 3 }
});

function leaf(field, operator, value) {
  return { field, operator, value };
}

test("condition normalization creates immutable canonical group and leaf nodes", () => {
  const normalized = normalizeConditionTree({
    mode: "all",
    conditions: [
      leaf("participants.source.hp.ratio", "lte", 0.5),
      { mode: "any", entries: [leaf("roll.saveType", "eq", "reflex")] }
    ]
  });
  assert.equal(normalized.type, "group");
  assert.equal(normalized.conditions[0].type, "condition");
  assert.equal(normalized.conditions[1].conditions[0].field, "roll.saveType");
  assertDeepFrozen(normalized);
  assert.equal(validateConditionTree(normalized).valid, true);
});


test("custom condition value types survive normalization, including unary operators", () => {
  const numeric = normalizeConditionTree({
    field: "provider.danger.score",
    operator: "gte",
    valueType: "number",
    value: 3
  });
  assert.equal(numeric.valueType, "number");
  assert.equal(validateConditionTree(numeric).valid, true);

  const unary = normalizeConditionTree({
    field: "provider.danger.score",
    operator: "exists",
    valueType: "number"
  });
  assert.equal(unary.valueType, "number");
  assert.equal(Object.hasOwn(unary, "value"), false);

  assert.throws(
    () => normalizeConditionTree({ field: "provider.value", operator: "eq", valueType: "object", value: {} }),
    /Unsupported Critical condition value type/
  );
  assert.equal(validateConditionTree({
    type: "condition",
    field: "provider.value",
    operator: "eq",
    valueType: "object",
    value: {}
  }).issues.some((entry) => entry.code === "CARD_CONDITION_VALUE_TYPE_INVALID"), true);
});

test("all and any groups evaluate recursively", () => {
  const tree = normalizeConditionTree({
    mode: "all",
    conditions: [
      leaf("participants.source.hp.ratio", "lte", 0.5),
      {
        mode: "any",
        conditions: [
          leaf("roll.saveType", "eq", "will"),
          leaf("battlefield.hostileThreatCount", "gte", 3)
        ]
      }
    ]
  });
  const result = evaluateConditionTree(tree, snapshot);
  assert.equal(result.matched, true);
  assert.deepEqual(result.counts, { groups: 2, conditions: 3, matched: 2, failed: 1, unavailable: 0 });
  assertDeepFrozen(result);
});

test("numeric and equality operators use normalized runtime values", () => {
  for (const [operator, expected, matched] of [
    ["eq", 10, true],
    ["neq", 11, true],
    ["lt", 11, true],
    ["lte", 10, true],
    ["gt", 9, true],
    ["gte", 10, true]
  ]) {
    const result = evaluateConditionTree(normalizeConditionTree(leaf("participants.source.level", operator, expected)), snapshot);
    assert.equal(result.matched, matched, operator);
  }
});

test("contains and notContains support arrays and strings", () => {
  const group = normalizeConditionTree({
    mode: "all",
    conditions: [
      leaf("participants.target.traits", "contains", ["dragon", "fire"]),
      leaf("participants.source.traits", "notContains", "undead"),
      leaf("roll.saveType", "contains", "flex")
    ]
  });
  assert.equal(evaluateConditionTree(group, snapshot).matched, true);
});

test("missing fields are explicit and never guessed", () => {
  const result = evaluateConditionTree(
    normalizeConditionTree(leaf("danger.score", "gte", 2)),
    snapshot
  );
  assert.equal(result.matched, false);
  assert.equal(result.available, false);
  assert.equal(result.root.reason, "field-unavailable");
  assert.equal(result.root.actual, null);
});

test("exists and notExists intentionally handle unavailable values", () => {
  assert.equal(evaluateConditionTree(
    normalizeConditionTree({ field: "participants.source.level", operator: "exists" }),
    snapshot
  ).matched, true);
  assert.equal(evaluateConditionTree(
    normalizeConditionTree({ field: "danger.score", operator: "notExists" }),
    snapshot
  ).matched, true);
});

test("empty conditions preserve legacy eligibility", () => {
  const result = evaluateConditionTree(null, null);
  assert.equal(result.configured, false);
  assert.equal(result.matched, true);
  assert.deepEqual(result.counts, { groups: 0, conditions: 0, matched: 0, failed: 0, unavailable: 0 });
  assertDeepFrozen(emptyConditionGroup());
});

test("field resolution distinguishes present null values from real data", () => {
  assert.deepEqual(resolveConditionField(snapshot, "participants.source.level"), { exists: true, value: 10 });
  assert.deepEqual(resolveConditionField({ value: null }, "value"), { exists: false, value: null });
  assert.equal(resolveConditionField(snapshot, "participants.missing.level").exists, false);
});

test("condition validation rejects unsafe and malformed paths", () => {
  const unsafe = {
    type: "condition",
    field: "participants.__proto__.level",
    operator: "eq",
    value: 10
  };
  const malformed = {
    type: "condition",
    field: "participants.source[level]",
    operator: "eq",
    value: 10
  };
  assert.equal(validateConditionTree(unsafe).issues.some((entry) => entry.code === "CARD_CONDITION_FIELD_UNSAFE"), true);
  assert.equal(validateConditionTree(malformed).issues.some((entry) => entry.code === "CARD_CONDITION_FIELD_INVALID"), true);
});

test("condition validation checks operator values and numeric operands", () => {
  const report = validateConditionTree({
    type: "group",
    mode: "all",
    conditions: [
      { type: "condition", field: "roll.dc", operator: "gte", value: "many" },
      { type: "condition", field: "roll.saveType", operator: "unknown", value: "reflex" }
    ]
  });
  assert.equal(report.valid, false);
  assert.equal(report.issues.some((entry) => entry.code === "CARD_CONDITION_NUMERIC_VALUE_INVALID"), true);
  assert.equal(report.issues.some((entry) => entry.code === "CARD_CONDITION_OPERATOR_INVALID"), true);
});

test("invalid raw condition input fails normalization with a stable error", () => {
  assert.throws(() => normalizeConditionTree({ mode: "sometimes", conditions: [] }), /Unsupported Critical condition group mode/);
  assert.throws(() => normalizeConditionTree({ field: "roll.dc", operator: "explode", value: 1 }), /Unsupported Critical condition operator/);
});
