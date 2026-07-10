const MODIFIER_TYPES = new Set(["status", "circumstance", "item", "untyped"]);

export const modifierComponent = {
  type: "modifier",

  validate(component) {
    const errors = [];
    const warnings = [];

    if (typeof component.selector !== "string" || !component.selector.trim()) {
      errors.push("Modifier component requires a non-empty selector.");
    }

    if (typeof component.value !== "number" || !Number.isFinite(component.value)) {
      errors.push("Modifier value must be a finite number.");
    }

    if (!MODIFIER_TYPES.has(component.modifierType)) {
      errors.push(`Unsupported modifier type: ${component.modifierType}`);
    }

    if (component.predicate !== undefined && !Array.isArray(component.predicate)) {
      errors.push("Modifier predicate must be an array.");
    }

    return { errors, warnings };
  },

  compile(component, context = {}) {
    return {
      kind: "modifier",
      selector: component.selector,
      value: component.value,
      modifierType: component.modifierType,
      predicate: component.predicate ?? [],
      duration: context.duration ?? null
    };
  },

  describe(component) {
    const sign = component.value > 0 ? "+" : "";
    return `${sign}${component.value} ${component.modifierType} (${component.selector})`;
  }
};
