import { isKnownResistanceType } from "../catalogs/resistance-type-catalog.js";

function error(code, messageKey, data = {}) {
  return { code, messageKey, data };
}

export const resistanceComponent = {
  type: "resistance",

  validate(component) {
    const errors = [];
    const warnings = [];

    if (
      typeof component.resistanceType !== "string" ||
      !isKnownResistanceType(component.resistanceType)
    ) {
      errors.push(error(
        "RESISTANCE_TYPE_INVALID",
        "Validation.Components.Resistance.TypeInvalid",
        { resistanceType: String(component.resistanceType ?? "") }
      ));
    }

    if (!Number.isInteger(component.value) || component.value < 1) {
      errors.push(error(
        "RESISTANCE_VALUE_INVALID",
        "Validation.Components.Resistance.ValueInvalid",
        { value: String(component.value ?? "") }
      ));
    }

    return { errors, warnings };
  },

  async compile(component) {
    return {
      kind: "resistance",
      resistanceType: component.resistanceType,
      value: component.value,
      rules: [{
        key: "Resistance",
        type: component.resistanceType,
        value: component.value
      }]
    };
  },

  describe(component) {
    return `Resistance ${component.value} to ${component.resistanceType}`;
  }
};
