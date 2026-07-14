import { isKnownImmunityType } from "../catalogs/immunity-type-catalog.js";

function error(code, messageKey, data = {}) {
  return { code, messageKey, data };
}

export const immunityComponent = {
  type: "immunity",

  validate(component) {
    const errors = [];
    const warnings = [];

    if (
      typeof component.immunityType !== "string" ||
      !isKnownImmunityType(component.immunityType)
    ) {
      errors.push(error(
        "IMMUNITY_TYPE_INVALID",
        "Validation.Components.Immunity.TypeInvalid",
        { immunityType: String(component.immunityType ?? "") }
      ));
    }

    return { errors, warnings };
  },

  async compile(component) {
    return {
      kind: "immunity",
      immunityType: component.immunityType,
      rules: [{
        key: "Immunity",
        type: component.immunityType
      }]
    };
  },

  describe(component) {
    return `Immunity to ${component.immunityType}`;
  }
};
