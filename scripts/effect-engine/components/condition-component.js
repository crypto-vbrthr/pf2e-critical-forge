export const conditionComponent = {
  type: "condition",

  validate(component) {
    const errors = [];
    const warnings = [];

    if (typeof component.slug !== "string" || !component.slug.trim()) {
      errors.push("Condition component requires a non-empty slug.");
    }

    if (
      component.value !== undefined &&
      (!Number.isInteger(component.value) || component.value < 0)
    ) {
      errors.push("Condition value must be a non-negative integer.");
    }

    return { errors, warnings };
  },

  compile(component, context = {}) {
    return {
      kind: "condition",
      slug: component.slug,
      value: component.value ?? null,
      duration: context.duration ?? null
    };
  },

  describe(component) {
    return component.value === undefined
      ? component.slug
      : `${component.slug} ${component.value}`;
  }
};
