import { CARD_CATEGORIES } from "../../constants.js";
import { firstDefined, getPath, normalizeSlug } from "./context-utils.js";

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

  const explicitCategory = normalizeSlug(input.category);
  const category = CARD_CATEGORIES.includes(input.category)
    ? input.category
    : CARD_CATEGORIES.find((candidate) => candidate.toLowerCase() === explicitCategory) ?? null;

  const degreeCandidate = firstDefined(
    input.degreeOfSuccess,
    input.outcome,
    roll?.degreeOfSuccess,
    roll?.options?.degreeOfSuccess,
    contextFlag?.outcome,
    damageRollFlag?.outcome
  );
  const degree = normalizeDegreeOfSuccess(degreeCandidate);
  const inferredCategory = degree?.index === 3
    ? "criticalHit"
    : degree?.index === 0
      ? "criticalFumble"
      : null;

  return {
    roll,
    contextFlag,
    damageRollFlag,
    degree,
    category: category ?? inferredCategory,
    categorySource: category ? "explicit" : inferredCategory ? "degreeOfSuccess" : null,
    rollType: normalizeSlug(firstDefined(input.rollType, roll?.type, roll?.options?.type, contextFlag?.type)) || null,
    identifier: String(firstDefined(input.identifier, roll?.options?.identifier, contextFlag?.identifier) ?? "").trim() || null,
    action: String(firstDefined(input.action, roll?.options?.action, contextFlag?.action) ?? "").trim() || null
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

function resolveRoll(explicitRoll, message) {
  if (explicitRoll) return explicitRoll;
  const rolls = Array.isArray(message?.rolls) ? message.rolls : [];
  return rolls.find((candidate) => candidate?.degreeOfSuccess != null || candidate?.options?.degreeOfSuccess != null)
    ?? rolls[0]
    ?? null;
}
