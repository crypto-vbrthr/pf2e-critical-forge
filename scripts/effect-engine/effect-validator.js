import { EFFECT_SCHEMA_VERSION } from "../constants.js";
import { componentRegistry } from "./component-registry.js";

const DURATION_UNITS = new Set(["rounds", "minutes", "hours", "days", "unlimited"]);

function validateDuration(duration, errors) {
  if (duration == null) return;

  if (typeof duration !== "object" || Array.isArray(duration)) {
    errors.push("duration must be an object.");
    return;
  }

  if (!DURATION_UNITS.has(duration.unit)) {
    errors.push(`Unsupported duration unit: ${duration.unit}`);
  }

  if (
    duration.unit !== "unlimited" &&
    (typeof duration.value !== "number" || !Number.isFinite(duration.value) || duration.value < 0)
  ) {
    errors.push("Duration value must be a non-negative finite number.");
  }
}

export function validateEffectDefinition(definition) {
  const errors = [];
  const warnings = [];

  if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
    return { valid: false, errors: ["Effect definition must be an object."], warnings };
  }

  if (definition.schemaVersion !== EFFECT_SCHEMA_VERSION) {
    errors.push(
      `Unsupported schemaVersion ${definition.schemaVersion}; expected ${EFFECT_SCHEMA_VERSION}.`
    );
  }

  if (typeof definition.name !== "string" || !definition.name.trim()) {
    errors.push("Effect definition requires a non-empty name.");
  }

  validateDuration(definition.duration, errors);

  if (!Array.isArray(definition.components) || definition.components.length === 0) {
    errors.push("Effect definition requires at least one component.");
  } else {
    definition.components.forEach((component, index) => {
      if (!component || typeof component !== "object") {
        errors.push(`Component ${index} must be an object.`);
        return;
      }

      const handler = componentRegistry.get(component.type);
      if (!handler) {
        errors.push(`Unknown component type at index ${index}: ${component.type}`);
        return;
      }

      const result = handler.validate(component, { definition, index }) ?? {};
      for (const error of result.errors ?? []) {
        errors.push(`Component ${index}: ${error}`);
      }
      for (const warning of result.warnings ?? []) {
        warnings.push(`Component ${index}: ${warning}`);
      }
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}
