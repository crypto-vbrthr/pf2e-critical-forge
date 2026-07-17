import { normalizeDuration } from "./duration-builder.js";

function withOptionalDuration(component, duration) {
  if (duration == null) return component;
  return {
    ...component,
    duration: normalizeDuration(duration)
  };
}

export function buildCondition(slug, value, { duration = null } = {}) {
  const normalizedSlug = String(slug ?? "").trim();
  if (!normalizedSlug) {
    throw new TypeError("Condition slug must not be empty.");
  }

  let component = {
    type: "condition",
    slug: normalizedSlug
  };

  if (value !== undefined && value !== null && value !== "") {
    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || numericValue < 0) {
      throw new TypeError("Condition value must be a non-negative integer.");
    }
    component.value = numericValue;
  }

  component = withOptionalDuration(component, duration);
  return Object.freeze(component);
}

export function buildModifier({
  selector,
  value,
  modifierType = "status",
  predicate = [],
  label,
  duration = null
} = {}) {
  const selectors = Array.isArray(selector)
    ? selector.map((entry) => String(entry).trim()).filter(Boolean)
    : String(selector ?? "").trim();

  if ((Array.isArray(selectors) && selectors.length === 0) || !selectors) {
    throw new TypeError("Modifier selector must not be empty.");
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new TypeError("Modifier value must be a finite number.");
  }

  if (!Array.isArray(predicate)) {
    throw new TypeError("Modifier predicate must be an array.");
  }

  let component = {
    type: "modifier",
    selector: selectors,
    value: numericValue,
    modifierType: String(modifierType ?? "status"),
    predicate: foundry.utils.deepClone(predicate)
  };

  if (typeof label === "string" && label.trim()) {
    component.label = label.trim();
  }

  component = withOptionalDuration(component, duration);
  return Object.freeze(component);
}

export function buildPersistentDamage({ formula, damageType, dc, duration = null } = {}) {
  const normalizedFormula = String(formula ?? "").trim();
  if (!normalizedFormula) {
    throw new TypeError("Persistent damage formula must not be empty.");
  }

  const normalizedDamageType = String(damageType ?? "").trim();
  if (!normalizedDamageType) {
    throw new TypeError("Persistent damage type must not be empty.");
  }

  let component = {
    type: "persistentDamage",
    formula: normalizedFormula,
    damageType: normalizedDamageType
  };

  if (dc !== undefined && dc !== null && dc !== "") {
    const numericDc = Number(dc);
    if (!Number.isInteger(numericDc) || numericDc < 1) {
      throw new TypeError("Persistent damage recovery DC must be a positive integer.");
    }
    component.dc = numericDc;
  }

  component = withOptionalDuration(component, duration);
  return Object.freeze(component);
}

export function buildResistance({ resistanceType, value, duration = null } = {}) {
  const normalizedType = String(resistanceType ?? "").trim();
  if (!normalizedType) {
    throw new TypeError("Resistance type must not be empty.");
  }

  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 1) {
    throw new TypeError("Resistance value must be a positive integer.");
  }

  return Object.freeze(withOptionalDuration({
    type: "resistance",
    resistanceType: normalizedType,
    value: numericValue
  }, duration));
}

export function buildImmunity({ immunityType, duration = null } = {}) {
  const normalizedType = String(immunityType ?? "").trim();
  if (!normalizedType) {
    throw new TypeError("Immunity type must not be empty.");
  }

  return Object.freeze(withOptionalDuration({
    type: "immunity",
    immunityType: normalizedType
  }, duration));
}

export function buildWeakness({ weaknessType, value, duration = null } = {}) {
  const normalizedType = String(weaknessType ?? "").trim();
  if (!normalizedType) {
    throw new TypeError("Weakness type must not be empty.");
  }

  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 1) {
    throw new TypeError("Weakness value must be a positive integer.");
  }

  return Object.freeze(withOptionalDuration({
    type: "weakness",
    weaknessType: normalizedType,
    value: numericValue
  }, duration));
}

export function buildFastHealing({ value, duration = null } = {}) {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 1) {
    throw new TypeError("Fast healing value must be a positive integer.");
  }

  return Object.freeze(withOptionalDuration({
    type: "fastHealing",
    value: numericValue
  }, duration));
}

export function buildTemporaryHitPoints({ value, duration = null } = {}) {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 1) {
    throw new TypeError("Temporary hit points value must be a positive integer.");
  }

  return Object.freeze(withOptionalDuration({
    type: "temporaryHitPoints",
    value: numericValue
  }, duration));
}

export function buildRegeneration({ value, deactivatedBy, duration = null } = {}) {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 1) {
    throw new TypeError("Regeneration value must be a positive integer.");
  }

  const sources = Array.isArray(deactivatedBy) ? deactivatedBy : [deactivatedBy];
  const normalized = [...new Set(
    sources.map((entry) => String(entry ?? "").trim()).filter(Boolean)
  )];
  if (normalized.length === 0) {
    throw new TypeError("Regeneration requires at least one deactivating damage type.");
  }

  return Object.freeze(withOptionalDuration({
    type: "regeneration",
    value: numericValue,
    deactivatedBy: Object.freeze(normalized)
  }, duration));
}

export function buildMovement({ movementType, value, modifierType = "status", duration = null } = {}) {
  const normalizedType = String(movementType ?? "").trim();
  if (!normalizedType) {
    throw new TypeError("Movement type must not be empty.");
  }

  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue === 0) {
    throw new TypeError("Movement value must be a non-zero integer.");
  }

  const normalizedModifierType = String(modifierType ?? "status").trim();
  if (!normalizedModifierType) {
    throw new TypeError("Movement modifier type must not be empty.");
  }

  return Object.freeze(withOptionalDuration({
    type: "movement",
    movementType: normalizedType,
    value: numericValue,
    modifierType: normalizedModifierType
  }, duration));
}

export function buildBaseSpeed({ movementType, value, duration = null } = {}) {
  const normalizedType = String(movementType ?? "").trim();
  if (!normalizedType) {
    throw new TypeError("Base Speed movement type must not be empty.");
  }

  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 1) {
    throw new TypeError("Base Speed value must be a positive integer.");
  }

  return Object.freeze(withOptionalDuration({
    type: "baseSpeed",
    movementType: normalizedType,
    value: numericValue
  }, duration));
}

export function cloneComponent(component) {
  if (!component || typeof component !== "object" || Array.isArray(component)) {
    throw new TypeError("Component must be an object.");
  }

  const cloned = foundry.utils.deepClone(component);
  if (cloned.duration != null) cloned.duration = normalizeDuration(cloned.duration);
  return cloned;
}
