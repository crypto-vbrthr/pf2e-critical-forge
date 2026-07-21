import { deepFreeze } from "../utils.js";

export function evaluateConditionTree(tree, context) {
  if (tree == null) return noConditionsResult();
  const result = evaluateNode(tree, context, "conditions");
  return deepFreeze({
    configured: true,
    matched: result.matched,
    available: result.available,
    counts: aggregateCounts(result),
    root: result
  });
}

export function resolveConditionField(context, field) {
  const segments = String(field ?? "").split(".").filter(Boolean);
  let cursor = context;
  for (const segment of segments) {
    if (cursor == null || typeof cursor !== "object" || !Object.hasOwn(cursor, segment)) {
      return Object.freeze({ exists: false, value: undefined });
    }
    cursor = cursor[segment];
  }
  return Object.freeze({ exists: cursor !== null && cursor !== undefined, value: cursor });
}

function evaluateNode(node, context, path) {
  if (node.type === "group") {
    const children = node.conditions.map((entry, index) => evaluateNode(entry, context, `${path}.conditions.${index}`));
    const matched = node.mode === "any"
      ? children.some((entry) => entry.matched)
      : children.every((entry) => entry.matched);
    const available = children.every((entry) => entry.available);
    return {
      type: "group",
      path,
      mode: node.mode,
      matched,
      available,
      conditions: children
    };
  }

  const resolved = resolveConditionField(context, node.field);
  const comparison = compare(node.operator, resolved, node.value);
  return {
    type: "condition",
    path,
    field: node.field,
    operator: node.operator,
    expected: Object.hasOwn(node, "value") ? structuredClone(node.value) : null,
    actual: serializableValue(resolved.value),
    fieldAvailable: resolved.exists,
    available: comparison.available,
    matched: comparison.matched,
    reason: comparison.reason
  };
}

function compare(operator, resolved, expected) {
  if (operator === "exists") {
    return { available: true, matched: resolved.exists, reason: resolved.exists ? "matched" : "field-unavailable" };
  }
  if (operator === "notExists") {
    return { available: true, matched: !resolved.exists, reason: !resolved.exists ? "matched" : "value-mismatch" };
  }
  if (!resolved.exists) return { available: false, matched: false, reason: "field-unavailable" };

  let matched = false;
  switch (operator) {
    case "eq":
      matched = equal(resolved.value, expected);
      break;
    case "neq":
      matched = !equal(resolved.value, expected);
      break;
    case "lt":
      matched = numeric(resolved.value, expected, (actual, value) => actual < value);
      break;
    case "lte":
      matched = numeric(resolved.value, expected, (actual, value) => actual <= value);
      break;
    case "gt":
      matched = numeric(resolved.value, expected, (actual, value) => actual > value);
      break;
    case "gte":
      matched = numeric(resolved.value, expected, (actual, value) => actual >= value);
      break;
    case "contains":
      matched = contains(resolved.value, expected);
      break;
    case "notContains":
      matched = !contains(resolved.value, expected);
      break;
    default:
      return { available: false, matched: false, reason: "operator-unsupported" };
  }
  return { available: true, matched, reason: matched ? "matched" : "value-mismatch" };
}

function numeric(actual, expected, predicate) {
  const left = Number(actual);
  const right = Number(expected);
  return Number.isFinite(left) && Number.isFinite(right) && predicate(left, right);
}

function contains(actual, expected) {
  if (Array.isArray(actual)) {
    const values = Array.isArray(expected) ? expected : [expected];
    return values.every((value) => actual.some((entry) => equal(entry, value)));
  }
  if (typeof actual === "string") {
    const values = Array.isArray(expected) ? expected : [expected];
    return values.every((value) => actual.includes(String(value)));
  }
  if (actual instanceof Set) {
    const values = Array.isArray(expected) ? expected : [expected];
    return values.every((value) => actual.has(value));
  }
  return false;
}

function equal(left, right) {
  if (Object.is(left, right)) return true;
  if (typeof left === "number" || typeof right === "number") {
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber === rightNumber;
  }
  if (left && right && typeof left === "object" && typeof right === "object") {
    try {
      return JSON.stringify(left) === JSON.stringify(right);
    } catch (_error) {
      return false;
    }
  }
  return false;
}

function aggregateCounts(result) {
  const nodes = flatten(result);
  const leaves = nodes.filter((entry) => entry.type === "condition");
  return {
    groups: nodes.filter((entry) => entry.type === "group").length,
    conditions: leaves.length,
    matched: leaves.filter((entry) => entry.matched).length,
    failed: leaves.filter((entry) => !entry.matched).length,
    unavailable: leaves.filter((entry) => !entry.available).length
  };
}

function flatten(node) {
  if (node.type !== "group") return [node];
  return [node, ...node.conditions.flatMap(flatten)];
}

function noConditionsResult() {
  return deepFreeze({
    configured: false,
    matched: true,
    available: true,
    counts: { groups: 0, conditions: 0, matched: 0, failed: 0, unavailable: 0 },
    root: null
  });
}

function serializableValue(value) {
  if (value === undefined) return null;
  if (value instanceof Set) return [...value];
  try {
    return structuredClone(value);
  } catch (_error) {
    return String(value);
  }
}
