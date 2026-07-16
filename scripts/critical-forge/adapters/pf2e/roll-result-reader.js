import { CARD_CATEGORIES } from "../../constants.js";
import { firstDefined, getPath, normalizeSlug, uniqueSlugs } from "./context-utils.js";
import { normalizeSaveType } from "./save-context-reader.js";

const DEGREE_KEYS = Object.freeze([
  "criticalFailure",
  "failure",
  "success",
  "criticalSuccess"
]);

const DEGREE_ALIASES = new Map([
  ["criticalfailure", 0],
  ["critical-failure", 0],
  ["critical_failure", 0],
  ["failure", 1],
  ["success", 2],
  ["criticalsuccess", 3],
  ["critical-success", 3],
  ["critical_success", 3]
]);

export function readRollResult(input = {}) {
  const message = input.message ?? null;
  const roll = resolveRoll(input.roll, message);
  const contextFlag = getPath(message, "flags.pf2e.context") ?? null;
  const damageRollFlag = getPath(message, "flags.pf2e.damageRoll") ?? null;

  const explicitCategory = normalizeExplicitCategory(input.category);
  const degreeCandidate = firstDefined(
    input.degreeOfSuccess,
    input.outcome,
    roll?.degreeOfSuccess,
    roll?.options?.degreeOfSuccess,
    contextFlag?.outcome,
    damageRollFlag?.outcome
  );
  const degree = normalizeDegreeOfSuccess(degreeCandidate);
  const dieResult = readDieResult(input, roll);
  const rollType = normalizeSlug(firstDefined(input.rollType, roll?.type, roll?.options?.type, contextFlag?.type)) || null;
  const identifier = String(firstDefined(input.identifier, roll?.options?.identifier, contextFlag?.identifier, contextFlag?.statistic) ?? "").trim() || null;
  const action = String(firstDefined(input.action, roll?.options?.action, contextFlag?.action) ?? "").trim() || null;
  const rawOptions = uniqueSlugs(
    input.rollOptions,
    contextFlag?.options,
    contextFlag?.contextualOptions?.postRoll,
    roll?.options?.options,
    roll?.options?.rollOptions
  );
  const rollFamily = readRollFamily({
    explicit: input.rollFamily,
    rollType,
    identifier,
    action,
    options: rawOptions,
    explicitCategory
  });

  return {
    roll,
    dieResult,
    isNatural20: dieResult === 20,
    isNatural1: dieResult === 1,
    contextFlag,
    damageRollFlag,
    degree,
    explicitCategory,
    category: explicitCategory,
    categorySource: explicitCategory ? "explicit" : null,
    rollFamily,
    rollType,
    identifier,
    action
  };
}

export function resolveCriticalCategory(rollResult, { isSpell = false } = {}) {
  if (rollResult.explicitCategory) {
    return { category: rollResult.explicitCategory, source: "explicit" };
  }
  const degree = rollResult.degree?.index;
  if (![0, 3].includes(degree)) return { category: null, source: null };

  if (rollResult.rollFamily === "savingThrow") {
    return {
      category: degree === 3 ? "savingThrowCriticalSuccess" : "savingThrowCriticalFailure",
      source: "savingThrowDegreeOfSuccess"
    };
  }
  if (isSpell) {
    return {
      category: degree === 3 ? "spellCriticalHit" : "spellCriticalFumble",
      source: "spellAttackDegreeOfSuccess"
    };
  }
  return {
    category: degree === 3 ? "criticalHit" : "criticalFumble",
    source: "attackDegreeOfSuccess"
  };
}

export function normalizeDegreeOfSuccess(value) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  const index = Number.isInteger(numeric) && numeric >= 0 && numeric <= 3
    ? numeric
    : DEGREE_ALIASES.get(normalizeSlug(value).replaceAll(" ", ""));
  if (index == null) return null;
  const key = DEGREE_KEYS[index];
  return Object.freeze({
    index,
    key,
    slug: key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
  });
}

function readRollFamily({ explicit, rollType, identifier, action, options, explicitCategory }) {
  const normalizedExplicit = normalizeSlug(explicit);
  if (["savingthrow", "saving-throw", "save"].includes(normalizedExplicit)) return "savingThrow";
  if (["spellattack", "spell-attack"].includes(normalizedExplicit)) return "spellAttack";
  if (["attack", "attack-roll"].includes(normalizedExplicit)) return "attack";

  if (explicitCategory?.startsWith("savingThrow")) return "savingThrow";
  if (explicitCategory?.startsWith("spellCritical")) return "spellAttack";
  if (["criticalHit", "criticalFumble"].includes(explicitCategory)) return "attack";

  const values = [rollType, identifier, action].map(normalizeSlug).filter(Boolean);
  if (values.some((value) => value.includes("saving-throw") || value.includes("savingthrow") || normalizeSaveType(value))) {
    return "savingThrow";
  }
  if (options.some((option) => option.includes("saving-throw")
    || option.startsWith("check:statistic:fortitude")
    || option.startsWith("check:statistic:reflex")
    || option.startsWith("check:statistic:will"))) {
    return "savingThrow";
  }
  if (values.some((value) => value.includes("spell-attack"))) return "spellAttack";
  if (values.some((value) => value.includes("attack") || value === "strike")) return "attack";
  return "unknown";
}

function normalizeExplicitCategory(value) {
  const normalized = normalizeSlug(value);
  return CARD_CATEGORIES.find((candidate) => candidate.toLowerCase() === normalized) ?? null;
}

function resolveRoll(explicitRoll, message) {
  if (explicitRoll) return explicitRoll;
  const rolls = Array.isArray(message?.rolls) ? message.rolls : [];
  return rolls.find((candidate) => candidate?.degreeOfSuccess != null || candidate?.options?.degreeOfSuccess != null)
    ?? rolls[0]
    ?? null;
}

function readDieResult(input, roll) {
  const explicit = firstDefined(input.dieResult, input.naturalRoll, input.d20Result);
  const candidates = [
    explicit,
    roll?.dice?.[0]?.total,
    roll?.dice?.[0]?.results?.find?.((entry) => entry?.active !== false)?.result,
    roll?.terms?.find?.((term) => Array.isArray(term?.results) && Number(term?.faces) === 20)?.results?.find?.((entry) => entry?.active !== false)?.result
  ];
  for (const value of candidates) {
    const number = Number(value);
    if (Number.isInteger(number) && number >= 1 && number <= 20) return number;
  }
  return null;
}
