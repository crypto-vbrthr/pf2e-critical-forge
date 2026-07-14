function error(code, messageKey, data = {}) {
  return { code, messageKey, data };
}

export const fastHealingComponent = {
  type: "fastHealing",

  validate(component) {
    const errors = [];
    const warnings = [];

    if (!Number.isInteger(component.value) || component.value < 1) {
      errors.push(error(
        "FAST_HEALING_VALUE_INVALID",
        "Validation.Components.FastHealing.ValueInvalid",
        { value: String(component.value ?? "") }
      ));
    }

    return { errors, warnings };
  },

  async compile(component) {
    return {
      kind: "fastHealing",
      value: component.value,
      rules: [{
        key: "FastHealing",
        value: component.value
      }]
    };
  },

  describe(component) {
    return `Fast healing ${component.value}`;
  }
};
