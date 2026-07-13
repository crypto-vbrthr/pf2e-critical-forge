const CHECK_SELECTORS = new Set([
  "all", "check", "attack-roll", "skill-check", "perception",
  "saving-throw", "fortitude", "reflex", "will"
]);

function selectorsOf(component) {
  return Array.isArray(component.selector)
    ? component.selector
    : [component.selector];
}

function frightenedAffectsSelector(selector) {
  return CHECK_SELECTORS.has(selector);
}

export function validateRules(definition) {
  const issues = [];
  const frightened = definition.components
    .map((component, index) => ({ component, index }))
    .find(({ component }) => component.type === "condition" && component.slug === "frightened");

  if (!frightened) return issues;

  definition.components.forEach((component, index) => {
    if (component.type !== "modifier" || component.value >= 0) return;

    const overlaps = selectorsOf(component).some(frightenedAffectsSelector);
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
