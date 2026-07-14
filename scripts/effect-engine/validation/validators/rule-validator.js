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
  const persistentDamageByType = new Map();
  definition.components.forEach((component, index) => {
    if (component.type !== "persistentDamage") return;
    const previous = persistentDamageByType.get(component.damageType);
    if (previous !== undefined) {
      issues.push({
        severity: "warning",
        code: "PERSISTENT_DAMAGE_DUPLICATE_TYPE",
        messageKey: "Validation.Rules.PersistentDamageDuplicateType",
        data: { damageType: component.damageType, firstComponent: previous + 1 },
        componentIndex: index
      });
    } else {
      persistentDamageByType.set(component.damageType, index);
    }
  });

  const resistanceByType = new Map();
  definition.components.forEach((component, index) => {
    if (component.type !== "resistance") return;
    const previous = resistanceByType.get(component.resistanceType);
    if (previous !== undefined) {
      issues.push({
        severity: "warning",
        code: "RESISTANCE_DUPLICATE_TYPE",
        messageKey: "Validation.Rules.ResistanceDuplicateType",
        data: {
          resistanceType: component.resistanceType,
          firstComponent: previous + 1
        },
        componentIndex: index
      });
    } else {
      resistanceByType.set(component.resistanceType, index);
    }
  });

  const immunityByType = new Map();
  definition.components.forEach((component, index) => {
    if (component.type !== "immunity") return;
    const previous = immunityByType.get(component.immunityType);
    if (previous !== undefined) {
      issues.push({
        severity: "warning",
        code: "IMMUNITY_DUPLICATE_TYPE",
        messageKey: "Validation.Rules.ImmunityDuplicateType",
        data: {
          immunityType: component.immunityType,
          firstComponent: previous + 1
        },
        componentIndex: index
      });
    } else {
      immunityByType.set(component.immunityType, index);
    }
  });

  const weaknessByType = new Map();
  definition.components.forEach((component, index) => {
    if (component.type !== "weakness") return;
    const previous = weaknessByType.get(component.weaknessType);
    if (previous !== undefined) {
      issues.push({
        severity: "warning",
        code: "WEAKNESS_DUPLICATE_TYPE",
        messageKey: "Validation.Rules.WeaknessDuplicateType",
        data: {
          weaknessType: component.weaknessType,
          firstComponent: previous + 1
        },
        componentIndex: index
      });
    } else {
      weaknessByType.set(component.weaknessType, index);
    }
  });

  const regenerationComponents = definition.components
    .map((component, index) => ({ component, index }))
    .filter(({ component }) => component.type === "regeneration");

  for (const { component, index } of regenerationComponents.slice(1)) {
    const first = regenerationComponents[0];
    issues.push({
      severity: "warning",
      code: "REGENERATION_MULTIPLE_SOURCES",
      messageKey: "Validation.Rules.RegenerationMultipleSources",
      data: {
        firstComponent: first.index + 1,
        firstValue: first.component.value,
        value: component.value
      },
      componentIndex: index
    });
  }

  const fastHealingComponents = definition.components
    .map((component, index) => ({ component, index }))
    .filter(({ component }) => component.type === "fastHealing");

  for (const { component, index } of fastHealingComponents.slice(1)) {
    const first = fastHealingComponents[0];
    issues.push({
      severity: "warning",
      code: "FAST_HEALING_MULTIPLE_SOURCES",
      messageKey: "Validation.Rules.FastHealingMultipleSources",
      data: {
        firstComponent: first.index + 1,
        firstValue: first.component.value,
        value: component.value
      },
      componentIndex: index
    });
  }

  const temporaryHitPointsComponents = definition.components
    .map((component, index) => ({ component, index }))
    .filter(({ component }) => component.type === "temporaryHitPoints");

  for (const { component, index } of temporaryHitPointsComponents.slice(1)) {
    const first = temporaryHitPointsComponents[0];
    issues.push({
      severity: "warning",
      code: "TEMPORARY_HIT_POINTS_MULTIPLE_SOURCES",
      messageKey: "Validation.Rules.TemporaryHitPointsMultipleSources",
      data: {
        firstComponent: first.index + 1,
        firstValue: first.component.value,
        value: component.value
      },
      componentIndex: index
    });
  }

  const movementComponents = definition.components
    .map((component, index) => ({ component, index }))
    .filter(({ component }) => component.type === "movement");

  for (let currentIndex = 1; currentIndex < movementComponents.length; currentIndex += 1) {
    const current = movementComponents[currentIndex];
    const previous = movementComponents.slice(0, currentIndex).find(({ component }) => {
      if (component.modifierType !== current.component.modifierType) return false;
      return component.movementType === current.component.movementType
        || component.movementType === "all"
        || current.component.movementType === "all";
    });

    if (!previous) continue;
    issues.push({
      severity: "warning",
      code: "MOVEMENT_MODIFIER_OVERLAP",
      messageKey: "Validation.Rules.MovementOverlap",
      data: {
        firstComponent: previous.index + 1,
        firstMovementType: previous.component.movementType,
        movementType: current.component.movementType,
        modifierType: current.component.modifierType
      },
      componentIndex: current.index
    });
  }

  const baseSpeedByType = new Map();
  definition.components.forEach((component, index) => {
    if (component.type !== "baseSpeed") return;
    const previous = baseSpeedByType.get(component.movementType);
    if (previous !== undefined) {
      issues.push({
        severity: "warning",
        code: "BASE_SPEED_DUPLICATE_TYPE",
        messageKey: "Validation.Rules.BaseSpeedDuplicateType",
        data: {
          movementType: component.movementType,
          firstComponent: previous + 1
        },
        componentIndex: index
      });
    } else {
      baseSpeedByType.set(component.movementType, index);
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
