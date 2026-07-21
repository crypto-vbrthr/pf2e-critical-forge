export const CONDITION_GROUP_MODES = Object.freeze(["all", "any"]);

export const CONDITION_OPERATORS = Object.freeze([
  "eq",
  "neq",
  "lt",
  "lte",
  "gt",
  "gte",
  "contains",
  "notContains",
  "exists",
  "notExists"
]);


export const CONDITION_VALUE_TYPES = Object.freeze([
  "string",
  "number",
  "boolean",
  "stringArray"
]);

export const CONDITION_FIELD_PATTERN = /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/u;

export const BLOCKED_CONDITION_PATH_SEGMENTS = Object.freeze([
  "__proto__",
  "prototype",
  "constructor"
]);
