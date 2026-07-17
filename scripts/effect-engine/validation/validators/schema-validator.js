import { EFFECT_SCHEMA_VERSION } from "../../../constants.js";
import { componentRegistry } from "../../component-registry.js";

const DURATION_UNITS = new Set(["rounds", "minutes", "hours", "days", "unlimited"]);

function issue(severity, code, messageKey, data = {}, componentIndex = null) {
  return { severity, code, messageKey, data, componentIndex };
}

function validateDuration(duration, componentIndex = null) {
  const issues = [];
  if (duration == null) return issues;

  if (typeof duration !== "object" || Array.isArray(duration)) {
    issues.push(issue("error", "SCHEMA_DURATION_OBJECT", "Validation.Schema.DurationObject", {}, componentIndex));
    return issues;
  }

  if (!DURATION_UNITS.has(duration.unit)) {
    issues.push(issue("error", "SCHEMA_DURATION_UNIT", "Validation.Schema.DurationUnit", {
      unit: String(duration.unit)
    }, componentIndex));
  }

  if (
    duration.unit !== "unlimited" &&
    (typeof duration.value !== "number" || !Number.isFinite(duration.value) || duration.value < 0)
  ) {
    issues.push(issue("error", "SCHEMA_DURATION_VALUE", "Validation.Schema.DurationValue", {}, componentIndex));
  }

  return issues;
}

export function validateSchema(definition) {
  const issues = [];

  if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
    return [issue("error", "SCHEMA_DEFINITION_OBJECT", "Validation.Schema.DefinitionObject")];
  }

  if (definition.schemaVersion !== EFFECT_SCHEMA_VERSION) {
    issues.push(issue("error", "SCHEMA_VERSION_UNSUPPORTED", "Validation.Schema.Version", {
      actual: definition.schemaVersion,
      expected: EFFECT_SCHEMA_VERSION
    }));
  }

  if (typeof definition.name !== "string" || !definition.name.trim()) {
    issues.push(issue("error", "SCHEMA_NAME_REQUIRED", "Validation.Schema.NameRequired"));
  }

  issues.push(...validateDuration(definition.duration));

  if (!Array.isArray(definition.components) || definition.components.length === 0) {
    issues.push(issue("error", "SCHEMA_COMPONENTS_REQUIRED", "Validation.Schema.ComponentsRequired"));
    return issues;
  }

  definition.components.forEach((component, index) => {
    if (!component || typeof component !== "object" || Array.isArray(component)) {
      issues.push(issue("error", "SCHEMA_COMPONENT_OBJECT", "Validation.Schema.ComponentObject", {}, index));
      return;
    }

    if (Object.hasOwn(component, "duration") && component.duration != null) {
      issues.push(...validateDuration(component.duration, index));
    }

    const handler = componentRegistry.get(component.type);
    if (!handler) {
      issues.push(issue("error", "SCHEMA_COMPONENT_UNKNOWN", "Validation.Schema.ComponentUnknown", {
        type: String(component.type)
      }, index));
      return;
    }

    const result = handler.validate(component, { definition, index }) ?? {};
    for (const entry of result.errors ?? []) {
      if (typeof entry === "string") {
        issues.push(issue("error", "COMPONENT_INVALID", null, { message: entry }, index));
      } else {
        issues.push(issue(
          entry.severity ?? "error",
          entry.code ?? "COMPONENT_INVALID",
          entry.messageKey ?? null,
          entry.data ?? {},
          index
        ));
      }
    }
    for (const entry of result.warnings ?? []) {
      if (typeof entry === "string") {
        issues.push(issue("warning", "COMPONENT_WARNING", null, { message: entry }, index));
      } else {
        issues.push(issue(
          entry.severity ?? "warning",
          entry.code ?? "COMPONENT_WARNING",
          entry.messageKey ?? null,
          entry.data ?? {},
          index
        ));
      }
    }
  });

  return issues;
}
