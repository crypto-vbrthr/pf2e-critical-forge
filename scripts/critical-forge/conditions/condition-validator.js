import {
  BLOCKED_CONDITION_PATH_SEGMENTS,
  CONDITION_FIELD_PATTERN,
  CONDITION_GROUP_MODES,
  CONDITION_OPERATORS,
  CONDITION_VALUE_TYPES
} from "./condition-constants.js";

const MAX_CONDITION_DEPTH = 12;
const MAX_CONDITION_NODES = 250;

export function validateConditionTree(tree) {
  if (tree == null) return frozenReport([]);
  const issues = [];
  const state = { count: 0 };
  validateNode(tree, "conditions", 0, state, issues);
  if (state.count > MAX_CONDITION_NODES) {
    issues.push(conditionIssue("CARD_CONDITION_NODE_LIMIT_EXCEEDED", "conditions", {
      actual: state.count,
      maximum: MAX_CONDITION_NODES
    }));
  }
  return frozenReport(issues);
}

function validateNode(node, path, depth, state, issues) {
  state.count += 1;
  if (depth > MAX_CONDITION_DEPTH) {
    issues.push(conditionIssue("CARD_CONDITION_DEPTH_EXCEEDED", path, {
      actual: depth,
      maximum: MAX_CONDITION_DEPTH
    }));
    return;
  }
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    issues.push(conditionIssue("CARD_CONDITION_NODE_INVALID", path));
    return;
  }

  if (node.type === "group") {
    if (!CONDITION_GROUP_MODES.includes(node.mode)) {
      issues.push(conditionIssue("CARD_CONDITION_GROUP_MODE_INVALID", `${path}.mode`, { mode: node.mode }));
    }
    if (!Array.isArray(node.conditions)) {
      issues.push(conditionIssue("CARD_CONDITION_GROUP_ENTRIES_INVALID", `${path}.conditions`));
      return;
    }
    node.conditions.forEach((entry, index) => validateNode(entry, `${path}.conditions.${index}`, depth + 1, state, issues));
    return;
  }

  if (node.type !== "condition") {
    issues.push(conditionIssue("CARD_CONDITION_TYPE_INVALID", `${path}.type`, { type: node.type }));
    return;
  }

  if (typeof node.field !== "string" || !CONDITION_FIELD_PATTERN.test(node.field)) {
    issues.push(conditionIssue("CARD_CONDITION_FIELD_INVALID", `${path}.field`, { field: node.field }));
  } else {
    const blocked = node.field.split(".").find((segment) => BLOCKED_CONDITION_PATH_SEGMENTS.includes(segment));
    if (blocked) {
      issues.push(conditionIssue("CARD_CONDITION_FIELD_UNSAFE", `${path}.field`, { field: node.field, segment: blocked }));
    }
  }

  if (!CONDITION_OPERATORS.includes(node.operator)) {
    issues.push(conditionIssue("CARD_CONDITION_OPERATOR_INVALID", `${path}.operator`, { operator: node.operator }));
  }

  if (node.valueType != null && !CONDITION_VALUE_TYPES.includes(node.valueType)) {
    issues.push(conditionIssue("CARD_CONDITION_VALUE_TYPE_INVALID", `${path}.valueType`, { valueType: node.valueType }));
  }

  const unary = ["exists", "notExists"].includes(node.operator);
  if (!unary && !Object.hasOwn(node, "value")) {
    issues.push(conditionIssue("CARD_CONDITION_VALUE_MISSING", `${path}.value`, { operator: node.operator }));
  }
  if (["lt", "lte", "gt", "gte"].includes(node.operator) && !Number.isFinite(Number(node.value))) {
    issues.push(conditionIssue("CARD_CONDITION_NUMERIC_VALUE_INVALID", `${path}.value`, { value: node.value }));
  }
  if (["contains", "notContains"].includes(node.operator) && node.value == null) {
    issues.push(conditionIssue("CARD_CONDITION_CONTAINS_VALUE_INVALID", `${path}.value`, { value: node.value }));
  }
}

function conditionIssue(code, path, data = {}, severity = "error") {
  return Object.freeze({ severity, code, path, data: structuredClone(data) });
}

function frozenReport(issues) {
  const errors = issues.filter((entry) => entry.severity === "error");
  const warnings = issues.filter((entry) => entry.severity === "warning");
  return Object.freeze({
    valid: errors.length === 0,
    issues: Object.freeze([...issues]),
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings)
  });
}
