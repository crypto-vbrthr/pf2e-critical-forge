import { CONDITION_GROUP_MODES, CONDITION_OPERATORS, CONDITION_VALUE_TYPES } from "../conditions/condition-constants.js";
import { emptyConditionGroup } from "../conditions/condition-normalizer.js";
import { evaluateConditionTree } from "../conditions/condition-evaluator.js";
import { deepClone } from "../utils.js";
import { criticalConditionProviderRegistry } from "../conditions/condition-provider-registry.js";

export const CONDITION_CUSTOM_FIELD = "__custom__";

export const CONDITION_FIELD_TYPES = Object.freeze({
  STRING: "string",
  NUMBER: "number",
  BOOLEAN: "boolean",
  STRING_ARRAY: "stringArray",
  ENUM: "enum",
  UNKNOWN: "unknown"
});

const CUSTOM_FIELD_TYPES = Object.freeze([...CONDITION_VALUE_TYPES]);

const FIELD = (path, type, labelKey, groupKey, values = null) => Object.freeze({
  path,
  type,
  labelKey,
  groupKey,
  values: values ? Object.freeze([...values]) : null
});

export const CONDITION_FIELD_CATALOG = Object.freeze([
  FIELD("roll.category", CONDITION_FIELD_TYPES.ENUM, "RollCategory", "Roll", [
    "criticalHit",
    "criticalFumble",
    "spellCriticalHit",
    "spellCriticalFumble",
    "savingThrowCriticalSuccess",
    "savingThrowCriticalFailure"
  ]),
  FIELD("roll.family", CONDITION_FIELD_TYPES.STRING, "RollFamily", "Roll"),
  FIELD("roll.type", CONDITION_FIELD_TYPES.STRING, "RollType", "Roll"),
  FIELD("roll.identifier", CONDITION_FIELD_TYPES.STRING, "RollIdentifier", "Roll"),
  FIELD("roll.action", CONDITION_FIELD_TYPES.STRING, "RollAction", "Roll"),
  FIELD("roll.outcome", CONDITION_FIELD_TYPES.STRING, "RollOutcome", "Roll"),
  FIELD("roll.degree", CONDITION_FIELD_TYPES.NUMBER, "RollDegree", "Roll"),
  FIELD("roll.dieResult", CONDITION_FIELD_TYPES.NUMBER, "DieResult", "Roll"),
  FIELD("roll.isNatural20", CONDITION_FIELD_TYPES.BOOLEAN, "Natural20", "Roll"),
  FIELD("roll.isNatural1", CONDITION_FIELD_TYPES.BOOLEAN, "Natural1", "Roll"),
  FIELD("roll.saveType", CONDITION_FIELD_TYPES.ENUM, "SaveType", "Roll", ["fortitude", "reflex", "will"]),
  FIELD("roll.dc", CONDITION_FIELD_TYPES.NUMBER, "DifficultyClass", "Roll"),

  FIELD("item.type", CONDITION_FIELD_TYPES.STRING, "ItemType", "Item"),
  FIELD("item.category", CONDITION_FIELD_TYPES.STRING, "ItemCategory", "Item"),
  FIELD("item.baseItem", CONDITION_FIELD_TYPES.STRING, "BaseItem", "Item"),
  FIELD("item.isMelee", CONDITION_FIELD_TYPES.BOOLEAN, "IsMelee", "Item"),
  FIELD("item.isRanged", CONDITION_FIELD_TYPES.BOOLEAN, "IsRanged", "Item"),
  FIELD("item.isSpell", CONDITION_FIELD_TYPES.BOOLEAN, "IsSpell", "Item"),
  FIELD("item.spellRank", CONDITION_FIELD_TYPES.NUMBER, "SpellRank", "Item"),

  ...participantFields("source", "Source"),
  ...participantFields("target", "Target"),

  FIELD("battlefield.round", CONDITION_FIELD_TYPES.NUMBER, "CombatRound", "Battlefield"),
  FIELD("battlefield.turn", CONDITION_FIELD_TYPES.NUMBER, "CombatTurn", "Battlefield"),
  FIELD("battlefield.selectedTargetCount", CONDITION_FIELD_TYPES.NUMBER, "SelectedTargetCount", "Battlefield"),
  FIELD("battlefield.hostileThreatCount", CONDITION_FIELD_TYPES.NUMBER, "HostileThreatCount", "Battlefield"),
  FIELD("battlefield.threatEvaluation", CONDITION_FIELD_TYPES.STRING, "ThreatEvaluation", "Battlefield")
]);

const FIELD_BY_PATH = new Map(CONDITION_FIELD_CATALOG.map((entry) => [entry.path, entry]));

export function listConditionFieldDefinitions() {
  return Object.freeze([
    ...CONDITION_FIELD_CATALOG,
    ...criticalConditionProviderRegistry.listFields()
  ]);
}

export function conditionFieldDefinition(path) {
  const normalized = String(path ?? "");
  return FIELD_BY_PATH.get(normalized) ?? criticalConditionProviderRegistry.getField(normalized) ?? null;
}

export function conditionOperatorsForField(path, type = null) {
  const resolvedType = type ?? conditionFieldDefinition(path)?.type ?? CONDITION_FIELD_TYPES.UNKNOWN;
  const operators = switchOperators(resolvedType);
  return operators.filter((operator) => CONDITION_OPERATORS.includes(operator));
}

export function createConditionRoot(mode = "all") {
  return deepClone(emptyConditionGroup(mode));
}

export function addConditionEditorNode(tree, parentPath = "", { type = "condition" } = {}) {
  const next = tree == null ? createConditionRoot("all") : deepClone(tree);
  const parent = getConditionNode(next, parentPath);
  if (!parent || parent.type !== "group") throw new TypeError("Condition nodes can only be added to groups.");
  parent.conditions.push(type === "group" ? createConditionRoot("all") : defaultConditionLeaf());
  return next;
}

export function removeConditionEditorNode(tree, path = "") {
  if (tree == null) return null;
  if (!path) return null;
  const next = deepClone(tree);
  const segments = parseConditionPath(path);
  const index = segments.pop();
  const parent = getConditionNode(next, segments.join("."));
  if (!parent || parent.type !== "group" || !Number.isInteger(index)) return next;
  parent.conditions.splice(index, 1);
  return next;
}

export function syncConditionTreeFromForm(tree, formData) {
  if (tree == null) return null;
  const next = deepClone(tree);
  for (const entry of flattenConditionTree(next)) {
    const key = conditionPathKey(entry.path);
    if (entry.node.type === "group") {
      const mode = String(formData.get(`condition.${key}.mode`) ?? entry.node.mode ?? "all");
      entry.node.mode = CONDITION_GROUP_MODES.includes(mode) ? mode : "all";
      continue;
    }

    const selection = String(formData.get(`condition.${key}.fieldSelection`) ?? entry.node.field ?? "");
    const custom = String(formData.get(`condition.${key}.customField`) ?? "").trim();
    entry.node.field = selection === CONDITION_CUSTOM_FIELD ? custom : selection;

    const definition = conditionFieldDefinition(entry.node.field);
    const inferredType = inferConditionValueType(entry.node.value);
    const requestedCustomType = String(formData.get(`condition.${key}.customType`) ?? entry.node.valueType ?? inferredType ?? CONDITION_FIELD_TYPES.STRING);
    const valueType = definition?.type ?? (CUSTOM_FIELD_TYPES.includes(requestedCustomType) ? requestedCustomType : CONDITION_FIELD_TYPES.STRING);
    if (definition) delete entry.node.valueType;
    else entry.node.valueType = valueType;
    const available = conditionOperatorsForField(entry.node.field, valueType);
    const requested = String(formData.get(`condition.${key}.operator`) ?? entry.node.operator ?? "eq");
    entry.node.operator = available.includes(requested) ? requested : available[0] ?? "eq";

    if (["exists", "notExists"].includes(entry.node.operator)) {
      delete entry.node.value;
      continue;
    }

    const raw = formData.get(`condition.${key}.value`);
    entry.node.value = parseConditionValue(raw, valueType, definition);
  }
  return next;
}

export function prepareConditionEditor(tree, { localize = defaultLocalize } = {}) {
  const nodes = tree == null ? [] : flattenConditionTree(tree).map(({ node, path, depth, parentPath }) => {
    const definition = node.type === "condition" ? conditionFieldDefinition(node.field) : null;
    const inferredType = inferConditionValueType(node.value);
    const configuredType = CUSTOM_FIELD_TYPES.includes(node.valueType) ? node.valueType : inferredType;
    const type = definition?.type ?? (CUSTOM_FIELD_TYPES.includes(configuredType) ? configuredType : CONDITION_FIELD_TYPES.STRING);
    const operators = node.type === "condition" ? conditionOperatorsForField(node.field, type) : [];
    const key = conditionPathKey(path);
    const isUnary = node.type === "condition" && ["exists", "notExists"].includes(node.operator);
    return {
      key,
      path,
      parentPath,
      depth,
      indent: depth * 18,
      isGroup: node.type === "group",
      isCondition: node.type === "condition",
      mode: node.mode,
      modeOptions: optionList(CONDITION_GROUP_MODES, node.mode, (value) => localize(`PF2E_CRITICAL_FORGE.CardEditor.ConditionModes.${capitalize(value)}`)),
      field: node.field,
      fieldSelection: definition ? node.field : CONDITION_CUSTOM_FIELD,
      isCustomField: !definition,
      customField: definition ? "" : node.field,
      customType: type,
      customTypeOptions: optionList(CUSTOM_FIELD_TYPES, type, (value) => localize(`PF2E_CRITICAL_FORGE.CardEditor.ConditionValueTypes.${capitalize(value)}`)),
      fieldOptions: conditionFieldOptions(node.field, { localize }),
      operator: node.operator,
      operatorOptions: optionList(operators, node.operator, (value) => localize(`PF2E_CRITICAL_FORGE.CardEditor.ConditionOperators.${value}`)),
      type,
      requiresValue: node.type === "condition" && !isUnary,
      isNumber: type === CONDITION_FIELD_TYPES.NUMBER,
      isBoolean: type === CONDITION_FIELD_TYPES.BOOLEAN,
      isArray: type === CONDITION_FIELD_TYPES.STRING_ARRAY,
      isEnum: type === CONDITION_FIELD_TYPES.ENUM && Boolean(definition?.values?.length),
      isText: ![
        CONDITION_FIELD_TYPES.NUMBER,
        CONDITION_FIELD_TYPES.BOOLEAN,
        CONDITION_FIELD_TYPES.ENUM
      ].includes(type),
      value: formatConditionValue(node.value, type),
      valueOptions: definition?.values
        ? optionList(definition.values, String(node.value ?? ""), (value) => localizeEnumValue(definition.path, value, localize))
        : [],
      booleanOptions: optionList(["true", "false"], String(Boolean(node.value)), (value) => localize(`PF2E_CRITICAL_FORGE.CardEditor.BooleanValues.${capitalize(value)}`)),
      label: definition ? localizeConditionField(definition, localize) : node.field,
      groupLabel: definition ? localizeConditionGroup(definition, localize) : localize("PF2E_CRITICAL_FORGE.CardEditor.ConditionFieldGroups.Custom")
    };
  });

  return {
    enabled: tree != null,
    nodeCount: nodes.length,
    nodes,
    json: tree == null ? "" : JSON.stringify(tree, null, 2)
  };
}

export function createConditionTestSnapshot(input = {}) {
  const sourceRatio = finiteOrNull(input.sourceHpRatio);
  const targetRatio = finiteOrNull(input.targetHpRatio);
  return {
    schemaVersion: 1,
    system: "pf2e",
    provider: "card-editor-test",
    providerVersion: "1.0.0",
    capturedAt: null,
    message: { id: null, uuid: null, timestamp: null, authorId: null, speaker: "Card Editor" },
    roll: {
      category: stringOrNull(input.category),
      family: stringOrNull(input.rollFamily),
      type: stringOrNull(input.rollType),
      identifier: null,
      action: null,
      outcome: stringOrNull(input.outcome),
      degree: finiteOrNull(input.degree),
      dieResult: finiteOrNull(input.dieResult),
      isNatural20: Boolean(input.isNatural20),
      isNatural1: Boolean(input.isNatural1),
      saveType: stringOrNull(input.saveType),
      dc: finiteOrNull(input.dc)
    },
    item: {
      id: null,
      uuid: null,
      name: null,
      type: stringOrNull(input.itemType),
      category: stringOrNull(input.itemCategory),
      baseItem: stringOrNull(input.baseItem),
      rangeIncrement: finiteOrNull(input.rangeIncrement),
      isMelee: nullableBoolean(input.isMelee),
      isRanged: nullableBoolean(input.isRanged),
      isSpell: Boolean(input.isSpell),
      spellRank: finiteOrNull(input.spellRank)
    },
    participants: {
      source: testParticipant("source", input.sourceLevel, sourceRatio, input.sourceTraits),
      target: testParticipant("target", input.targetLevel, targetRatio, input.targetTraits)
    },
    roles: { roller: "source", opponent: "target", legacySource: "source", legacyTarget: "target" },
    battlefield: {
      sceneId: null,
      sceneUuid: null,
      combatId: null,
      combatUuid: null,
      round: finiteOrNull(input.round),
      turn: finiteOrNull(input.turn),
      selectedTargetCount: finiteOrNull(input.selectedTargetCount),
      hostileThreatCount: finiteOrNull(input.hostileThreatCount),
      threatEvaluation: input.hostileThreatCount === "" || input.hostileThreatCount == null ? "not-evaluated" : "editor-test"
    },
    selection: {},
    provenance: { test: true },
    diagnostics: []
  };
}

export function defaultConditionTestInput(category = "criticalHit") {
  return {
    category,
    saveType: "",
    dc: "",
    sourceLevel: "",
    sourceHpRatio: "",
    sourceTraits: "",
    targetLevel: "",
    targetHpRatio: "",
    targetTraits: "",
    hostileThreatCount: "",
    round: "",
    turn: ""
  };
}

export function syncConditionTestInput(current = {}, formData) {
  const keys = [
    "category",
    "saveType",
    "dc",
    "sourceLevel",
    "sourceHpRatio",
    "sourceTraits",
    "targetLevel",
    "targetHpRatio",
    "targetTraits",
    "hostileThreatCount",
    "round",
    "turn"
  ];
  return Object.fromEntries(keys.map((key) => [key, String(formData.get(`conditionTest.${key}`) ?? current[key] ?? "").trim()]));
}

export function evaluateConditionEditorTest(tree, input = {}) {
  const snapshot = createConditionTestSnapshot(input);
  const evaluation = evaluateConditionTree(tree, snapshot);
  return {
    snapshot,
    evaluation,
    rows: evaluation.root ? flattenEvaluation(evaluation.root) : []
  };
}

export function analyzeConditionContradictions(tree) {
  if (tree == null) return [];
  const issues = [];
  walkContradictions(tree, "conditions", issues);
  return issues;
}

export function flattenConditionTree(tree) {
  if (tree == null) return [];
  const rows = [];
  walk(tree, "", 0, "", rows);
  return rows;
}

export function getConditionNode(tree, path = "") {
  if (tree == null) return null;
  if (!path) return tree;
  let cursor = tree;
  for (const index of parseConditionPath(path)) {
    if (!cursor || cursor.type !== "group" || !Array.isArray(cursor.conditions)) return null;
    cursor = cursor.conditions[index];
  }
  return cursor ?? null;
}

export function conditionPathKey(path = "") {
  return path ? path.replaceAll(".", "_") : "root";
}

function participantFields(role, prefix) {
  const group = prefix;
  return [
    FIELD(`participants.${role}.level`, CONDITION_FIELD_TYPES.NUMBER, `${prefix}Level`, group),
    FIELD(`participants.${role}.size`, CONDITION_FIELD_TYPES.STRING, `${prefix}Size`, group),
    FIELD(`participants.${role}.traits`, CONDITION_FIELD_TYPES.STRING_ARRAY, `${prefix}Traits`, group),
    FIELD(`participants.${role}.hp.current`, CONDITION_FIELD_TYPES.NUMBER, `${prefix}HpCurrent`, group),
    FIELD(`participants.${role}.hp.max`, CONDITION_FIELD_TYPES.NUMBER, `${prefix}HpMax`, group),
    FIELD(`participants.${role}.hp.temp`, CONDITION_FIELD_TYPES.NUMBER, `${prefix}HpTemp`, group),
    FIELD(`participants.${role}.hp.ratio`, CONDITION_FIELD_TYPES.NUMBER, `${prefix}HpRatio`, group),
    FIELD(`participants.${role}.conditions.wounded`, CONDITION_FIELD_TYPES.NUMBER, `${prefix}Wounded`, group),
    FIELD(`participants.${role}.conditions.dying`, CONDITION_FIELD_TYPES.NUMBER, `${prefix}Dying`, group),
    FIELD(`participants.${role}.conditions.frightened`, CONDITION_FIELD_TYPES.NUMBER, `${prefix}Frightened`, group),
    FIELD(`participants.${role}.defeated`, CONDITION_FIELD_TYPES.BOOLEAN, `${prefix}Defeated`, group)
  ];
}

function switchOperators(type) {
  switch (type) {
    case CONDITION_FIELD_TYPES.NUMBER:
      return ["eq", "neq", "lt", "lte", "gt", "gte", "exists", "notExists"];
    case CONDITION_FIELD_TYPES.BOOLEAN:
    case CONDITION_FIELD_TYPES.ENUM:
      return ["eq", "neq", "exists", "notExists"];
    case CONDITION_FIELD_TYPES.STRING_ARRAY:
      return ["contains", "notContains", "eq", "neq", "exists", "notExists"];
    case CONDITION_FIELD_TYPES.STRING:
      return ["eq", "neq", "contains", "notContains", "exists", "notExists"];
    default:
      return [...CONDITION_OPERATORS];
  }
}

function defaultConditionLeaf() {
  return {
    type: "condition",
    field: "participants.source.hp.ratio",
    operator: "lte",
    value: 0.5
  };
}

function walk(node, path, depth, parentPath, rows) {
  rows.push({ node, path, depth, parentPath });
  if (node?.type !== "group") return;
  node.conditions.forEach((child, index) => {
    const childPath = path ? `${path}.${index}` : String(index);
    walk(child, childPath, depth + 1, path, rows);
  });
}

function parseConditionPath(path) {
  if (!path) return [];
  return String(path).split(".").map((part) => Number(part)).filter(Number.isInteger);
}

function conditionFieldOptions(selected, { localize }) {
  const byGroup = new Map();
  for (const field of listConditionFieldDefinitions()) {
    const group = localizeConditionGroup(field, localize);
    const values = byGroup.get(group) ?? [];
    values.push({ value: field.path, label: localizeConditionField(field, localize), selected: field.path === selected });
    byGroup.set(group, values);
  }
  const groups = [...byGroup.entries()].map(([label, options]) => ({ label, options }));
  groups.push({
    label: localize("PF2E_CRITICAL_FORGE.CardEditor.ConditionFieldGroups.Custom"),
    options: [{
      value: CONDITION_CUSTOM_FIELD,
      label: localize("PF2E_CRITICAL_FORGE.CardEditor.ConditionFields.Custom"),
      selected: !conditionFieldDefinition(selected)
    }]
  });
  return groups;
}

function localizeConditionField(definition, localize) {
  if (!definition?.extension) return localize(`PF2E_CRITICAL_FORGE.CardEditor.ConditionFields.${definition.labelKey}`);
  return localizeOptional(definition.labelKey, definition.fallbackLabel ?? definition.path, localize);
}

function localizeConditionGroup(definition, localize) {
  if (!definition?.extension) return localize(`PF2E_CRITICAL_FORGE.CardEditor.ConditionFieldGroups.${definition.groupKey}`);
  return localizeOptional(definition.groupKey, definition.fallbackGroup ?? definition.providerId, localize);
}

function localizeOptional(key, fallback, localize) {
  if (!key) return fallback;
  const localized = localize(key);
  return localized && localized !== key ? localized : fallback;
}

function parseConditionValue(raw, type, definition) {
  const text = String(raw ?? "").trim();
  switch (type) {
    case CONDITION_FIELD_TYPES.NUMBER:
      return text === "" ? null : Number(text);
    case CONDITION_FIELD_TYPES.BOOLEAN:
      return text === "true";
    case CONDITION_FIELD_TYPES.STRING_ARRAY:
      return text.split(/[,;\n]+/u).map((entry) => entry.trim()).filter(Boolean);
    case CONDITION_FIELD_TYPES.ENUM:
      return definition?.values?.includes(text) ? text : text;
    default:
      return text;
  }
}

function formatConditionValue(value, type) {
  if (value == null) return "";
  if (type === CONDITION_FIELD_TYPES.STRING_ARRAY && Array.isArray(value)) return value.join(", ");
  if (type === CONDITION_FIELD_TYPES.BOOLEAN) return String(Boolean(value));
  return String(value);
}

function inferConditionValueType(value) {
  if (typeof value === "number") return CONDITION_FIELD_TYPES.NUMBER;
  if (typeof value === "boolean") return CONDITION_FIELD_TYPES.BOOLEAN;
  if (Array.isArray(value)) return CONDITION_FIELD_TYPES.STRING_ARRAY;
  if (typeof value === "string") return CONDITION_FIELD_TYPES.STRING;
  return CONDITION_FIELD_TYPES.UNKNOWN;
}

function optionList(values, selected, labeler) {
  return values.map((value) => ({ value, label: labeler(value), selected: String(value) === String(selected) }));
}

function localizeEnumValue(path, value, localize) {
  if (path === "roll.saveType") return localize(`PF2E_CRITICAL_FORGE.CardEditor.SaveTypes.${capitalize(value)}`);
  if (path === "roll.category") return localize(`PF2E_CRITICAL_FORGE.CardEditor.Categories.${capitalize(value)}`);
  return value;
}

function defaultLocalize(key) {
  const value = globalThis.game?.i18n?.localize?.(key);
  return value && value !== key ? value : key.split(".").pop();
}

function testParticipant(role, level, ratio, traits) {
  const normalizedRatio = ratio == null ? null : Math.min(1, Math.max(0, ratio));
  return {
    role,
    id: null,
    uuid: null,
    tokenUuid: null,
    name: role === "source" ? "Source" : "Target",
    type: "character",
    level: finiteOrNull(level),
    size: null,
    traits: String(traits ?? "").split(/[,;\n]+/u).map((entry) => entry.trim()).filter(Boolean),
    hp: { current: normalizedRatio == null ? null : normalizedRatio * 100, max: normalizedRatio == null ? null : 100, temp: 0, ratio: normalizedRatio },
    conditions: { wounded: 0, dying: 0, frightened: 0 },
    position: { x: null, y: null, elevation: null },
    disposition: null,
    defeated: false
  };
}

function finiteOrNull(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function stringOrNull(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function nullableBoolean(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}

function flattenEvaluation(root) {
  const rows = [];
  const walkResult = (node, depth = 0) => {
    rows.push({
      ...node,
      depth,
      indent: depth * 18,
      isGroup: node.type === "group",
      isCondition: node.type === "condition",
      expectedText: displayValue(node.expected),
      actualText: displayValue(node.actual)
    });
    if (node.type === "group") node.conditions.forEach((child) => walkResult(child, depth + 1));
  };
  walkResult(root);
  return rows;
}

function displayValue(value) {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function walkContradictions(node, path, issues) {
  if (node?.type !== "group") return;
  if (node.mode === "all") inspectAllGroup(node, path, issues);
  node.conditions.forEach((child, index) => walkContradictions(child, `${path}.conditions.${index}`, issues));
}

function inspectAllGroup(group, path, issues) {
  const leaves = group.conditions.filter((entry) => entry?.type === "condition");
  const byField = new Map();
  for (const leaf of leaves) {
    const values = byField.get(leaf.field) ?? [];
    values.push(leaf);
    byField.set(leaf.field, values);
  }

  for (const [field, constraints] of byField) {
    if (constraints.some((entry) => entry.operator === "exists") && constraints.some((entry) => entry.operator === "notExists")) {
      issues.push(contradiction("exists-not-exists", path, field));
    }

    const equals = constraints.filter((entry) => entry.operator === "eq").map((entry) => stableValue(entry.value));
    if (new Set(equals).size > 1) issues.push(contradiction("multiple-equality", path, field));
    if (constraints.some((entry) => entry.operator === "neq" && equals.includes(stableValue(entry.value)))) {
      issues.push(contradiction("equal-and-not-equal", path, field));
    }

    const containsValues = constraints.filter((entry) => entry.operator === "contains").flatMap((entry) => arrayValue(entry.value).map(stableValue));
    const excludes = constraints.filter((entry) => entry.operator === "notContains").flatMap((entry) => arrayValue(entry.value).map(stableValue));
    if (containsValues.some((value) => excludes.includes(value))) issues.push(contradiction("contains-and-not-contains", path, field));

    const numeric = constraints.filter((entry) => ["lt", "lte", "gt", "gte", "eq"].includes(entry.operator) && Number.isFinite(Number(entry.value)));
    if (numeric.length) {
      const lower = strongestLowerBound(numeric);
      const upper = strongestUpperBound(numeric);
      if (lower && upper && (lower.value > upper.value || (lower.value === upper.value && (!lower.inclusive || !upper.inclusive)))) {
        issues.push(contradiction("numeric-range-empty", path, field));
      }
    }
  }
}

function strongestLowerBound(entries) {
  const candidates = entries.flatMap((entry) => {
    if (entry.operator === "eq") return [{ value: Number(entry.value), inclusive: true }];
    if (entry.operator === "gt") return [{ value: Number(entry.value), inclusive: false }];
    if (entry.operator === "gte") return [{ value: Number(entry.value), inclusive: true }];
    return [];
  });
  return candidates.sort((a, b) => b.value - a.value || Number(a.inclusive) - Number(b.inclusive))[0] ?? null;
}

function strongestUpperBound(entries) {
  const candidates = entries.flatMap((entry) => {
    if (entry.operator === "eq") return [{ value: Number(entry.value), inclusive: true }];
    if (entry.operator === "lt") return [{ value: Number(entry.value), inclusive: false }];
    if (entry.operator === "lte") return [{ value: Number(entry.value), inclusive: true }];
    return [];
  });
  return candidates.sort((a, b) => a.value - b.value || Number(a.inclusive) - Number(b.inclusive))[0] ?? null;
}

function contradiction(reason, path, field) {
  return Object.freeze({
    severity: "warning",
    code: "CARD_CONDITION_CONTRADICTION",
    path,
    data: { field, reason }
  });
}

function stableValue(value) {
  return JSON.stringify(value);
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [value];
}

function capitalize(value) {
  const text = String(value ?? "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
