import {
  getMovementSelector,
  isKnownMovementType
} from "../catalogs/movement-type-catalog.js";

const MODIFIER_TYPES = new Set(["status", "circumstance", "item", "untyped"]);

function issue(code, messageKey, data = {}) {
  return { code, messageKey, data };
}

export const movementComponent = {
  type: "movement",

  validate(component) {
    const errors = [];
    const warnings = [];

    if (typeof component.movementType !== "string" || !isKnownMovementType(component.movementType)) {
      errors.push(issue(
        "MOVEMENT_TYPE_INVALID",
        "Validation.Components.Movement.TypeInvalid",
        { movementType: String(component.movementType ?? "") }
      ));
    }

    if (!Number.isInteger(component.value) || component.value === 0) {
      errors.push(issue(
        "MOVEMENT_VALUE_INVALID",
        "Validation.Components.Movement.ValueInvalid",
        { value: String(component.value ?? "") }
      ));
    } else if (Math.abs(component.value) % 5 !== 0) {
      warnings.push(issue(
        "MOVEMENT_VALUE_UNUSUAL_INCREMENT",
        "Validation.Components.Movement.UnusualIncrement",
        { value: component.value }
      ));
    }

    if (!MODIFIER_TYPES.has(component.modifierType)) {
      errors.push(issue(
        "MOVEMENT_MODIFIER_TYPE_INVALID",
        "Validation.Components.Movement.ModifierTypeInvalid",
        { modifierType: String(component.modifierType ?? "") }
      ));
    }

    return { errors, warnings };
  },

  async compile(component) {
    const selector = getMovementSelector(component.movementType);
    return {
      kind: "movement",
      movementType: component.movementType,
      selector,
      value: component.value,
      modifierType: component.modifierType,
      rules: [{
        key: "FlatModifier",
        selector,
        value: component.value,
        type: component.modifierType
      }]
    };
  },

  describe(component) {
    const sign = component.value > 0 ? "+" : "";
    return `${sign}${component.value} ${component.modifierType} to ${component.movementType} speed`;
  }
};
