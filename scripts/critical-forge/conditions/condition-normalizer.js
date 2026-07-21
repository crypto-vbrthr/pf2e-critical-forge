import { deepFreeze } from "../utils.js";
import { CONDITION_GROUP_MODES, CONDITION_OPERATORS, CONDITION_VALUE_TYPES } from "./condition-constants.js";

export function normalizeConditionTree(value) {
  if (value == null) return null;
  return deepFreeze(normalizeNode(value, "conditions"));
}

export function emptyConditionGroup(mode = "all") {
  return deepFreeze({
    type: "group",
    mode: normalizeMode(mode),
    conditions: []
  });
}

function normalizeNode(node, path) {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    throw new TypeError(`Critical condition node must be an object at ${path}.`);
  }

  if (isGroup(node)) {
    const mode = normalizeMode(node.mode);
    const entries = node.conditions ?? node.entries ?? [];
    if (!Array.isArray(entries)) {
      throw new TypeError(`Critical condition group entries must be an array at ${path}.`);
    }
    return {
      type: "group",
      mode,
      conditions: entries.map((entry, index) => normalizeNode(entry, `${path}.conditions.${index}`))
    };
  }

  const field = String(node.field ?? "").trim();
  const operator = String(node.operator ?? "eq").trim();
  if (!field) throw new TypeError(`Critical condition field is required at ${path}.`);
  if (!CONDITION_OPERATORS.includes(operator)) {
    throw new TypeError(`Unsupported Critical condition operator at ${path}: ${operator}`);
  }

  const result = {
    type: "condition",
    field,
    operator
  };
  if (node.valueType != null && String(node.valueType).trim() !== "") {
    const valueType = String(node.valueType).trim();
    if (!CONDITION_VALUE_TYPES.includes(valueType)) {
      throw new TypeError(`Unsupported Critical condition value type at ${path}: ${valueType}`);
    }
    result.valueType = valueType;
  }
  if (!["exists", "notExists"].includes(operator)) result.value = structuredClone(node.value);
  return result;
}

function isGroup(node) {
  return node.type === "group"
    || Object.hasOwn(node, "conditions")
    || Object.hasOwn(node, "entries")
    || CONDITION_GROUP_MODES.includes(String(node.mode ?? "").trim().toLowerCase());
}

function normalizeMode(value) {
  const mode = String(value ?? "all").trim().toLowerCase();
  if (!CONDITION_GROUP_MODES.includes(mode)) {
    throw new TypeError(`Unsupported Critical condition group mode: ${mode}`);
  }
  return mode;
}
