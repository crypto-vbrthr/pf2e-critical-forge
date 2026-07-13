import { resolveConditionUuid } from "../condition-resolver.js";

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

  async compile(component) {
    const uuid = await resolveConditionUuid(component.slug);
    const rule = {
      key: "GrantItem",
      uuid,
      allowDuplicate: false,
      onDeleteActions: { grantee: "restrict" }
    };

    if (component.value !== undefined) {
      rule.alterations = [{
        mode: "override",
        property: "badge-value",
        value: component.value
      }];
    }

    return {
      kind: "condition",
      slug: component.slug,
      value: component.value ?? null,
      rules: [rule]
    };
  },

  describe(component) {
    return component.value === undefined
      ? component.slug
      : `${component.slug} ${component.value}`;
  }
};
