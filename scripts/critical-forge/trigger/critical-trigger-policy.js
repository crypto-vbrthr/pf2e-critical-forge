import { MODULE_ID, SETTINGS } from "../../constants.js";
import { CARD_CATEGORIES } from "../constants.js";

export const CRITICAL_TRIGGER_BEHAVIORS = Object.freeze(["disabled", "prompt", "automatic"]);
export const CRITICAL_TRIGGER_SCOPES = Object.freeze(["all", "natural"]);

const SUCCESS_CATEGORIES = new Set([
  "criticalHit",
  "spellCriticalHit",
  "savingThrowCriticalSuccess"
]);
const FAILURE_CATEGORIES = new Set([
  "criticalFumble",
  "spellCriticalFumble",
  "savingThrowCriticalFailure"
]);

const SETTING_KEYS = Object.freeze({
  criticalHit: Object.freeze({
    behavior: SETTINGS.CRITICAL_HIT_BEHAVIOR,
    scope: SETTINGS.CRITICAL_HIT_TRIGGER
  }),
  criticalFumble: Object.freeze({
    behavior: SETTINGS.CRITICAL_FUMBLE_BEHAVIOR,
    scope: SETTINGS.CRITICAL_FUMBLE_TRIGGER
  }),
  spellCriticalHit: Object.freeze({
    behavior: SETTINGS.SPELL_CRITICAL_HIT_BEHAVIOR,
    scope: SETTINGS.SPELL_CRITICAL_HIT_TRIGGER
  }),
  spellCriticalFumble: Object.freeze({
    behavior: SETTINGS.SPELL_CRITICAL_FUMBLE_BEHAVIOR,
    scope: SETTINGS.SPELL_CRITICAL_FUMBLE_TRIGGER
  }),
  savingThrowCriticalSuccess: Object.freeze({
    behavior: SETTINGS.SAVING_THROW_CRITICAL_SUCCESS_BEHAVIOR,
    scope: SETTINGS.SAVING_THROW_CRITICAL_SUCCESS_TRIGGER
  }),
  savingThrowCriticalFailure: Object.freeze({
    behavior: SETTINGS.SAVING_THROW_CRITICAL_FAILURE_BEHAVIOR,
    scope: SETTINGS.SAVING_THROW_CRITICAL_FAILURE_TRIGGER
  })
});

export function evaluateCriticalTrigger(report, policy = {}) {
  const category = report?.context?.category ?? report?.category ?? null;
  const metadata = report?.metadata ?? report ?? {};
  const degree = metadata.degreeOfSuccess?.index ?? metadata.degreeOfSuccess ?? null;
  const dieResult = Number(metadata.roll?.dieResult ?? metadata.dieResult);
  const behavior = normalizeChoice(policy.behavior, CRITICAL_TRIGGER_BEHAVIORS, "prompt");
  const scope = normalizeChoice(policy.scope, CRITICAL_TRIGGER_SCOPES, "all");

  if (!category || !CARD_CATEGORIES.includes(category)) {
    return result(false, "ignore", "category-unresolved", { category, degree, dieResult, behavior, scope });
  }
  if (behavior === "disabled") {
    return result(false, "ignore", "disabled", { category, degree, dieResult, behavior, scope });
  }

  const expectsSuccess = SUCCESS_CATEGORIES.has(category);
  const expectsFailure = FAILURE_CATEGORIES.has(category);
  const finalCritical = expectsSuccess ? degree === 3 : expectsFailure ? degree === 0 : false;
  if (!finalCritical) {
    return result(false, "ignore", "final-result-not-critical", { category, degree, dieResult, behavior, scope });
  }

  if (scope === "natural") {
    const required = expectsSuccess ? 20 : 1;
    if (dieResult !== required) {
      return result(false, "ignore", "natural-result-mismatch", { category, degree, dieResult, behavior, scope });
    }
  }

  return result(true, behavior, "matched", { category, degree, dieResult, behavior, scope });
}

export function configuredTriggerPolicy(category) {
  const keys = SETTING_KEYS[category] ?? SETTING_KEYS.criticalHit;
  const defaultBehavior = category === "savingThrowCriticalSuccess" ? "disabled" : "prompt";
  return Object.freeze({
    behavior: setting(keys.behavior, defaultBehavior),
    scope: setting(keys.scope, "all")
  });
}

export function isCriticalSuccessCategory(category) {
  return SUCCESS_CATEGORIES.has(category);
}

export function isCriticalFailureCategory(category) {
  return FAILURE_CATEGORIES.has(category);
}

function result(matched, action, reason, data) {
  return Object.freeze({ matched, action, reason, ...data });
}

function setting(key, fallback) {
  try {
    return globalThis.game?.settings?.get?.(MODULE_ID, key) ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

function normalizeChoice(value, allowed, fallback) {
  const normalized = String(value ?? "");
  return allowed.includes(normalized) ? normalized : fallback;
}
