import { isKnownDamageType } from "../catalogs/damage-type-catalog.js";

function issue(code, messageKey, data = {}) {
  return { code, messageKey, data };
}

export const regenerationComponent = {
  type: "regeneration",

  validate(component) {
    const errors = [];
    const warnings = [];

    if (!Number.isInteger(component.value) || component.value < 1) {
      errors.push(issue(
        "REGENERATION_VALUE_INVALID",
        "Validation.Components.Regeneration.ValueInvalid",
        { value: String(component.value ?? "") }
      ));
    }

    if (!Array.isArray(component.deactivatedBy) || component.deactivatedBy.length === 0) {
      errors.push(issue(
        "REGENERATION_DEACTIVATION_REQUIRED",
        "Validation.Components.Regeneration.DeactivationRequired"
      ));
      return { errors, warnings };
    }

    const seen = new Set();
    for (const damageType of component.deactivatedBy) {
      if (typeof damageType !== "string" || !isKnownDamageType(damageType)) {
        errors.push(issue(
          "REGENERATION_DEACTIVATION_TYPE_INVALID",
          "Validation.Components.Regeneration.TypeInvalid",
          { damageType: String(damageType ?? "") }
        ));
        continue;
      }

      if (seen.has(damageType)) {
        warnings.push(issue(
          "REGENERATION_DEACTIVATION_DUPLICATE",
          "Validation.Components.Regeneration.DuplicateType",
          { damageType }
        ));
      }
      seen.add(damageType);
    }

    return { errors, warnings };
  },

  async compile(component) {
    const deactivatedBy = [...new Set(component.deactivatedBy)];
    return {
      kind: "regeneration",
      value: component.value,
      deactivatedBy,
      rules: [{
        key: "FastHealing",
        value: component.value,
        type: "regeneration",
        deactivatedBy
      }]
    };
  },

  describe(component) {
    return `Regeneration ${component.value} (deactivated by ${component.deactivatedBy.join(", ")})`;
  }
};
