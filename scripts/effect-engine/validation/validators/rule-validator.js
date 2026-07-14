import { isValuedCondition } from "../../catalogs/condition-catalog.js";
import {
  isKnownSelector,
  isValidSelectorSyntax,
  selectorIsAffectedByFrightened
} from "../../catalogs/selector-catalog.js";

function selectorsOf(component) {
  return Array.isArray(component.selector)
    ? component.selector
    : [component.selector];
}

export function validateRules(definition) {
  const issues = [];

  definition.components.forEach((component, index) => {
    if (
      component.type === "condition" &&
      component.value !== undefined &&
      !isValuedCondition(component.slug)
    ) {
      issues.push({
        severity: "warning",
        code: "CONDITION_VALUE_IGNORED",
        messageKey: "Validation.Rules.ConditionValueIgnored",
        data: { slug: component.slug, value: component.value },
        componentIndex: index
      });
    }

    if (component.type !== "modifier") return;

    for (const selector of selectorsOf(component)) {
      if (!isValidSelectorSyntax(selector)) {
        issues.push({
          severity: "error",
          code: "MODIFIER_SELECTOR_FORMAT",
          messageKey: "Validation.Rules.SelectorFormat",
          data: { selector: String(selector ?? "") },
          componentIndex: index
        });
      } else if (!isKnownSelector(selector)) {
        issues.push({
          severity: "info",
          code: "MODIFIER_SELECTOR_CUSTOM",
          messageKey: "Validation.Rules.SelectorCustom",
          data: { selector },
          componentIndex: index
        });
      }
    }
  });
  const frightened = definition.components
    .map((component, index) => ({ component, index }))
    .find(({ component }) => component.type === "condition" && component.slug === "frightened");

  if (!frightened) return issues;

  definition.components.forEach((component, index) => {
    if (component.type !== "modifier" || component.value >= 0) return;

    const overlaps = selectorsOf(component).some(selectorIsAffectedByFrightened);
    if (!overlaps) return;

    if (component.modifierType === "status") {
      issues.push({
        severity: "warning",
        code: "STACKING_FRIGHTENED_STATUS",
        messageKey: "Validation.Rules.FrightenedStatus",
        data: {
          frightenedValue: frightened.component.value ?? 1,
          modifierValue: component.value
        },
        componentIndex: index
      });
    } else if (component.modifierType === "circumstance") {
      issues.push({
        severity: "info",
        code: "STACKING_FRIGHTENED_CIRCUMSTANCE",
        messageKey: "Validation.Rules.FrightenedCircumstance",
        data: {
          frightenedValue: frightened.component.value ?? 1,
          modifierValue: component.value
        },
        componentIndex: index
      });
    }
  });

  return issues;
}
