import {
  getBaseSpeedSelector,
  isKnownBaseSpeedType
} from "../catalogs/movement-type-catalog.js";

function issue(code, messageKey, data = {}) {
  return { code, messageKey, data };
}

export const baseSpeedComponent = {
  type: "baseSpeed",

  validate(component) {
    const errors = [];
    const warnings = [];

    if (typeof component.movementType !== "string" || !isKnownBaseSpeedType(component.movementType)) {
      errors.push(issue(
        "BASE_SPEED_TYPE_INVALID",
        "Validation.Components.BaseSpeed.TypeInvalid",
        { movementType: String(component.movementType ?? "") }
      ));
    }

    if (!Number.isInteger(component.value) || component.value < 1) {
      errors.push(issue(
        "BASE_SPEED_VALUE_INVALID",
        "Validation.Components.BaseSpeed.ValueInvalid",
        { value: String(component.value ?? "") }
      ));
    } else if (component.value % 5 !== 0) {
      warnings.push(issue(
        "BASE_SPEED_VALUE_UNUSUAL_INCREMENT",
        "Validation.Components.BaseSpeed.UnusualIncrement",
        { value: component.value }
      ));
    }

    return { errors, warnings };
  },

  async compile(component) {
    const selector = getBaseSpeedSelector(component.movementType);
    return {
      kind: "baseSpeed",
      movementType: component.movementType,
      selector,
      value: component.value,
      rules: [{
        key: "BaseSpeed",
        selector,
        value: component.value
      }]
    };
  },

  describe(component) {
    return `${component.movementType} Speed ${component.value} feet`;
  }
};
