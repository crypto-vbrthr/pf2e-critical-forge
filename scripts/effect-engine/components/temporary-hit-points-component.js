function issue(code, messageKey, data = {}) {
  return { code, messageKey, data };
}

export const temporaryHitPointsComponent = {
  type: "temporaryHitPoints",

  validate(component) {
    const errors = [];
    const warnings = [];

    if (!Number.isInteger(component.value) || component.value < 1) {
      errors.push(issue(
        "TEMPORARY_HIT_POINTS_VALUE_INVALID",
        "Validation.Components.TemporaryHitPoints.ValueInvalid",
        { value: String(component.value ?? "") }
      ));
    }

    return { errors, warnings };
  },

  async compile(component) {
    return {
      kind: "temporaryHitPoints",
      value: component.value,
      rules: [{
        key: "TempHP",
        value: component.value
      }]
    };
  },

  describe(component) {
    return `Temporary hit points ${component.value}`;
  }
};
