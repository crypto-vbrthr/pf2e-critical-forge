import { resolveConditionDefinition } from "../condition-resolver.js";

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
    const condition = await resolveConditionDefinition(component.slug);
    const rule = {
      key: "GrantItem",
      uuid: condition.uuid,
      allowDuplicate: false,
      onDeleteActions: { grantee: "restrict" }
    };

    // badge-value is valid only for PF2e conditions whose badge is a numeric
    // condition value. Adding it to binary conditions can prevent the granted
    // condition from being prepared and applied correctly.
    if (condition.isValued && component.value !== undefined) {
      rule.alterations = [{
        mode: "override",
        property: "badge-value",
        value: component.value
      }];
    }

    return {
      kind: "condition",
      slug: component.slug,
      isValued: condition.isValued,
      value: condition.isValued ? (component.value ?? null) : null,
      rules: [rule]
    };
  },

  describe(component) {
    return component.value === undefined
      ? component.slug
      : `${component.slug} ${component.value}`;
  }
};
