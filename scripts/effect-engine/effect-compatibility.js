import { validateEffectDefinition } from "./effect-validator.js";

export function checkEffectCompatibility(definition, target, options = {}) {
  const validation = validateEffectDefinition(definition);
  const warnings = [...validation.warnings];

  if (!target) warnings.push("No target was supplied.");

  return {
    compatible: validation.valid && Boolean(target),
    validation,
    warnings,
    targetUuid: target?.uuid ?? target?.document?.uuid ?? null,
    mode: options.incompatibilityMode ?? definition?.application?.incompatibilityMode ?? "warn"
  };
}
