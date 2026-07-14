import { isKnownWeaknessType } from "../catalogs/weakness-type-catalog.js";

function error(code, messageKey, data = {}) {
  return { code, messageKey, data };
}

export const weaknessComponent = {
  type: "weakness",

  validate(component) {
    const errors = [];
    const warnings = [];

    if (
      typeof component.weaknessType !== "string" ||
      !isKnownWeaknessType(component.weaknessType)
    ) {
      errors.push(error(
        "WEAKNESS_TYPE_INVALID",
        "Validation.Components.Weakness.TypeInvalid",
        { weaknessType: String(component.weaknessType ?? "") }
      ));
    }

    if (!Number.isInteger(component.value) || component.value < 1) {
      errors.push(error(
        "WEAKNESS_VALUE_INVALID",
        "Validation.Components.Weakness.ValueInvalid",
        { value: String(component.value ?? "") }
      ));
    }

    return { errors, warnings };
  },

  async compile(component) {
    return {
      kind: "weakness",
      weaknessType: component.weaknessType,
      value: component.value,
      rules: [{
        key: "Weakness",
        type: component.weaknessType,
        value: component.value
      }]
    };
  },

  describe(component) {
    return `Weakness ${component.value} to ${component.weaknessType}`;
  }
};
