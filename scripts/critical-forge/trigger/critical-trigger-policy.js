import { MODULE_ID, SETTINGS } from "../../constants.js";

export const CRITICAL_TRIGGER_BEHAVIORS = Object.freeze(["disabled", "prompt", "automatic"]);
export const CRITICAL_TRIGGER_SCOPES = Object.freeze(["all", "natural"]);

export function evaluateCriticalTrigger(report, policy = {}) {
  const category = report?.context?.category ?? report?.category ?? null;
  const metadata = report?.metadata ?? report ?? {};
  const degree = metadata.degreeOfSuccess?.index ?? metadata.degreeOfSuccess ?? null;
  const dieResult = Number(metadata.roll?.dieResult ?? metadata.dieResult);
  const behavior = normalizeChoice(policy.behavior, CRITICAL_TRIGGER_BEHAVIORS, "prompt");
  const scope = normalizeChoice(policy.scope, CRITICAL_TRIGGER_SCOPES, "all");

  if (!category || !["criticalHit", "criticalFumble"].includes(category)) {
    return result(false, "ignore", "category-unresolved", { category, degree, dieResult, behavior, scope });
  }
  if (behavior === "disabled") {
    return result(false, "ignore", "disabled", { category, degree, dieResult, behavior, scope });
  }

  const finalCritical = category === "criticalHit" ? degree === 3 : degree === 0;
  if (!finalCritical) {
    return result(false, "ignore", "final-result-not-critical", { category, degree, dieResult, behavior, scope });
  }

  if (scope === "natural") {
    const required = category === "criticalHit" ? 20 : 1;
    if (dieResult !== required) {
      return result(false, "ignore", "natural-result-mismatch", { category, degree, dieResult, behavior, scope });
    }
  }

  return result(true, behavior, "matched", { category, degree, dieResult, behavior, scope });
}

export function configuredTriggerPolicy(category) {
  const hit = category === "criticalHit";
  return Object.freeze({
    behavior: setting(hit ? SETTINGS.CRITICAL_HIT_BEHAVIOR : SETTINGS.CRITICAL_FUMBLE_BEHAVIOR, "prompt"),
    scope: setting(hit ? SETTINGS.CRITICAL_HIT_TRIGGER : SETTINGS.CRITICAL_FUMBLE_TRIGGER, "all")
  });
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
