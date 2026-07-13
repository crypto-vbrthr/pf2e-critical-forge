const MODIFIER_TYPES = new Set(["status", "circumstance", "item", "untyped"]);

export const modifierComponent = {
  type: "modifier",

  validate(component) {
    const errors = [];
    const warnings = [];
    const selectors = Array.isArray(component.selector)
      ? component.selector
      : [component.selector];

    if (
      selectors.length === 0 ||
      selectors.some((selector) => typeof selector !== "string" || !selector.trim())
    ) {
      errors.push("Modifier component requires one or more non-empty selectors.");
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

  async compile(component) {
    const rule = {
      key: "FlatModifier",
      selector: component.selector,
      value: component.value,
      type: component.modifierType
    };

    if (Array.isArray(component.predicate) && component.predicate.length > 0) {
      rule.predicate = component.predicate;
    }

    if (typeof component.label === "string" && component.label.trim()) {
      rule.label = component.label;
    }

    return {
      kind: "modifier",
      selector: component.selector,
      value: component.value,
      modifierType: component.modifierType,
      predicate: component.predicate ?? [],
      rules: [rule]
    };
  },

  describe(component) {
    const sign = component.value > 0 ? "+" : "";
    const selectors = Array.isArray(component.selector)
      ? component.selector.join(", ")
      : component.selector;
    return `${sign}${component.value} ${component.modifierType} (${selectors})`;
  }
};
